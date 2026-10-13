# Document Compare

Offline Windows desktop app for comparing legislative PDFs and reviewing instructional amendments. This source is the **1.21.6 release source**, expanding selected LCB contraction, spelling, ratio and possessive forms and strengthening complete source evidence for punctuation, prefixes, initials and meaning cues. Technical identifiers retain their source spelling. This source accompanies the 1.21.6 GitHub release. Native desktop workflow checks of 1.21.6 were skipped at the user’s request. Published **1.21.5** adds separate Digest and Instructional Amendments uploads, digest replacement verification, independent digest indentation and final-line insertions. It passed all 21 native desktop stages after the verifier readiness correction and remains the last release with completed native verification. The preceding 1.21.4 release passed all 20 desktop stages.

## Download

Download **Document-Compare-Windows-1.21.6.zip** from the [1.21.6 release](https://github.com/Alexander-D-Loyd/Document-Compare/releases/tag/v1.21.6) and extract the entire archive and open **Document Compare/Document Compare.exe**. Keep the runtime and resources together. No installation or development tools are required. PDF and language review run locally.

## Features

- Previous Version, Digest/Instructional Amendments (two independent slots) and Current Version PDF drop boxes; up to 50 MB and 1,500 pages per PDF.
- Word/punctuation comparison independent of margin numbering, wrapping and page breaks; digest differences excluded from ordinary change highlighting. The uploaded replacement digest appears first under the label Digest; instructional amendment numbers remain exactly as printed in the instructions.
- Digest-only verification, source strikeouts, failed-load recovery, independent replacement/removal and retained digest uploads on Refresh. The digest heading/enactment boundary confines verification to front matter.
- Explicit after-line/end-of-bill insertion and final between-lines insertion when the following number is unprinted. Missing intermediate lines remain unresolved, and the inserted text must precede the bill’s end marker.
- Amendment verification and complete-range navigation, including referenced bill bodies, source strikeouts, insertion arrows and separate discrepancy navigation.
- Separate Changes, Amendments, Spelling & Grammar, and Stylistic Check modes with forward/backward arrows.
- Current-only language checking, case-sensitive dictionary and custom style terms, Ignore/Ignore All and Undo.
- Searchable LCB/GPO sources and honest check-coverage inventory. Conflicting LCB/GPO recommendations are excluded from style findings.
- Local authorized-data spelling importer; see OFFLINE_AUTHORITY.md. Complete Merriam-Webster data is not bundled.
- On-demand local OCR for printed bill scans, with uncertainty and embedded-text disagreement warnings.
- Offline California Entities snapshot and selected LanguageTool/spaCy contextual methods. Engines start on demand and do not send text online.

Blue indicates additions, red deletions, yellow non-amendment changes, and purple potential style issues. Red and blue underlines identify spelling and grammar.

## Validation and limitations

All 2,017 source tests pass. Cached comparisons and fresh text-layer imports of 28 original Current PDFs (2,230 pages) preserve all findings against sealed 1.21.5, with no fresh intake problems. The local follow-on adds 97 source regressions since 1.21.5, covering selected expansions, false suggestions and exact source ranges. Two controlled five-page PDFs exercise 20 annotated findings, a corrected counterpart with no findings, tables, literals, identifiers and cross-page selections. The prior offline engine benchmark detects all 132 annotated problems across 235 controlled cases; seven additional reader questions remain. Controlled source OCR preserves complete raster/hybrid bill text and eight line numbers. Rotated scanned bills need an upright copy. All 21 native 1.21.5 stages passed, including Digest/end-of-bill checks, OCR and dictionary restart. The 1.21.6 native desktop workflow is unverified; packaging integrity is checked separately. See TESTING_REPORT.md and DEVELOPMENT_REVIEW.md for the final source-suite and original-PDF comparison results.

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

The public source ZIP contains the same source as the release tag, including development setup scripts. Generated OCR/assets and reference files are restored as above. The Windows ZIP contains the complete runtime. Native desktop workflow checks of 1.21.6 were skipped at the user’s request. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.
