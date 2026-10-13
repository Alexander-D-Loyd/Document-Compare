# Document Compare

Offline Windows desktop app for legislative PDF comparison and amendment/style review. This is the **1.21.10 release source**. Digest selection uses regular amendment outlines; the shared trash clears both optional uploads. Style findings are limited to explicit supported LCB/GPO provisions, with LCB priority and legislative exceptions. Native desktop verification of this release remains unrun.

## Run the packaged app

Extract the entire **Document-Compare-Windows-1.21.10.zip** and open **Document Compare/Document Compare.exe**. Keep the runtime and resources together. No installation or development tools are required. PDF and language review run locally.

## Features

- Previous Version, Digest/Instructional Amendments (two independent slots) and Current Version PDF drop boxes; up to 50 MB and 1,500 pages per PDF.
- Word/punctuation comparison independent of margin numbering, wrapping and page breaks; digest differences excluded from ordinary change highlighting. The uploaded replacement digest appears first under the label Digest; instructional amendment numbers remain exactly as printed in the instructions.
- Digest-only verification, source strikeouts, failed-load recovery, independent replacement and shared removal of both optional uploads and retained digest uploads on Refresh. The digest heading/enactment boundary confines verification to front matter.
- Explicit after-line/end-of-bill insertion and final between-lines insertion when the following number is unprinted. Missing intermediate lines remain unresolved, and the inserted text must precede the bill’s end marker.
- Amendment verification and complete-range navigation, including referenced bill bodies, source strikeouts, insertion arrows and separate discrepancy navigation.
- Separate Changes, Amendments, Spelling & Grammar, and Stylistic Check modes with forward/backward arrows.
- Current-only language checking, case-sensitive dictionary and custom style terms, Ignore/Ignore All and Undo.
- Searchable LCB/GPO sources and honest check-coverage inventory. Applicable printed LCB provisions take priority where the guides disagree; unknown conditions remain manual.
- Local authorized-data spelling importer; see OFFLINE_AUTHORITY.md. Complete Merriam-Webster data is not bundled.
- On-demand local OCR for printed bill scans, with uncertainty and embedded-text disagreement warnings.
- Offline California Entities snapshot and selected LanguageTool/spaCy contextual methods. Engines start on demand and do not send text online.

Blue indicates additions, red deletions, yellow non-amendment changes, and purple potential style issues. Red and blue underlines identify spelling and grammar.

## Validation and limitations

All 1,963 source tests pass. Fresh replay of 11 actual PDFs (2,105 pages) preserves nine amendment results and exact AB 224 Digest change ranges. Source guards, staged offline-engine checks and package integrity are verified separately. These are regression checks, not an office accuracy measurement. Native desktop workflow and appearance verification of 1.21.10 remains unrun. See TESTING_REPORT.md and DEVELOPMENT_REVIEW.md for current scope and historical checks.

Full contextual LCB/GPO automation and the complete ordered Merriam-Webster authority remain incomplete. Genuine SB 879 differences and missing drafting attachments remain flagged. Office-wide precision/recall has not been measured; controlled tests are not an exhaustive human benchmark.

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

The public source ZIP contains the same source as the release tag, including development setup scripts. Generated OCR/assets and reference files are restored as above. The Windows ZIP contains the complete runtime. Native desktop workflow verification of 1.21.10 remains unrun. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.
