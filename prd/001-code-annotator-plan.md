# Plan: Code Annotator VS Code Extension

**Generated**: 2026-03-19
**Revised**: 2026-03-19 (post-review: 14 issues fixed)

## Overview

Build a VS Code extension called "Code Annotator" that lets users highlight code, add free-text annotations via a quick input box, see visual indicators (gutter icons + background highlights), and collect all annotations as structured markdown copied to clipboard. Supports full edit/delete, line-drift tracking, collection history persisted via workspaceState, and configurable highlight colors. Marketplace-ready scaffolding.

## Prerequisites

- Node.js 18+, npm
- VS Code 1.85+
- `vsce` CLI for packaging (`npm install -g @vscode/vsce`)
- esbuild for bundling

## Dependency Graph

```
T1 (scaffold) ──────────────────────────────────────────────┐
                                                             │
T2 (store/types) ──┬── T5 (decorations) ── T6 (annotate) ──┤
                   │        │                  │             │
T3 (line track) ───┘        │             T7 (edit/del)     │
                            │                               │
T4 (SVG icons) ─────────────┘                               │
                                                             │
T2 ── T8 (formatter) ── T9 (collect) ── T10 (history) ──── T13 (wire)
                                                   │         │
T2 ── T12 (status bar) ───────────────────────────┤         │
                                                   │         │
                              T11 (view history) ──┘         │
                                                             │
                                                        T14 (package)
```

## Module Export Contracts

All modules must export these exact signatures. Agents implementing tasks independently MUST conform to these contracts.

```typescript
// src/types.ts
export interface Annotation { id: string; uri: string; startLine: number; endLine: number; code: string; comment: string; languageId: string; createdAt: number; }
export interface CollectionSnapshot { id: string; timestamp: number; markdown: string; annotationCount: number; }
export interface IHistoryManager { saveSnapshot(markdown: string, count: number): void; getSnapshots(): CollectionSnapshot[]; clearHistory(): void; }

// src/annotation-store.ts
export class AnnotationStore {
  readonly onDidChange: vscode.Event<void>;
  add(annotation: Annotation): void;
  updateComment(id: string, comment: string): void;
  updateLines(id: string, startLine: number, endLine: number): void;
  delete(id: string): void;
  getByUri(uri: string): Annotation[];
  getAll(): Annotation[];
  getAtLine(uri: string, line: number): Annotation[];
  clear(): void;
  count(): number;
  isEmpty(): boolean;
  dispose(): void;
}

// src/line-tracker.ts
export class LineTracker { constructor(store: AnnotationStore); dispose(): void; }

// src/decoration-manager.ts
export class DecorationManager { constructor(store: AnnotationStore, context: vscode.ExtensionContext); dispose(): void; }

// src/status-bar.ts
export class StatusBarController { constructor(store: AnnotationStore); dispose(): void; }

// src/history-manager.ts
export class HistoryManager implements IHistoryManager { constructor(context: vscode.ExtensionContext); ... }

// src/markdown-formatter.ts
export function formatAnnotationsAsMarkdown(annotations: Annotation[], workspacePath: string): string;

// src/commands/annotate.ts
export function annotateCommand(store: AnnotationStore): Promise<void>;

// src/commands/edit-annotation.ts
export function editAnnotationCommand(store: AnnotationStore): Promise<void>;

// src/commands/delete-annotation.ts
export function deleteAnnotationCommand(store: AnnotationStore): Promise<void>;

// src/commands/collect-annotations.ts
export function collectAnnotationsCommand(store: AnnotationStore, historyManager: IHistoryManager): Promise<void>;

// src/commands/clear-all.ts
export function clearAllCommand(store: AnnotationStore): void;

// src/commands/view-history.ts
export function viewHistoryCommand(historyManager: IHistoryManager): Promise<void>;
```

## Tasks

