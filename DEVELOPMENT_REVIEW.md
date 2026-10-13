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
was reproduced and corrected. Desktop renderer verification is pending. The
unchanged preceding 1.21.4 release passed all 20 native desktop stages.

The new native test-digest-final-ui.cjs covers responsive split inputs, Digest
labeling and original amendment numbers, scoped marks, mismatch navigation, final insertion before zero,
original viewing, Refresh, independent removal, digest-only verification and
unchanged physical source. The full runner includes this stage plus all prior
real-bill, OCR, dictionary restart and offline engine stages (21 total).

Limitations: controlled checks are not an office accuracy measurement. Licensed
complete Merriam-Webster data, complete contextual rule automation, employee
testing and missing AB 109/SB 879 drafting material remain outstanding. This
source accompanies the 1.21.5 GitHub release; desktop verification is pending.
