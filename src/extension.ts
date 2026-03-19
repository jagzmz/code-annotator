import * as vscode from 'vscode';
import { AnnotationStore } from './annotation-store';
import { LineTracker } from './line-tracker';
import { DecorationManager } from './decoration-manager';
import { HistoryManager } from './history-manager';
import { StatusBarController } from './status-bar';
import { annotateCommand } from './commands/annotate';
import { editAnnotationCommand } from './commands/edit-annotation';
import { deleteAnnotationCommand } from './commands/delete-annotation';
import { collectAnnotationsCommand } from './commands/collect-annotations';
import { clearAllCommand } from './commands/clear-all';
import { viewHistoryCommand } from './commands/view-history';

export function activate(context: vscode.ExtensionContext) {
  const store = new AnnotationStore();
  const lineTracker = new LineTracker(store);
  const decorationManager = new DecorationManager(store, context);
  const historyManager = new HistoryManager(context);
  const statusBar = new StatusBarController(store);

  context.subscriptions.push(
    vscode.commands.registerCommand('code-annotator.annotate', () => annotateCommand(store)),
    vscode.commands.registerCommand('code-annotator.editAnnotation', () => editAnnotationCommand(store)),
    vscode.commands.registerCommand('code-annotator.deleteAnnotation', () => deleteAnnotationCommand(store)),
    vscode.commands.registerCommand('code-annotator.collectAnnotations', () => collectAnnotationsCommand(store, historyManager)),
    vscode.commands.registerCommand('code-annotator.clearAllAnnotations', () => clearAllCommand(store)),
    vscode.commands.registerCommand('code-annotator.viewHistory', () => viewHistoryCommand(historyManager)),
    store,
    lineTracker,
    decorationManager,
    statusBar,
  );
}

export function deactivate() {}
