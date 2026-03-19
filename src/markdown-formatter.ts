import { Annotation } from './types';

/**
 * Formats annotations as a structured markdown document.
 *
 * Groups annotations by file URI (sorted alphabetically by relative path),
 * then sorts within each group by startLine. Produces fenced code blocks
 * with language tags and blockquoted comments.
 *
 * The `code` field on each annotation is a point-in-time snapshot captured
 * when the annotation was created -- this is by design.
 */
export function formatAnnotationsAsMarkdown(
  annotations: Annotation[],
  workspacePath: string,
): string {
  if (annotations.length === 0) {
    return '';
  }

  // Group annotations by URI
  const groups = new Map<string, Annotation[]>();
  for (const annotation of annotations) {
    const existing = groups.get(annotation.uri);
    if (existing) {
      existing.push(annotation);
    } else {
      groups.set(annotation.uri, [annotation]);
    }
  }

  // Convert URI to file path, stripping the file:// scheme
  const uriToFilePath = (uri: string): string => {
    if (uri.startsWith('file://')) {
      return uri.slice(7);
    }
    return uri;
  };

  // Compute workspace-relative path
  const normalizedWorkspace = workspacePath.endsWith('/')
    ? workspacePath
    : workspacePath + '/';

  const toRelativePath = (uri: string): string => {
    const filePath = uriToFilePath(uri);
    if (workspacePath && filePath.startsWith(normalizedWorkspace)) {
      return filePath.slice(normalizedWorkspace.length);
    }
    // Not under workspace -- return full path
    return filePath;
  };

  // Sort groups alphabetically by relative path
  const sortedEntries = [...groups.entries()].sort((a, b) => {
    const pathA = toRelativePath(a[0]);
    const pathB = toRelativePath(b[0]);
    return pathA.localeCompare(pathB);
  });

  // Sort annotations within each group by startLine
  for (const [, anns] of sortedEntries) {
    anns.sort((a, b) => a.startLine - b.startLine);
  }

  const parts: string[] = [];

  for (const [uri, anns] of sortedEntries) {
    const relativePath = toRelativePath(uri);

    // File header
    parts.push(`## \`${relativePath}\``);
    parts.push('');

    for (let i = 0; i < anns.length; i++) {
      const ann = anns[i];

      // Line heading (display as 1-based)
      if (ann.startLine === ann.endLine) {
        parts.push(`### Line ${ann.startLine + 1}`);
      } else {
        parts.push(`### Lines ${ann.startLine + 1}-${ann.endLine + 1}`);
      }

      // Fenced code block with language
      parts.push('```' + ann.languageId);
      parts.push(ann.code);
      parts.push('```');

      // Blockquoted comment
      // Handle multi-line comments by prefixing each line with >
      const commentLines = ann.comment.split('\n');
      parts.push(commentLines.map(line => `> ${line}`).join('\n'));

      // Blank line between annotations (but not after the last one in a group)
      if (i < anns.length - 1) {
        parts.push('');
      }
    }

    // Blank line between file groups
    parts.push('');
  }

  return parts.join('\n');
}
