import * as vscode from 'vscode';
import { Annotation } from './types';

/**
 * In-memory store for annotations, keyed by annotation ID.
 * Annotation objects in the Map are mutable references — other modules
 * may hold references to them (e.g., LineTracker updates lines via updateLines).
 *
 * Emits `onDidChange` whenever the store is mutated so that decoration
 * managers, status bar, and other consumers can react.
 */
export class AnnotationStore implements vscode.Disposable {
  private readonly _annotations = new Map<string, Annotation>();
  private readonly _onDidChange = new vscode.EventEmitter<void>();

  /**
   * Fires whenever the store contents change (add, update, delete, clear).
   */
  readonly onDidChange: vscode.Event<void> = this._onDidChange.event;

  /**
   * Add an annotation to the store and fire onDidChange.
   */
  add(annotation: Annotation): void {
    this._annotations.set(annotation.id, annotation);
    this._onDidChange.fire();
  }

  /**
   * Update the comment of an existing annotation.
   * No-op if the annotation ID is not found.
   */
  updateComment(id: string, comment: string): void {
    const annotation = this._annotations.get(id);
    if (!annotation) {
      return;
    }
    annotation.comment = comment;
    this._onDidChange.fire();
  }

  /**
   * Update the line range of an existing annotation.
   * Critical for LineTracker (T3) — call this instead of direct mutation
   * so that onDidChange fires and decorations refresh.
   */
  updateLines(id: string, startLine: number, endLine: number): void {
    const annotation = this._annotations.get(id);
    if (!annotation) {
      return;
    }
    annotation.startLine = startLine;
    annotation.endLine = endLine;
    this._onDidChange.fire();
  }

  /**
   * Remove an annotation by ID and fire onDidChange.
   */
  delete(id: string): void {
    if (this._annotations.delete(id)) {
      this._onDidChange.fire();
    }
  }

  /**
   * Get all annotations for a given document URI, sorted by startLine ascending.
   */
  getByUri(uri: string): Annotation[] {
    const result: Annotation[] = [];
    for (const annotation of this._annotations.values()) {
      if (annotation.uri === uri) {
        result.push(annotation);
      }
    }
    result.sort((a, b) => a.startLine - b.startLine);
    return result;
  }

  /**
   * Get all annotations grouped by URI then sorted by startLine within each group.
   * URIs are sorted alphabetically.
   */
  getAll(): Annotation[] {
    const byUri = new Map<string, Annotation[]>();
    for (const annotation of this._annotations.values()) {
      let group = byUri.get(annotation.uri);
      if (!group) {
        group = [];
        byUri.set(annotation.uri, group);
      }
      group.push(annotation);
    }

    // Sort URIs alphabetically
    const sortedUris = Array.from(byUri.keys()).sort();

    const result: Annotation[] = [];
    for (const uri of sortedUris) {
      const group = byUri.get(uri)!;
      group.sort((a, b) => a.startLine - b.startLine);
      result.push(...group);
    }
    return result;
  }

  /**
   * Get annotations at a specific line in a document.
   * Returns annotations whose range includes the given line
   * (startLine <= line && endLine >= line).
   */
  getAtLine(uri: string, line: number): Annotation[] {
    const result: Annotation[] = [];
    for (const annotation of this._annotations.values()) {
      if (
        annotation.uri === uri &&
        annotation.startLine <= line &&
        annotation.endLine >= line
      ) {
        result.push(annotation);
      }
    }
    result.sort((a, b) => a.startLine - b.startLine);
    return result;
  }

  /**
   * Remove all annotations and fire onDidChange.
   */
  clear(): void {
    if (this._annotations.size > 0) {
      this._annotations.clear();
      this._onDidChange.fire();
    }
  }

  /**
   * Return the total number of annotations.
   */
  count(): number {
    return this._annotations.size;
  }

  /**
   * Return true if the store has no annotations.
   */
  isEmpty(): boolean {
    return this._annotations.size === 0;
  }

  /**
   * Dispose the EventEmitter.
   */
  dispose(): void {
    this._onDidChange.dispose();
  }
}
