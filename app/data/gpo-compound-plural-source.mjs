// GPO 2016, PDF 103 / printed 89, rule 5.8. Physical columns establish
// which word receives the plural; the final-word examples are controls too.
export const GPO_58_SOURCE_FORMS=Object.freeze([
 ...['adjutants general','aides-de-camp','ambassadors at large','attorneys at law','attorneys general','billets-doux','bills of fare','brothers-in-law','chargés d’affaires','chiefs of staff','commanders in chief','comptrollers general','consuls general','courts-martial','crepes suzette','daughters-in-law','governors general','grants-in-aid','heirs at law','inspectors general','men-of-war','ministers-designate','mothers-in-law','notaries public','pilots-in-command','postmasters general','presidents-elect','prisoners of war','reductions in force','rights-of-way','secretaries general','sergeants at arms','sergeants major','solicitors general','surgeons general'].map(form=>Object.freeze({form,position:'first',pdfPage:103,printedPage:89})),
 ...['assistant attorneys general','assistant chiefs of staff','assistant comptrollers general','assistant surgeons general'].map(form=>Object.freeze({form,position:'middle',pdfPage:103,printedPage:89})),
 ...['assistant attorneys','assistant commissioners','assistant corporation counsels','assistant directors','assistant general counsels','brigadier generals','deputy judges','deputy sheriffs','general counsels','judge advocates','judge advocate generals','lieutenant colonels','major generals','provost marshals','provost marshal generals','quartermaster generals'].map(form=>Object.freeze({form,position:'last',pdfPage:103,printedPage:89}))
]);
// Finite malformed source-example variants, not a productive plural rule.
export const GPO_58_REMAINDER_VARIANTS=Object.freeze([
 ['aide-de-camps','aides-de-camp'],['billet-douxs','billets-doux'],['bill of fares','bills of fare'],
 ['chargé d’affaires','chargés d’affaires',true],['crepe suzettes','crepes suzette'],['man-of-wars','men-of-war'],['sergeant at arms','sergeants at arms',true],
 ['assistant attorney generals','assistant attorneys general'],['assistant chief of staffs','assistant chiefs of staff'],['assistant comptroller generals','assistant comptrollers general'],['assistant surgeon generals','assistant surgeons general'],
 ['assistants attorney general','assistant attorneys general'],['assistants chief of staff','assistant chiefs of staff'],['assistants comptroller general','assistant comptrollers general'],['assistants surgeon general','assistant surgeons general']
].map(([variant,preferred,requiresPlural=false])=>Object.freeze({rule:'5.8',variant,preferred,requiresPlural})));
