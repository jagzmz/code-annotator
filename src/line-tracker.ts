import * as vscode from 'vscode';
import { AnnotationStore } from './annotation-store';

/**
 * Listens to document edits and adjusts annotation line numbers
 * so annotations track their original code as lines shift.
 *
 * contentChanges are processed in reverse order (highest line first)
 * to avoid cascading offset errors when multiple changes exist in one event.
 */
export class LineTracker implements vscode.Disposable {
  private readonly _disposable: vscode.Disposable;

  constructor(private readonly _store: AnnotationStore) {
    this._disposable = vscode.workspace.onDidChangeTextDocument((event) => {
      this._handleDocumentChange(event);
    });
  }

  private _handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    try {
      if (event.contentChanges.length === 0) {
        return;
      }

      const uri = event.document.uri.toString();

      // Process changes in reverse order (highest line first) to avoid
      // cascading offset errors when multiple changes exist in one event.
      const sortedChanges = [...event.contentChanges].sort(
        (a, b) => b.range.start.line - a.range.start.line,
      );

      for (const change of sortedChanges) {
        const oldLineCount =
          change.range.end.line - change.range.start.line + 1;
        const newLineCount = change.text.split('\n').length;
        const delta = newLineCount - oldLineCount;

        if (delta === 0) {
          continue;
        }

        const annotations = this._store.getByUri(uri);

        for (const annotation of annotations) {
          if (change.range.end.line < annotation.startLine) {
            // Change is entirely before the annotation — shift both lines
            this._store.updateLines(
              annotation.id,
              annotation.startLine + delta,
              annotation.endLine + delta,
            );
          } else if (change.range.start.line <= annotation.endLine) {
            // Change overlaps the annotation range — expand/shrink endLine
            this._store.updateLines(
              annotation.id,
              annotation.startLine,
              annotation.endLine + delta,
            );
          }
          // If the change is entirely after the annotation, no adjustment needed.
        }
      }
    } catch {
      // Swallow errors to prevent uncaught exceptions from crashing the extension.
      // Line drift tracking is best-effort — a missed update is recoverable,
      // but an unhandled throw in an event listener is not.
    }
  }

  dispose(): void {
    this._disposable.dispose();
  }
}
