import { compareTokenValues } from './text-diff.mjs';
self.onmessage = ({ data }) => {
  self.postMessage({ changes: compareTokenValues(data.left, data.right) });
};
