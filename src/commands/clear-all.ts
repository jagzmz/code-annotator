import { AnnotationStore } from '../annotation-store';

export function clearAllCommand(store: AnnotationStore): void {
  store.clear();
}
