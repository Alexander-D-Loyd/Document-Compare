import { sequenceDiff } from './sequence-diff.mjs';
import { comparisonTokens } from './core.mjs';
import {splitHistoryChanges} from './history-rows.mjs';
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
  return splitHistoryChanges(changes)?.map(change => ({ count: change.count, added: !!change.added, removed: !!change.removed, history:!!change.history, words: change.value.reduce((n,t)=>n+comparisonTokens(t).filter(w=>/[\p{L}\p{N}]/u.test(w.value)).length,0) })) || null;
}
