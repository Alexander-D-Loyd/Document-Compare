# Functionality audit — October 14, 2026

The current source was reviewed with the full regression suite, independent
source-range controls and the bundled language runtime. No additional confirmed
PDF/UI lifecycle regression was found. This is a bounded regression audit, not
proof of every possible document layout or measured office accuracy.

| Area | Verification and result |
| --- | --- |
| PDF intake and OCR | Import limits, hybrid/raster reading, source uncertainty, masks, Unicode, page boundaries and original geometry controls retained. |
| Comparison and amendments | Full-range highlights, discrepancy categories, both-pane navigation, end-of-bill insertion and referenced-body safeguards retained. |
| Digest | Red/blue changed-word ranges, Digest label, unchanged instruction numbering, original viewer and quiet selected display retained. |
| Uploads and state | Shared optional-upload trash, independent replacement, pending-read cancellation, Refresh and stale-result guards retained. |
| JR Boxes | Separate reader indication and exclusion from amendment/language payloads retained. |
| Language and saved data | Current-only grammar/spelling, dictionary/importer persistence and failure controls, Ignore/Ignore All/Undo and cancellation/recovery retained. |
| LCB/GPO style | Explicit source conditions, LCB priority, correct-form controls, exact source selections and bill-local quote reset verified. Generic compound and fuzzy identity generators remain disabled. |
| Bundled engines | Actual staged LanguageTool/spaCy controls, 75-entry printed modifier catalogue, UTF-16/page mapping and cancellation/recovery pass. |

The audit repaired temperature-name detection: partial Unicode words, damaged
source evidence, original quotation payloads and extended titles no longer
establish Celsius/Fahrenheit corrections. Actual temperature forms and LCB's
accepted centigrade choice retain their existing behavior. Original literal
protection now also applies at the final style gate without disabling the
separate quotation-punctuation detector.

Four old source-test expectations were updated to the user-requested bounded
data-sharing agreement/agreements behavior. The unlisted engine rule remains
disabled; the application check cites LCB8 item1 and produces one owner. Ordinary
data sharing, other unlisted heads and quoted bill-local terms remain protected.

The audit accounts for all 663 canonical LCB entries: 650 demonstrated bounded
checks, seven specialized aliases, four prefix/authority/meaning dependencies,
and two C/S corporation quoted-term exceptions. Each recorded result retains
the actual source passage, test construction and stated role limits. This does
not certify whole-rule semantic completeness. The complete nonlexical inventory
also preserves document-type, authority and manual-review dependencies.

Native evidence is separate: the frozen 1.21.11 stabilization snapshot passed
all 21 desktop stages across a full run and targeted corrected-fixture Undo
rerun against the unchanged package. That verifies the Digest/UI stabilization,
but excludes newer LCB expansion code. Native desktop verification of the entire
1.21.12 release remains unrun. The release keeps the same Electron and bundled
offline runtime and verifies archive/file hashes independently.

Remaining practical limits include opinions/cover-letter classification,
unavailable complete licensed dictionary authority, deferred drafting material,
some budget/layout/font cases and employee benchmarking. Findings are review
prompts; no findings is not a compliance certificate.
