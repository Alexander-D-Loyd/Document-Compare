// Transcribed from the user's supplied image. These are exact reference forms,
// not statutory text, section-number data, or an LCB/GPO source passage.
export const CALIFORNIA_CODES_SOURCE=Object.freeze({
 title:'California Codes', suppliedBy:'User-supplied reference image', asOfDate:null,
 file:'codex-clipboard-a16e4bdc-976b-4440-8bbc-ae5f24f6a227.png',
 sha256:'d184392c63b43cc8051ed2e63a6ead3d9550de88e3761919583c01bae40fab4e'
});
export const CALIFORNIA_CODES=Object.freeze([
 ['Business and Professions Code','BPC'],['Civil Code','CIV'],['Code of Civil Procedure','CCP'],
 ['Commercial Code','COM'],['Corporations Code','CORP'],['Education Code','EDC'],
 ['Elections Code','ELEC'],['Evidence Code','EVID'],['Family Code','FAM'],['Financial Code','FIN'],
 ['Fish and Game Code','FGC'],['Food and Agricultural Code','FAC'],['Government Code','GOV'],
 ['Harbors and Navigation Code','HNC'],['Health and Safety Code','HSC'],['Insurance Code','INS'],
 ['Labor Code','LAB'],['Military and Veterans Code','MVC'],['Penal Code','PEN'],['Probate Code','PROB'],
 ['Public Contract Code','PCC'],['Public Resources Code','PRC'],['Public Utilities Code','PUC'],
 ['Revenue and Taxation Code','RTC'],['Streets and Highways Code','SHC'],
 ['Unemployment Insurance Code','UIC'],['Vehicle Code','VEH'],['Water Code','WAT'],
 ['Welfare and Institutions Code','WIC']
].map(([name,shorthand])=>Object.freeze({name,shorthand})));
export const CALIFORNIA_CODES_SCOPE='Exact, case-sensitive code names and shorthand from the user-supplied 29-row list. PDF layout whitespace and recognized word divisions are ignored. The hyphen between a name and its shorthand is only a separator. Checks recognized code-title citations, shorthand with section/citation cues, and name–shorthand pairs, including quoted citations. Unknown forms require review. Ordinary acronyms, generic codes, and identified foreign or federal codes are excluded. This does not validate section numbers, statutory text, legal effect, or source currency.';
export function searchCaliforniaCodes(query=''){
 const terms=query.toLocaleLowerCase('en-US').split(/\s+/u).filter(Boolean);
 return CALIFORNIA_CODES.filter(e=>terms.every(t=>(e.name+' '+e.shorthand).toLocaleLowerCase('en-US').includes(t)));
}
