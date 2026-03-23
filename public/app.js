const samplePuzzle = '...13.....1...45....2....6.1..3...7.2...5...8.4...6..9.5....7....67...9.....89...';

const puzzleEl = document.getElementById('puzzle');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const rulesEl = document.getElementById('rules');
const outputEl = document.getElementById('output');

let solverBridgePromise;

function setStatus(message, type = 'info') {
  statusEl.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

function normalizePuzzle(input) {
  return String(input || '')
    .replace(/[|+\-!]/g, '')
    .replace(/\s+/g, '')
    .replace(/0/g, '.');
}

function renderGrid(originalPuzzle, solvedGrid) {
  gridEl.innerHTML = '';

  if (!solvedGrid || solvedGrid.length !== 9) return;

  const source = normalizePuzzle(originalPuzzle);
  const solved = solvedGrid.join('');

  for (let i = 0; i < solved.length; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (source[i] !== '.') cell.classList.add('given');
    cell.textContent = solved[i];
    gridEl.appendChild(cell);
  }
}

function renderRules(rulesUsed) {
  rulesEl.innerHTML = '';

  if (!rulesUsed || !rulesUsed.length) {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = 'No rule lines were parsed from solver output.';
    rulesEl.appendChild(li);
    return;
  }

  for (const rule of rulesUsed) {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = rule;
    rulesEl.appendChild(li);
  }
}

function createWorkerBridge() {
  const worker = new Worker('./solver-worker.js');
  let nextRequestId = 1;
  const pending = new Map();

  worker.addEventListener('message', (event) => {
    const { id, ok, result, error } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);

    if (ok) {
      entry.resolve(result);
      return;
    }

    entry.reject(new Error(error || 'Unknown worker error.'));
  });

  worker.addEventListener('error', (event) => {
    for (const entry of pending.values()) {
      entry.reject(event.error || new Error(event.message || 'Worker failure.'));
    }
    pending.clear();
  });

  return {
    solve(puzzle) {
      const id = nextRequestId;
      nextRequestId += 1;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, type: 'solve', puzzle });
      });
    },
  };
}

async function getSolverBridge() {
  if (!solverBridgePromise) {
    solverBridgePromise = Promise.resolve(createWorkerBridge());
  }
  return solverBridgePromise;
}

async function solvePuzzle() {
  const puzzle = puzzleEl.value;
  setStatus('Solving in WebAssembly...', 'info');
  outputEl.textContent = '';
  rulesEl.innerHTML = '';
  gridEl.innerHTML = '';

  try {
    const solver = await getSolverBridge();
    const data = await solver.solve(puzzle);
    renderGrid(puzzle, data.solvedGrid);
    renderRules(data.rulesUsed);
    outputEl.textContent = data.rawOutput || '';
    setStatus(`Solved in browser. Parsed ${data.rulesUsed.length} rule lines.`, 'success');
  } catch (error) {
    setStatus(error.message || String(error), 'danger');
  }
}

document.getElementById('solve').addEventListener('click', solvePuzzle);
document.getElementById('sample').addEventListener('click', () => {
  puzzleEl.value = samplePuzzle;
  statusEl.innerHTML = '';
});
document.getElementById('clear').addEventListener('click', () => {
  puzzleEl.value = '';
  gridEl.innerHTML = '';
  rulesEl.innerHTML = '';
  outputEl.textContent = '';
  statusEl.innerHTML = '';
});