### T1: Project Scaffolding
- **depends_on**: []
- **location**: `package.json`, `tsconfig.json`, `esbuild.js`, `.vscodeignore`, `.gitignore`, `src/extension.ts`, `src/commands/` (directory)
- **description**: Initialize the VS Code extension project structure from scratch (no Yeoman). Create:
  - `package.json` with:
    - `name`: `code-annotator`
    - `displayName`: `Code Annotator`
    - `version`: `0.1.0`
    - `engines.vscode`: `^1.85.0`
    - `activationEvents`: `onStartupFinished` (annotations are session-wide, need early activation)
    - `main`: `./dist/extension.js`
    - `contributes.commands`: Register all 7 commands:
      1. `code-annotator.annotate` — "Code Annotator: Add Annotation"
      2. `code-annotator.editAnnotation` — "Code Annotator: Edit Annotation"
      3. `code-annotator.deleteAnnotation` — "Code Annotator: Delete Annotation"
      4. `code-annotator.collectAnnotations` — "Code Annotator: Collect Annotations"
      5. `code-annotator.clearAllAnnotations` — "Code Annotator: Clear All Annotations"
      6. `code-annotator.viewHistory` — "Code Annotator: View Collection History"
      7. `code-annotator.clearHistory` — "Code Annotator: Clear Collection History"
    - `contributes.menus`:
      - `editor/context`:
        - `code-annotator.annotate` with `when: editorTextFocus`, group `1_modification`
        - `code-annotator.editAnnotation` with `when: editorTextFocus && code-annotator.hasAnnotationAtCursor`, group `1_modification`
        - `code-annotator.deleteAnnotation` with `when: editorTextFocus && code-annotator.hasAnnotationAtCursor`, group `1_modification`
    - `contributes.keybindings`:
      - `code-annotator.annotate`: `cmd+shift+a` (mac), `ctrl+shift+a` (win/linux), `when: editorTextFocus`
    - `contributes.configuration`:
      - `code-annotator.highlightColor` (string, default `rgba(255, 213, 79, 0.15)`)
      - `code-annotator.gutterIconColor` (string, default `#FDD835`)
  - `tsconfig.json`: target ES2020, module commonjs, strict, outDir `./dist`, rootDir `./src`
  - `esbuild.js`: bundle `src/extension.ts` → `dist/extension.js`, external `vscode`, platform node, format cjs
  - `.vscodeignore`: exclude `src/`, `node_modules/`, `.gitignore`, `esbuild.js`, `tsconfig.json`
  - `.gitignore`: `node_modules/`, `dist/`, `*.vsix`
  - `src/extension.ts`: empty `activate(context: vscode.ExtensionContext)` and `deactivate()` stubs
  - `src/commands/`: create the directory (empty `.gitkeep` or just mkdir)
  - Run `npm install --save-dev @types/vscode esbuild typescript`
  - **UUID strategy**: Use `crypto.randomUUID()` (available in Node 19+ and all VS Code 1.85+ runtimes). No external package needed. Document this choice in a comment in `src/types.ts` if created here, or leave for T6.
- **validation**: `npm run build` succeeds (add `"build": "node esbuild.js"` script). Extension compiles with no errors.
- **status**: Completed
- **log**: Scaffolded full VS Code extension project. Created package.json with all 7 commands, context menus, keybindings, and configuration. Set up tsconfig.json (ES2020, commonjs, strict), esbuild.js bundler, .vscodeignore, .gitignore. Created src/extension.ts with activate/deactivate stubs and src/commands/ directory. Installed @types/vscode, esbuild, and typescript dev dependencies. Build succeeds via `npm run build`.
- **files edited/created**: `package.json`, `package-lock.json`, `tsconfig.json`, `esbuild.js`, `.vscodeignore`, `.gitignore`, `src/extension.ts`, `src/commands/.gitkeep`

### T2: Annotation Data Model & Store
- **depends_on**: []
- **location**: `src/types.ts`, `src/annotation-store.ts`
- **description**: Create the core data structures and in-memory store.

  `src/types.ts`:
  ```typescript
  export interface Annotation {
    id: string;           // crypto.randomUUID()
    uri: string;          // document URI string
    startLine: number;    // 0-based
    endLine: number;      // 0-based (inclusive)
    code: string;         // the annotated code text (snapshot at annotation time)
    comment: string;      // user's annotation
    languageId: string;   // for markdown code fences
    createdAt: number;    // Date.now()
  }

  export interface CollectionSnapshot {
    id: string;
    timestamp: number;
    markdown: string;
    annotationCount: number;
  }

  // Interface for HistoryManager — implemented in T10, consumed by T9
  export interface IHistoryManager {
    saveSnapshot(markdown: string, count: number): void;
    getSnapshots(): CollectionSnapshot[];
    clearHistory(): void;
  }
  ```

  `src/annotation-store.ts`:
  - Class `AnnotationStore` managing a `Map<string, Annotation>` (keyed by annotation id)
  - **Annotation objects in the Map are mutable references** — other modules may hold references to them
  - Methods:
    - `add(annotation: Annotation): void` — adds and fires `onDidChange`
    - `updateComment(id: string, comment: string): void` — updates comment field, fires `onDidChange`
    - `updateLines(id: string, startLine: number, endLine: number): void` — updates line numbers, fires `onDidChange`. **Critical for T3 (LineTracker)** to call instead of direct mutation.
    - `delete(id: string): void` — removes and fires `onDidChange`
    - `getByUri(uri: string): Annotation[]` — returns annotations for a file, sorted by startLine
    - `getAll(): Annotation[]` — returns all annotations grouped by URI then sorted by startLine
    - `getAtLine(uri: string, line: number): Annotation[]` — returns annotations whose range includes the given line (for overlapping support: `startLine <= line && endLine >= line`)
    - `clear(): void` — removes all annotations, fires `onDidChange`
    - `count(): number`
    - `isEmpty(): boolean`
  - Emits events via `vscode.EventEmitter<void>` (`onDidChange`) so other components can react to store changes
  - Implements `Disposable` (dispose the EventEmitter)
