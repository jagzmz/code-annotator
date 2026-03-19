# Code Annotator

Highlight code, add annotations, and collect them as structured markdown.

## Features

- **Annotate code** -- Select any code and attach a free-text annotation via a quick input box.
- **Gutter icons and highlights** -- Annotated lines show a gutter icon and a configurable background highlight color.
- **Edit and delete annotations** -- Right-click on an annotated line to edit or delete the annotation. Overlapping annotations prompt a quick pick to choose.
- **Collect as markdown** -- Gather all annotations into a structured markdown document, grouped by file, and copy it to the clipboard. Annotations are cleared after collection.
- **Collection history** -- Every collection is saved as a snapshot. Browse and re-copy past collections from the history.
- **Configurable colors** -- Customize the highlight background color and gutter icon color through VS Code settings.
- **Status bar** -- See the current annotation count in the status bar. Click it to collect.

## Commands

| Command | Title | Description |
|---------|-------|-------------|
| `code-annotator.annotate` | Code Annotator: Add Annotation | Annotate the selected code (or current line if no selection). |
| `code-annotator.editAnnotation` | Code Annotator: Edit Annotation | Edit the annotation at the cursor position. |
| `code-annotator.deleteAnnotation` | Code Annotator: Delete Annotation | Delete the annotation at the cursor position. |
| `code-annotator.collectAnnotations` | Code Annotator: Collect Annotations | Format all annotations as markdown, copy to clipboard, and clear them. |
| `code-annotator.clearAllAnnotations` | Code Annotator: Clear All Annotations | Remove all annotations without collecting. |
| `code-annotator.viewHistory` | Code Annotator: View Collection History | Browse past collections and re-copy them to the clipboard. |
| `code-annotator.clearHistory` | Code Annotator: Clear Collection History | Delete all saved collection snapshots. |

## Keybinding

| Shortcut | Command |
|----------|---------|
| `Cmd+Shift+A` (macOS) / `Ctrl+Shift+A` (Windows/Linux) | Add Annotation |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `code-annotator.highlightColor` | `string` | `rgba(255, 213, 79, 0.15)` | Background highlight color for annotated lines. |
| `code-annotator.gutterIconColor` | `string` | `#FDD835` | Color for the gutter icon and overview ruler indicator. |

## Usage

1. Select some code in the editor (or place your cursor on a line).
2. Press `Cmd+Shift+A` (macOS) or `Ctrl+Shift+A` (Windows/Linux), or right-click and choose **Add Annotation**.
3. Type your annotation in the input box and press Enter.
4. Repeat for as many lines or files as you like.
5. When ready, run **Collect Annotations** from the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`). All annotations are formatted as markdown, copied to your clipboard, and cleared from the editor.
6. To review past collections, run **View Collection History**.

## Requirements

- VS Code 1.85 or later.

## License

MIT
