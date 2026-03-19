// UUID strategy: Uses crypto.randomUUID() which is available in Node 19+
// and all VS Code 1.85+ runtimes. No external package needed.

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