- **validation**: Can be coded immediately. Requires `@types/vscode` to compile (depends on T1 for `npm install`). Unit-testable.
- **status**: Completed
- **log**: Implemented Annotation, CollectionSnapshot, and IHistoryManager interfaces in types.ts. Built AnnotationStore class with Map-based storage, full CRUD (add, updateComment, updateLines, delete, clear), query methods (getByUri, getAll, getAtLine, count, isEmpty), and vscode.EventEmitter-based onDidChange notifications. All methods conform to the module export contract. Implements Disposable.
- **files edited/created**: `src/types.ts`, `src/annotation-store.ts`

### T3: Line Drift Tracker
- **depends_on**: [T2]
- **location**: `src/line-tracker.ts`
- **description**: Create a module that listens to `vscode.workspace.onDidChangeTextDocument` and adjusts annotation line numbers when edits occur above annotated ranges.

  Class `LineTracker`:
  - Constructor takes `AnnotationStore` and registers the `onDidChangeTextDocument` listener
  - `dispose()` to clean up the listener

  Logic (inside the listener, wrapped in try/catch to prevent uncaught errors):
  - For each `TextDocumentContentChangeEvent` in `event.contentChanges`:
    - Compute the line delta: `newLineCount - oldLineCount` where `oldLineCount = change.range.end.line - change.range.start.line + 1` and `newLineCount = change.text.split('\n').length`
    - Get annotations for this document URI via `store.getByUri(uri)`
    - For each annotation:
      - If the change is entirely before the annotation's start (`change.range.end.line < annotation.startLine`): call `store.updateLines(id, startLine + delta, endLine + delta)`
      - If the change overlaps the annotation range: call `store.updateLines(id, startLine, endLine + delta)` (expand/shrink endLine)
      - If the change is entirely after: no change
  - The `store.updateLines()` call fires `onDidChange`, which triggers decoration refresh automatically

  **Important**: Process `contentChanges` in reverse order (highest line first) to avoid cascading offset errors when multiple changes exist in one event.
- **validation**: Manually test: annotate line 10, add a line above it, verify annotation moves to line 11. Delete a line above, verify annotation moves to line 9.
- **status**: Completed (committed: 21b62a4)
- **log**: Implemented LineTracker class that listens to vscode.workspace.onDidChangeTextDocument and adjusts annotation line numbers via store.updateLines(). Processes contentChanges in reverse order (highest line first) to avoid cascading offset errors. Handles three cases: change before annotation (shift both lines), change overlapping annotation (expand/shrink endLine), change after annotation (no-op). Skips zero-delta changes for efficiency. Entire listener wrapped in try/catch. Build and type-check pass cleanly.
- **files edited/created**: `src/line-tracker.ts`

### T4: Gutter Icon Asset
- **depends_on**: []
- **location**: `images/annotation-gutter-light.svg`, `images/annotation-gutter-dark.svg`
- **description**: Create simple SVG icons for the gutter decoration. Design a minimal speech-bubble that visually matches the VS Code `comment` codicon. 16x16px.
  - `images/annotation-gutter-light.svg` — dark icon (e.g., `#424242`) for light themes
  - `images/annotation-gutter-dark.svg` — light icon (e.g., `#E0E0E0`) for dark themes

  Note: VS Code `gutterIconPath` requires actual SVG file paths, not codicons directly. Max 16x16px, must use `gutterIconSize: contain`.
