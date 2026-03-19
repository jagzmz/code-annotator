import * as vscode from 'vscode';
import { AnnotationStore } from './annotation-store';

/**
 * Manages a status bar item that displays the current annotation count.
 * Clicking the item triggers the collect annotations command.
 * The item is shown when annotations exist and hidden when there are none.
 */
export class StatusBarController implements vscode.Disposable {
  private readonly _statusBarItem: vscode.StatusBarItem;
  private readonly _storeListener: vscode.Disposable;

  constructor(private readonly _store: AnnotationStore) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this._statusBarItem.command = 'code-annotator.collectAnnotations';

    this._storeListener = this._store.onDidChange(() => this._update());

    // Initial update
    this._update();
  }

  private _update(): void {
    const count = this._store.count();

    this._statusBarItem.text = `$(comment) ${count}`;
    this._statusBarItem.tooltip = `${count} annotation(s) — click to collect`;

    if (count > 0) {
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
    }
  }

  dispose(): void {
    this._statusBarItem.dispose();
    this._storeListener.dispose();
  }
}
