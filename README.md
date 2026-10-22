# Document Compare

Offline Windows desktop app for legislative PDF comparison and amendment/style review. Version **1.21.23** applies supported bill-section rules automatically and reduces unsupported review questions while preserving explicit source comparisons. It includes the AB 1967 amendment-placement, in-kind and Digest-layout fixes. Coverage remains partial; a quiet check does not certify compliance.

Current development status: [PROJECT_STATUS.md](PROJECT_STATUS.md). [Version **1.21.23**](https://github.com/Alexander-D-Loyd/Document-Compare/releases/tag/v1.21.23) is the latest published Windows release on main, including the verified GPO clock, unit, time-zone and era follow-up. All 3,043 source tests, 16 packaging/publishing regressions and actual staged Windows GPO/AB 1967/AB 2266 checks pass. GitHub reconstructed the exact tested ZIP and verified both asset digests.

## Run the packaged app

Extract the entire **Document-Compare-Windows-1.21.23.zip** and open **Document Compare/Document Compare.exe**. Keep the runtime and resources together. No installation or development tools are required. PDF and language review run locally.

## Features

- Previous Version, Digest/Instructional Amendments (two independent slots) and Current Version PDF drop boxes; up to 50 MB and 1,500 pages per PDF.
- Word/punctuation comparison independent of margin numbering, wrapping and page breaks; digest differences excluded from ordinary change highlighting. The uploaded replacement digest appears first under the label Digest; instructional amendment numbers remain exactly as printed in the instructions.
- Digest-only verification, source strikeouts, failed-load recovery, independent replacement and shared removal of both optional uploads and retained digest uploads on Refresh. The digest heading/enactment boundary confines verification to front matter.
- Explicit after-line/end-of-bill insertion and final between-lines insertion when the following number is unprinted. Missing intermediate lines remain unresolved, and the inserted text must precede the bill’s end marker.
- Amendment verification and complete-range navigation, including referenced bill bodies, source strikeouts, insertion arrows and separate discrepancy navigation.
- Separate Changes, Amendments, Spelling & Grammar, and Stylistic Check modes with forward/backward arrows.
- Current-only language checking, case-sensitive dictionary and custom style terms, Ignore/Ignore All and Undo.
- Searchable LCB/GPO sources and honest check-coverage inventory. Applicable printed LCB provisions take priority where the guides disagree; unknown conditions remain manual.
- California Counties: checks all 58 supplied names and the required “County of [Name]” or “Counties of [Name], [Name], …” forms. Reversed forms and capitalization differences are flagged for review; unknown names receive no guessed replacement. Browse and search the separate California Counties tab.
- California Codes: checks code names and shorthand against the user-supplied 29-row list, including incorrect name/shorthand pairs. Browse and search the list in Style Guides → California Codes. Differences in capitalization or punctuation are flagged; the name–shorthand separator and PDF layout whitespace are ignored. Unlisted citation forms require review, with no invented replacement. This additional reference does not validate section numbers or replace LCB/GPO guidance.
- GPO follow-up covers all nine printed noun/preposition plural examples, all 16 printed calendar abbreviations after supported prose cues, exact-hour/meridian forms, and selected editorial annotations/legal versus connectors. Whole-source safeguards preserve names, quotations, tables, removed text and physical offsets; full-rule contextual and typography exceptions remain manual.
- GPO 9.58 checks appended-s variants for 21 unambiguous measurement/time abbreviations from the 23-symbol table. GPO 10.3 closes the five printed arithmetic operators in explicitly identified simple expressions, preserving source numbers, names, breeding and magnification exceptions. Ambiguous units, scientific notation, complex algebra and broader semantic interpretation remain manual.
- GPO continuation: checks 41 explicit measurement definitions, complete repeated-percent lists and same-unit physical-dimension lists/ranges. Nonzero-minute meridians and six additional calendar leads have bounded source checks. Source numbers and connectors are preserved; numeric-day witnesses do not validate calendar dates. Ambiguous units, semantic meaning and typography remain manual.
- GPO remaining groups: six printed temperature/gravity definitions; complete whole clocks; the printed numeric result expression; LCB-compatible dollar series; selected prefix/sake forms and holiday names. Complete source evidence preserves quotes, names, technical literals and removed text.
- Conditional web/email typography review requires complete reliable original font evidence. Review Suggested has no replacement; confirm legislative or quoted-source italics in the original PDF. Broader layout and font interpretation remain manual.
- Local authorized-data spelling importer; see OFFLINE_AUTHORITY.md. Complete Merriam-Webster data is not bundled.
- On-demand local OCR for printed bill scans, with uncertainty and embedded-text disagreement warnings.
- Profile-persisted authorized entity-list import, source metadata, bounded search and restoration of the bundled snapshot; see ENTITY_AUTHORITY.md. Missing names do not become errors.
- Automatic section-aware style checks for the Current bill: the Legislative Counsel’s Digest heading and enacting clause distinguish heading, Digest and bill text. No ruleset selection is required.
- Selected LanguageTool/spaCy contextual methods. Engines start on demand and do not send text online.

Blue indicates additions, red deletions, yellow non-amendment changes, and purple potential style issues. Red and blue underlines identify spelling and grammar.

## Validation and limitations

The published 1.21.23 build passes all 3,043 source tests, 16 packaging/publishing regressions and staged Windows verification for the selected GPO follow-up, automatic sections, AB 1967 amendment/comma/in-kind/Digest cases and AB 2266 original readings. Fresh intake covers 34 unchanged PDFs and 23 bill models / 2,024 pages. The numerical follow-up reduces cached-model questions from 589 to 219 while retaining every precise comparison. Fresh extraction removes four old Roman-spacing artifacts. See [current status](PROJECT_STATUS.md) for exact scope and remaining limits.

The published 1.21.21 build passed all 2,975 source tests; its 13 packaging/publishing regression tests were also rechecked. The staged Windows 1.21.21 EXE passes the four supplied AB 1967 PDFs, all nine amendment results, comma placement, exact in-kind highlighting and Digest alignment, plus existing citation/two-page regressions and a new three-page LCB fixture. Source links, expandable citation duties, whole numerical/table questions, known-role controls and exact physical highlights pass. Quality replay across 23 unchanged models / 2,024 pages reduces reader questions by a net 2,440 while preserving all 141 precise comparisons. A fresh final parser run reproduces all 3,175 mapped baseline candidates. All 34 original corpus PDFs retain their hashes. These are processing and stability checks, not human precision/recall or a full-rule certificate. Complete ordered Merriam-Webster authority remains unavailable; intended meaning, unrecognized contexts, legal identity, source support and original typography may still require reader or authoritative verification. Native testing uses an isolated packaged app with actual PDF readers, workers and portable engines; physical OS chooser/drag gestures are outside this result. The final archive is verified against every manifest entry and includes a SHA-256 sidecar. See [desktop verification](DESKTOP_VERIFICATION.md) and [LCB coverage](LCB_COVERAGE_REVIEW.md).

Full contextual LCB/GPO automation and the complete ordered Merriam-Webster authority remain incomplete. Genuine SB 879 differences and missing drafting attachments remain flagged. Office-wide precision/recall has not been measured; controlled tests are not an exhaustive human benchmark.

## Development setup

Install Node.js 22 or later and Git, clone this repository, then run `npm install`. Dependencies are pinned: Electron 44.5.1, PDF.js 6.4.299 and Tesseract.js/core 7.0.0. Postinstall restores PDF.js fonts/maps/WASM, application icons and pinned OCR assets with SHA-256 verification. Dependency setup requires network access; document review stays offline.

This desktop was restored with pnpm. For an installation that skips dependency lifecycle scripts, run the following setup steps explicitly, then use `pnpm start` and `pnpm test`:

```text
pnpm install --ignore-scripts
node node_modules/electron/install.js
node scripts/setup-pdf-assets.cjs
node scripts/setup-app-icons.cjs
node scripts/setup-ocr-assets.cjs
```

The committed LF attributes preserve byte-fingerprinted dictionary/fixture inputs on Windows. Keep the two reference JSON files and manuals local; `.gitignore` excludes the restored copies and generated assets.

The supplied manuals and complete extracted reference text remain excluded from this public source repository and its source ZIP. Copy these four files from the Windows release's `Document Compare/resources/app/app/data` into `app/data`:

```text
gpo-stylemanual-2016.pdf
lcb-stylemanual-2019.pdf
gpo-reference.json
lcb-reference.json
```

For full offline language-engine functionality, copy the Windows release's `Document Compare/resources/offline-engines` directory to `engines/runtime`, preserving all files and licenses. See engines/README.md for layout and staging details. No engine binary, uploaded bill, personal dictionary, imported authority dataset or user profile is tracked in this repository.

Run `npm start` to launch the source app. Run `npm test` after restoring the two reference JSON files to execute the complete source suite. The launcher exits with an explicit setup message if those references are missing; it does not label a skipped suite as passed.

The Windows ZIP contains the complete runtime; generated development assets and reference files are restored as above. The published 1.21.23 package includes the verified application changes described in PROJECT_STATUS.md; subsequent main documentation records publication without modifying the tested archive. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.

## Build the Windows package

Restore the release-only references and offline engines described above, then run:

```text
node scripts/package-windows.cjs --stage-only --electron-base "../Document Compare"
```

This preserves the matching branded Electron executable from the extracted release. Omit --electron-base to use the installed pinned Electron executable. Run the staged app from `dist/Document-Compare-Windows-<package.json version>/Document Compare` and finish native verification before archiving:

```text
node scripts/package-windows.cjs --archive-existing --refresh-docs --electron-base "../Document Compare"
```

Finalization verifies all application/runtime bytes against the tested stage, permits only root documentation/status refreshes, verifies every ZIP entry and writes a .zip.sha256 sidecar. Existing outputs are never replaced. Keep the entire extracted application folder together. Test documents and personal profiles are excluded.
