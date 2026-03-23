const samplePuzzle = '...13.....1...45....2....6.1..3...7.2...5...8.4...6..9.5....7....67...9.....89...';

const puzzleEl = document.getElementById('puzzle');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const rulesEl = document.getElementById('rules');
const outputEl = document.getElementById('output');

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function normalizePuzzle(input) {
  return String(input || '')
    .replace(/[|+\-!]/g, '')
    .replace(/\s+/g, '')
    .replace(/0/g, '.');
}

function renderPuzzleGrid(puzzle) {
  gridEl.innerHTML = '';
  const source = normalizePuzzle(puzzle);
  
  for (let i = 0; i < 81; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const value = source[i] || '.';
    if (value !== '.') {
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

    renderGrid(puzzle, data.solvedGrid);
    renderRules(data.rulesUsed);
    outputEl.textContent = data.rawOutput || '';
    setStatus(`Solved with native CLIPS. Parsed ${data.rulesUsed.length} rule lines.`, 'ok');
  } catch (error) {
    setStatus(error.message || String(error), 'error');
  }
}

document.getElementById('solve').addEventListener('click', solvePuzzle);
document.getElementById('sample').addEventListener('click', () => {
  puzzleEl.value = samplePuzzle;
  renderPuzzleGrid(samplePuzzle);
  setStatus('');
});
document.getElementById('clear').addEventListener('click', () => {
  puzzleEl.value = '';
  renderPuzzleGrid('');
  rulesEl.innerHTML = '';
  outputEl.textContent = '';
  setStatus('');
});

// Update grid when puzzle is pasted or typed
puzzleEl.addEventListener('input', () => {
  renderPuzzleGrid(puzzleEl.value);
});

// Initialize board with sample puzzle on page load
puzzleEl.value = samplePuzzle;
renderPuzzleGrid(samplePuzzle);
