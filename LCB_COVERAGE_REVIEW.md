# LCB coverage review

Implementation for version 1.21.20, October 21, 2026. The earlier 1.21.19 package does not contain these changes. Publication and native verification are recorded separately in TESTING_REPORT.md and DESKTOP_VERIFICATION.md.

The desktop now requests additional reader-assisted LCB checks alongside the existing precise comparisons. An unresolved meaning or grammatical role produces a question with its source rule and no selected replacement. This is broader implementation coverage; it is not a claim that every possible context is automatically resolved or that an empty finding list certifies compliance.

## Added checking methods

- A source-driven lexical review uses the 663 actual LCB table entries and 47 printed page 15 end-word forms and exceptions. It recognizes changes at printed word boundaries and asks about unresolved roles, meanings and capitalization conditions without relying on a finite noun-head list. Exact plain compliant spellings remain quiet. Existing precise findings retain precedence.
- Explicitly separated potential prefixes receive source-backed questions, including the four prescriptions previously available only for manual lookup. Familiar roots do not authorize invented closed words. Ordinary open `in` prepositions remain protected.
- Productive `-adopted`, `-approved`, `-based` and `-related` forms receive a role question when their use has not been established. A finite verb is not automatically converted into a hyphenated modifier.
- The explicitly enabled parser layer supplies source witnesses for complete noun and qualified-noun prefixes, direct multiword attributive subtrees, linking-verb compounds and supported following participial phrases. This includes unfamiliar participial/adverb constructions such as `fast growing` and `sugar free` before a noun. Every component, attachment, head, predicate and source span is checked before a question is displayed. Parsed open `-ly` adverbs retain their exception; a hyphenated counterpart links to LCB8 item 3. A parser result never authorizes a lexical replacement.
- Complete-sentence punctuation review reaches unfamiliar multiword lists without requiring a recognized noun head or introducer. It asks whether the wording is a parallel series, a nested group or separate clauses.
- Complete-sentence Bill item 3 review asks whether smaller and larger numbers belong to different numerical expressions, including different noun heads and intervening clauses. A base small-figure-to-word comparison becomes conditional when this relationship is unresolved. Legal serials, paragraph labels, complete valid dates and monetary pairs retain their specialized roles.
- All 30 bundled California Entities entries excluded from automatic case correction now have reader-review triggers. Source eligibility is unchanged. Questions cover short titles, inverted index entries, parenthetical abbreviations and the region template. Unresolved institutional constructions receive a verification question without a fuzzy nearest-name replacement.
- The desktop displays dictionary-readiness limitations after a style check. A spelling subset or imported preference list cannot silently become a complete dictionary authority.

## Supplied entity source

The newly supplied `California Entities.docx` is byte-identical to the bundled source:

`273ba8d47f33ba9bdc15823ce381a547a03074a52886fc03a3a7a3d14dabd4e3`

The read-only audit inspected 416 DOCX paragraphs and verified all 311 retained source paragraphs across 16 categories. All 512 entries are retained: 482 eligible exact case checks and 30 reader-review entries. There are no unparsed source entries. The file and bundled names were not changed. This verifies source fidelity, not current legal status or freshness.

## Validation and limits

The new tests use the actual bundled spaCy model, original-source corruption controls, bridge transport checks, source-table witnesses and conditional numerical comparisons. The native AB 1967 workflow additionally exercises the actual PDF reader, workers and local engines. It retains the named-comma amendment result, exact in-kind highlight, LCB source navigation and Digest alignment fixes. All four original PDFs remain unchanged.

The final source-suite result and desktop receipt are recorded in `TESTING_REPORT.md`. Detailed local evidence is in `qa-output/lcb-full` and `qa-output/ab1967/source-lcb-full-final`.

Complete ordered Merriam-Webster authority is unavailable; the user has confirmed that no licensed export is available. Ordinary spelling and the finite LCB/Merriam subset continue to work. Full supplementary California Style Manual citation coverage is also incomplete. Missing or mistaken parses, noncontiguous grammatical roles, chunk edges, noncanonical numerical recognition, legal identity and intended meaning remain limits. Source quotations, names, tables, strikeouts and unknown excluded content retain their protections. These protections must not be counted as proof that protected content complies.

The source inventory therefore continues to describe partial automatic coverage and required judgment. Inventory counts, reference availability and reader questions are not a completion percentage or a whole-rule certificate.

## Exact-target audit and requirement dispositions

`scripts/audit-lcb-targets.mjs` fingerprints all 23 actual source pages and records all 41 numbered/section provisions separately from lexical examples. For each source-derived candidate it requires a finding overlapping the target with the exact source row and page; an unrelated issue elsewhere in a sentence cannot count. The audit verifies 497 target-source rows and 213 plain solid forms for which the source supplies no justified alternate boundary or case probe. There are zero unresolved generated target rows and zero failed literal-protection probes. This finite matrix does not prove arbitrary misspelling, grammatical or semantic coverage. The regression is `tests/lcb-target-audit.test.mjs`; independent gap cases are in `tests/style-lcb-audit-gaps.test.mjs`.

The requirement audit retains these dispositions. Referenced test groups exercise selected actionable, accepted and protected conditions; their existence is not a whole-rule certificate.

