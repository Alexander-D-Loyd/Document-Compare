Document Compare 1.20.23 — GitHub release.

Fixed page-break spelling grouping: divided words skip budget running heads and use distinct source fragments, so spelling marks never cover intervening page headers or footers. Source layout remains visible. Moved Undo to the left of Ignore, including keyboard order. Adjacent replacement discrepancies remain flagged without false missing-text labels. Complex budget alignment still produces some missing markers and is deferred at the user's request. Genuinely absent wording continues to receive missing markers.

Validation: 197 automated tests pass, all 142 ordinary amendments pass the highlight/navigation retest, and desktop checks confirm Undo positioning and PDF previews. Full AB 109/SB 879 testing confirms that the page 27/28 Legislature division no longer flags its fragments or page heads. Visually inspected SB 879 page 3: its Senate amount is 196,942,000; AB 109 strikes that amount and inserts 206,258,000. The amounts genuinely differ. These and other supplied-body discrepancies remain flagged as requested; missing additional drafting material prevents determining complete amendment correctness. The large-budget missing-marker regression still fails and is recorded as unresolved for later investigation. This version does not claim to resolve SB 879 verification. Prior offline style rule coverage is retained.

Extract the entire Windows ZIP and run Document Compare.exe. Keep its resources and runtime files together. All review remains offline. Full automatic style rule coverage remains unfinished.

---
Document Compare 1.20.22 — saved locally; not pushed to GitHub.

Expanded offline style coverage: missing and malformed thousands commas in selected quantities and explicit population/enrollment/headcount expressions, retaining all digits; final semicolons in explicitly introduced comma-containing noun groups under LCB and GPO guidance. Dates, legal references, serials, fractions, decimals, leading-zero codes, quoted names, tables and removed wording remain protected. General quantity roles and clause semantics remain manual. Check Coverage and the source inventory describe these specific limits.

Validation: 195 automated tests pass. Controlled validation covers 175 violation/compliant pairs per bill in 12 real bill contexts (2,100 pairs). The original 12 Current documents were rechecked, including all 1,008 AB 109 pages; neither new check introduced findings in the unchanged original corpus. The desktop worker loads and executes both new checks offline and continues excluding known guide disagreements. Prior 1.20.21 amendment, PDF preview and UI fixes are retained.

Extract the entire Windows ZIP and run Document Compare.exe. Keep its resources and runtime files together. All review remains offline. Full automatic style rule coverage remains unfinished.

---
Document Compare 1.20.21 — saved locally; not pushed to GitHub.

Digest differences remain visible but are excluded from Changes highlighting and navigation. Recognized discretionary line-end hyphens are joined for spelling/comparison without changing PDF rendering; wrapped amendment targets retain their offsets. Referenced budget bodies omit repeated Item / Amount running heads. Only the Issues button turns yellow; its arrows retain default colors. Click a loaded filename to open the original PDF locally; click the remaining drop area to replace it. Undo stays immediately to the right of Ignore.

Validation: 190 automated tests pass. All 142 ordinary amendments across 11 bill sets were retested for navigation and complete highlights. AB 109/SB 879 was retested separately: layout discrepancies were removed, while actual amount/wording differences still appear; missing additional drafting material prevents full verification. PDF previews in all three upload boxes, Issues colors, wrapped-word spelling, and Ignore/Undo passed desktop checks.

Extract the entire Windows ZIP and run Document Compare.exe. Keep its resources and runtime files together. All review remains offline. Full automatic style rule coverage remains unfinished.

---
# Document Compare 1.20.20 current validation

The older sections below are historical checkpoints. Current results follow.

## October 7 implementation and basic-functionality checkpoint (1.20.20)

Completed explicit applicability/partial/manual scopes for all 783 numbered GPO chapter rules, including the 13 Chapter 7 introductory instructions. These statuses do not mean full automatic rule coverage. Bounded the final instruction before its separate compound dictionary. Added explicit crystal-clear/fire-tested modifier versus predicate checks, and geometry-based LCB lexical entries that preserve wrapped names, grammatical roles and stated exceptions. The source inventory now contains 1,905 records, including 663 discrete LCB lexical entries; 307 unnumbered passages remain unassessed. The experimental full GPO compound-tree extraction is not bundled as an automatic checker.

