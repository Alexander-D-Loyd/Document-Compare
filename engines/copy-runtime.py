"""Copy a validated staged runtime into a release's existing resources folder.
No downloads, recursive deletion, or build/archive replacement.
"""
from pathlib import Path
import sys,json,hashlib,shutil
runtime=Path(sys.argv[1]).resolve();resources=Path(sys.argv[2]).resolve()
if not resources.is_dir()or resources.name!='resources':raise ValueError('Pass the existing release resources directory.')
manifest=json.loads((runtime/'runtime-manifest.json').read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if sha(runtime/'offline-worker.py')!=manifest['workerSHA256']:raise ValueError('Worker changed after staging; stage the runtime again.')
if sha(runtime/'language-config.json')!=manifest['configSHA256']:raise ValueError('Configuration changed after staging; stage the runtime again.')
if sha(runtime/'lcb_parser.py')!=manifest['parserSHA256']:raise ValueError('Parser changed after staging; stage the runtime again.')
if sha(runtime/'bridge/OfflineGrammar.class')!=manifest['grammarClassSHA256']:raise ValueError('Grammar bridge changed after staging; stage the runtime again.')
for f in ['python/python.exe','java/bin/java.exe','bridge/OfflineGrammar.class','languagetool/libs']:
 if not(runtime/f).exists():raise ValueError('The staged runtime is incomplete: '+f)
if '--verify-only'in sys.argv[3:]:
 print(json.dumps({'validatedRuntime':str(runtime),'workerSHA256':manifest['workerSHA256']}));sys.exit(0)
target=resources/'offline-engines'
if target==runtime or target.is_relative_to(runtime)or runtime.is_relative_to(target):raise ValueError('Source and destination runtime must be separate.')
shutil.copytree(runtime,target,dirs_exist_ok=True)
for f in ['offline-worker.py','lcb_parser.py','language-config.json','runtime-manifest.json','bridge/OfflineGrammar.class']:
 if sha(runtime/f)!=sha(target/f):raise RuntimeError('Copied runtime verification failed: '+f)
print(json.dumps({'copiedRuntime':str(target),'workerSHA256':manifest['workerSHA256']}))
