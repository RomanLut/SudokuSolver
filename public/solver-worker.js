const CSP_ROOT = '/csp';
const COMMAND_FILE = '/workspace/run.clp';
const CONFIG_FILE = `${CSP_ROOT}/SudoRules-V20.1-web-config.clp`;

let runtimeFactoryPromise;
let bundlePromise;

function normalizePuzzle(input) {
  const normalized = String(input || '')
    .replace(/[|+\-!]/g, '')
    .replace(/\s+/g, '')
    .replace(/0/g, '.');

  if (!/^[1-9.]{81}$/.test(normalized)) {
    throw new Error('Puzzle must contain exactly 81 cells using digits 1-9 and "." or "0" for empty cells.');
  }

  return normalized;
}

function parseSolvedGrid(output) {
  const lines = output.split(/\r?\n/);
  const gridLines = [];

  for (const line of lines) {
    if (!line.includes('!')) continue;
    const digits = line.replace(/[^1-9]/g, '');
    if (digits.length === 9) {
      gridLines.push(digits);
    }
  }

  return gridLines.length >= 9 ? gridLines.slice(-9) : null;
}

function parseRulesUsed(output) {
  const lines = output.split(/\r?\n/);
  const rules = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('Entering_level_')) continue;
    if (trimmed.startsWith('Resolution state')) continue;
    if (trimmed.startsWith('Starting non trivial part of solution.')) continue;
    if (trimmed.startsWith('PUZZLE ')) continue;
    if (trimmed.startsWith('nb-facts =')) continue;
    if (trimmed.startsWith('Puzzle ')) continue;
    if (trimmed.startsWith('init-time =')) continue;
    if (trimmed.startsWith('CLIPS>')) continue;
    if (trimmed.startsWith('***')) continue;

    const isRuleLine =
      trimmed.includes('==>') ||
      trimmed.startsWith('hidden-single') ||
      trimmed.startsWith('naked-single') ||
      trimmed.startsWith('naked-pairs') ||
      trimmed.startsWith('hidden-pairs') ||
      trimmed.startsWith('x-wing') ||
      trimmed.startsWith('finned-') ||
      trimmed.startsWith('biv-chain') ||
      trimmed.startsWith('z-chain') ||
      trimmed.startsWith('t-whip') ||
      trimmed.startsWith('whip[');

    if (isRuleLine) {
      rules.push(trimmed);
    }
  }

  return rules;
}

function requireCreateClipsModuleFactory() {
  if (typeof self.createClipsModule !== 'function') {
    throw new Error(
      'Missing WebAssembly runtime. Run `npm run build:wasm` to generate public/wasm/clips.js and public/wasm/clips.wasm.',
    );
  }

  return self.createClipsModule;
}

async function loadRuntimeFactory() {
  if (runtimeFactoryPromise) return runtimeFactoryPromise;

  runtimeFactoryPromise = new Promise((resolve, reject) => {
    const script = new URL('./wasm/clips.js', self.location.href).toString();

    try {
      importScripts(script);
    } catch (error) {
      reject(error);
      return;
    }

    resolve(requireCreateClipsModuleFactory());
  });

  return runtimeFactoryPromise;
}

async function ensureBrowserAssets(module) {
  if (!bundlePromise) {
    bundlePromise = fetch(new URL('./csp/bundle.json', self.location.href)).then((r) => {
      if (!r.ok) {
        throw new Error('Missing packaged CLIPS bundle. Run `npm run prepare:web` first.');
      }
      return r.json();
    });
  }

  module.FS.mkdirTree('/workspace');
  module.FS.mkdirTree(CSP_ROOT);

  const bundle = await bundlePromise;
  for (const [relativePath, content] of Object.entries(bundle)) {
    const virtualPath = `${CSP_ROOT}/${relativePath}`;
    const parentDir = virtualPath.slice(0, virtualPath.lastIndexOf('/')) || '/';
    module.FS.mkdirTree(parentDir);
    module.FS.writeFile(virtualPath, content, { encoding: 'utf8' });
  }
}

async function solveInBrowser(puzzle) {
  const normalized = normalizePuzzle(puzzle);
  const createClipsModule = await loadRuntimeFactory();
  const output = [];
  const module = await createClipsModule({
    locateFile(file) {
      return new URL(`./wasm/${file}`, self.location.href).toString();
    },
    print(text) {
      output.push(String(text));
    },
    printErr(text) {
      output.push(String(text));
    },
    noInitialRun: true,
  });

  await ensureBrowserAssets(module);

  const command = [
    `(batch "${CONFIG_FILE}")`,
    `(solve "${normalized}")`,
    '(exit)',
    '',
  ].join('\n');

  module.FS.writeFile(COMMAND_FILE, command, { encoding: 'utf8' });
  module.callMain(['-f', COMMAND_FILE]);

  const rawOutput = output.join('\n');

  return {
    puzzle: normalized,
    solvedGrid: parseSolvedGrid(rawOutput),
    rulesUsed: parseRulesUsed(rawOutput),
    rawOutput,
  };
}

self.addEventListener('message', async (event) => {
  const { id, type, puzzle } = event.data || {};

  if (type !== 'solve') return;

  try {
    const result = await solveInBrowser(puzzle);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
