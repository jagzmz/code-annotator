import * as vscode from 'vscode';
import { Annotation } from '../types';
import { AnnotationStore } from '../annotation-store';

/**
 * Find the annotation(s) at the current cursor position and let the user
 * pick one if there are multiple overlapping annotations.
 * Returns `undefined` if no annotation is found or the user cancels.
 */
async function findAnnotationAtCursor(
  store: AnnotationStore,
): Promise<Annotation | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const uri = editor.document.uri.toString();
  const line = editor.selection.active.line;
  const annotations = store.getAtLine(uri, line);

  if (annotations.length === 0) {
    vscode.window.showInformationMessage('No annotation at cursor position');
    return undefined;
  }

  if (annotations.length === 1) {
    return annotations[0];
  }

  // Multiple overlapping annotations — let the user choose
  const items = annotations.map((a) => ({
    label: `Lines ${a.startLine + 1}-${a.endLine + 1}: ${a.comment.substring(0, 50)}`,
    annotation: a,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an annotation',
  });

  return picked?.annotation;
}

/**
 * Command handler for `code-annotator.editAnnotation`.
 *
 * Finds the annotation at the cursor, shows an input box pre-filled with the
 * current comment, and updates the comment in the store on confirmation.
 */
export async function editAnnotationCommand(
  store: AnnotationStore,
): Promise<void> {
  const annotation = await findAnnotationAtCursor(store);
  if (!annotation) {
    return;
  }

  const newComment = await vscode.window.showInputBox({
    prompt: `Edit annotation (lines ${annotation.startLine + 1}-${annotation.endLine + 1})`,
    value: annotation.comment,
  });

  if (newComment === undefined) {
    // User cancelled
    return;
  }

  store.updateComment(annotation.id, newComment);
}
