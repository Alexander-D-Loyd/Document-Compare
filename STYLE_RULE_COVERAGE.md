# Highest priority: style rule coverage

User priority recorded October 7, 2026: expand reliable rule coverage across the uploaded LCB and GPO manuals before cosmetic improvements or unrelated features. Keep changes local unless a GitHub push is explicitly requested.

Current user policy: ignore LCB/GPO disagreements in Stylistic Check regardless of which form the document uses. Keep independent, nonconflicting checks active. The complete guides remain searchable. Full-text search is not automated rule coverage. Do not describe the checker as exhaustive or interpret an empty result as compliance certification.

## Required rule inventory

Audit every rule in LCB pages 1–23, then every relevant rule in GPO pages 1–475. Give each discrete rule a stable identifier, source page, context, exceptions, LCB/GPO precedence, and an explicit status: automated and tested, partially automated, manual review required, or not applicable to legislative prose. Nonapplicability requires an explanation. Existing page/chapter metadata and the Check Coverage summary do not constitute that complete inventory yet.

## Implementation order

1. LCB numerals: complete bill/digest distinctions, amounts and paired monetary expressions, sentence starts, measures and specialized numerical forms. Protect citations, service codes, legal identifiers, dates and table cells without excluding actual prose quantities.
2. LCB hyphenation: broaden unit modifiers using grammatical context, distinguish modifiers before/after a noun, and handle listed prefixes, compounds and exceptions. The current data-sharing check is only one supported example.
3. LCB punctuation and spelling/usage: explicit listed rules, possessives, punctuation scope and meaningful exceptions. Avoid treating official names or quoted source wording as automatically editable prose.
4. LCB capitalization: statutory titles, offices, defined terms and descriptive uses, with document context.
5. GPO spelling, compounding, punctuation, capitalization, numerals, abbreviations, symbols and italic conventions. Resolve against LCB first; formatting-dependent rules require reliable PDF layout evidence.
6. Audit remaining GPO chapters individually: general instructions; tabular work and leaderwork; footnotes, indexes, contents and outlines; datelines, addresses and signatures; tables and geographic terminology; Congressional Record; reports and hearings. Mark specialized material explicitly instead of silently omitting it.

## Acceptance criteria

- Each automated rule needs a source citation and independently chosen examples of a violation, compliant wording and contextual exceptions.
- Findings must highlight the exact source text, explain the relevant context, and preserve source offsets through margin numbering, wrapping and strikeouts.
- Test false negatives and false positives against the downloaded legislative corpus. Merely running the checker or counting suggestions is not evidence of correctness.
- Exclude known LCB/GPO disagreements from stylistic findings in either direction. Explain excluded choices in the coverage reports without representing them as actionable corrections.
- Extend the searchable Check Coverage view as rules are implemented. Show unsupported rule families and manual-review limitations.
- Do not use a numerical coverage percentage until the full rule inventory exists and its denominator is documented.

## Current baseline

All pages of both guides are searchable. Automated coverage is partial: selected numeral, punctuation, spelling/usage, capitalization and modifier rules, plus user-defined case-sensitive terms. The latest complete regression suite has 195 passing tests. The external-bill upload and 1,500-page support are implemented. The local testing report records twelve bill sets and identified limitations. Comprehensive rule inventory and the broader rule families above remain unfinished work.

## October 7 implementation checkpoint (1.20.13)

The user requires all review to remain offline. Added source-rule inventory across both complete manuals with explicit partially automated/unassessed statuses; listed LCB modifiers, participial modifier checks and predicate/foreign phrase exceptions; selected initialisms; monetary pair disagreement; dates, quotations, possessives and simple serial lists; selected simple fractions; mixed-case institution/code titles and descriptive uses; expanded contractions and spelling variants. Protected nested citations such as Subarticle 7 and corrected corpus false positives around prepositions, official names, wrapped words and table percentages.

