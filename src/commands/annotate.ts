import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { Annotation } from '../types';
import { AnnotationStore } from '../annotation-store';

/**
 * Command handler for `code-annotator.annotate`.
 *
 * Prompts the user for annotation text on the current selection (or cursor line)
 * and adds the resulting Annotation to the store.
 */
export async function annotateCommand(store: AnnotationStore): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a file to annotate code.');
    return;
  }

  const { selection, document } = editor;

  // If nothing is selected, annotate the line at the cursor position
  const startLine = selection.isEmpty ? selection.active.line : selection.start.line;
  const endLine = selection.isEmpty ? selection.active.line : selection.end.line;

  const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
  const code = document.getText(range);
  const uri = document.uri.toString();
  const { languageId } = document;

  const lineLabel = startLine === endLine
    ? `${startLine + 1}`
    : `${startLine + 1}-${endLine + 1}`;

  const comment = await vscode.window.showInputBox({
    prompt: `Annotation for line${startLine === endLine ? '' : 's'} ${lineLabel}`,
    placeHolder: 'Enter your annotation...',
  });

  if (comment === undefined) {
    // User cancelled the input box
    return;
  }

  const annotation: Annotation = {
    id: crypto.randomUUID(),
    uri,
    startLine,
    endLine,
    code,
    comment,
    languageId,
    createdAt: Date.now(),
  };

  store.add(annotation);
}
