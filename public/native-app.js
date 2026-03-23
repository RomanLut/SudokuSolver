import { samplePuzzles } from './sample-puzzles.js';
import { renderPuzzleGrid, renderGrid, createStepViewer } from './ui.js';

let currentSampleIndex = 0;

const puzzleEl = document.getElementById('puzzle');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const rulesEl = document.getElementById('rules');
const outputEl = document.getElementById('output');

const stepViewer = createStepViewer(
  gridEl, rulesEl,
  document.getElementById('step-first'),
  document.getElementById('step-prev'),
  document.getElementById('step-next'),
  document.getElementById('step-last'),
);

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

async function solvePuzzle() {
  const puzzle = puzzleEl.value;
  setStatus('Solving...', 'solving');
  outputEl.textContent = '';
  rulesEl.innerHTML = '';

  try {
    const response = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Native solver request failed.');
    }

    renderGrid(gridEl, puzzle, data.solvedGrid);
    stepViewer.setup(puzzle, data.solvedGrid, data.rulesUsed);
    outputEl.textContent = data.rawOutput || '';
    setStatus(`Solved with native CLIPS. Parsed ${data.rulesUsed.length} rule lines.`, 'ok');
  } catch (error) {
    setStatus(error.message || String(error), 'error');
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

puzzleEl.value = samplePuzzles[0];
renderPuzzleGrid(gridEl, samplePuzzles[0]);
