// The source is already masked with preserved offsets. LCB page 7 prints
// extremely low and very low open in the income series; page 14 lists the
// complete very low income phrase. Do not infer a suffix-only hyphen inside it.
export function openIncomeQualifierBefore(source,start){
 return /\b(?:extremely|very)\s+$/i.test(source.slice(Math.max(0,start-300),start));
}