- **validation**: SVGs render correctly at 16x16px. Visible on both light and dark backgrounds.
- **status**: Completed
- **log**: Created two 16x16 SVG speech-bubble icons. Both validated as well-formed XML via xmllint. Light-theme icon uses #424242 (dark fill), dark-theme icon uses #E0E0E0 (light fill). Design is a rounded-rectangle speech bubble with a triangular tail at bottom-left, matching the VS Code comment codicon style.
- **files edited/created**: `images/annotation-gutter-light.svg`, `images/annotation-gutter-dark.svg`

### T5: Decoration Manager
- **depends_on**: [T2, T3, T4]
- **location**: `src/decoration-manager.ts`
- **description**: Create the `DecorationManager` class that renders gutter icons and background highlights for annotations.

  Class `DecorationManager`:
  - **Constructor**: `constructor(store: AnnotationStore, context: vscode.ExtensionContext)` — needs context for `extensionPath` to resolve SVG icon paths
  - Implements `Disposable`

  Implementation:
  - Create a `TextEditorDecorationType` using `window.createTextEditorDecorationType`:
    - `backgroundColor`: read from config `code-annotator.highlightColor`
    - `isWholeLine: true`
    - `gutterIconPath`: resolve to `path.join(context.extensionPath, 'images/annotation-gutter-dark.svg')` for dark theme, light for light theme. Use `light` and `dark` sub-properties of `DecorationRenderOptions`.
    - `gutterIconSize`: `contain`
    - `overviewRulerColor`: config `code-annotator.gutterIconColor`
    - `overviewRulerLane`: `OverviewRulerLane.Left`
  - Method `refreshDecorations(editor: TextEditor)`:
    - Get annotations for the editor's document URI from the store
    - Build `DecorationOptions[]` with:
      - `range`: `new Range(annotation.startLine, 0, annotation.endLine, Number.MAX_SAFE_INTEGER)`
      - `hoverMessage`: `new MarkdownString(annotation.comment)` — shows annotation text on hover
    - Call `editor.setDecorations(decorationType, decorationOptions)`
  - Method `refreshAllVisibleEditors()`: iterate `window.visibleTextEditors` and refresh each
  - **Debounce**: Wrap `refreshAllVisibleEditors` in a 100ms debounce to handle rapid `onDidChange` events from line tracking during typing
  - **Context key**: After refreshing, set `vscode.commands.executeCommand('setContext', 'code-annotator.hasAnnotationAtCursor', boolean)` based on whether the cursor position has annotations. Listen to `window.onDidChangeTextEditorSelection` for cursor moves.
  - Listen to:
    - `annotationStore.onDidChange` → debounced `refreshAllVisibleEditors()`
    - `window.onDidChangeActiveTextEditor` → `refreshDecorations(editor)`
    - `window.onDidChangeVisibleTextEditors` → `refreshAllVisibleEditors()`
    - `workspace.onDidChangeConfiguration` → if `code-annotator.*` changed, dispose old decoration type, create new one, then reapply to all visible editors (apply new BEFORE disposing old to avoid flicker)
    - `window.onDidChangeTextEditorSelection` → update `hasAnnotationAtCursor` context key
  - `dispose()`: dispose decoration type and all event listeners
- **validation**: Add an annotation via store, verify gutter icon and background highlight appear. Hover shows annotation text. Edit/Delete context menu items only show when cursor is on an annotated line.
- **status**: Completed
- **log**: Implemented DecorationManager class with: TextEditorDecorationType using config-driven backgroundColor and gutterIconColor, light/dark SVG gutter icons via Uri.file paths, isWholeLine highlights, overview ruler indicators. refreshDecorations builds DecorationOptions with Range and MarkdownString hover messages. refreshAllVisibleEditors iterates visible editors. 100ms debounce on store.onDidChange. Context key `code-annotator.hasAnnotationAtCursor` updated on cursor movement via onDidChangeTextEditorSelection. Configuration changes recreate decoration type (apply new before disposing old to avoid flicker). All event listeners and the decoration type are disposed in dispose(). Also installed @types/node as a dev dependency for the `path` module. Build and tsc --noEmit both pass clean.
- **files edited/created**: `src/decoration-manager.ts`, `package.json` (added @types/node devDep)

