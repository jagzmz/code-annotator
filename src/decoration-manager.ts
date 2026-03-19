import * as vscode from 'vscode';
import * as path from 'path';
import { AnnotationStore } from './annotation-store';

/**
 * Manages gutter icons and background highlights for annotations.
 *
 * Listens to store changes, editor visibility, cursor movement, and
 * configuration changes to keep decorations in sync.
 */
export class DecorationManager implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly store: AnnotationStore,
    private readonly context: vscode.ExtensionContext,
  ) {
    this.decorationType = this.createDecorationType();

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
   * Create the TextEditorDecorationType from current configuration.
   */
  private createDecorationType(): vscode.TextEditorDecorationType {
    const config = vscode.workspace.getConfiguration('code-annotator');
    const highlightColor = config.get<string>(
      'highlightColor',
      'rgba(255, 213, 79, 0.15)',
    );
    const gutterIconColor = config.get<string>('gutterIconColor', '#FDD835');

    const lightGutterIconPath = path.join(
      this.context.extensionPath,
      'images',
      'annotation-gutter-light.svg',
    );
    const darkGutterIconPath = path.join(
      this.context.extensionPath,
      'images',
      'annotation-gutter-dark.svg',
    );

    return vscode.window.createTextEditorDecorationType({
      backgroundColor: highlightColor,
      isWholeLine: true,
      gutterIconSize: 'contain',
      overviewRulerColor: gutterIconColor,
      overviewRulerLane: vscode.OverviewRulerLane.Left,
      light: {
        gutterIconPath: vscode.Uri.file(lightGutterIconPath),
      },
      dark: {
        gutterIconPath: vscode.Uri.file(darkGutterIconPath),
      },
    });
  }

  /**
   * Dispose the old decoration type and create a new one.
   * Applies new decorations BEFORE disposing old to avoid flicker.
   */
  private recreateDecorationType(): void {
    const oldDecorationType = this.decorationType;
    this.decorationType = this.createDecorationType();

    // Apply new decorations first to prevent flicker
    this.refreshAllVisibleEditors();

    // Then dispose the old type
    oldDecorationType.dispose();
  }

  /**
   * Refresh decorations for a single editor based on its document's annotations.
   */
  private refreshDecorations(editor: vscode.TextEditor): void {
    const uri = editor.document.uri.toString();
    const annotations = this.store.getByUri(uri);

    const decorationOptions: vscode.DecorationOptions[] = annotations.map(
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

    editor.setDecorations(this.decorationType, decorationOptions);
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
   * Dispose all event listeners, the decoration type, and clear the debounce timer.
   */
  dispose(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.decorationType.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
