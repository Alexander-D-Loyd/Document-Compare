import { sequenceDiff } from './sequence-diff.mjs';
import { comparisonTokens } from './core.mjs';
export function compareText(left, right) {
  return compareTokenValues(comparisonTokens(left).map(t => t.value), comparisonTokens(right).map(t => t.value));
}
export function compareTokenValues(left, right) {
  const changes = sequenceDiff(left, right);
  // Slide an isolated edit over identical preceding tokens. Repeated phrases
  // such as amendment-date headings then receive a single coherent highlight.
  for (let i=1; changes && i<changes.length-1; i++) {
    const previous=changes[i-1], edit=changes[i], next=changes[i+1];
    if (!(edit.added || edit.removed) || previous.added || previous.removed || next.added || next.removed) continue;
    while (previous.value.length && /[\p{L}\p{N}]/u.test(edit.value.at(-1)) && edit.value.at(-1) === previous.value.at(-1)) {
      const token=previous.value.pop(); previous.count--;
      edit.value.unshift(edit.value.pop());
      next.value.unshift(token); next.count++;
    }
  }
  return changes?.map(change => ({ count: change.count, added: !!change.added, removed: !!change.removed, words: change.value.filter(t => /[\p{L}\p{N}]/u.test(t)).length })) || null;
}
