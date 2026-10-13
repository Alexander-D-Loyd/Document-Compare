"""Private stdin/stdout JSON bridge. All language processing stays local."""
import os,sys,json,threading,queue,subprocess
from pathlib import Path
sys.stdin.reconfigure(encoding='utf-8',errors='strict')
sys.stdout.reconfigure(encoding='utf-8',errors='strict')
os.environ.update(OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',BLIS_NUM_THREADS='1')
ROOT=Path(sys.argv[1]).resolve()
CONFIG=json.loads((ROOT/'language-config.json').read_text(encoding='utf-8'))
import importlib.util
parserSpec=importlib.util.spec_from_file_location('lcb_parser',ROOT/'lcb_parser.py')
parserModule=importlib.util.module_from_spec(parserSpec);parserSpec.loader.exec_module(parserModule)
modifierParser=parserModule.ListedModifierParser(CONFIG['lcbModifiers'])
jobs=queue.Queue();stopping=threading.Event();active={};lock=threading.Lock();outputLock=threading.Lock()
java=None;nlp=None;javaReplies=queue.Queue();javaSequence=0
# NumPy's Windows DLL initialization must finish before another thread is
# blocked reading stdin. Load the parser on this process's main thread, after
# the app has requested its lazy background worker, never during app startup.
try:
 import spacy
 nlp=spacy.load('en_core_web_sm',exclude=['ner'])
except Exception:
 nlp=None
def emit(value):
 with outputLock:
  print(json.dumps(value,ensure_ascii=True),flush=True)
def u16(s):return len(s.encode('utf-16-le'))//2
def lt(text,cancel):
 global javaSequence
 javaSequence+=1;identifier=javaSequence
 java.stdin.write(json.dumps({'id':identifier,'text':text},ensure_ascii=True)+'\n');java.stdin.flush()
 # Reader thread permits cancellation during startup/checking, including on
 # Windows, where select() cannot wait on these process pipes.
 import time
 deadline=time.monotonic()+90
 while time.monotonic()<deadline:
  if cancel.is_set()or stopping.is_set():return []
  try:response=javaReplies.get(timeout=.1)
  except queue.Empty:
   if java.poll()is not None:raise RuntimeError('Local grammar process exited.')
   continue
  if response.get('id')!=identifier:continue
  if response.get('error'):raise RuntimeError('Local grammar check failed.')
  return response['matches']
 raise RuntimeError('Local grammar check timed out.')
def startJava(cancel):
 global java,javaReplies
 if stopping.is_set()or cancel.is_set():return
 if java and java.poll()is None:return
 javaReplies=queue.Queue();replies=javaReplies
 classpath=os.pathsep.join(str(p)for p in [ROOT/'bridge',ROOT/'languagetool',ROOT/'languagetool/libs/*'])
 with lock:
  if stopping.is_set()or cancel.is_set():return
  java=subprocess.Popen([str(ROOT/'java/bin/java.exe'),'-Xms64m','-Xmx512m','-cp',classpath,'OfflineGrammar',str(ROOT/'language-config.json')],cwd=ROOT/'languagetool',stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 current=java
 def reader():
  for line in current.stdout:
   try:replies.put(json.loads(line))
   except ValueError:pass
 threading.Thread(target=reader,daemon=True).start()
 emit({'event':'java-started','pid':java.pid})
def source_candidate_to_plan(value,text,base):
 # Python/spaCy uses code-point offsets; the JavaScript source plan uses UTF-16.
 # Nested role witnesses need the same conversion and chunk base as selections.
 coordinates={'start','end','evidenceStart','evidenceEnd','headStart','headEnd','peerStart','peerEnd','peerHeadStart','peerHeadEnd'}
 if isinstance(value,list):return [source_candidate_to_plan(item,text,base)for item in value]
 if isinstance(value,dict):return {key:base+u16(text[:item])if key in coordinates and isinstance(item,int)and not isinstance(item,bool)else source_candidate_to_plan(item,text,base)for key,item in value.items()}
 return value

def check(job,cancel):
 global nlp
 kind=job['kind'];chunks=job['chunks'];results=[]
 emit({'event':'progress','id':job['id'],'completed':0,'total':len(chunks)})
 if kind=='grammar':startJava(cancel)
 elif nlp is None:raise RuntimeError('Offline parser unavailable.')
 for index,chunk in enumerate(chunks):
  if cancel.is_set()or stopping.is_set():return {'cancelled':True,'issues':[]}
  text=chunk['text'];base=chunk['start'];size=u16(text)
  if kind=='grammar':
   for m in lt(text,cancel):
    a,b=m['evidenceStart'],m['evidenceEnd']
    encoded=text.encode('utf-16-le')
    if (not chunk['completeStart']and not encoded[:a*2].decode('utf-16-le').strip())or(not chunk['completeEnd']and not encoded[b*2:].decode('utf-16-le').strip()):continue
    suggestions=[r for r in m.get('replacements',[])if r]
    if not suggestions:continue
    results.append({'start':base+m['offset'],'end':base+m['offset']+m['length'],'evidenceStart':base+a,'evidenceEnd':base+b,'suggestion':suggestions[0],'message':m['message'],'engine':'LanguageTool','engineRule':m['rule']})
   # Only parse chunks containing the narrowly evaluated passive trigger.
   # A rare omitted infinitive marker does not require a second full parser
   # pass over every document merely to enable the grammar checker.
   if parserModule.REQUIRED_INFINITIVE.search(text):
    if nlp is None:raise RuntimeError('Offline parser unavailable.')
    for candidate in parserModule.missing_infinitive_candidates(nlp(text)):
     a,b=candidate['evidenceStart'],candidate['evidenceEnd']
     if (not chunk['completeStart']and not text[:a].strip())or(not chunk['completeEnd']and not text[b:].strip()):continue
     results.append({**candidate,**{field:base+u16(text[:candidate[field]])for field in ['start','end','evidenceStart','evidenceEnd']}})
  else:
   doc=nlp(text)
   # Style output is restricted to exact printed catalogue modifiers with
   # source role witnesses. Generic number/compound reader guesses are not
   # produced; grammar mode keeps its independent language-engine contract.
   for candidate in modifierParser.candidates(doc):
    a,b=candidate['evidenceStart'],candidate['evidenceEnd']
    if (not chunk['completeStart']and not text[:a].strip())or(not chunk['completeEnd']and not text[b:].strip()):continue
    results.append(source_candidate_to_plan(candidate,text,base))
  emit({'event':'progress','id':job['id'],'completed':index+1,'total':len(chunks)})
 return {'issues':results,'engine':'LanguageTool'if kind=='grammar'else'spaCy'}
def worker():
 while not stopping.is_set():
  try:job=jobs.get(timeout=.2)
  except queue.Empty:continue
  identifier=job['id']
  with lock:cancel=active.get(identifier)
  if cancel is None:continue
  try:
   if cancel.is_set():result={'cancelled':True,'issues':[]}
   else:result=check(job,cancel)
   emit({'id':identifier,**result})
  except Exception:
   # No document text, paths, or third-party tracebacks reach the renderer.
   emit({'id':identifier,'error':'The bundled offline language engine could not finish. Existing local checks remain available.'})
  finally:
   with lock:active.pop(identifier,None)
thread=threading.Thread(target=worker,daemon=True);thread.start()
try:
 for line in sys.stdin:
  try:
   value=json.loads(line)
   if value.get('type')=='shutdown':break
   if value.get('type')=='cancel':
    with lock:
     if value.get('id')in active:active[value['id']].set()
    continue
   identifier=value['id']
   if value['kind']not in ['grammar','style']or not isinstance(value['chunks'],list):raise ValueError()
   with lock:active[identifier]=threading.Event()
   jobs.put(value)
  except (ValueError,KeyError,TypeError):emit({'error':'Invalid offline language request.'})
finally:
 stopping.set()
 with lock:
  for cancel in active.values():cancel.set()
 if java and java.poll()is None:
  java.terminate()
  try:java.wait(timeout=5)
  except subprocess.TimeoutExpired:java.kill();java.wait(timeout=5)
 thread.join(timeout=2)
