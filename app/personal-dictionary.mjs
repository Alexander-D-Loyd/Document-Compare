export const DICTIONARY_KEY = 'document-compare.personal-dictionary.v1';
export function normalizeWord(word) {
  return word.normalize('NFKC').trim().replace(/’/g,"'");
}
function validWord(word) { return typeof word === 'string' && word.length <= 150 && /^\p{L}+(?:'\p{L}+)*$/u.test(word); }
export function loadDictionary(storage) {
  const raw = storage.getItem(DICTIONARY_KEY);
  if (!raw) return new Set();
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.words) || data.words.length > 100000 || !data.words.every(validWord)) throw Error('Personal dictionary data could not be read.');
  return new Set(data.words.map(normalizeWord));
}
export function saveWord(storage, word) {
  const normalized = normalizeWord(word);
  if (!validWord(normalized)) throw Error('This spelling issue cannot be added as a dictionary word.');
  // Merge with the latest stored words so other app windows are preserved.
  const words = loadDictionary(storage);
  words.add(normalized);
  storage.setItem(DICTIONARY_KEY, JSON.stringify({version:1, words:[...words].sort()}));
  return words;
}
export function removeWord(storage,word){
  const words=loadDictionary(storage);
  words.delete(normalizeWord(word));
  storage.setItem(DICTIONARY_KEY,JSON.stringify({version:1,words:[...words].sort()}));
  return words;
}
export function isAccepted(word, words) {
  const normalized = normalizeWord(word);
  return words.has(normalized) || (normalized.endsWith("'s") && words.has(normalized.slice(0,-2)));
}
