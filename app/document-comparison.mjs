// Compare the active wording in both roles. The complete source text and
// strike ranges stay in each document for its PDF display and amendments.
export const documentComparisonTokens=doc=>doc.effectiveTokens||doc.tokens;
