"""Source-listed unit modifiers, with explicit uncertainty for reader review.

Direct grammatical attachment supplies a stronger witness. An open listed
phrase immediately before a noun can also be a review suggestion; the parser
does not manufacture a corrected sentence to establish its own evidence.
"""
import re

NUMBER_RELATION_RULE='LCB_PARSED_NUMBER_RELATION_REVIEW'
COORDINATED_NUMBER_RELATION_RULE='LCB_COORDINATED_NUMBER_RELATION_REVIEW'
MIXED_COUNT_LIST_RULE='LCB_MIXED_COUNT_LIST_REVIEW'
SMALL_CARDINALS={word:value for value,word in enumerate(['zero','one','two','three','four','five','six','seven','eight','nine'])}
CARDINAL_WORDS=set(SMALL_CARDINALS)|{'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand','million','billion','trillion','and'}
CARDINAL_ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
CARDINAL_TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
CARDINAL_VALUES={**{w:i for i,w in enumerate(CARDINAL_ONES)},**{w:(i+2)*10 for i,w in enumerate(CARDINAL_TENS[2:])}}
CARDINAL_SCALES={'thousand':1000,'million':10**6,'billion':10**9,'trillion':10**12}
CANONICAL_FIGURE=re.compile(r'(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)')
MAX_SAFE_INTEGER_DIGITS='9007199254740991'

