"""Verified missing-ToUnicode glyph mappings for the bundled 2016 GPO PDF.
Only the listed source fonts are handled. Other fonts/symbols remain literal.
ASCII IDs and special glyphs were checked against rendered source pages
330, 416, 425 and 434 plus the original extracted word contexts.
"""
import re
from collections import defaultdict
SERIF_FONTS={'Century-Book','Century-BookItalic','Century-Bold','Century-BoldItalic','IonicMT','IonicMT-Italic'}
SERIF_SPECIAL={116:'´',212:'—',213:'‘',214:'’',216:'“',217:'”',229:'fi',230:'fl'}
TIMES_SPECIAL={177:'–',178:'—',182:'’',191:'fi',192:'fl'}
CID=re.compile(r'\(cid:(\d+)\)')
def decode_missing_glyph(text,fontname):
 m=CID.fullmatch(text)
 if not m:return None
 font=re.sub(r'^[A-Z]{6}\+','',fontname);cid=int(m[1])
 if font not in SERIF_FONTS and font!='TimesNewRomanPSMT':return None
 if 3<=cid<=97:return chr(cid+29)
 return (TIMES_SPECIAL if font=='TimesNewRomanPSMT' else SERIF_SPECIAL).get(cid)
def restore_page_glyphs(page):
 values=defaultdict(set);restored=0;unresolved=0
 for char in page.chars:
  m=CID.fullmatch(char['text'])
  if not m:continue
  decoded=decode_missing_glyph(char['text'],char['fontname'])
  if decoded is None:unresolved+=1;values[int(m[1])].add(None);continue
  values[int(m[1])].add(decoded);char['text']=decoded;restored+=1
 mapping={cid:next(iter(v)) for cid,v in values.items() if len(v)==1 and None not in v}
 return mapping,restored,unresolved
def restore_index_text(text,mapping):
 return CID.sub(lambda m:mapping.get(int(m[1]),m[0]),text)
