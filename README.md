# Document Compare

An offline desktop app for comparing legislative PDFs and reviewing instructional amendments. Version 1.20.8.

## Features

- Drag and drop Previous Version, Instructional Amendments and Current Version PDFs (up to 50 MB each).
- Compare words and punctuation independently of printed margin numbering, line wrapping and page breaks.
- Verify supported amendment instructions against the current bill, preserving source strikeouts and navigating both versions.
- Review non-amendment changes, spelling and grammar, or stylistic findings separately with forward/backward navigation.
- Maintain a case-sensitive personal dictionary and custom style terms.
- Search the LCB and GPO style guides, with LCB taking priority; contextual numeral checks distinguish quantities, references, bill text and digest text.

Blue marks additions, red marks deletions, yellow marks non-amendment changes, and purple marks potential style discrepancies. Spelling and grammar use red and blue underlines.

## Run from source

Install Node.js 22 or later and Git, then run:

```sh
git clone https://github.com/Alexander-D-Loyd/Document-Compare.git
cd Document-Compare
npm install
npm start
```

Electron 42.11.10 and PDF.js 6.4.299 are pinned as development dependencies. `npm install` restores PDF.js character maps, fonts and WASM assets, plus the matching application icons, through the postinstall scripts. The runtime processes PDFs locally and blocks outbound web requests. Installing development dependencies requires internet access; reviewing PDFs does not.

### Restore the style references

The supplied manuals and their complete extracted text are excluded from this public repository. To restore all style-check and guide-viewer functions, copy these four files from your existing desktop package's `resources/app/app/data` folder into this repository's `app/data` folder:

```text
gpo-stylemanual-2016.pdf
lcb-stylemanual-2019.pdf
gpo-reference.json
lcb-reference.json
```

These files remain ignored by Git. Comparison, amendments, spelling and grammar work without them. Stylistic Check and manual search require the reference JSON; original-page viewing also requires the PDFs. Each manual is available in the desktop package already saved on the original computer. Verify redistribution rights before publishing reference files or a desktop release containing them.

## Test

```sh
npm test
```

The test launcher runs all tests when reference JSON is available. On a fresh clone, it reports and skips four manual-dependent test files and runs the remaining core tests. No sample bills, personal dictionary or custom-term data are included. Restore the references to run the complete 39-test suite.

## Local changes in 1.20.0

Each drop box has a red trash-can button in its top-right corner to remove its PDF, including cancelling a file being read. Removing Instructional Amendments reruns comparison without amendment exclusions when both bill versions remain loaded.

One shared Ignore (one selected occurrence) and Ignore All (matching occurrences, with exact case) pair applies to whichever is active: Spelling & Grammar or Stylistic Check. It is disabled in Amendments and Changes. Ignore All is also disabled when only one matching finding remains, while Ignore stays available. Ignore choices affect only the currently loaded files, survive category switches and rechecks, and are cleared by replacing/removing any file, Refresh, or restarting. They do not change the saved dictionary or guides. Source changes remain local until explicitly requested to push to GitHub.

## Use on another computer

Clone this repository and follow the setup steps above, including copying the four local style-reference files. Alternatively, copy and extract the complete Windows desktop ZIP from your original computer and run `Document Compare.exe`. Copy the entire portable folder, not just the executable.

Saved dictionary words and custom terms live in Electron's local user profile and do not synchronize through GitHub. Uploaded bills are held in memory and must be reopened after restarting the app.

## Limits

Text-based PDFs are supported; scans need OCR first. PDF images, comments and formatting changes are not compared. Unsupported or ambiguous amendment instructions are marked for review. Style checks cover selected rules and contexts, not every semantic judgment in either manual. The searchable Check Coverage tab documents supported checks and remaining manual-review areas. Documents are never corrected automatically.

## Project layout

`main.cjs` contains the Electron launcher and local protocol. `app/` contains the interface, comparison and review modules, and vendored runtime libraries. `tests/` contains regression tests. `scripts/test.cjs` launches tests with or without locally restored references.

## Licensing

The application has no open-source license grant (`UNLICENSED`). Third-party library and dictionary licenses are retained under `app/vendor/`; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No rights to the excluded style manuals are granted by this repository.



The controls above the document panes use compact spacing. Selected-finding descriptions occupy a full-width row, and Add to Dictionary/View Style Rules sit beside the shared Ignore controls. Document font size and PDF text layout are unchanged.