Visually verified two further guide disagreements in the original GPO tables: ground water (PDF 154, printed 140) and wild land (PDF 204, printed 190) versus LCB page 15 solid forms. Both choices are excluded from Stylistic Check, consistent with the user policy. Independent agreed checks stay active.

Fixed false insertion discrepancies caused by an unrelated neighboring edit: only an exactly mapped, contiguous pure-insertion payload with an immediate unchanged boundary can use the narrow evidence interval. Missing, altered, duplicate and remote payloads remain detectable. Fixed a loading/cleanup race that could leave amendment verification unstarted after comparison. Fixed stepped highlight contours clipping glyph edges on tightly spaced lines.

187 automated tests and 2,064 controlled violation/compliant pairs across 12 real bill contexts pass. Fresh desktop tests cycled all 142 ordinary amendments and all 103 non-amendment change groups across 11 bill sets, checking both-pane navigation, every selected span and glyph containment within the actual contour. AB 1546's long amendment is enclosed across 13 Previous and two Current pages, with headers/footers excluded and corresponding deleted wording red in Current. AB 2266's stamps/OCR do not enter the ten verified amendments. The Drive project listed 25 PDFs; local copies of all 25 were included, alongside the four earlier bill sets.

AB 109 and SB 879 were loaded and the 1,741,710-character referenced body displayed and compared. The available instruction also requires additional attached LCB drafting material; the supplied body has discrepancies relative to Current. These remain review findings, not proof of an unauthorized change. Full certification requires that missing material and confirmation of the requested source edition. Non-amendment classification remains uncertain for this unresolved instruction.

Desktop checks also passed dictionary exact-case search/add/removal and immediate rechecking, spelling/grammar/style Ignore and Ignore All with Undo, current-file scope, Refresh retention, custom terms, rule lookup/search, incorrect-payload highlights, Issues navigation/disablement, exclusive categories, current-only language checks, page entry, before-line arrows and referenced-bill popup validation. Boundary fixtures verify acceptance of 1,500 pages and rejection of 1,501 pages, over-50-MB files and invalid PDFs. Source PDFs were unchanged. Saved locally; no GitHub push. Full semantic and typographic rule coverage remains unfinished.

# Document Compare 1.20.15 testing

Local validation on October 7, 2026. No changes pushed to GitHub.

| Bill | Previous | Current | Amendment findings |
|---|---|---|---|
| AB 2266 | v95 | v94 | 10 implemented |
| AB 195 | v99 | v98 | 4 implemented |
| AB 302 | v93 | v92 | 4 implemented |
| AB 1415 | v97 | v96 | 12 implemented |
| AB 1832 | v98 | v97 | 8 implemented |
| AB 1682 | v98 | v97 | 6 implemented |
| AB 2100 | v99 | v98 | 2 implemented |
| AB 109 | v99 | v98 | 1 implemented; referenced body has discrepancies; neighboring deletion requires review |

AB 109 Current loads all 1,008 pages, including its blank final page. SB 879 loads all 848 pages through the additional-bill popup. Only legislative body text is extracted. The AB 109 instruction also requires additional attached LCB drafting material, which is not in the project sources. The uploaded SB 879 body is displayed and compared independently: 1,741,710 body characters, with 3,931 differing expected-text segments detected in this corpus pair. These differences are relative to the uploaded bill body and cannot establish whether absent additional drafting attachments authorize them. Additional-only inserted wording is left unresolved. Full instruction verification and neighboring deletion still require review; non-amendment classification stays uncertain.

The popup identifies SB 879 and the requested edition description, rejects a PDF identifying a different bill, enables Continue after a valid body is loaded, and closes when the primary amendment file is removed. Bill number is validated; requested publication date/edition still needs user confirmation against the description.

