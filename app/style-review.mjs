import {californiaCountyIssues} from './style-california-counties.mjs';
import {jointStylisticIssues} from './joint-style.mjs';
import {californiaCodeIssues} from './style-california-codes.mjs';
import {attachGuideEvidence} from './style-guide-evidence.mjs';
import {lcbSourceReviewIssues} from './style-lcb-source-review.mjs';
import {lcbEntitySourceReviewIssues} from './style-lcb-entity-source-review.mjs';
import {californiaEntityReview} from './style-california-entities.mjs';
import {lcbSentenceReview} from './style-lcb-sentence-review.mjs';
import {lcbNumericalUncertaintyIssues} from './style-lcb-numerical-uncertainty.mjs';
import {lcbCreatedTitleIdentityReviewIssues} from './style-lcb-review-created-title-identity.mjs';
import {corporationLetterIssues} from './style-corporation-letters.mjs';
import {californiaCitationReview} from './style-california-citations.mjs';
import {lcbTableCellIssues} from './style-lcb-review-table-cells.mjs';
// The supplied lists are additional references, separate from the LCB/GPO
// rule engine. Identical capitalization questions need only one visible owner.
export function reviewStyleIssues(doc,references,options={}){
 // Valid listed words do not become findings because a parser or meaning
 // reviewer can propose another interpretation of otherwise ordinary prose.
 const guides=jointStylisticIssues(doc,references,options).filter(i=>!i.checkId?.startsWith('lcb-semantic-review:')),codes=californiaCodeIssues(doc).map(i=>attachGuideEvidence(i,references));
 const counties=californiaCountyIssues(doc).map(i=>attachGuideEvidence(i,references));
 const base=[...guides.filter(i=>![...codes,...counties].some(c=>c.start===i.start&&c.end===i.end&&c.suggestion===i.suggestion)),...codes,...counties];
 const citationReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?californiaCitationReview(doc,references,{includeContextReview:true}):{issues:[],ranges:[]};
 const sentenceReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbSentenceReview(doc,references,{existingIssues:base,citationRanges:citationReview.ranges,includeSeriesReview:false}):{issues:[],superseded:[]};
 const precise=base.filter((i,index)=>!sentenceReview.superseded.includes(index)&&!(i.checkId==='numerals'&&citationReview.ranges.some(r=>r.start<=i.start&&r.end>=i.end)));
 precise.push(...citationReview.issues);
 const complete=options.includeCompleteLcbReview&&options.includeReviewSuggestions;
 if(complete){
  precise.push(...lcbTableCellIssues(doc,references,{existingIssues:precise,includeUnresolvedForms:true,unresolvedOnly:true}));
  // The LCB explicitly quotes the classification letter, not the entire
  // surrounding prose. The dedicated detector protects enclosing literals.
  precise.push(...corporationLetterIssues(doc,references).filter(i=>!precise.some(p=>p.start<i.end&&p.end>i.start)));
  precise.push(...lcbCreatedTitleIdentityReviewIssues(doc,references,{existingIssues:precise}));
  precise.push(...lcbNumericalUncertaintyIssues(doc,references,{existingIssues:precise}));
 }
 // General noun grouping, modifier attachment and competing grammatical
 // parses are outside the product's explicit source-comparison scope.
 const entityReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbEntitySourceReviewIssues(doc,references,{...options,existingIssues:precise}):[];
 const nameRanges=options.includeCompleteLcbReview&&options.includeReviewSuggestions?californiaEntityReview(doc,references,options).ranges:[];
 const sourceReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbSourceReviewIssues(doc,references,{engineIssues:options.engineIssues||[],existingIssues:[...precise,...entityReview,...nameRanges]}):[];
 return [...precise,...sentenceReview.issues,...entityReview,...sourceReview].map(i=>attachGuideEvidence(i,references)).sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id}));
}
