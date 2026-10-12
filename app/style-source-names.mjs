// Literal names encountered in the source corpus. These are preserved as
// names, not offered as a general dictionary of legally authoritative names.
// Optional end-of-line division keeps the protected range in source offsets.
const names=['Department of Healthcare Access and Information','Missing Persons DNA Data Base Fund','California Healthcare, Research and Prevention Tobacco Tax Act','Municipal Storm Water and Urban Runoff Discharges Mandate','School Bus Safety I and II','Centers for Medicare and Medicaid Services','Emerging Threats 2 IT Project',
 'Special Olympics of Northern and Southern California',
 'Mathematics Framework for California Public Schools: Kindergarten Through Grade Twelve',
 'English Language Arts/English Language Development Framework for California Public Schools: Kindergarten Through Grade Twelve',
 'Alzheimer’s Disease Program','California Alzheimer’s Disease Centers','Alzheimer’s Disease and Related Disorders Advisory Committee',
 'Clean Cars 4 All Program','2026 University Capital Outlay Bond Fund Conditions',
];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function sourceNameRanges(source){
 const ranges=[];
 for(const name of names){const pattern=name.split(' ').map(w=>[...w].map(c=>/[’']/.test(c)?'[’\']':escape(c)).join('(?:-\\s*)?')).join('\\s+');for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','g')))ranges.push({start:m.index,end:m.index+m[0].length});}
 return ranges;
}
