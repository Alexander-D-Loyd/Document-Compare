import {californiaCountyIssues} from './style-california-counties.mjs';
import {jointStylisticIssues} from './joint-style.mjs';
import {californiaCodeIssues} from './style-california-codes.mjs';
import {attachGuideEvidence} from './style-guide-evidence.mjs';
import {lcbSourceReviewIssues} from './style-lcb-source-review.mjs';
import {lcbEntitySourceReviewIssues} from './style-lcb-entity-source-review.mjs';
import {californiaEntityReview} from './style-california-entities.mjs';
import {lcbParserReviewIssues} from './style-lcb-parser-review.mjs';
import {lcbSentenceReview} from './style-lcb-sentence-review.mjs';
import {lcbNumericalUncertaintyIssues} from './style-lcb-numerical-uncertainty.mjs';
import {lcbCreatedTitleIdentityReviewIssues} from './style-lcb-review-created-title-identity.mjs';
import {corporationLetterIssues} from './style-corporation-letters.mjs';
import {californiaCitationReview} from './style-california-citations.mjs';
import {lcbTableCellIssues} from './style-lcb-review-table-cells.mjs';
import {lcbIncompleteAnalysisIssues} from './style-lcb-analysis-coverage.mjs';
// The supplied lists are additional references, separate from the LCB/GPO
// rule engine. Identical capitalization questions need only one visible owner.
export function reviewStyleIssues(doc,references,options={}){
 const guides=jointStylisticIssues(doc,references,options),codes=californiaCodeIssues(doc).map(i=>attachGuideEvidence(i,references));
 const counties=californiaCountyIssues(doc).map(i=>attachGuideEvidence(i,references));
 const base=[...guides.filter(i=>![...codes,...counties].some(c=>c.start===i.start&&c.end===i.end&&c.suggestion===i.suggestion)),...codes,...counties];
 const citationReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?californiaCitationReview(doc,references,{includeContextReview:true}):{issues:[],ranges:[]};
 const sentenceReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbSentenceReview(doc,references,{existingIssues:base,citationRanges:citationReview.ranges}):{issues:[],superseded:[]};
 const precise=base.filter((i,index)=>!sentenceReview.superseded.includes(index)&&!(i.checkId==='numerals'&&citationReview.ranges.some(r=>r.start<=i.start&&r.end>=i.end)));
 precise.push(...citationReview.issues);
 const complete=options.includeCompleteLcbReview&&options.includeReviewSuggestions;
 const analysisReview=complete?lcbIncompleteAnalysisIssues(doc,references):[];
 if(complete){
  precise.push(...lcbTableCellIssues(doc,references,{existingIssues:precise,includeUnresolvedForms:true,unresolvedOnly:true}));
  // The LCB explicitly quotes the classification letter, not the entire
  // surrounding prose. The dedicated detector protects enclosing literals.
  precise.push(...corporationLetterIssues(doc,references).filter(i=>!precise.some(p=>p.start<i.end&&p.end>i.start)));
  precise.push(...lcbCreatedTitleIdentityReviewIssues(doc,references,{existingIssues:precise}));
  precise.push(...lcbNumericalUncertaintyIssues(doc,references,{existingIssues:precise}));
 }
 const parserReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbParserReviewIssues(doc,references,{...options,existingIssues:precise}):[];
 const entityReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbEntitySourceReviewIssues(doc,references,{...options,existingIssues:[...precise,...parserReview]}):[];
 const nameRanges=options.includeCompleteLcbReview&&options.includeReviewSuggestions?californiaEntityReview(doc,references,options).ranges:[];
 const sourceReview=options.includeCompleteLcbReview&&options.includeReviewSuggestions?lcbSourceReviewIssues(doc,references,{engineIssues:options.engineIssues||[],existingIssues:[...precise,...parserReview,...entityReview,...nameRanges]}):[];
 return [...precise,...sentenceReview.issues,...parserReview,...entityReview,...sourceReview,...analysisReview].map(i=>attachGuideEvidence(i,references)).sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id}));
}
