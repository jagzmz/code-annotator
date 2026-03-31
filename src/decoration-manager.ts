import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AnnotationStore } from './annotation-store';

/**
 * Manages gutter icons and background highlights for annotations.
 *
 * Listens to store changes, editor visibility, cursor movement, and
 * configuration changes to keep decorations in sync.
 */
export class DecorationManager implements vscode.Disposable {
  private highlightDecorationType: vscode.TextEditorDecorationType;
  private gutterDecorationType: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly store: AnnotationStore,
    private readonly context: vscode.ExtensionContext,
  ) {
    this.highlightDecorationType = this.createHighlightDecorationType();
    this.gutterDecorationType = this.createGutterDecorationType();

    // Store changes → debounced refresh all visible editors
    this.disposables.push(
      store.onDidChange(() => this.debouncedRefreshAllVisibleEditors()),
    );

    // Active editor changed → refresh that editor
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.refreshDecorations(editor);
          this.updateCursorContext(editor);
        }
      }),
    );

    // Visible editors changed → refresh all
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.refreshAllVisibleEditors();
      }),
    );

    // Configuration changed → recreate decoration type if our settings changed
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('code-annotator.highlightColor') ||
          e.affectsConfiguration('code-annotator.gutterIconColor')
        ) {
          this.recreateDecorationType();
        }
      }),
    );

    // Cursor moved → update hasAnnotationAtCursor context key
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection((e) => {
        this.updateCursorContext(e.textEditor);
      }),
    );

    // Initial refresh
    this.refreshAllVisibleEditors();
  }

  /**
   * Generate an SVG speech-bubble icon with the given fill color.
   */
  private generateGutterSvg(color: string): string {
    // Shifted right (x+2), with a darker outline for visual weight
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">` +
      `<path d="M5 3.5C5 2.67 5.67 2 6.5 2h6c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H9L7 12v-2h-.5C5.67 10 5 9.33 5 8.5v-5z" fill="${color}" stroke="${color}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M5 3.5C5 2.67 5.67 2 6.5 2h6c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H9L7 12v-2h-.5C5.67 10 5 9.33 5 8.5v-5z" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>` +
      `</svg>`;
  }

  /**
   * Write a dynamic SVG gutter icon to the extension's storage and return its URI.
   */
  private writeDynamicIcon(filename: string, color: string): vscode.Uri {
    const dir = this.context.globalStorageUri.fsPath;
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, this.generateGutterSvg(color), 'utf8');
    return vscode.Uri.file(filePath);
  }

  /**
   * Create the TextEditorDecorationType used for highlighted annotation ranges.
   */
  private createHighlightDecorationType(): vscode.TextEditorDecorationType {
    const config = vscode.workspace.getConfiguration('code-annotator');
    const highlightColor = config.get<string>(
      'highlightColor',
      'rgba(255, 213, 79, 0.15)',
    );

    return vscode.window.createTextEditorDecorationType({
      backgroundColor: highlightColor,
      isWholeLine: true,
    });
  }

  /**
   * Create the TextEditorDecorationType used for annotation gutter icons.
   * Gutter icon color is driven by the code-annotator.gutterIconColor setting.
   */
  private createGutterDecorationType(): vscode.TextEditorDecorationType {
    const config = vscode.workspace.getConfiguration('code-annotator');
    const gutterIconColor = config.get<string>('gutterIconColor', '#FDD835');

    // Generate dynamic SVGs using the configured color
    const darkIcon = this.writeDynamicIcon('gutter-dark.svg', gutterIconColor);
    const lightIcon = this.writeDynamicIcon('gutter-light.svg', gutterIconColor);

    return vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      gutterIconSize: 'contain',
      overviewRulerColor: gutterIconColor,
      overviewRulerLane: vscode.OverviewRulerLane.Left,
      light: {
        gutterIconPath: lightIcon,
      },
      dark: {
        gutterIconPath: darkIcon,
      },
    });
  }

  /**
   * Dispose old decoration types and create new ones.
   * Applies new decorations BEFORE disposing old types to avoid flicker.
   */
  private recreateDecorationType(): void {
    const oldHighlightDecorationType = this.highlightDecorationType;
    const oldGutterDecorationType = this.gutterDecorationType;
    this.highlightDecorationType = this.createHighlightDecorationType();
    this.gutterDecorationType = this.createGutterDecorationType();

    // Apply new decorations first to prevent flicker
    this.refreshAllVisibleEditors();

    // Then dispose the old types
    oldHighlightDecorationType.dispose();
    oldGutterDecorationType.dispose();
  }

  /**
   * Refresh decorations for a single editor based on its document's annotations.
   */
  private refreshDecorations(editor: vscode.TextEditor): void {
    const uri = editor.document.uri.toString();
    const annotations = this.store.getByUri(uri);

    const highlightDecorationOptions: vscode.DecorationOptions[] = annotations.map(
      (annotation) => ({
        range: new vscode.Range(
          annotation.startLine,
          0,
          annotation.endLine,
          Number.MAX_SAFE_INTEGER,
        ),
        hoverMessage: new vscode.MarkdownString(annotation.comment),
      }),
    );

    const gutterDecorationOptions: vscode.DecorationOptions[] = annotations.map(
      (annotation) => ({
        range: new vscode.Range(annotation.startLine, 0, annotation.startLine, 0),
        hoverMessage: new vscode.MarkdownString(annotation.comment),
      }),
    );

    editor.setDecorations(
      this.highlightDecorationType,
      highlightDecorationOptions,
    );
    editor.setDecorations(this.gutterDecorationType, gutterDecorationOptions);
  }

  /**
   * Refresh decorations for all currently visible text editors.
   */
  private refreshAllVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.refreshDecorations(editor);
    }

    // Also update cursor context for the active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.updateCursorContext(activeEditor);
    }
  }

  /**
   * Debounced version of refreshAllVisibleEditors (100ms).
   * Prevents excessive refreshes during rapid store mutations
   * (e.g., line tracking during typing).
   */
  private debouncedRefreshAllVisibleEditors(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.refreshAllVisibleEditors();
    }, 100);
  }

  /**
   * Update the `code-annotator.hasAnnotationAtCursor` context key
   * based on whether the cursor is on an annotated line.
   */
  private updateCursorContext(editor: vscode.TextEditor): void {
    const uri = editor.document.uri.toString();
    const cursorLine = editor.selection.active.line;
    const annotationsAtCursor = this.store.getAtLine(uri, cursorLine);
    const hasAnnotation = annotationsAtCursor.length > 0;

    vscode.commands.executeCommand(
      'setContext',
      'code-annotator.hasAnnotationAtCursor',
      hasAnnotation,
    );
  }

  /**
   * Dispose all event listeners, decoration types, and clear the debounce timer.
   */
  dispose(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.highlightDecorationType.dispose();
    this.gutterDecorationType.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