def spelled_cardinal(value):
 if value<20:return CARDINAL_ONES[value]
 if value<100:return CARDINAL_TENS[value//10]+(' '+CARDINAL_ONES[value%10]if value%10 else '')
 for scale,name in [(10**12,'trillion'),(10**9,'billion'),(10**6,'million'),(1000,'thousand'),(100,'hundred')]:
  if value>=scale:return spelled_cardinal(value//scale)+' '+name+(' '+spelled_cardinal(value%scale)if value%scale else '')

def count_value(text):
 normalized=re.sub(r'[\s-]+',' ',text.lower()).strip()
 if CANONICAL_FIGURE.fullmatch(normalized):
  digits=normalized.replace(',','')
  if len(digits)>len(MAX_SAFE_INTEGER_DIGITS)or(len(digits)==len(MAX_SAFE_INTEGER_DIGITS)and digits>MAX_SAFE_INTEGER_DIGITS):return None
  return int(digits)
 words=normalized.split();scales={'hundred',*CARDINAL_SCALES}
 if any(w=='and'and(i==0 or words[i-1]not in scales or i+1==len(words)or words[i+1]=='and')for i,w in enumerate(words)):return None
 words=[w for w in words if w!='and'];total=part=0
 for word in words:
  if word in CARDINAL_VALUES:part+=CARDINAL_VALUES[word]
  elif word=='hundred':part=(part or 1)*100
  elif word in CARDINAL_SCALES:total+=(part or 1)*CARDINAL_SCALES[word];part=0
  else:return None
 value=total+part
 return value if value<=9007199254740991 and spelled_cardinal(value)==' '.join(words)else None

def count_at_least_ten(text):
 """Exact threshold only; arbitrary-length figures never become Python ints.

 None means an unsupported expression, not a count below ten. Retain whole
 canonical source digits and let the mapper independently recheck them.
 """
 source=text.strip()
 if CANONICAL_FIGURE.fullmatch(source):return len(source.replace(',',''))>1
 if any(character.isdecimal()for character in source):return None
 value=count_value(source)
 return None if value is None else value>=10

def count_span(token):
 """Keep the complete adjacent cardinal expression, never its small suffix."""
 doc=token.doc;sentence=token.sent;a=token.i;b=token.i+1
 def cardinal(t):return t.lower_ in CARDINAL_WORDS or bool(re.fullmatch(r'\d+(?:,\d{3})*',t.text))
 def connected(left,right):return not doc.text[left.idx+len(left.text):right.idx].strip()
 while a>sentence.start:
  if cardinal(doc[a-1])and connected(doc[a-1],doc[a]):a-=1
  elif a>sentence.start+1 and doc[a-1].text=='-'and cardinal(doc[a-2])and connected(doc[a-2],doc[a-1])and connected(doc[a-1],doc[a]):a-=2
  else:break
 while b<min(sentence.end,token.head.i):
  if cardinal(doc[b])and connected(doc[b-1],doc[b]):b+=1
  elif b+1<min(sentence.end,token.head.i)and doc[b].text=='-'and cardinal(doc[b+1])and connected(doc[b-1],doc[b])and connected(doc[b],doc[b+1]):b+=2
  else:break
 # A conjunction is part of an expression only between cardinal words.
 while a<b and doc[a].lower_=='and':a+=1
 while b>a and doc[b-1].lower_=='and':b-=1
 return doc[a:b]

def number_relation_candidates(doc):
 """Parser-backed count relationships are questions for a reader, not edits.

 A direct nummod and a shared common-noun lemma establish a bounded candidate.
 JavaScript independently validates whole number values, original sentence
 evidence, legal identifiers, mathematical expressions and source exclusions.
 """
 for sentence in doc.sents:
  groups={}
  for token in sentence:
   head=token.head
   if token.dep_!='nummod'or head.pos_!='NOUN'or head.sent!=sentence or token.i>=head.i or not head.text.islower()or not head.text.isalpha():continue
   span=count_span(token)
   if not span or span.end>head.i:continue
   text=span.text.lower()
   if count_at_least_ten(text)is None:continue
   record=(span,head);group=groups.setdefault(head.lemma_.casefold(),[])
   if not any(s.start==span.start and s.end==span.end and h.i==head.i for s,h in group):group.append(record)
  for lemma,members in groups.items():
   for span,head in members:
    value=SMALL_CARDINALS.get(span.text.casefold())
    if value is None or value<1:continue
    peers=[(s,h)for s,h in members if s.start!=span.start and count_at_least_ten(s.text)is True]
    # The nearest potentially large peer suffices; its value is independently
    # checked in the source mapper. No parser confidence is a legal conclusion.
    peers.sort(key=lambda pair:abs(pair[0].start-span.start))
    for peer,peer_head in peers[:1]:
     yield {'start':span.start_char,'end':span.end_char,'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'headLemma':lemma,'peerStart':peer.start_char,'peerEnd':peer.end_char,'peerHeadStart':peer_head.idx,'peerHeadEnd':peer_head.idx+len(peer_head.text),'peerHead':peer_head.text,'peerHeadLemma':peer_head.lemma_.casefold(),'evidenceStart':sentence.start_char,'evidenceEnd':sentence.end_char,'conditionalSuggestion':str(value),'suggestion':None,'reviewSuggested':True,'engine':'spaCy','engineRule':NUMBER_RELATION_RULE}
 yield from coordinated_number_relation_candidates(doc)
 yield from mixed_count_list_candidates(doc)

def coordinated_number_relation_candidates(doc):
 """Different common-noun counts may be related within nominal coordination.

 The complete attachment paths and source conjunction/comma witnesses are
 retained. Coordination does not establish quantity meaning; the source
 mapper protects units/references and asks the reader rather than editing.
 Try all large peers, so an independently protected nearest peer cannot hide
 another valid question. The joint checker owns each selected count once.
 """
 role=lambda t:{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_,'lemma':t.lemma_.casefold(),'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}
 def path_for(head):
  path=[head];markers=[];seen={head.i};child=head
  while child.dep_=='conj':
   parent=child.head
   if parent.i in seen or parent.pos_!='NOUN'or not parent.text.islower()or not parent.text.isalpha()or parent.i>=child.i or parent.sent!=head.sent:return None
   cues=[t for t in parent.children if parent.i<t.i<child.i and(t.dep_=='cc'and t.lower_ in {'and','or','nor'}or t.dep_=='punct'and t.text==',')]
   if not cues:return None
   markers.append(role(cues[-1]));seen.add(parent.i);path.append(parent);child=parent
  return path,markers
 for sentence in doc.sents:
  groups={};seen=set()
  for token in sentence:
   head=token.head
   if token.dep_!='nummod'or head.pos_!='NOUN'or head.sent!=sentence or token.i>=head.i or not head.text.islower()or not head.text.isalpha():continue
   span=count_span(token);attachment=path_for(head)
   if not span or span.end>head.i or count_at_least_ten(span.text)is None or attachment is None:continue
   key=(span.start,span.end,head.i)
   if key in seen:continue
   seen.add(key);path,markers=attachment;groups.setdefault(path[-1].i,[]).append((span,head,token,path,markers))
  for members in groups.values():
   for span,head,token,path,markers in members:
    value=SMALL_CARDINALS.get(span.text.casefold())
    if value is None or value<1:continue
    peers=[r for r in members if r[1].lemma_.casefold()!=head.lemma_.casefold()and count_at_least_ten(r[0].text)is True]
    peers.sort(key=lambda r:abs(r[0].start-span.start))
    for peer,peer_head,peer_token,peer_path,peer_markers in peers:
     yield {'start':span.start_char,'end':span.end_char,'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'headLemma':head.lemma_.casefold(),'peerStart':peer.start_char,'peerEnd':peer.end_char,'peerHeadStart':peer_head.idx,'peerHeadEnd':peer_head.idx+len(peer_head.text),'peerHead':peer_head.text,'peerHeadLemma':peer_head.lemma_.casefold(),'evidenceStart':sentence.start_char,'evidenceEnd':sentence.end_char,'conditionalSuggestion':str(value),'suggestion':None,'reviewSuggested':True,'engine':'spaCy','engineRule':COORDINATED_NUMBER_RELATION_RULE,'coordinationEvidence':{'counts':[role(token),role(peer_token)],'paths':[[role(t)for t in path],[role(t)for t in peer_path]],'markers':[markers,peer_markers]}}

def mixed_count_list_candidates(doc):
 """A source-complete counted list can survive a middle appos parser label.

 Require at least three complete counts, comma separators and an explicit
 final conjunction. Retain every count, nominal path and punctuation role;
 ordinary explanatory apposition and discontinuous lists are insufficient.
 """
 role=lambda t:{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_,'lemma':t.lemma_.casefold(),'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}
 def path_for(head):
  path=[head];markers=[];seen={head.i};child=head
  while child.dep_ in {'conj','appos'}:
   parent=child.head
   if parent.i in seen or parent.pos_!='NOUN'or not parent.text.islower()or not parent.text.isalpha()or parent.i>=child.i or parent.sent!=head.sent:return None
   cues=[t for t in parent.children if parent.i<t.i<child.i and(t.dep_=='punct'and t.text==','or child.dep_=='conj'and t.dep_=='cc'and t.lower_ in {'and','or','nor'})]
   if not cues:return None
   markers.append(role(cues[-1]));seen.add(parent.i);path.append(parent);child=parent
  return path,markers
 for sentence in doc.sents:
  groups={};seen=set()
  for token in sentence:
   head=token.head
   if token.dep_!='nummod'or head.pos_!='NOUN'or head.sent!=sentence or token.i>=head.i or not head.text.islower()or not head.text.isalpha():continue
   span=count_span(token);attachment=path_for(head)
   if not span or span.end>head.i or count_at_least_ten(span.text)is None or attachment is None:continue
   key=(span.start,span.end,head.i)
   if key in seen:continue
   seen.add(key);path,markers=attachment;groups.setdefault(path[-1].i,[]).append((span,head,token,path,markers))
  for members in groups.values():
   members.sort(key=lambda r:r[0].start)
   if len(members)<3 or len({r[1].i for r in members})!=len(members)or not any(t.dep_=='appos'for r in members for t in r[3][:-1]):continue
   separators=[];valid=True
   for k in range(1,len(members)):
    previous=members[k-1][1];span=members[k][0];start=previous.idx+len(previous.text);end=span.start_char;text=doc.text[start:end]
    pattern=r'\s*,?\s*\b(?:and|or|nor)\s+'if k==len(members)-1 else r'\s*,\s*'
    if not re.fullmatch(pattern,text):valid=False;break
    separators.append({'start':start,'end':end,'text':text})
   if not valid:continue
   node_ids={r[1].i for r in members}
   if any(t.i not in node_ids for r in members for t in r[3]):continue
   last_path,last_markers=members[-1][3:]
   if len(last_path)<2 or last_path[0].dep_!='conj'or not last_markers or last_markers[0]['dep']!='cc':continue
   proof={'members':[{'start':s.start_char,'end':s.end_char,'headStart':h.idx,'headEnd':h.idx+len(h.text),'head':h.text,'lemma':h.lemma_.casefold(),'sourceText':s.text}for s,h,t,p,m in members],'counts':[role(r[2])for r in members],'paths':[[role(t)for t in r[3]]for r in members],'markers':[r[4]for r in members],'separators':separators}
   for span,head,token,path,markers in members:
    value=SMALL_CARDINALS.get(span.text.casefold())
    if value is None or value<1:continue
    peers=[r for r in members if r[1].lemma_.casefold()!=head.lemma_.casefold()and count_at_least_ten(r[0].text)is True];peers.sort(key=lambda r:abs(r[0].start-span.start))
    for peer,peer_head,peer_token,peer_path,peer_markers in peers:
     yield {'start':span.start_char,'end':span.end_char,'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'headLemma':head.lemma_.casefold(),'peerStart':peer.start_char,'peerEnd':peer.end_char,'peerHeadStart':peer_head.idx,'peerHeadEnd':peer_head.idx+len(peer_head.text),'peerHead':peer_head.text,'peerHeadLemma':peer_head.lemma_.casefold(),'evidenceStart':sentence.start_char,'evidenceEnd':sentence.end_char,'conditionalSuggestion':str(value),'suggestion':None,'reviewSuggested':True,'engine':'spaCy','engineRule':MIXED_COUNT_LIST_RULE,'mixedCountListEvidence':proof}

REPORTING_VERBS={'say','report','confirm','know','believe','state','testify','explain','assert','claim','find','conclude','determine','understand','learn','observe','notice','admit','deny','think','remember'}
REQUIRED_INFINITIVE=re.compile(r'\b(?:is|are|was|were|be|been|being)\s+(?:required|obligated)\s+(?!to\b|for\b|under\b|by\b|as\b|pursuant\b|in\b|of\b|at\b|and\b|or\b|that\b|which\b)([a-z]+)\b',re.I)

def missing_infinitive_candidates(doc):
 for match in REQUIRED_INFINITIVE.finditer(doc.text):
  governed=doc.char_span(match.start(1),match.end(1),alignment_mode='strict')
  if governed is None or len(governed)!=1:continue
  verb=governed[0]
  if verb.i==0 or verb.pos_!='VERB'or verb.tag_ not in {'VB','VBP'}or verb.text.casefold()!=verb.lemma_.casefold():continue
  required=doc[verb.i-1]
  if required.lemma_ not in {'require','obligate'}or required.tag_!='VBN'or required.sent!=verb.sent:continue
  if not any(child.dep_ in {'auxpass','aux'}and child.lemma_=='be'for child in required.children):continue
  # Nested clauses can attach the bare verb to an outer "require" instead
  # of the adjacent passive participle. Retain the local passive witness,
  # rather than accepting a distant or merely lexical required occurrence.
  direct=verb.tag_=='VB'and verb.dep_=='xcomp'and verb.head==required
  passive=any(child.dep_ in {'nsubjpass','csubjpass'}for child in required.children)
  if not direct and not passive:continue
  if any(child.lower_=='to'and child.dep_ in {'aux','mark'}for child in verb.children):continue
  span=doc[required.i:verb.i+1];sentence=verb.sent
  yield {'start':span.start_char,'end':span.end_char,'evidenceStart':sentence.start_char,'evidenceEnd':sentence.end_char,'suggestion':required.text+' to '+verb.text,'message':'Review Suggested: A passive required or obligated construction governs this bare infinitive without “to”. Check whether the infinitive marker is missing.','engine':'spaCy','engineRule':'SPACY_REQUIRED_INFINITIVE_REVIEW','reviewSuggested':True}

def nominal_head(doc,span):
 sentence=span[0].sent;head=None;previous=span[-1]
 for token in doc[span.end:sentence.end]:
  gap=doc.text[previous.idx+len(previous.text):token.idx]
  if gap and not gap.isspace():break
  # A later clause subject cannot replace the established nominal head.
  if head is not None and(token.dep_ in {'nsubj','nsubjpass','csubj','csubjpass'}or token.pos_=='ADV'):break
  if token.pos_ in {'NOUN','PROPN'}:head=token
  elif token.pos_ in {'ADJ','ADV'}:pass
  elif token.pos_=='VERB'and((token.tag_ in {'VBG','VBN','VBD'}and token.dep_ in {'amod','compound','acl'})or(head is None and token.tag_=='VBN'and token!=sentence.root and not any(c.dep_ in {'nsubj','nsubjpass','csubj','mark'}and not span.start<=c.i<span.end for c in token.children))):pass
  elif token.text=='-'and token.i>span.end and token.i+1<sentence.end and doc[token.i-1].text.isalpha()and doc[token.i+1].text.isalpha():pass
  else:break
  previous=token
 return head

def protected_verb_use(span):
 sentence=span[0].sent
 if span.start<=sentence.root.i<span.end:return True
 verbs=[t for t in span if t.pos_ in {'VERB','AUX'}]
 if any(any(c.dep_=='mark'and not span.start<=c.i<span.end for c in v.children)for v in verbs):return True
 if any(any(c.lower_=='to'and c.dep_ in {'aux','mark'}and c.i<span.start for c in v.children)for v in verbs):return True
 subject=any(t.dep_ in {'nsubj','nsubjpass','csubj','csubjpass'}and span.start<=t.head.i<span.end for t in span)
 return subject and sentence.root.lemma_.casefold()in REPORTING_VERBS

def lexical_hyphen_before(text,start):
 cursor=start-1
 while cursor>=0 and text[cursor].isspace():cursor-=1
 if cursor<0 or text[cursor]!='-':return False
 cursor-=1
 while cursor>=0 and text[cursor].isspace():cursor-=1
 return cursor>=0 and text[cursor].isalpha()

def attached(span,head):
 if not any(t.head==head and t.dep_ in {'compound','amod','acl','nmod'}for t in span):return False
 resolved=set()
 for token in span:
  if token.is_punct:continue
  visited=set();path=[]
  while span.start<=token.i<span.end:
   if token.i in resolved:break
   if token.i in visited:return False
   visited.add(token.i);path.append(token.i);token=token.head
  if token!=head and token.i not in resolved:return False
  resolved.update(path)
 return True

def noun_sequence_reviews(doc):
 """Complete noun-prefix roles; compound meaning remains unconfirmed.

 The complete parsed sequence, not an arbitrary word-count limit, supplies
 the candidate boundary. Whole clause attachments and finite evidence are
 still required; the worker's normal chunk/resource limits remain in force.
 """
 for first in doc:
  if first.pos_!='NOUN'or not first.text.isalpha()or lexical_hyphen_before(doc.text,first.idx):continue
  if first.i>first.sent.start:
   previous=doc[first.i-1]
   if previous.pos_=='NOUN'and previous.text.isalpha()and doc.text[previous.idx+len(previous.text):first.idx].isspace():continue
  root=first.sent.root
  finite=lambda t:t.pos_ in {'VERB','AUX'}and t.tag_ in {'VBD','VBP','VBZ','MD'}
  if not(finite(root)or any(finite(t)and t.dep_ in {'aux','auxpass','cop'}for t in root.children)):continue
  sequence=[first];cursor=first.i+1
  while cursor<first.sent.end:
   token=doc[cursor];previous=sequence[-1]
   if token.pos_!='NOUN'or not token.text.isalpha()or not doc.text[previous.idx+len(previous.text):token.idx].isspace():break
   sequence.append(token);cursor+=1
  if len(sequence)<2:continue
  span=doc[first.i:sequence[-1].i+1];head=nominal_head(doc,span)
  if head is None:
   if len(sequence)<3:continue
   span=doc[first.i:sequence[-1].i];head=sequence[-1]
  if len(span)<2 or head.pos_ not in {'NOUN','PROPN'}or any(t.dep_ not in {'compound','nmod'}for t in span)or protected_verb_use(span)or not attached(span,head):continue
  if head.dep_ in {'compound','nmod'}:continue
  governing=head.head
  if governing!=root and governing.pos_=='VERB'and not(finite(governing)or any(t.lower_=='to'and t.dep_ in {'aux','mark'}for t in governing.children)):continue
  predicate={'start':root.idx,'end':root.idx+len(root.text),'text':root.text,'pos':root.pos_,'tag':root.tag_,'finiteAuxiliaries':[{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_}for t in root.children if finite(t)and t.dep_ in {'aux','auxpass','cop'}]}
  components=[{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'dep':t.dep_,'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}for t in span]
  yield {'start':first.idx,'end':span[-1].idx+len(span[-1].text),'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'evidenceStart':first.sent.start_char,'evidenceEnd':first.sent.end_char,'suggestion':None,'engine':'spaCy','engineRule':'LCB_GENERAL_UNIT_MODIFIER_REVIEW','reviewSuggested':True,'reviewVariant':'noun-sequence','attachmentMethod':'noun-sequence-role-review','nounRoleEvidence':{'components':components,'predicate':predicate}}

def qualified_noun_prefix_reviews(doc):
 """Adjectives attached to interior nouns, without choosing compound meaning."""
 finite=lambda t:t.pos_ in {'VERB','AUX'}and t.tag_ in {'VBD','VBP','VBZ','MD'}
 for first in doc:
  if first.pos_!='ADJ'or not first.text.isalpha()or lexical_hyphen_before(doc.text,first.idx):continue
  if first.i>first.sent.start:
   previous=doc[first.i-1]
   if previous.pos_ in {'ADJ','NOUN','ADV'}and previous.text.isalpha()and doc.text[previous.idx+len(previous.text):first.idx].isspace():continue
  root=first.sent.root
  if not(finite(root)or any(finite(t)and t.dep_ in {'aux','auxpass','cop'}for t in root.children)):continue
  sequence=[first];cursor=first.i+1
  while cursor<first.sent.end:
   token=doc[cursor];previous=sequence[-1]
   if token.pos_ not in {'ADJ','NOUN'}or not token.text.isalpha()or not doc.text[previous.idx+len(previous.text):token.idx].isspace():break
   sequence.append(token);cursor+=1
  if len(sequence)<2:continue
  span=doc[first.i:sequence[-1].i+1];head=nominal_head(doc,span)
  if head is None:
   if len(sequence)<3:continue
   head=sequence[-1];span=doc[first.i:head.i]
  nouns={t.i for t in span if t.pos_=='NOUN'}
  if not nouns or head.pos_ not in {'NOUN','PROPN'}or head.dep_ in {'compound','nmod'}:continue
  # A direct adjective of the final head does not establish the interior
  # qualification being reviewed here (e.g. new school policies).
  if any((t.dep_!='amod'or t.head.i not in nouns)if t.pos_=='ADJ'else t.dep_ not in {'compound','nmod'}for t in span):continue
  if protected_verb_use(span)or not attached(span,head):continue
  governing=head.head
  if governing!=root and governing.pos_=='VERB'and not(finite(governing)or any(t.lower_=='to'and t.dep_ in {'aux','mark'}for t in governing.children)):continue
  predicate={'start':root.idx,'end':root.idx+len(root.text),'text':root.text,'pos':root.pos_,'tag':root.tag_,'finiteAuxiliaries':[{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_}for t in root.children if finite(t)and t.dep_ in {'aux','auxpass','cop'}]}
  components=[{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'dep':t.dep_,'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}for t in span]
  yield {'start':first.idx,'end':span[-1].idx+len(span[-1].text),'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'evidenceStart':first.sent.start_char,'evidenceEnd':first.sent.end_char,'suggestion':None,'engine':'spaCy','engineRule':'LCB_GENERAL_UNIT_MODIFIER_REVIEW','reviewSuggested':True,'reviewVariant':'qualified-noun-prefix','attachmentMethod':'qualified-noun-prefix-role-review','nounRoleEvidence':{'components':components,'predicate':predicate}}

PREDICATE_COMPOUND_RULE='LCB_PARSED_PREDICATE_COMPOUND_REVIEW'
LINKING_LEMMAS={'be','remain','become','seem','appear'}
COMPOUND_PATTERN=re.compile(r'(?<![\w-])[^\W\d_]+(?:\s*-\s*[^\W\d_]+)+(?![\w-])')

def predicate_compound_reviews(doc):
 """Whole source compounds in explicit subject/linking-verb complements.

 Grammatical position does not establish lexical spelling or compound
 meaning. In particular an -ing noun label is only a potential verbal noun.
 """
 finite=lambda t:t.pos_ in {'VERB','AUX'}and t.tag_ in {'VBD','VBP','VBZ','MD'}
 role=lambda t:{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_,'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}
 complement=lambda t:t.pos_ in {'ADJ','VERB','NOUN'}
 for match in COMPOUND_PATTERN.finditer(doc.text):
  span=doc.char_span(match.start(),match.end(),alignment_mode='strict')
  if span is None or lexical_hyphen_before(doc.text,match.start()):continue
  words=[t for t in span if t.text.isalpha()]
  if len(words)<2 or words[0].lower_ in {'ex','quasi','self'}or any(not t.text.islower()or t.pos_ not in {'NOUN','ADJ','ADV','VERB'}for t in words):continue
  last=words[-1]
  if not complement(last):continue
  if any(t.dep_ not in {'compound','amod','advmod','npadvmod','nmod'}for t in words[:-1]):continue
  # Validate every base component's complete route to the final component.
  resolved=set();valid=True
  for first in words[:-1]:
   token=first;seen=set();path=[]
   while span.start<=token.i<span.end and token!=last and token.i not in resolved:
    if token.i in seen:valid=False;break
    seen.add(token.i);path.append(token.i);token=token.head
   if not valid or(token!=last and token.i not in resolved):valid=False;break
   resolved.update(path)
  if not valid:continue
  token=last;path=[];seen=set();markers=[]
  while token.dep_=='conj'and complement(token):
   if token.i in seen:break
   parent=token.head
   cues=[t for t in parent.children if parent.idx+len(parent.text)<=t.idx<token.idx and(t.pos_=='CCONJ'and t.dep_=='cc'or t.text==','and t.dep_=='punct')]
   if not cues:break
   markers.append(role(cues[-1]));seen.add(token.i);path.append(token);token=parent
  if token.dep_ not in {'acomp','attr'}or not complement(token):continue
  if path and token.pos_=='NOUN'and not re.search(r'[^\W\d_]\s*-\s*$',doc.text[:token.idx]):continue
  path.append(token);cop=token.head
  if cop.lemma_ not in LINKING_LEMMAS or cop.pos_ not in {'VERB','AUX'}or cop.idx>=span.start_char:continue
  auxiliaries=[t for t in cop.children if finite(t)and t.dep_ in {'aux','auxpass','cop'}]
  if not finite(cop)and not auxiliaries:continue
  subjects=[t for t in cop.children if t.dep_ in {'nsubj','nsubjpass'}and t.pos_ in {'NOUN','PROPN','PRON'}and t.idx<span.start_char]
  if len(subjects)!=1:continue
  preceding=list(doc[cop.i+1:span.start])
  if len(path)==1 and any(t.pos_!='ADV'and not(t.pos_=='PART'and t.dep_=='neg')for t in preceding):continue
  path.append(cop)
  predicate={**role(cop),'lemma':cop.lemma_,'finiteAuxiliaries':[role(t)for t in auxiliaries]}
  proof={'components':[role(t)for t in words],'attachmentPath':[role(t)for t in path],'coordinationMarkers':markers,'preModifiers':[role(t)for t in preceding]if len(path)==2 else[],'subject':role(subjects[0]),'predicate':predicate}
  if cop.dep_=='relcl'and cop.head.pos_ in {'NOUN','PROPN','PRON'}and subjects[0].pos_=='PRON'and subjects[0].tag_ in {'WDT','WP'}and subjects[0].lower_ in {'that','which','who'}:
   members=sorted(cop.subtree,key=lambda t:t.idx)
   if members and members[0]==subjects[0]and cop.head.idx+len(cop.head.text)<=members[0].idx and members[-1].idx+len(members[-1].text)>=span.end_char:
    proof['relativeClause']={'start':cop.head.idx,'end':members[-1].idx+len(members[-1].text),'antecedent':role(cop.head),'members':[role(t)for t in members]}
  yield {'start':span.start_char,'end':span.end_char,'evidenceStart':span[0].sent.start_char,'evidenceEnd':span[0].sent.end_char,'suggestion':None,'engine':'spaCy','engineRule':PREDICATE_COMPOUND_RULE,'reviewSuggested':True,'predicateRoleEvidence':proof}

POSTNOMINAL_COMPOUND_RULE='LCB_POSTNOMINAL_COMPOUND_REVIEW'

def postnominal_compound_reviews(doc):
 """Complete participial compounds following their parsed nominal head.

 This supplies a role question, never a lexical or semantic correction.
 Full subtree witnesses distinguish pre-noun and finite predicate uses.
 """
 role=lambda t:{'start':t.idx,'end':t.idx+len(t.text),'text':t.text,'pos':t.pos_,'tag':t.tag_,'dep':t.dep_,'headStart':t.head.idx,'headEnd':t.head.idx+len(t.head.text),'headText':t.head.text}
 participle=lambda t:t.pos_ in {'VERB','ADJ'}and t.tag_ in {'VBN','VBG'}
 for match in COMPOUND_PATTERN.finditer(doc.text):
  span=doc.char_span(match.start(),match.end(),alignment_mode='strict')
  if span is None or lexical_hyphen_before(doc.text,match.start()):continue
  words=[t for t in span if t.text.isalpha()]
  if len(words)<2 or words[0].lower_ in {'ex','quasi','self'}or any(not t.text.islower()or t.pos_ not in {'NOUN','ADJ','ADV','VERB'}for t in words):continue
  last=words[-1]
  if not participle(last)or any(t.dep_ not in {'compound','amod','advmod','npadvmod','nmod'}for t in words[:-1]):continue
  resolved={last.i};valid=True
  for first in words[:-1]:
   token=first;seen=set();trace=[]
   while token.i not in resolved:
    if token.i in seen or not span.start<=token.i<span.end:valid=False;break
    seen.add(token.i);trace.append(token.i);token=token.head
   if not valid:break
   resolved.update(trace)
  if not valid:continue
  token=last;path=[];markers=[];seen=set()
  while token.dep_=='conj'and participle(token):
   if token.i in seen:break
   parent=token.head
   cues=[t for t in parent.children if parent.idx+len(parent.text)<=t.idx<token.idx and(t.pos_=='CCONJ'and t.dep_=='cc'and t.lower_ in {'and','or','but','nor'}or t.text==','and t.dep_=='punct')]
   if not cues:break
   seen.add(token.i);path.append(token);markers.append(role(cues[-1]));token=parent
  if not participle(token)or token.dep_ not in {'acl','amod','relcl'}:continue
  noun=token.head;members=sorted(token.subtree,key=lambda t:t.idx)
  if noun.pos_!='NOUN'or not members or noun.idx+len(noun.text)>members[0].idx or not re.fullmatch(r'(?:\s+|\s*,\s+)',doc.text[noun.idx+len(noun.text):members[0].idx]):continue
  if any(t.idx<span[0].sent.start_char or t.idx+len(t.text)>span[0].sent.end_char for t in [noun,noun.head,*members]):continue
  relative=None
  if token.dep_=='relcl':
   auxiliaries=sorted([t for t in token.children if t.dep_ in {'aux','auxpass'}and t.pos_ in {'VERB','AUX'}],key=lambda t:t.idx)
   subjects=[t for t in members if t.pos_=='PRON'and t.tag_ in {'WDT','WP'}and t.lower_ in {'that','which','who'}and t.dep_ in {'nsubj','nsubjpass'}and(t.head==token or t.head in auxiliaries)]
   if token.tag_!='VBN'or len(subjects)!=1 or members[0]!=subjects[0]or not any(t.lemma_=='be'and t.dep_=='auxpass'for t in auxiliaries)or not any(t.tag_ in {'VBD','VBP','VBZ','MD'}for t in auxiliaries):continue
   relative={'subject':role(subjects[0]),'auxiliaries':[{**role(t),'lemma':t.lemma_}for t in auxiliaries]}
  path.extend([token,noun])
  proof={'components':[role(t)for t in words],'attachmentPath':[role(t)for t in path],'coordinationMarkers':markers,'modifiedNoun':role(noun),'members':[role(t)for t in members]}
  if relative:proof['finiteRelative']=relative
  yield {'start':span.start_char,'end':span.end_char,'evidenceStart':span[0].sent.start_char,'evidenceEnd':span[0].sent.end_char,'suggestion':None,'engine':'spaCy','engineRule':POSTNOMINAL_COMPOUND_RULE,'reviewSuggested':True,'postnominalRoleEvidence':proof}

class ListedModifierParser:
 def __init__(self,rules):
  self.rules=[]
  for rule in rules:
   expression=r'(?<![\w-])'+r'[\s-]+'.join(re.escape(word).replace('’',"[’']")for word in rule['preferred'].split('-'))+r'(?![\w-])'
   self.rules.append((rule,re.compile(expression,re.I)))

 def candidates(self,doc):
  for rule,pattern in self.rules:
   for match in pattern.finditer(doc.text):
    selected=match.group();normalized=re.sub(r'\s*-\s*','-',re.sub(r'\s+',' ',selected)).replace("'",'’')
    if normalized[:1].lower()+normalized[1:]==rule['preferred']:continue
    span=doc.char_span(match.start(),match.end(),alignment_mode='strict')
    if span is None or span.end>=len(doc):continue
    sentence=span[0].sent
    # Retain the whole following nominal sequence, including unfamiliar
    # adjectives, noun adjuncts, acronym heads and internal lexical hyphens.
    # Stop at a predicate, preposition, conjunction or sentence boundary.
    head=nominal_head(doc,span)
    if head is None or not doc.text[match.end():doc[span.end].idx].isspace():continue
    # A real sentence predicate within the selected phrase is a verb use.
    if protected_verb_use(span):continue
    internal_subject=any(t.dep_ in {'nsubj','nsubjpass','csubj','csubjpass'}and span.start<=t.head.i<span.end for t in span)
    # Reporting complements can omit 'that'. Subject evidence is protective
    # even when the parser labels an embedded past verb as an adjective.
    if internal_subject and sentence.root.lemma_.casefold()in REPORTING_VERBS:continue
    direct=not internal_subject and attached(span,head)
    yield {'start':match.start(),'end':match.end(),'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'evidenceStart':sentence.start_char,'evidenceEnd':sentence.end_char,'suggestion':rule['preferred'],'engine':'spaCy','engineRule':rule['engineRule'],'reviewSuggested':not direct,'attachmentMethod':'direct'if direct else'noun-adjacent-review'}
  # A separate reader-review family covers unfamiliar lexical compounds.
  # These are candidate roles, not proof that two words form a lexical unit.
  # Keep the vocabulary unrestricted without treating every noun pair as an
  # error. A noun + adjective/participle or a true -ly adverb is required.
  for first in doc:
   if not first.text.isalpha()or first.pos_ not in {'NOUN','ADV'}:continue
   if lexical_hyphen_before(doc.text,first.idx):continue
   secondIndex=first.i+1
   if secondIndex>=first.sent.end:continue
   hyphen=doc[secondIndex].text=='-'
   if hyphen:secondIndex+=1
   if secondIndex>=first.sent.end:continue
   second=doc[secondIndex]
   if not second.text.isalpha()or not(second.pos_=='ADJ'or second.tag_ in {'VBG','VBN'}or(second.tag_=='VBD'and second.dep_ in {'amod','acl','ccomp'})):continue
   # An explicit present-participle clause after its noun is a reduced
   # relative (students attending colleges), not a lexical unit modifier.
   if second.tag_=='VBG'and(second.dep_ in {'acl','prep','advcl','pcomp'}or first.dep_ in {'nsubj','nsubjpass','csubj'}):continue
   variant='ly-hyphen'if first.pos_=='ADV'and first.lower_.endswith('ly')and hyphen else'open-modifier'if first.pos_=='NOUN'and not hyphen else None
   if variant is None:continue
   bridge=doc.text[first.idx+len(first.text):second.idx]
   if not(re.fullmatch(r'\s*-\s*',bridge)if hyphen else bridge.isspace()):continue
   span=doc[first.i:second.i+1]
   if protected_verb_use(span):continue
   head=nominal_head(doc,span)
   if head is None or not doc.text[second.idx+len(second.text):doc[span.end].idx].isspace():continue
   if second.pos_=='ADJ'and second.tag_ not in {'VBG','VBN','VBD'}and not attached(span,head):continue
   yield {'start':first.idx,'end':second.idx+len(second.text),'headStart':head.idx,'headEnd':head.idx+len(head.text),'head':head.text,'evidenceStart':first.sent.start_char,'evidenceEnd':first.sent.end_char,'suggestion':None,'engine':'spaCy','engineRule':'LCB_GENERAL_UNIT_MODIFIER_REVIEW','reviewSuggested':True,'reviewVariant':variant,'attachmentMethod':'general-role-review'}
  yield from noun_sequence_reviews(doc)
  yield from qualified_noun_prefix_reviews(doc)
  yield from predicate_compound_reviews(doc)
  yield from postnominal_compound_reviews(doc)
