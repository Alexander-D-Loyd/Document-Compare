# Document Compare

Offline Windows desktop application for comparing legislative PDFs and reviewing instructional amendments. Version **1.21.5** adds separate Digest uploads and final-line insertion fixes. All **1,920 source tests** pass; native desktop verification of this build is pending. The preceding 1.21.4 release passed all 20 native stages. The fixed offline-engine benchmark detected all 132 annotated problems across 235 controlled cases. These tests do not measure office-wide precision or recall.

## Download

Download **Document-Compare-Windows-1.21.5.zip** from the [1.21.5 release](https://github.com/Alexander-D-Loyd/Document-Compare/releases/tag/v1.21.5), extract the entire ZIP and run **Document Compare/Document Compare.exe**. Keep all runtime/resources files together. No account, development tools, API key or internet connection is required for document review. SHA-256 checksums are provided with the release.

## Current features

- Previous/Current PDF comparison and separate Digest/Instructional Amendments uploads. Digest appears first under the label Digest; all instructional amendment numbers remain exactly as printed. Digest-only replacement verification uses the existing full-span highlights, discrepancy navigation, original PDF viewer, Refresh and removal controls.
- Digest paragraphs use their own left baseline, preserving paragraph indents without borrowing a far-left enacted-body column.
- Explicit after-line and end-of-bill insertions resolve before the zero marker. Final between-lines instructions support an unprinted or empty following line; missing intermediate lines remain unresolved. Both-pane navigation and insertion markers retain the source location.
- On-demand local OCR for printed bills and amendments, including hybrid image/text pages, separate line-number reading and explicit uncertainty warnings. Rotated scanned bills require an upright readable copy.
- Current-only spelling, grammar and LCB/GPO style review, using bundled LanguageTool/spaCy methods, the California Entities snapshot, personal dictionary, custom terms and Ignore/Undo.
- Authorized local spelling-authority JSON importer with ordered preferences, source/edition/hash provenance and persistent storage. Complete Merriam-Webster data is not bundled. See OFFLINE_AUTHORITY.md.
- Searchable manual sources and coverage inventory; known guide disagreements remain excluded. Full contextual LCB/GPO automation remains partial.

AB 1502 cutoff/spacing and italic clause-marker regressions pass. Complete budget numbers retain their highlights. AB 109/SB 879 source discrepancies and missing additional drafting material remain flagged for reader review.

## Development setup

Install Node.js 22 or later and Git, clone this repository, then run `npm install`. Dependencies are pinned: Electron 44.5.1, PDF.js 6.4.299 and Tesseract.js/core 7.0.0. Postinstall restores PDF.js fonts/maps/WASM, application icons and pinned OCR assets with SHA-256 verification. Dependency setup requires network access; document review stays offline.

The supplied manuals and complete extracted reference text remain excluded from this public source repository and its source ZIP. Copy these four files from the Windows release's `Document Compare/resources/app/app/data` into `app/data`:

```text
gpo-stylemanual-2016.pdf
lcb-stylemanual-2019.pdf
gpo-reference.json
lcb-reference.json
```

For full offline language-engine functionality, copy the Windows release's `Document Compare/resources/offline-engines` directory to `engines/runtime`, preserving all files and licenses. See engines/README.md for layout and staging details. No engine binary, uploaded bill, personal dictionary, imported authority dataset or user profile is tracked in this repository.

Run `npm start` to launch the source app. Run `npm test` after restoring the two reference JSON files to execute the complete source suite. The launcher exits with an explicit setup message if those references are missing; it does not label a skipped suite as passed.

The public source ZIP contains the same source as the release tag, including development setup scripts. Generated OCR/assets and reference files are restored as above. The Windows ZIP contains the complete tested runtime. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.
