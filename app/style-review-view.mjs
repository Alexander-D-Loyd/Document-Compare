// Eligibility belongs to the source-backed detector pipeline. Every retained
// finding is shown; a view preference cannot revive unsupported generators.
export function styleReviewView(allIssues,{accept=()=>true}={}){
 return {issues:allIssues.filter(accept)};
}
