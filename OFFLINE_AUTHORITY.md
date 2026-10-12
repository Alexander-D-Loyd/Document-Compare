The Personal Dictionary window contains an Offline Spelling Authority section. Import a UTF-8 JSON file up to 50 MB that your office is permitted to use offline. The app records its source, edition, ordered spellings and SHA-256 hash. It stores one active dataset in the local application profile; import replaces that dataset only after storage succeeds. Removal restores the bundled lists. Run spelling and stylistic checks again after import/removal.

Schema example using office-owned demonstration data:

```json
{
  "version": 1,
  "authority": "Office preference list",
  "edition": "Office demonstration 1",
  "source": "Office-owned example",
  "permissions": "Office authorizes local use of this example",
  "entries": [
    {"entry": "color noun", "spellings": ["color", "colour"]}
  ]
}
```

For an authorized Merriam-Webster export, use `"authority": "Merriam-Webster"` and identify its actual edition and permitted source. Metadata is a record supplied by the importer, not a license verification. Do not convert public API responses into a redistributed offline dictionary without permission. No complete Merriam-Webster export is included.

Each entry needs a source identifier and 1–20 ordered whole-word spellings. The first is the preferred form for that entry; all forms are accepted by spelling review. Inflections must be listed explicitly. Limits: 500,000 entries, one million forms, 150 characters per spelling. Definitions, pronunciation files and arbitrary executable data are not imported. Curly apostrophes are normalized for matching. The UI displays at most 100 search results.

Style review marks lowercase later-listed forms for reader judgment, with source entries and conditional preferred forms. Meaning, proper names and dictionary sense selection remain human decisions. Existing precise checks take precedence, and known guide disagreements, quoted literals, removed text, headings and tables retain their protections. Recognized line-end divisions retain physical source spans; importing data never changes PDF text or comparison tokens. No imported dataset is treated as proof of complete coverage.