| Source requirements | Implemented route and remaining limit |
| --- | --- |
| LCB1 items 1–2 | LCB/GPO priority and source evidence. Applicable LCB wins; unknown roles remain unresolved. Guide-priority tests retain the hierarchy. |
| LCB1 items 3–4; LCB2 items 1–2 | Ordinary spelling, office forms and the authorized subset/importer. Complete ordered dictionary and sense authority is unavailable and visibly disclosed. |
| LCB1 item 5 | Selected supplementary citation checks for explicit Opinion/Cover letter selection; full manual and authority validation remain incomplete. |
| LCB2 items 3–5 | Contractions, and/or, and selected initialism pronunciation/articles. Ambiguous expansions and local initials receive source-backed questions. Contraction and initialism evidence suites protect names and literals. |
| LCB2 Office Preferences items 1–7 | Historical, adviser, ensure/assure, judgment, marshal, moneys and willful checks; ensure/assure meaning can require review. Word-choice, office-preference and original-evidence tests retain the finite limits. |
| LCB6 punctuation and LCB7 examples | Quote ownership, possessives, serial commas, grouped semicolons and printed phrases/names. Complete-sentence series review supplements finite grammatical checks. Ambiguous clause/group structure remains a question. |
| LCB8 items 1–3 | Exact listed forms plus validated parser questions for direct, predicate and supported following modifiers; the -ly exception remains. Missing, mistaken and noncontiguous parses remain limits. |
| LCB8 items 4–5 | Listed foreign phrases, source prefix examples and separated-prefix questions; no arbitrary root joining or foreign-language dictionary inference. |
| LCB15–16 examples | All 47 printed end-word forms/exceptions and four productive endings. Explicit determiners/auxiliaries do not become invented compounds. Context, source boundaries and printed open forms remain relevant. |
| LCB17 items 1–2 | Selected entity titles/heads, exact names, guarded creation/reference clauses and bounded document-local near-title questions. Similarity never establishes legal identity or selects a replacement. |
| LCB17 items 3–6 | Selected standalone office/section labels, federal descriptions and personal/agency Office roles. Source lexical questions supplement unresolved qualifiers; unfamiliar identity is not automatically resolved. |
| LCB17 item 7 | All 512 supplied entity entries retained: 482 exact case checks and 30 reader triggers. Current legal identity and source freshness remain unverified. Unlisted institutional questions stop at clause boundaries. |
| LCB21 General items 1–2 | Sentence-opening and specialized numeral forms; explicit table cells use their source columns/units. Unrecognized numerical expressions receive selected whole-expression questions rather than inferred values. Arbitrary notation and table meaning remain limits. |
| LCB21 Bill items 1–5 | Small/large counts, fractions, numerical-expression relationships, ordinals and uncodified money. Whole-sentence Bill item 3 questions make dependent base corrections conditional. Complex semantic relationships still need a reader. |
| LCB21 Digest items 1–3 | Figure/one, ordinal and third-party forms in detected Digest context. Meaning and incomplete/misclassified document structure remain review limits. |
| LCB21 Opinion/Cover letter and Resolution sections | Explicit Opinion/Cover letter selection supplies Bill base rules and money/reference exceptions; supported resolution/findings source cues supply figure-only money. Unknown document/provision identity is not inferred. |
| LCB22–23 printed examples | Selected ages, code/constitutional references, correlatives, dates, grades, measures, money, percentages, proportions and time have dedicated source/evidence suites. Examples do not authorize every unprinted construction. |
| LCB3–5, 9–14, 18–20 lexical tables | All 663 rows remain separately source-linked. Exact comparisons, meaning/role questions and complete source protections coexist. Independently quoted c/s corporation classifications have their dedicated source exception. |

## Follow-on gaps and supplementary citations

The audit exposed a source-form guard that discarded printed internal capitals. Variants of African American, Asian American, Mexican American, limited English proficiency and Conflict of Interest Code now receive appropriate questions, while larger organization names stay protected. Ordinary Bill references to the state stay quiet even when another sentence mentions a constitutional amendment; an identified constitutional-amendment document retains the relevant question.

Selected noncanonical adjacent cardinal words, very large scales and unprotected exponent notation receive LCB21 questions about the complete expression. Removed characters cannot expose a new suffix quantity. Protected technical tokens, quotations and arbitrary unrecognized notation are not certified by this route.

The California Style Manual Fourth Edition source was retrieved and inspected, including rendered pages, from https://sdap.org/wp-content/uploads/downloads/Style-Manual.pdf (SHA-256 `276be1cfc5284989713edde57466f51309d76d145b8c11b5781983fbf005bfea`). Sections 1:1, 1:2, 2:5 and 2:6 support selected reporter spacing, full-case year placement, code punctuation, code supra and unresolved Id./Ibid. questions. Exact source links open in the browser only for the reviewed manual and valid PDF page range. This does not implement every citation family, verify case existence or publication status, validate supporting point pages, or establish original italics. Fifth-series coordinates are recognized without treating the 2000 edition as new typography authority. LCB-specific reference conventions and the user's separate California Codes list retain their own roles.