78 automated tests pass. 96 controlled violation/compliant pairs pass across eight real bill contexts. Eight original Current versions were reviewed with the same engine, including all 1,008 AB 109 pages. AB 2100 contributes two additional correctly implemented amendments. Comprehensive automatic rule coverage is NOT complete. Source inventory is a transparency tool, not a completed semantic audit. Remaining rules must be assessed and implemented or explicitly identified as requiring judgment. Do not equate reference search or source-page accounting with rule checking.

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

## October 7 checkpoint (1.20.17)

User changed conflict policy: LCB/GPO disagreements are suppressed from style highlights, counts and navigation. Disputed numbered-reference capitalization is skipped without suppressing independent reference-spacing checks. Known conflict ranges also suppress overlapping legacy checks. 137 automated tests pass. Full coverage remains unfinished. Saved locally; no GitHub push.

## October 7 implementation checkpoint (1.20.18)

Added conservative offline punctuation checks for LCB’s fixed parenthetic list phrases and existing-law introductions, mechanic’s liens, selected indefinite possessives, plural initialisms, redundant quotation periods and from/between full-year ranges. Added GPO thousands grouping for explicit count/quantity nouns, protecting dates, serials, decimals, literal wording, tables and removed text. Expanded conflict exclusions to amendment quotation-punctuation exceptions, standalone digest fractions, small mixed bill durations, fraction unit modifiers and closely related sentence-opening numbers. Independent agreed checks remain active. Updated the user-facing coverage summary to the current conflict policy.

Classified all 153 numbered GPO Chapter 8 rules and all 29 Chapter 12 rules by the implementation’s actual narrow scope or manual-review limitation. This is source-rule accounting, not full semantic automation. The source inventory still has unassessed passages and entries. The 920 controlled rule/corpus pairs cover supported checks in eight real bill contexts; original PDFs were unchanged. Full automatic coverage is unfinished, and an empty result is not compliance certification. Local only; no GitHub push.

Validation: 152 automated tests pass, 920 controlled rule/corpus pairs pass, and the actual desktop worker passes the newly added punctuation/quantity checks with source references and conflict exclusions.


## October 7 implementation checkpoint (1.20.19)

Expanded offline checks for explicit arithmetic notation, three-value percent series, editorial annotations and legal versus cues, recognized budget table amounts/terminal periods, 35 word-choice cues, larger compound ordinals and grade syntax, selected significant-noun plurals and formal geologic names. Known digest-percent conflicts are excluded. Ignore All recognizes equivalent wrapped style wording without consuming printed margin labels or changing source highlight positions. The guide menu now describes the actual conflict-exclusion policy.

Restored 17,057 missing-font glyphs across 47 GPO source pages using visually verified source-font mappings. Four unverified symbols remain literal. Rebuilt the 475-page searchable index and coordinate-ordered source flow; original PDFs were not edited. The reproducible source builder includes the verified mapping helper. Actual desktop guide search and offline worker tests pass.

At this checkpoint, 770 of the 783 chapter.number GPO rules have explicit partial/manual/applicability explanations; the 13 Chapter 7 introductory rules remain to be assessed. Fourteen differently numbered report-format rules and four unnumbered geologic/physiographic instructions retain authentic source identities. The inventory has 1,759 entries/passages with 320 still unassessed; these are source-accounting counts, not an automated coverage percentage.

Validation: 177 automated tests and 2,040 controlled violation/compliant pairs across 12 real bill contexts pass. Original versions of all 12 bills were rechecked, including all 1,008 AB 109 pages. Existing corpus findings remain 34 in AB 109, seven data-sharing modifiers in AB 1636, and two toward/towards suggestions in AB 1415; these counts do not certify whole-document compliance. Full automatic coverage remains unfinished, especially unfamiliar meanings, names, complex grammar/quotation context and source typography. Local only; no GitHub push.

## October 7 implementation and basic-functionality checkpoint (1.20.20)

