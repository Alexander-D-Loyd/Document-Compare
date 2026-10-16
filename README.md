# Document Compare

Offline Windows desktop app for legislative PDF comparison and amendment/style review. This is the **1.21.15 local review package source**. It adds exact printed LCB spelling/phrase acceptance and stabilizes source-sensitive context checks. Digest edits use red deletions and blue additions. Style findings retain applicable LCB priority, legislative exceptions and bill-local quoted terms.

## Run the packaged app

Extract the entire **Document-Compare-Windows-1.21.15.zip** and open **Document Compare/Document Compare.exe**. Keep the runtime and resources together. No installation or development tools are required. PDF and language review run locally.

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
- Profile-persisted authorized entity-list import, source metadata, bounded search and restoration of the bundled snapshot; see ENTITY_AUTHORITY.md. Missing names do not become errors.
- Explicit Bill/Digest, Opinion and Cover letter style selection for the Current document; a replacement Current file resets to Bill/Digest.
- Selected LanguageTool/spaCy contextual methods. Engines start on demand and do not send text online.

Blue indicates additions, red deletions, yellow non-amendment changes, and purple potential style issues. Red and blue underlines identify spelling and grammar.

## Validation and limitations

The separate 1.21.11 stabilization snapshot passed all 21 desktop stages across a full run and targeted Undo rerun against the unchanged package. The current LCB expansion source is verified separately and is not included in that desktop result. Source guards, offline-engine checks, real PDF replays and package integrity remain separate evidence. See TESTING_REPORT.md and LCB_IMPLEMENTATION.md for current scope; these checks do not measure office precision or recall.

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

This local public-source ZIP is a prepared source snapshot, including development setup scripts. No GitHub tag or publication is created by this preparation. Generated OCR/assets and reference files are restored as above. The Windows ZIP contains the complete runtime. Native desktop workflow verification of 1.21.15 remains unrun. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.
