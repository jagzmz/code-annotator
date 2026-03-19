import * as vscode from 'vscode';
import { IHistoryManager } from '../types';

/**
 * Shows a quick pick of saved collection snapshots.
 * User can select one to copy its markdown to the clipboard,
 * or clear the entire history.
 */
export async function viewHistoryCommand(
  historyManager: IHistoryManager,
): Promise<void> {
  const snapshots = historyManager.getSnapshots();

  if (snapshots.length === 0) {
    vscode.window.showInformationMessage('No collection history');
    return;
  }

  interface SnapshotQuickPickItem extends vscode.QuickPickItem {
    snapshotId?: string;
    isClearAction?: boolean;
  }

  const snapshotItems: SnapshotQuickPickItem[] = snapshots.map((s) => ({
    label: new Date(s.timestamp).toLocaleString(),
    description: `${s.annotationCount} annotations`,
    snapshotId: s.id,
  }));

  const items: SnapshotQuickPickItem[] = [
    ...snapshotItems,
    { kind: vscode.QuickPickItemKind.Separator, label: '' },
    { label: '$(trash) Clear History', isClearAction: true },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a collection to copy to clipboard',
  });

  if (!selected) {
    return;
  }

  if (selected.isClearAction) {
    historyManager.clearHistory();
    vscode.window.showInformationMessage('Collection history cleared');
    return;
  }

  const snapshot = snapshots.find((s) => s.id === selected.snapshotId);
  if (snapshot) {
    await vscode.env.clipboard.writeText(snapshot.markdown);
    vscode.window.showInformationMessage('Collection copied to clipboard');
  }
}