Fixes found through the corpus: blank pages incorrectly rejected as scans; slow overlapping strikeout filtering; footer version numbers entering comparisons; false numeral suggestions on Proposition identifiers, budget appropriation codes and tabulated amounts; wrapped dates/citations; telephone service codes such as 2-1-1 and decision identifiers. Comma-formatted amounts retain their commas. Ordinary quantity checks remain covered by tests.

AB 1832 previously produced 168 style findings, predominantly inappropriate numeral checks on telephone codes. Those false findings are now absent. AB 195's false Proposition 4 suggestion is absent. AB 1682's 18 remaining style findings are displayed guide conflicts around health care, which already matches LCB; they are not suggested LCB corrections. AB 1415 similarly includes health care conflicts and selected wording suggestions.

Full AB 109 style/grammar engine testing exercised 305,324 words. Budget context reduced thousands of false numeral findings. Remaining findings are potential review suggestions, not independently certified errors. Full spelling/grammar/style UI testing also ran on the smaller bills. Full spelling on the 1,008-page bill has not been separately validated.

All 78 automated regression tests pass. The packaged app passed the referenced-bill popup and searchable rule-inventory checks. Original PDFs remain unchanged.

## Guide coverage

All 23 LCB pages and 475 GPO pages are available for searching. Automated style checking applies selected contextual rules, not every rule in these manuals. Meaning-dependent wording, unfamiliar modifiers, official-name exceptions, complex lists, typography and other specialized rules still need review. Style Guides > Check Coverage identifies supported checks and limitations. A clean result is not certification of full manual compliance.

1.20.13 adds an inventory of 1,137 rules/passages, including 783 numbered GPO rules. 1,068 passages remain labeled unassessed. These numbers are source records, not a coverage percentage or denominator of discrete applicable rules. Some records are whole unnumbered pages or continuations. Comprehensive automated coverage is unfinished.

Expanded checks cover listed LCB modifiers, participial modifiers, selected predicate forms, foreign phrases, established initialisms, monetary pair disagreement, simple fractions, mixed-case code/entity names, descriptive capitalization, contractions, additional sourced spelling variants, quotations, dates, possessive phrases, time expressions and simple serial lists. Corpus review corrected false flags for Subarticle 7, prepositions/determiners, wrapped words, official fund/agency names and budget percentage tables.

96 controlled violation/compliant pairs passed in eight actual bill/digest contexts. These use in-memory copies of the real introductory/body pages with twelve deliberately inserted test sentences and their compliant counterparts. They test detection and acceptance; they do not establish coverage of every guide rule. Full original Current versions also ran through the same style engine, including all 1,008 AB 109 pages.

Latest AB 109 audit: 494 potential style findings, including 321 LCB-compliant GPO conflicts and 173 potential corrections. Findings have not all been independently adjudicated. AB 2100's two Subarticle 7 false positives are fixed; its remaining style finding is an LCB-compliant federal-government conflict. All review runs offline; no document content is sent to an AI service.

## October 7 implementation checkpoint (1.20.14)

Referenced SB 879 body now appears in Amendment Verification and is independently compared even when additional LCB drafting attachments remain missing. Known-body discrepancies are highlighted; additional-only wording cannot certify the whole instruction. The real AB 109 desktop test displayed and verified 1,741,710 characters of SB 879 body text. Full resolution still requires additional attachments and source edition confirmation.

Undo Ignore reverses Ignore or Ignore All actions in last-in-first-out order across spelling, grammar and style. It rechecks the selected category locally so dictionary/custom-rule edits remain respected. Replacing/removing files or Refresh clears history. Added bill/digest mixed-duration and fractional-percentage checks and full recognized multiword participial modifiers. Fixed repeated LCB rule numbers so General/Bill/Digest rules retain distinct inventory entries; explicit manual-review statuses describe dictionary authority, official referents and unavailable OLC entity verification.

