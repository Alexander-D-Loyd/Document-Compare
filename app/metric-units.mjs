// GPO 9.56, source page 250: prefixes and the meter/gram/liter symbols.
// Preserve prefix case: m (milli) and M (mega) identify different quantities.
const prefixes=[['',''],['yotta','Y'],['zetta','Z'],['exa','E'],['peta','P'],['tera','T'],['giga','G'],['mega','M'],['kilo','k'],['hecto','h'],['deka','da'],['deci','d'],['centi','c'],['milli','m'],['micro','μ'],['nano','n'],['pico','p'],['femto','f'],['atto','a'],['zepto','z'],['yocto','y']];
const basicUnits=prefixes.flatMap(([name,prefix])=>[['meter','m'],['gram','g'],['liter','L']].map(([base,symbol])=>({name:name+base,symbol:prefix+symbol,page:250,rule:'9.56'})));
// GPO 9.57, page 251: only the explicitly printed electrical forms.
// Do not generate unlisted prefix/unit combinations from this table.
const electricalUnits=[['ampere','A'],['voltampere','VA'],['farad','F'],['henry','H'],['hertz','Hz'],['joule','J'],['kilocycle','kc'],['kilovolt','kV'],['kilovoltampere','kVA'],['kilowatt','kW'],['volt','V'],['watt','W'],['millifarad','mF'],['millihenry','mH'],['microfarad','μF']].map(([name,symbol])=>({name,symbol,page:251,rule:'9.57',plural:name.endsWith('henry')?name.slice(0,-1)+'ies':name==='hertz'?'hertz':name+'s'}));
export const METRIC_UNITS=[...basicUnits,...electricalUnits];
// LCB page 19 provides these explicit name/symbol definitions, including
// megabytes (not an SI base unit). Keep their authority separate from GPO's
// finite electrical table and preserve case-sensitive prefix/bit distinctions.
export const LCB_LISTED_UNIT_DEFINITIONS=[
 {name:'kilowatt',symbol:'kW',page:19,rule:'Capitalization examples: kilowatt',guideId:'lcb',gpoPage:251,gpoRule:'9.57'},
 {name:'megawatt',symbol:'MW',page:19,rule:'Capitalization examples: megawatt',guideId:'lcb'},
 {name:'megabyte',symbol:'MB',page:19,rule:'Capitalization examples: megabyte',guideId:'lcb',gpoPage:264,gpoRule:'Abbreviations and Letter Symbols'},
];
export const METRIC_SYMBOLS=[...new Set(METRIC_UNITS.map(r=>r.symbol).concat(METRIC_UNITS.filter(r=>r.symbol.includes('μ')).map(r=>r.symbol.replace('μ','µ')),LCB_LISTED_UNIT_DEFINITIONS.map(r=>r.symbol)))];