### T6: Annotate Command
- **depends_on**: [T5]
- **location**: `src/commands/annotate.ts`
- **description**: Implement the `code-annotator.annotate` command.

  Export: `export async function annotateCommand(store: AnnotationStore): Promise<void>`

  Flow:
  1. Get active text editor via `vscode.window.activeTextEditor`. If none, show warning and return.
  2. Get selection. If selection is empty (no selection), use the line at cursor position: `startLine = endLine = editor.selection.active.line`.
  3. Extract: `document.uri.toString()`, `startLine`, `endLine`, selected text via `document.getText(range)`, `document.languageId`.
  4. Show `vscode.window.showInputBox` with:
     - `prompt`: `Annotation for line${startLine === endLine ? '' : 's'} ${startLine+1}${startLine === endLine ? '' : '-' + (endLine+1)}`
     - `placeHolder`: `Enter your annotation...`
  5. If user provides input (not undefined/cancelled):
     - Generate ID via `crypto.randomUUID()`
     - Create an `Annotation` object
     - Add to `AnnotationStore` via `store.add(annotation)`
     - Decorations auto-refresh via the store's `onDidChange` event
- **validation**: Select code → right-click → "Add Annotation" → input box appears → type comment → annotation appears with highlight and gutter icon. Also test with no selection (single line).
- **status**: Not Completed
- **log**:
- **files edited/created**:

### T7: Edit & Delete Commands
- **depends_on**: [T6]
- **location**: `src/commands/edit-annotation.ts`, `src/commands/delete-annotation.ts`
- **description**: Implement edit and delete annotation commands.

  **Shared helper** — find annotations at cursor (can be a local function in each file or a shared utility):
  1. Get active editor. If none, return.
  2. Get cursor line: `editor.selection.active.line`
  3. Call `store.getAtLine(uri, line)`
  4. If no annotations at cursor: show info message "No annotation at cursor position" and return
  5. If one annotation: use it directly
  6. If multiple (overlapping): show `vscode.window.showQuickPick` with items like `"Lines ${start+1}-${end+1}: ${comment.substring(0, 50)}"` to let user choose. Return selected.

  **Edit** (`code-annotator.editAnnotation`):
  - Export: `export async function editAnnotationCommand(store: AnnotationStore): Promise<void>`
  - After selecting the annotation, show `vscode.window.showInputBox` with `value` pre-filled with current comment
  - On confirm (not undefined): call `store.updateComment(id, newComment)`

  **Delete** (`code-annotator.deleteAnnotation`):
  - Export: `export async function deleteAnnotationCommand(store: AnnotationStore): Promise<void>`
  - After selecting the annotation, call `store.delete(id)` immediately (no confirmation per spec)
- **validation**: Annotate a line → right-click → Edit → change text → hover shows new text. Delete → highlight and icon disappear.
- **status**: Not Completed
- **log**:
- **files edited/created**:

### T8: Markdown Formatter
- **depends_on**: [T2]
- **location**: `src/markdown-formatter.ts`
- **description**: Create a pure function that takes annotations and produces the markdown output string. This is a pure function with no VS Code API dependency beyond types.

  Export: `export function formatAnnotationsAsMarkdown(annotations: Annotation[], workspacePath: string): string`

  Logic:
  1. Group annotations by `uri`
  2. Sort groups by file path alphabetically
  3. Within each group, sort by `startLine`
  4. Build markdown string:
  5. For each file group, emit:
     ```
     ## `<workspace-relative-path>`
     ```
     Where relative path = `uri.replace('file://', '').replace(workspacePath, '')` (strip leading `/`). If not under workspace, use full path.
  6. For each annotation in the group:
     - If single line: `### Line <startLine+1>`
     - If multi-line: `### Lines <startLine+1>-<endLine+1>`
     - Then fenced code block with language: ` ```<languageId>\n<code>\n``` `
     - Then blockquote: `> <comment>`
     - Blank line between annotations
  7. **Code freshness**: The `code` field is a point-in-time snapshot from when the annotation was created. This is by design — the markdown output reflects what the user saw when they annotated. (If live code is needed in the future, the collect command would re-read from the document.)
  8. Return the full markdown string
