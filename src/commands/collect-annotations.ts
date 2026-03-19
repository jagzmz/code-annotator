import * as vscode from 'vscode';
import { AnnotationStore } from '../annotation-store';
import { IHistoryManager } from '../types';
import { formatAnnotationsAsMarkdown } from '../markdown-formatter';

/**
 * Collects all annotations, formats them as markdown, copies to clipboard,
 * saves a history snapshot, and clears the store.
 *
 * This is the "finalize session" action — after collecting, the annotation
 * slate is wiped clean.
 */
export async function collectAnnotationsCommand(
  store: AnnotationStore,
  historyManager: IHistoryManager,
): Promise<void> {
  if (store.isEmpty()) {
    vscode.window.showInformationMessage('No annotations to collect');
    return;
  }

  const workspacePath =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const count = store.count();
  const markdown = formatAnnotationsAsMarkdown(store.getAll(), workspacePath);

  await vscode.env.clipboard.writeText(markdown);
  historyManager.saveSnapshot(markdown, count);
  store.clear();

  vscode.window.showInformationMessage(
    `Copied ${count} annotation(s) to clipboard`,
  );
}
