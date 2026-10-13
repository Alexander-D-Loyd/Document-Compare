Document Compare 1.21.6 release source - LCB near-completion rules

Local LCB changes extend selected contraction forms, adviser/judgment regular
plurals, complete written ratios and seven possessive noun-head inflections.
Ratio figures retain exact strings, including integers beyond JavaScript's safe
integer range. Calendar examples require valid four-digit dates and intact
continuation evidence; month/year forms require a temporal cue or source entry.
Complete quotation ownership replaces clipped look-behind excerpts and preserves
the GPO amendment-directive exception. Source evidence guards cover finite prefix,
spelling-sense, corporation-classification, initialism and foreign-phrase checks.
Finite subject/auxiliary cues survive long actual PDF whitespace without turning
an ordinary noun into an imperative. URL, email, file and explicitly labeled
serial identifiers retain their source spellings and figures.

The two-hour continuation added 91 regression tests to the preceding six local
tests. Two controlled five-page PDFs were freshly imported through PDF.js and
the actual layout/document pipeline. All 20 annotated review findings are found;
the corrected counterpart has zero findings. Source selections remain exact,
including the two-page ratio, while source strikes, tables and identifier controls
remain protected. All ten pages were visually reviewed. These are source import
checks, not native renderer verification or an office accuracy measurement.

The final source-suite, cached corpus and fresh original-PDF results are recorded
in STYLE_COVERAGE_STATUS.json and the retained local development-session checkpoint.
Selected forms remain partial coverage; no whole-rule status was promoted. The 1.21.6 release is prepared for packaging and publication. Native desktop
workflow checks were skipped at the user’s request; no native pass is claimed.

Final verification: all 2,017 source tests pass. The cached comparison and fresh
text-layer imports of 28 original Current PDFs (2,230 pages) each add or remove
no findings compared with the sealed 1.21.5 source. Fresh imports have zero
reading-problem pages and zero identified OCR-layer pages; this does not certify
a raster/OCR reread. Original PDF hashes and source models remain unchanged.

Published 1.21.5 native run 2026-10-13T01-48-21-709Z-49634733 passed all 21
stages, including OCR/authority, dictionary/authority close/restart and Digest/
final-line insertions. The complete real-bill suite ran. Packaged files and
security settings were unchanged. Startup waited for evaluation of the packaged
app module; all 12 runner controls pass. The previous run failed its first OCR
drop and initial dictionary add while the verifier could act before application
handlers were attached. No package changes were needed for this successful
rerun. 1.21.5 was subsequently published as the verified Latest release.

Document Compare 1.21.5 - Digest and final-line amendments

The middle upload card is Digest/Instructional Amendments with two independent
PDF inputs. Replacement digest text appears first and is labeled Digest; instructional
amendments follow in source order with their original numbers unchanged.
The digest replacement is confined to text between its heading and the enactment
line. Standalone digest text and wrapped words are supported. Source strikeouts
remain visible and are excluded from requested active wording. Both-pane marks,
discrepancy navigation, original PDF viewing, Refresh, removal and reloading use
the existing amendment workflow. The source PDFs are never edited.

Digest paragraph indentation is based on the digest column, preventing a far-left
legislative table/body from shifting every paragraph. True paragraph indentation
is retained. No text or source offsets are changed by this display correction.

After-line and end-of-bill instructions resolve to the end of the final numbered
body line, before the zero marker. A final between-lines insertion can use an
unprinted or empty next numbered line only at the proven end of the bill. Missing
intermediate lines, ambiguous targets and substantive trailing material still
require review. Current Version wording and placement are verified, not rewritten.

Validation: 1920 source tests, including 14 new regression tests; six controlled
PDFs freshly imported through PDF.js in Node. Exact digest and final insertion
match, a digest mismatch remains isolated, and excessive common-column indent
was reproduced and corrected. The Digest desktop renderer stage passed. The
unchanged preceding 1.21.4 release passed all 20 native desktop stages.

The new native test-digest-final-ui.cjs covers responsive split inputs, Digest
labeling and original amendment numbers, scoped marks, mismatch navigation, final insertion before zero,
original viewing, Refresh, independent removal, digest-only verification and
unchanged physical source. The full runner includes this stage plus all prior
real-bill, OCR, dictionary restart and offline engine stages (21 total).

Limitations: controlled checks are not an office accuracy measurement. Licensed
complete Merriam-Webster data, complete contextual rule automation, employee
testing and missing AB 109/SB 879 drafting material remain outstanding. This
build is published as the latest verified GitHub release.