83 automated tests pass; 120 controlled violation/compliant pairs pass across eight actual bill contexts. Desktop Undo and full AB 109/SB 879 verification tested. Complete rule coverage remains unfinished; continue auditing discrete rules and contextual exceptions before claiming completeness.

## October 7 implementation checkpoint (1.20.15)

Added 47 explicit LCB end-word/exception variants with individual source inventory records, selected noun/verb compound checks, GPO 9.53–9.58 measurement notation checks, and hyphenated monetary-pair checks plus digest figure-only pairs. Numeric symbols are protected from contradictory isolated numeral suggestions. Existing guide conflicts retain both references and LCB precedence when an expanded check overlaps.

Audited all 22 numbered GPO Chapter 1 rules individually: 18 publishing/production workflow rules are explicitly not applicable to legislative prose; 4 source legibility, chemical-symbol, presentation and footnote-layout rules require manual review. These classifications do not count as automated coverage.

94 automated tests pass. 184 controlled violation/compliant pairs passed across eight real bill contexts. Desktop style-worker/source-reference QA passed. Full original corpus was rechecked, including all 1,008 AB 109 pages. Review found and fixed false positives from end-of-line division of workload and the Municipal Storm Water and Urban Runoff Discharges Mandate name. Remaining 494 AB 109 suggestions include 321 LCB-compliant guide conflicts and 173 potential corrections; they are not all independently adjudicated.

Full rule coverage is unfinished. Next priorities: complete LCB compound inflections and contextual exceptions; source-backed monetary-pair completeness in codified versus uncodified provisions; official-title/defined-term semantics; audit remaining GPO chapters and add tested rules rather than treating searchable source records as coverage. Continue entirely offline and save locally unless the user requests a push.

## October 7 implementation checkpoint (1.20.16)

Expanded offline checks for recognized codified versus uncodified monetary forms, selected standalone office titles and the defined Education Code Superintendent exception, 18 explicit word-choice cues, explicit ratios, first grade, selected compound plurals/fixed hyphens, 66 listed noun variants, calendar capitalization/abbreviation contexts, cede/ceed/sede verb endings, simple fractions with denominators through twenty, and temperature scale names. Chained legal-reference spacing and numbered Section/Schedule capitalization retain LCB priority and both conflicting guide references.

All 128 Chapter 2, 60 Chapter 3, 26 Chapter 5, 52 Chapter 6 and 64 Chapter 9 numbered GPO rules now have explicit applicability/partial/manual explanations, alongside the prior Chapter 1 audit. LCB lexical tables add 517 discrete entries with stable identifiers and contextual limitations. Coordinate-ordered GPO rule text repairs misplaced examples and bounds chapters correctly; original reference-search text and PDFs remain intact. The inventory contains 1,724 source passages/entries, including 783 numbered GPO rules; 728 passages remain unassessed. These counts are not a coverage percentage.

138 automated tests pass. Controlled validation covers 111 violation/compliant pairs per bill across eight real bill contexts (888 total). Original eight Current documents were rechecked, including all 1,008 AB 109 pages. Corpus review fixed false flags from legal/session citations, program rounds, version strings, numbered buildings/committees, zero-emission, monetary scales, quoted identifiers, divided words, running table heads, net-zero and selected literal source names. AB 109 now has 1,524 potential style findings: 1,481 LCB-compliant conflicts and 43 potential corrections. AB 1415 retains two toward/towards spelling suggestions. Findings are not all independently adjudicated and do not certify compliance.

Desktop worker/source-reference and searchable inventory tests pass. All review remains offline. Full coverage remains unfinished: unfamiliar semantic modifiers, complete proper-name authority, every lexical/GPO table entry, complex punctuation, foreign/scientific meanings and source typography still need work. Preserve these limitations in the UI and continue source-backed checks plus violation/compliant/context tests. This checkpoint is local only; no GitHub push.

1.20.17: Style conflicts ignored by user request; independent spacing remains checked. All 137 tests pass. Prior corpus counts describe the older conflict-reporting policy. No GitHub push.
