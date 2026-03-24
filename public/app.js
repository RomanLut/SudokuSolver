import { samplePuzzles } from './sample-puzzles.js';
import { renderPuzzleGrid, renderGrid, createStepViewer } from './ui.js';

let currentSampleIndex = 0;

const puzzleEl = document.getElementById('puzzle');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const rulesEl = document.getElementById('rules');
const outputEl = document.getElementById('output');

let solverBridgePromise;

const stepViewer = createStepViewer(
  gridEl, rulesEl,
  document.getElementById('step-explain'),
  document.getElementById('step-copy'),
  document.getElementById('step-first'),
  document.getElementById('step-prev'),
  document.getElementById('step-next'),
  document.getElementById('step-last'),
);

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
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

const solveBtn = document.getElementById('solve');
const sampleBtn = document.getElementById('sample');
const clearBtn = document.getElementById('clear');

function setSolving(solving) {
  solveBtn.disabled = solving;
  sampleBtn.disabled = solving;
  clearBtn.disabled = solving;
}

async function solvePuzzle() {
  const puzzle = puzzleEl.value;
  setStatus('Solving...', 'solving');
  outputEl.textContent = '';
  rulesEl.innerHTML = '';
  setSolving(true);

  try {
    const solver = await getSolverBridge();
    const data = await solver.solve(puzzle);
    renderGrid(gridEl, puzzle, data.solvedGrid);
    stepViewer.setup(puzzle, data.solvedGrid, data.rulesUsed);
    outputEl.textContent = data.rawOutput || '';
    setStatus(`Solved in browser. Parsed ${data.rulesUsed.length} rule lines.`, 'ok');
  } catch (error) {
    setStatus(error.message || String(error), 'error');
  } finally {
    setSolving(false);
  }
}

document.getElementById('solve').addEventListener('click', solvePuzzle);
document.getElementById('sample').addEventListener('click', () => {
  currentSampleIndex = (currentSampleIndex + 1) % samplePuzzles.length;
  const puzzle = samplePuzzles[currentSampleIndex];
  puzzleEl.value = puzzle;
  renderPuzzleGrid(gridEl, puzzle);
  setStatus(`Sample Loaded: ${currentSampleIndex + 1}/${samplePuzzles.length}`, 'ok');
});
document.getElementById('clear').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    puzzleEl.value = text;
    renderPuzzleGrid(gridEl, text);
    rulesEl.innerHTML = '';
    outputEl.textContent = '';
    setStatus('Pasted from clipboard', 'ok');
  } catch (error) {
    setStatus('Failed to paste from clipboard', 'error');
  }
});

puzzleEl.addEventListener('input', () => {
  renderPuzzleGrid(gridEl, puzzleEl.value);
});

const boardParam = new URLSearchParams(window.location.search).get('board');
if (boardParam) {
  puzzleEl.value = boardParam;
  renderPuzzleGrid(gridEl, boardParam);
  solvePuzzle();
} else {
  puzzleEl.value = samplePuzzles[0];
  renderPuzzleGrid(gridEl, samplePuzzles[0]);
}
