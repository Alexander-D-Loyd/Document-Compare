"""Stage a portable runtime from already downloaded offline evaluation assets.

Usage: python stage-runtime.py BASE_PYTHON EVALUATION_DIRECTORY ECJ_JAR
No downloads, no installation into Windows, no packaged build replacement.
"""
from pathlib import Path
import sys,shutil,json,hashlib,subprocess,os
base=Path(sys.argv[1]).resolve();evaluation=Path(sys.argv[2]).resolve()
source=Path(__file__).resolve().parent;destination=source/'runtime';destination.mkdir(exist_ok=True)
def copytree(a,b,ignore=None):shutil.copytree(a,b,dirs_exist_ok=True,ignore=ignore)
python=destination/'python';python.mkdir(exist_ok=True)
for f in base.iterdir():
 if f.is_file()and(f.suffix in ['.exe','.dll']or f.name=='LICENSE.txt'):shutil.copy2(f,python/f.name)
copytree(base/'DLLs',python/'DLLs')
copytree(base/'Lib',python/'Lib',shutil.ignore_patterns('site-packages','__pycache__','test','tests','idlelib','tkinter','turtledemo','ensurepip','venv'))
copytree(evaluation/'venv/Lib/site-packages',python/'Lib/site-packages',shutil.ignore_patterns('__pycache__','pip','pip-*.dist-info'))
java=next((evaluation/'java').glob('*/bin/java.exe')).parent.parent
copytree(java,destination/'java')
copytree(evaluation/'languagetool/LanguageTool-6.6',destination/'languagetool')
shutil.copy2(source/'offline-worker.py',destination/'offline-worker.py')
shutil.copy2(source/'lcb_parser.py',destination/'lcb_parser.py')
shutil.copy2(source/'language-config.json',destination/'language-config.json')
if len(sys.argv)<4:raise RuntimeError('Pass the build-only Eclipse compiler JAR as the third argument.')
compiler=Path(sys.argv[3]).resolve();bridge=destination/'bridge';bridge.mkdir(exist_ok=True)
classpath=os.pathsep.join([str(destination/'languagetool'),*[str(p)for p in(destination/'languagetool/libs').glob('*.jar')]])
subprocess.run([str(destination/'java/bin/java.exe'),'-jar',str(compiler),'-17','-encoding','UTF-8','-classpath',classpath,'-d',str(bridge),str(source/'OfflineGrammar.java')],check=True)
manifest={'purpose':'Portable offline LanguageTool/spaCy runtime using stdin/stdout, without sockets. Do not serve these resources to the renderer. Package as extra resources/offline-engines outside app.asar.','pythonVersion':sys.version,'sources':{f:json.loads((evaluation/f).read_text(encoding='utf-8'))for f in ['engine-downloads.json','model-download.json']},'workerSHA256':hashlib.sha256((source/'offline-worker.py').read_bytes()).hexdigest(),'grammarSourceSHA256':hashlib.sha256((source/'OfflineGrammar.java').read_bytes()).hexdigest(),'compilerSHA256':hashlib.sha256(compiler.read_bytes()).hexdigest(),'distributionNotice':'Retain the included Python, Temurin, LanguageTool, model and Python-package licenses and notices. Runtime is staged locally; this does not create or replace a release. Eclipse compiler is build-only and not included.'}
manifest['configSHA256']=hashlib.sha256((source/'language-config.json').read_bytes()).hexdigest()
manifest['parserSHA256']=hashlib.sha256((source/'lcb_parser.py').read_bytes()).hexdigest()
manifest['grammarClassSHA256']=hashlib.sha256((bridge/'OfflineGrammar.class').read_bytes()).hexdigest()
(destination/'runtime-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'runtime':str(destination),'workerSHA256':manifest['workerSHA256']}))
