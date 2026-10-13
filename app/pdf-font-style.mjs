// Embedded and bundled-standard fonts can omit the PDF.js boolean style
// flags. Their exported source face name is still evidence of a named style.
// Do not infer style from a generated font ID, family name, or the words drawn.
// These two original LCB faces are serif, but their embedded descriptors
// declare only the Symbolic flag. PDF.js consequently reports sans-serif.
const lcbSerifFaces=new Set(['TimesLDC','MinionPC']);
export function pdfFontStyle(style={},font={}){
  const name=typeof font.name==='string'?font.name:typeof style.name==='string'?style.name:'';
  const sourceFace=name.replace(/^[A-Z]{6}\+/,'');
  const family=style.fontFamily==='sans-serif'&&lcbSerifFaces.has(sourceFace)?{fontFamily:'serif'}:{};
  const face=/(?:^|[-_,+])((?:Bold|SemiBold|DemiBold)?(?:Italic|Oblique)|Bold|SemiBold|DemiBold)(?:MT|PS)?$/i.exec(name)?.[1]||'';
  return {...style,...family,name,bold:typeof font.bold==='boolean'?font.bold:/bold/i.test(face),italic:typeof font.italic==='boolean'?font.italic:/italic|oblique/i.test(face)};
}
