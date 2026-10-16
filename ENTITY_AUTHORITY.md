# Offline Entity Authority

Open **Style Guides → Entity Authority** to inspect the name list used by
selected LCB page 17 complete-name and official-title checks. Item 7 directs
readers to the California Entities list; item 1 covers complete official names
and titles. The app starts with the supplied California
Entities snapshot: 512 listed names, including 482 eligible for exact case
comparison. Its authoritative source date is unknown. Historical entries are
retained as supplied; a missing name is not evidence of an error.

## Import, search and restore

1. Choose **Import Authorized Entity Data** and select a local JSON export in
   the format below. Confirm that the source permits your intended offline use
   before preparing the export.
2. The panel displays the selected source, its stated as-of date or **unknown**,
   import time, citation, imported file hash, and listed/eligible name counts.
   Use the guide search field to search names, categories, citations or notes.
   Up to 100 matching rows are shown; narrow the search to find further rows.
3. Choose **Use Bundled Snapshot** to remove the imported selection and restore
   the supplied list. This control also permits recovery after a saved import
   cannot be loaded.

The selected export replaces the snapshot for the supported complete-name
case comparisons and registry-backed official-head review. The lists are not
merged. Unknown names, substantive wording differences, ambiguous short
titles, placeholders and legal identity remain outside those comparisons.
An eligible complete name supplies a case-comparison witness, not proof that
an entity or office is legally current. Official-head review also requires its
separate complete role and personal-name evidence.

The selection is saved in this application's local profile and loaded on
restart. It applies to subsequent checks and bills until restored or replaced.
Bill-local quoted-term exceptions remain separate and reset with their bill;
importing entity data does not create a permanent quoted-term exception.
Changing the selection clears stale style results and style ignores. If style
review is active, the app starts a fresh check using the selected data.

Import and restore become active only after their storage transaction commits.
An invalid file or failed save/restore retains the previous active selection.
If a saved import is corrupt or unavailable on startup, the panel reports the
problem and uses the bundled list; it does not silently delete the saved data.
Source JSON and PDF files remain unchanged. No update is fetched online.

## JSON format

Start with [the incomplete template](examples/entity-authority/authorized-entities.template.json).
It intentionally fails validation until metadata, permission attestation and
at least one actual supplied row are filled in. Version 1 accepts exact names;
it has no active alias field. Unknown fields are discarded.

| Field | Required value |
| --- | --- |
| `format` | `document-compare.california-entities` |
| `version` | `1` |
| `source.title` | Nonempty source title, at most 300 characters |
| `source.authority` | Nonempty supplying authority, at most 1,000 characters |
| `source.citation` | Nonempty source citation, at most 2,000 characters |
| `source.asOfDate` | Actual authoritative `YYYY-MM-DD` date, or `null` when unknown |
| `source.permissions` | Nonempty statement of permission for offline use, at most 2,000 characters |
| `source.rightsAttested` | `true`, after permission is confirmed for this export |
| `source.originalFile` | Optional original source label, at most 260 characters |
| `source.declaredSourceSHA256` | Optional original-source claim: 64 lowercase hexadecimal characters |
| `entries` | Array of 1–10,000 rows |
| `entries[].name` | Exact complete name, at most 600 characters, without outer whitespace |
| `entries[].category` | Nonempty category, at most 200 characters |
| `entries[].citation` | Row citation, at most 2,000 characters; may be empty |
| `entries[].annotation` | Source note, at most 4,000 characters; may be empty |
| `entries[].checkEligible` | Explicit boolean; retain `false` for reference-only rows |
| `entries[].paragraph` | Optional source paragraph integer from 1 through 1,000,000 |

Eligible names must have at least three whitespace-separated words and cannot
contain placeholder brackets, an ellipsis or `etc.`. This minimum does not make
an otherwise ambiguous name safe: preserve the source's eligibility decisions.
Case and selected apostrophe/dash typography duplicates are rejected. Names
and metadata reject hidden controls and invalid lone Unicode surrogates.

Files must be valid UTF-8 JSON, no larger than 50 MB. Aggregate row text is
limited to 20 million characters. Names and metadata are displayed as text.
Direct DOCX import, automatic alias generation and online source verification
are not implemented.

## Dates and hashes

`source.asOfDate` describes the authority data. Never substitute today's date
or the date of import when the source date is unknown.

The app creates `datasetId` from the SHA-256 of the exact imported JSON bytes,
along with `inputFile` and the UTC `importedAt` timestamp. Do not place a trusted
receipt in the export: incoming transport claims are discarded and generated
again from the selected file. JSON whitespace changes can alter the file hash
without changing its names. The optional `declaredSourceSHA256` identifies a
claimed original document separately; importing JSON does not verify an
absent original document against that claim.

These values provide provenance. They do not authenticate source accuracy,
permission, legal status or freshness. The store retains normalized data and
its import receipt, rather than the raw input file bytes.

## Illustrative sample and verification limits

[The supplied-name sample](examples/entity-authority/illustrative-supplied-entities.sample.json)
contains six unchanged rows from the existing snapshot, including four eligible
names and two reference-only entries. It is explicitly a **partial illustration,
not a current official authority**. Importing it would replace the full active
list with six rows. Its permission statement applies only to this authorized
local illustration; it cannot authorize a future replacement export.

The source schema, transaction handling and selected-data integration have
automated checks. Native packaged-app import, restart, search and restore
verification remain separate; this document does not claim desktop or office
accuracy certification.
