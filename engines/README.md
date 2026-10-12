# Bundled offline language engines

The desktop uses LanguageTool 6.6 through a small Java API bridge and spaCy 3.8.16 with the English `en_core_web_sm` 3.8.0 model. Review runs in local background processes, using JSON over private stdin/stdout pipes. No HTTP service or network socket is used by this bridge. The renderer still blocks HTTP, HTTPS and WebSocket requests. Runtime setup can require downloads; document review does not download or send documents.

LanguageTool currently enables only `AGREEMENT_SENT_START`, `APOS_ARE` and `FEWER_LESS`. Source-aware guards protect financial subtraction and numeric threshold contexts discovered in the saved bill tests. Other stock rules stay disabled pending evaluation. These selected checks supplement the existing spelling and grammar checks.

spaCy supplies noun attachment for `data sharing` and the source-listed LCB `data processing`, `profit sharing` and `board approved` modifiers. The app checks the original source, following noun, sentence evidence and manual references before accepting a candidate. Existing guide checks take precedence on overlapping findings. Quotes, strikeouts, tables, names, damaged character codes and incomplete chunk-edge sentences cannot establish a new finding. Known LCB/GPO disagreements remain excluded. This is selected contextual coverage; neither engine provides complete LCB automation or licensed Merriam-Webster first-listed spelling authority.

## Portable runtime layout

During development, `main.cjs` reads `engines/runtime/`. In a packaged desktop build it reads `resources/offline-engines/`, outside `app.asar` and the renderer's served `app/` directory:

```text
offline-engines/
  python/python.exe
  python/DLLs/
  python/Lib/                 # Standard library, dependencies and English model
  java/bin/java.exe           # Temurin 17 JRE, complete distribution
  languagetool/               # LanguageTool 6.6 distribution
  bridge/OfflineGrammar.class
  offline-worker.py
  language-config.json
  runtime-manifest.json
```

`runtime/` is ignored by Git. Preserve all included upstream licenses and notices when distributing it. The compiler is build-only and is not part of the runtime. This source update does not replace an existing packaged release.

## Stage already downloaded assets

`stage-runtime.py` performs no downloads or system installation. Its inputs are a Windows x64 Python 3.12 base installation; the evaluation directory containing the spaCy virtual environment, Temurin JRE and LanguageTool distribution; and Eclipse ECJ 3.33.0 JAR. It expects the saved download provenance JSON files in that evaluation directory. Run with the same Python version used to install the compiled dependencies:

```text
python stage-runtime.py BASE_PYTHON EVALUATION_DIRECTORY ECJ_JAR
```

The staging script copies a portable Python standard library and the virtual environment's packages, copies the JRE and LanguageTool, compiles `OfflineGrammar.java` for Java 17, and records source/download hashes. No engine starts when the desktop opens. The first spelling/grammar or style review starts a persistent background worker; it exits after two idle minutes. Java's heap is capped at 512 MB and parser numerical libraries use one thread. Cancellation drops stale results; process failures and unavailable resources produce an explicit incomplete-check warning while the existing checks remain available.

Use `copy-runtime.py RUNTIME_DIRECTORY BUILT_RESOURCES_DIRECTORY` when preparing a release, before generating its archive. It validates the staged worker/config hashes and copies the runtime into that release's `resources/offline-engines/`. Exclude `engines/runtime/` from source archives and from the application's source directory. Do not package only the EXE: the whole runtime folder is required. A clean-machine office deployment and independent precision/recall benchmark remain necessary.