- **validation**: Create mock annotations across 2 files, call formatter, verify output matches expected markdown with correct grouping, relative paths, language tags, and code snippets.
- **status**: Completed
- **log**: Implemented pure formatAnnotationsAsMarkdown function. Groups annotations by URI (sorted alphabetically by workspace-relative path), sorts within groups by startLine. Produces markdown with file headers (## `relative/path`), line headings (### Line N or ### Lines N-M, 1-based), fenced code blocks with languageId, and blockquoted comments. Handles edge cases: empty annotations, files outside workspace (uses full path), multi-line comments (each line prefixed with >). Verified via transpiled inline tests against mock annotations across multiple files. Build and tsc --noEmit pass clean.
- **files edited/created**: `src/markdown-formatter.ts`

### T9: Collect Annotations Command
- **depends_on**: [T8]
- **location**: `src/commands/collect-annotations.ts`
- **description**: Implement the `code-annotator.collectAnnotations` command.

  Export: `export async function collectAnnotationsCommand(store: AnnotationStore, historyManager: IHistoryManager): Promise<void>`

  Note: Takes `IHistoryManager` (the interface from `types.ts`), NOT the concrete `HistoryManager` class. This breaks the circular dependency with T10.

  Flow:
  1. If `store.isEmpty()`, show info message "No annotations to collect" and return
  2. Get workspace folder path: `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ''`
  3. Get annotation count: `store.count()`
  4. Call `formatAnnotationsAsMarkdown(store.getAll(), workspacePath)`
  5. Copy markdown to clipboard via `vscode.env.clipboard.writeText(markdown)`
  6. Save snapshot: `historyManager.saveSnapshot(markdown, count)`
  7. Clear all annotations: `store.clear()` (per spec: collect = finalize session, clears annotations)
  8. Show info message: `Copied ${count} annotation(s) to clipboard`
- **validation**: Add annotations across files → run "Collect Annotations" → verify clipboard contains correct markdown → verify annotations are cleared from editor → verify snapshot saved to history.
- **status**: Not Completed
- **log**:
- **files edited/created**:

### T10: Collection History Manager
- **depends_on**: [T2]
- **location**: `src/history-manager.ts`
- **description**: Implement `IHistoryManager` interface (defined in `src/types.ts`) using `ExtensionContext.workspaceState` for persistence.

  Class `HistoryManager implements IHistoryManager`:
  - Constructor takes `vscode.ExtensionContext`
  - Storage key: `code-annotator.collectionHistory`
  - Methods:
    - `saveSnapshot(markdown: string, count: number): void` — creates a `CollectionSnapshot` with `id: crypto.randomUUID()`, `timestamp: Date.now()`, saves to workspaceState array. **Cap at 50 snapshots** — if array exceeds 50, drop the oldest entries.
    - `getSnapshots(): CollectionSnapshot[]` — returns all snapshots sorted by timestamp descending (newest first)
    - `clearHistory(): void` — sets the workspaceState key to empty array
  - workspaceState stores a JSON-serializable array of `CollectionSnapshot` objects via `workspaceState.update(key, value)`
- **validation**: Save a snapshot → call getSnapshots → verify it's returned. Save 51 snapshots → verify only 50 remain (oldest dropped). clearHistory → getSnapshots returns [].
- **status**: Completed
- **log**: Implemented HistoryManager class conforming to IHistoryManager interface. Uses ExtensionContext.workspaceState with key `code-annotator.collectionHistory` for persistence. saveSnapshot creates CollectionSnapshot with crypto.randomUUID() and Date.now(), appends to stored array, and caps at 50 snapshots (drops oldest when exceeded). getSnapshots returns all snapshots sorted by timestamp descending (newest first). clearHistory resets storage to empty array. Build and type-check pass.
- **files edited/created**: `src/history-manager.ts`

### T11: View History Command
- **depends_on**: [T10]
- **location**: `src/commands/view-history.ts`
- **description**: Implement the `code-annotator.viewHistory` command.

  Export: `export async function viewHistoryCommand(historyManager: IHistoryManager): Promise<void>`

  Flow:
  1. Get snapshots from `historyManager.getSnapshots()`
  2. If empty, show info message "No collection history" and return
  3. Create quick pick items:
     - Each snapshot: `label` = formatted date/time (e.g., `new Date(timestamp).toLocaleString()`), `description` = `${count} annotations`, store snapshot id in item
     - Add a separator (`{ kind: QuickPickItemKind.Separator, label: '' }`)
     - Add "Clear History" item at the bottom (label: `$(trash) Clear History`)
  4. Show `vscode.window.showQuickPick(items, { placeHolder: 'Select a collection to copy to clipboard' })`
  5. If user selects a snapshot: copy its `markdown` to clipboard, show info "Collection copied to clipboard"
  6. If user selects "Clear History": call `historyManager.clearHistory()`, show info "Collection history cleared"
- **validation**: Collect annotations multiple times → run "View History" → see list with timestamps → select one → clipboard contains that collection's markdown. Select "Clear History" → history is empty.
- **status**: Not Completed
- **log**:
- **files edited/created**:

### T12: Status Bar Item
- **depends_on**: [T2]
- **location**: `src/status-bar.ts`
- **description**: Create and manage the status bar item showing annotation count.

  Class `StatusBarController`:
  - Constructor takes `AnnotationStore`
  - Implements `Disposable`

  Implementation:
  - Create `vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)`
  - `command`: `code-annotator.collectAnnotations` (click to collect)
  - Update method:
    - `text`: `$(comment) ${count}` (uses codicon for the comment icon)
    - `tooltip`: `${count} annotation(s) — click to collect`
    - Show item when `count > 0`, hide when `count === 0`
  - Listen to `store.onDidChange` to call update
  - Call update once on construction
  - `dispose()`: dispose the status bar item and event listener
- **validation**: Add annotations → status bar shows "$(comment) 1" → add more → count updates → collect → status bar hides (count 0).
- **status**: Completed
- **log**: Implemented StatusBarController with vscode.StatusBarItem (Right-aligned, priority 100). Shows annotation count using `$(comment)` codicon, wired to `code-annotator.collectAnnotations` command on click. Listens to store.onDidChange for live updates. Shows item when count > 0, hides when 0. Disposes both the status bar item and event listener.
- **files edited/created**: `src/status-bar.ts`

### T13: Extension Activation — Wire Everything Together
- **depends_on**: [T1, T5, T6, T7, T8, T9, T10, T11, T12]
- **location**: `src/extension.ts`, `src/commands/clear-all.ts`
- **description**: Wire all components together in the `activate()` function.

  Create `src/commands/clear-all.ts`:
  ```typescript
  export function clearAllCommand(store: AnnotationStore): void {
    store.clear();
  }
  ```

  Update `src/extension.ts`:
  ```typescript
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
  ```

  Ensure all disposables are pushed to `context.subscriptions`.
- **validation**: `npm run build` succeeds. Launch Extension Development Host (F5). Full E2E flow works: annotate → see decorations → edit → delete → collect → check clipboard → view history → clear all.
- **status**: Not Completed
- **log**:
- **files edited/created**:

### T14: Marketplace Packaging & README
- **depends_on**: [T13]
- **location**: `README.md`, `CHANGELOG.md`, `package.json` (add metadata), `images/icon.png`
- **description**: Prepare the extension for VS Code Marketplace publishing.

  - `package.json` additions:
    - `publisher`: (user to fill in)
    - `repository`: (user to fill in)
    - `icon`: `images/icon.png`
    - `categories`: `["Other"]`
    - `keywords`: `["annotate", "code review", "highlight", "notes", "comments"]`
    - `license`: `MIT`
  - Create `README.md` with:
    - Feature overview with GIF/screenshots placeholder
    - Command list with descriptions
    - Settings documentation (`highlightColor`, `gutterIconColor`)
    - Keybinding info (Cmd+Shift+A / Ctrl+Shift+A)
    - Collection history feature
  - Create `CHANGELOG.md` with initial `0.1.0` entry
  - Create a simple `images/icon.png` (128x128 app icon — speech bubble design)
  - Add npm scripts: `"package": "vsce package"`, `"publish": "vsce publish"`
  - Verify `vsce package` produces a valid `.vsix`
- **validation**: `vsce package` succeeds and produces `code-annotator-0.1.0.vsix`. Install locally with `code --install-extension code-annotator-0.1.0.vsix` and verify it works.
- **status**: Not Completed
- **log**:
- **files edited/created**:

## Parallel Execution Groups

| Wave | Tasks | Can Start When |
|------|-------|----------------|
| 1 | T1, T2, T4 | Immediately |
| 2 | T3, T5, T8, T10, T12 | T2 complete (T5 also needs T4) |
| 3 | T6 | T5 complete |
| 4 | T7, T9 | T6 complete; T9 also needs T8 |
| 5 | T11 | T10 complete |
| 6 | T13 | All of T1-T12 complete |
| 7 | T14 | T13 complete |

**Note**: T2 is the critical path bottleneck — most tasks depend on it. T1 is needed for `npm install` (compilation) but agents can write code before T1 completes.

## Testing Strategy

- **Manual E2E testing** in Extension Development Host (F5):
  1. Open a multi-file workspace
  2. Select code → Cmd+Shift+A → enter annotation → verify highlight + gutter icon
  3. Repeat across multiple files and with overlapping ranges
  4. Hover over annotations to verify tooltip
  5. Right-click on annotated line → verify Edit/Delete appear in context menu
  6. Right-click on non-annotated line → verify Edit/Delete do NOT appear
  7. Edit an annotation via context menu → verify hover shows updated text
  8. Delete an annotation via context menu → verify highlight/icon disappear
  9. Edit code above annotations → verify line drift tracking
  10. Close and reopen an annotated file → verify annotations persist in session
  11. Click status bar → verify collect copies markdown to clipboard
  12. Verify annotations are cleared after collect
  13. Run "View History" → verify snapshot is listed → select and copy
  14. Run "Clear All Annotations" → verify immediate clear
  15. Change `code-annotator.highlightColor` in settings → verify color updates live

- **Edge cases to test**:
  - Annotate with no selection (single line)
  - Annotate same lines twice (overlapping) → right-click shows quick pick
  - Annotate a file, close the tab, reopen → decorations reappear
  - Annotate a file, delete the file, then collect → included in output with file path
  - Collect with zero annotations → "No annotations to collect" info message
  - View history with no history → "No collection history" info message
  - Rapid typing in annotated region → verify debounce prevents flicker
  - Multi-cursor edits above annotations → verify line drift handles contentChanges array
  - Save 51 snapshots → verify oldest is pruned

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Line drift with complex edits (multi-cursor, find-replace) | Process `contentChanges` in reverse order (highest line first). Wrap listener in try/catch to prevent uncaught errors from crashing the extension. |
| Decoration performance with many annotations | `setDecorations` is called per-editor, not per-annotation. VS Code handles hundreds of decorations efficiently. |
| `workspaceState` size limits for history | Cap at 50 snapshots, oldest auto-pruned (implemented in T10). |
| Gutter icon not rendering on all themes | Use light/dark SVG variants via `DecorationRenderOptions.light` and `.dark` sub-properties. |
| `onDidChangeTextDocument` fires frequently during typing | Debounce decoration refresh (100ms) in T5. Store mutations (`updateLines`) are cheap. |
| Context menu showing edit/delete when no annotation at cursor | Use `setContext` API to set `code-annotator.hasAnnotationAtCursor` on cursor move. Context menu `when` clause gates on this. |
| Configuration change causes decoration flicker | Apply new decoration type BEFORE disposing old one to prevent visible flash. |
| Code snippet in markdown becomes stale after edits | By design: code is a point-in-time snapshot. Documented in T8. Future enhancement could re-read from document at collect time. |
| Circular dependency between T9 (collect) and T10 (history) | Resolved via `IHistoryManager` interface in `types.ts`. T9 depends on the interface, T10 implements it. |

## Review Changes Log

Fixes applied from subagent review:
1. **Fixed T5 deps**: Added T4 (SVG icons needed for gutterIconPath)
2. **Fixed T7 deps**: Removed T4, now `[T6]` only
3. **Fixed T8 deps**: Changed from `[T6]` to `[T2]` — it's a pure function on types
4. **Fixed T12 deps**: Changed from `[T11]` to `[T2]` — only needs the store
5. **Resolved T9/T10 circular**: Added `IHistoryManager` interface to `types.ts`
6. **Added UUID strategy**: `crypto.randomUUID()` — no external package
7. **Fixed store mutation in T3**: Added `updateLines()` method to store that fires `onDidChange`
8. **Added history cap**: T10 now caps at 50 snapshots
9. **Added module export contracts**: Exact signatures for all modules at top of plan
10. **Fixed class naming**: Aligned on `StatusBarController` everywhere
11. **Fixed T5 constructor**: Explicitly takes `(store, context)` — documented
12. **Added `src/commands/` directory**: Created in T1
13. **Added debounce**: Explicitly in T5 description, not just risk table
14. **Documented stale code decision**: Point-in-time snapshot, documented in T8
15. **Added `setContext` for context menu**: T5 manages `hasAnnotationAtCursor` context key
16. **Added try/catch**: T3 listener wrapped in error handler
17. **Added `clear-all.ts`**: Dedicated file in T13 instead of inline
18. **Added reverse processing**: T3 processes contentChanges in reverse order
