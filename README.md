# SudokuSolver

Sudoku solver based on Denis Berthier's SudoRules.

This project runs the Sudoku solver in the browser with a CLIPS WebAssembly runtime and keeps a native executable comparison page on the same local server.

- public/index.html is the WebAssembly UI.
- public/native.html is the native executable UI.
- public/app.js drives the WebAssembly app.
- public/native-app.js drives the native backend app.
- public/solver-worker.js runs the CLIPS solver in a Web Worker.
- scripts/package-web-assets.mjs builds the browser CLIPS asset bundle.
- scripts/build-clips-wasm.ps1 builds the CLIPS WebAssembly runtime.
- Both UI modes run on http://localhost:3004/.

## Build

1. npm install
2. npm run prepare:web
3. npm run build:wasm
4. npm start

You can also run npm run build:web to perform the prepare:web and build:wasm steps together.

Then open `http://localhost:3004/` for the WebAssembly UI or `http://localhost:3004/native.html` for the native-backed UI.

## Start The App

- `start.bat` starts the shared local server on `http://localhost:3004/` and opens both the WebAssembly UI and the native-backed UI.

## Native Reference Path

- sudorules.js runs the local clip-63.exe flow.
- `public/native.html` uses `/api/solve` so it exercises the native executable backend directly.

The main browser UI remains WebAssembly-first. The native page is kept for comparison and local reference testing.

## Project Structure

- `server.js` serves both UIs on port `3004` and exposes `/api/solve`.
- `start.bat` launches the shared server and opens both UIs.
- public/ contains the WebAssembly UI, native UI, and worker code.
- scripts/package-web-assets.mjs packages .clp files into a browser bundle.
- scripts/build-clips-wasm.ps1 compiles CLIPS to WebAssembly.
- CSP-Rules-V2.1/ contains SudoRules, CSP-Rules sources, and browser-specific loader/config files.
- CSP-Rules-V2.1/XTERNS/ is trimmed to the two `.clp` wrapper files used by the normal solver flow; external helper tool payloads are not needed for the browser UI or the native comparison page.
- vendor/clips631/ contains the CLIPS 6.3 source used for the WASM build.

## References

- CSP-Rules-V2.1: https://github.com/denis-berthier/CSP-Rules-V2.1
- Controlled-bias Sudoku generator and collection: https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection
- CLIPS 6.3 source branch: https://sourceforge.net/p/clipsrules/code/HEAD/tree/branches/63x/core/