Completed explicit applicability/partial/manual scopes for all 783 numbered GPO chapter rules, including the 13 Chapter 7 introductory instructions. These statuses do not mean full automatic rule coverage. Bounded the final instruction before its separate compound dictionary. Added explicit crystal-clear/fire-tested modifier versus predicate checks, and geometry-based LCB lexical entries that preserve wrapped names, grammatical roles and stated exceptions. The source inventory now contains 1,905 records, including 663 discrete LCB lexical entries; 307 unnumbered passages remain unassessed. The experimental full GPO compound-tree extraction is not bundled as an automatic checker.

Visually verified two further guide disagreements in the original GPO tables: ground water (PDF 154, printed 140) and wild land (PDF 204, printed 190) versus LCB page 15 solid forms. Both choices are excluded from Stylistic Check, consistent with the user policy. Independent agreed checks stay active.

Fixed false insertion discrepancies caused by an unrelated neighboring edit: only an exactly mapped, contiguous pure-insertion payload with an immediate unchanged boundary can use the narrow evidence interval. Missing, altered, duplicate and remote payloads remain detectable. Fixed a loading/cleanup race that could leave amendment verification unstarted after comparison. Fixed stepped highlight contours clipping glyph edges on tightly spaced lines.

187 automated tests and 2,064 controlled violation/compliant pairs across 12 real bill contexts pass. Fresh desktop tests cycled all 142 ordinary amendments and all 103 non-amendment change groups across 11 bill sets, checking both-pane navigation, every selected span and glyph containment within the actual contour. AB 1546's long amendment is enclosed across 13 Previous and two Current pages, with headers/footers excluded and corresponding deleted wording red in Current. AB 2266's stamps/OCR do not enter the ten verified amendments. The Drive project listed 25 PDFs; local copies of all 25 were included, alongside the four earlier bill sets.

AB 109 and SB 879 were loaded and the 1,741,710-character referenced body displayed and compared. The available instruction also requires additional attached LCB drafting material; the supplied body has discrepancies relative to Current. These remain review findings, not proof of an unauthorized change. Full certification requires that missing material and confirmation of the requested source edition. Non-amendment classification remains uncertain for this unresolved instruction.

Desktop checks also passed dictionary exact-case search/add/removal and immediate rechecking, spelling/grammar/style Ignore and Ignore All with Undo, current-file scope, Refresh retention, custom terms, rule lookup/search, incorrect-payload highlights, Issues navigation/disablement, exclusive categories, current-only language checks, page entry, before-line arrows and referenced-bill popup validation. Boundary fixtures verify acceptance of 1,500 pages and rejection of 1,501 pages, over-50-MB files and invalid PDFs. Source PDFs were unchanged. Saved locally; no GitHub push. Full semantic and typographic rule coverage remains unfinished.

## October 8 rule-coverage checkpoint (1.20.22)

Expanded GPO 12.14 / 8.52 checks to missing and malformed thousands grouping in four-to-fifteen-digit quantities before recognized count nouns and after explicit population/enrollment/headcount cues. Suggestions retain every digit; leading-zero codes, fractions, decimals, scientific/serial suffixes, years, citations, quoted source names, tables and removed text remain protected. Added LCB page 6 / GPO 8.148 final-semicolon checks for explicitly introduced, already grouped series containing comma-separated recognized nouns. Simple series, unintroduced lists, ordinary clauses and unfamiliar or proper-name phrases remain protected or manual. Updated searchable coverage and source-rule statuses to describe these limits.

195 automated tests pass. 2,100 controlled violation/compliant pairs across 12 actual bill contexts pass. The original Current versions of all 12 bills were reviewed, including 1,008 AB 109 pages. Neither new rule family introduced findings in these unchanged originals; controlled mutations exercise their detection and contextual protections. Existing findings remain 34 in AB 109, seven data-sharing modifiers in AB 1636, and two toward/towards suggestions in AB 1415. These counts are not compliance certification. Offline desktop worker checks passed. No source PDFs were changed. All 783 numbered GPO rules retain explicit scopes; full automatic coverage and assessment of 307 remaining unnumbered passages are still unfinished. Local only; no GitHub push.

