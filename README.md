# Document Compare

An offline desktop app for comparing legislative PDFs and reviewing instructional amendments. Version 1.20.23.

## Download the Windows app

Download **Document-Compare-Windows.zip** from [the latest release](https://github.com/Alexander-D-Loyd/Document-Compare/releases/latest), extract the entire ZIP, and run **Document Compare.exe**. Keep its resources and runtime files together. No development tools are needed.

## Current validation and limitations

Version 1.20.23 passes 197 automated tests and the 142 ordinary-amendment highlight/navigation retest. Page-break spelling uses separate word fragments and excludes intervening running heads. Undo is to the left of Ignore.

The AB 109/SB 879 budget case remains unresolved: source amounts genuinely differ, additional drafting material is unavailable, and complex budget alignment still produces some false missing markers. These discrepancies remain flagged for review. Full automatic offline style-rule coverage is still unfinished; consult STYLE_RULE_COVERAGE.md.

## Features

- Drag and drop Previous Version, Instructional Amendments and Current Version PDFs (up to 50 MB each).
- Compare words and punctuation independently of printed margin numbering, line wrapping and page breaks.
- Verify supported amendment instructions against the current bill, preserving source strikeouts and navigating both versions.
- Review non-amendment changes, spelling and grammar, or stylistic findings separately with forward/backward navigation.
- Maintain a case-sensitive personal dictionary and custom style terms.
- Search the LCB and GPO style guides, with conflicting LCB/GPO recommendations excluded from stylistic findings; contextual numeral checks distinguish quantities, references, bill text and digest text.

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



Local 1.20.11 fixes OCR word joins, misread directive quotes and line numbers, and nested quoted deletions. Amendment Verification uses natural spacing without padded word highlights. All ten AB 2266 August 21 amendments verify against v95 (Previous) and v94 (Current).

Local 1.20.12 raises the PDF limit to 1,500 pages (50 MB remains), requests externally referenced bills in a drop-box dialog, and extracts only legislative body text. Unavailable additional drafting attachments require review. Blank pages retain page navigation. Contextual numeral checks protect budget codes/table amounts, proposition references, wrapped citations and telephone service codes. All 60 automated tests pass. The complete manuals are searchable; automated rule coverage remains partial and is listed in Style Guides > Check Coverage.

Local 1.20.13 expands offline style checks and adds a searchable source-rule inventory in Check Coverage. 78 tests pass; 96 controlled violation/compliant pairs were checked across eight real bill contexts. Full automatic rule coverage is unfinished; see STYLE_RULE_COVERAGE.md. No GitHub push performed.

Version 1.20.14: referenced bill bodies displayed and checked despite missing additional attachments; Undo Ignore; expanded offline mixed-duration/fraction/modifier checks and distinct LCB bill/digest rule inventory. Comprehensive rule coverage remains unfinished.

Version 1.20.15 expands offline LCB compounds, GPO measurement notation and monetary pairs; audits GPO Chapter 1 applicability. 94 tests pass; 184 controlled rule/corpus pairs passed. Full coverage remains unfinished.

Version 1.20.16 expands offline contextual style checks and discrete guide coverage. 138 tests pass; 888 controlled rule/corpus pairs pass across eight bills. Source-order and corpus false positives are repaired. Full coverage remains unfinished; see STYLE_RULE_COVERAGE.md. No GitHub push.

Version 1.20.17 ignores LCB/GPO style disagreements while retaining independent checks. 137 tests pass. Local only.


Version 1.20.18 expands offline punctuation and explicit quantity grouping, documents all numbered GPO Chapter 8/12 rule scopes, and excludes further known guide disagreements. 152 automated tests and 920 controlled rule/corpus pairs pass. Full automatic coverage remains unfinished. Local only; no GitHub push.

Version 1.20.19 expands offline contextual rules, repairs GPO guide search, records remaining rule limits, and improves wrapped-style Ignore All. 177 tests and 2,040 controlled rule/corpus pairs pass across 12 bills. Full automatic coverage remains unfinished. Saved locally; no GitHub push.

Version 1.20.20 completes numbered GPO rule-scope accounting, expands selected offline checks and conflict exclusions, and fixes amendment loading, neighboring-edit verification and tight-line contours. 187 tests and 2,064 controlled style pairs pass. Desktop retests cover all 12 available bill sets, including 142 ordinary amendments and the unresolved AB 109/SB 879 case. Full automatic rule coverage remains unfinished. Local only; no GitHub push.
