# Document Compare

Offline Windows desktop app for legislative PDF comparison and amendment/style review. Version **1.21.17** adds California Counties to the packaged program-name protection, California Codes reference checks, both GPO coverage follow-ups and portable development setup repairs. Digest edits use red deletions and blue additions. Style findings retain applicable LCB priority, legislative exceptions and bill-local quoted terms.

## Run the packaged app

Extract the entire **Document-Compare-Windows-1.21.17.zip** and open **Document Compare/Document Compare.exe**. Keep the runtime and resources together. No installation or development tools are required. PDF and language review run locally.

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
- Local authorized-data spelling importer; see OFFLINE_AUTHORITY.md. Complete Merriam-Webster data is not bundled.
- On-demand local OCR for printed bill scans, with uncertainty and embedded-text disagreement warnings.
- Profile-persisted authorized entity-list import, source metadata, bounded search and restoration of the bundled snapshot; see ENTITY_AUTHORITY.md. Missing names do not become errors.
- Explicit Bill/Digest, Opinion and Cover letter style selection for the Current document; a replacement Current file resets to Bill/Digest.
- Selected LanguageTool/spaCy contextual methods. Engines start on demand and do not send text online.

Blue indicates additions, red deletions, yellow non-amendment changes, and purple potential style issues. Red and blue underlines identify spelling and grammar.

## Validation and limitations

The 1.21.17 Windows package passes 13 controlled native stages, including county checks and the searchable 58-county list. All 2,699 source tests pass. The county replay across 23 unchanged bill models / 2,024 pages yields 833 → 857 findings, with all differences reviewed. All 34 original Drive PDFs retain their hashes. Each ZIP entry is verified against the tested package manifest, with a separate archive SHA-256. See [desktop verification](DESKTOP_VERIFICATION.md) for evidence and limitations. These checks do not measure office precision or recall.

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

The Windows ZIP contains the complete runtime; generated development assets and reference files are restored as above. The October 21 changes are included in the Windows package; GitHub publication is recorded separately. The renderer blocks external network requests, and native engine requests are restricted to the trusted app frame.

## Build the Windows package

Restore the release-only references and offline engines described above, then run:

```text
node scripts/package-windows.cjs --stage-only --electron-base "../Document Compare"
```

This preserves the matching branded Electron executable from the extracted release. Omit --electron-base to use the installed pinned Electron executable. Run the staged app from dist/Document-Compare-Windows-1.21.17/Document Compare and finish native verification before archiving:

```text
node scripts/package-windows.cjs --archive-existing --refresh-docs --electron-base "../Document Compare"
```

Finalization verifies all application/runtime bytes against the tested stage, permits only root documentation/status refreshes, verifies every ZIP entry and writes a .zip.sha256 sidecar. Existing outputs are never replaced. Keep the entire extracted application folder together. Test documents and personal profiles are excluded.
