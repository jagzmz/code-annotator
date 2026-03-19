import * as vscode from 'vscode';
import { IHistoryManager, CollectionSnapshot } from './types';

const STORAGE_KEY = 'code-annotator.collectionHistory';
const MAX_SNAPSHOTS = 50;

export class HistoryManager implements IHistoryManager {
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  saveSnapshot(markdown: string, count: number): void {
    const snapshot: CollectionSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      markdown,
      annotationCount: count,
    };

    const snapshots = this.getRawSnapshots();
    snapshots.push(snapshot);

    // Cap at MAX_SNAPSHOTS — drop oldest entries if over the limit
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.sort((a, b) => a.timestamp - b.timestamp);
      snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
    }

    this.context.workspaceState.update(STORAGE_KEY, snapshots);
  }

  getSnapshots(): CollectionSnapshot[] {
    const snapshots = this.getRawSnapshots();
    // Return sorted by timestamp descending (newest first)
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  clearHistory(): void {
    this.context.workspaceState.update(STORAGE_KEY, []);
  }

  private getRawSnapshots(): CollectionSnapshot[] {
    return this.context.workspaceState.get<CollectionSnapshot[]>(STORAGE_KEY, []);
  }
}
