import { samplePuzzles } from './sample-puzzles.js';

let currentSampleIndex = 0;

const puzzleEl = document.getElementById('puzzle');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const rulesEl = document.getElementById('rules');
const outputEl = document.getElementById('output');

let solverBridgePromise;

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function normalizePuzzle(input) {
  return String(input || '')
    .replace(/[|+\-!]/g, '')
    .replace(/\s+/g, '');
}

function renderPuzzleGrid(puzzle) {
  gridEl.innerHTML = '';
  const source = normalizePuzzle(puzzle);
  
  for (let i = 0; i < 81; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const value = source[i] || '.';
    if (value !== '.' && value !== '0') {
      cell.classList.add('given');
      cell.textContent = value;
    }
    gridEl.appendChild(cell);
  }
}

function renderGrid(originalPuzzle, solvedGrid) {
  gridEl.innerHTML = '';

  if (!solvedGrid || solvedGrid.length !== 9) return;

  const source = normalizePuzzle(originalPuzzle);
  const solved = solvedGrid.join('');

  for (let i = 0; i < solved.length; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (source[i] !== '.' && source[i] !== '0') cell.classList.add('given');
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
  setStatus('Solving...', 'solving');
  outputEl.textContent = '';
  rulesEl.innerHTML = '';

  try {
    const solver = await getSolverBridge();
    const data = await solver.solve(puzzle);
    renderGrid(puzzle, data.solvedGrid);
    renderRules(data.rulesUsed);
    outputEl.textContent = data.rawOutput || '';
    setStatus(`Solved in browser. Parsed ${data.rulesUsed.length} rule lines.`, 'ok');
  } catch (error) {
    setStatus(error.message || String(error), 'error');
  }
}

document.getElementById('solve').addEventListener('click', solvePuzzle);
document.getElementById('sample').addEventListener('click', () => {
  currentSampleIndex = (currentSampleIndex + 1) % samplePuzzles.length;
  const puzzle = samplePuzzles[currentSampleIndex];
  puzzleEl.value = puzzle;
  renderPuzzleGrid(puzzle);
  setStatus(`Sample Loaded: ${currentSampleIndex + 1}/${samplePuzzles.length}`, 'ok');
});
document.getElementById('clear').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    puzzleEl.value = text;
    renderPuzzleGrid(text);
    rulesEl.innerHTML = '';
    outputEl.textContent = '';
    setStatus('Pasted from clipboard', 'ok');
  } catch (error) {
    setStatus('Failed to paste from clipboard', 'error');
  }
});

// Update grid when puzzle is pasted or typed
puzzleEl.addEventListener('input', () => {
  renderPuzzleGrid(puzzleEl.value);
});

// Initialize board with sample puzzle on page load
puzzleEl.value = samplePuzzles[0];
renderPuzzleGrid(samplePuzzles[0]);
