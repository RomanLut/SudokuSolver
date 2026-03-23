export function normalizePuzzle(input) {
  return String(input || '')
    .replace(/[|+\-!]/g, '')
    .replace(/\s+/g, '');
}

export function renderPuzzleGrid(gridEl, puzzle) {
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

export function renderGrid(gridEl, originalPuzzle, solvedGrid) {
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

function parseCellRefs(rule) {
  const seen = new Set();
  const refs = [];
  const regex = /r(\d)c(\d)/g;
  let m;
  while ((m = regex.exec(rule)) !== null) {
    const idx = (parseInt(m[1]) - 1) * 9 + (parseInt(m[2]) - 1);
    if (!seen.has(idx)) { seen.add(idx); refs.push(idx); }
  }
  return refs;
}

function buildStepStates(originalPuzzle, rulesUsed) {
  const source = normalizePuzzle(originalPuzzle);
  const board = source.split('').map(c => (c === '.' || c === '0') ? '' : c);

  return rulesUsed.map(rule => {
    const assignRegex = /r(\d)c(\d)=(\d)/g;
    let m;
    while ((m = assignRegex.exec(rule)) !== null) {
      board[(parseInt(m[1]) - 1) * 9 + (parseInt(m[2]) - 1)] = m[3];
    }
    return { boardState: [...board], highlightCells: parseCellRefs(rule) };
  });
}

function renderStepBoard(gridEl, originalPuzzle, boardState, highlightCells) {
  gridEl.innerHTML = '';
  const source = normalizePuzzle(originalPuzzle);
  const highlightSet = new Set(highlightCells);

  for (let i = 0; i < 81; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (source[i] !== '.' && source[i] !== '0') cell.classList.add('given');
    if (highlightSet.has(i)) cell.classList.add('step-highlight');
    cell.textContent = boardState[i] || '';
    gridEl.appendChild(cell);
  }
}

export function createStepViewer(gridEl, rulesEl, firstBtnEl, prevBtnEl, nextBtnEl, lastBtnEl) {
  let currentPuzzle = '';
  let currentSolvedGrid = null;
  let stepStates = [];
  let selectedStepIndex = -1;

  function updateButtons() {
    const total = stepStates.length;
    const atStart = total === 0 || selectedStepIndex <= 0;
    const atEnd   = total === 0 || selectedStepIndex >= total - 1;
    if (firstBtnEl) firstBtnEl.disabled = atStart;
    if (prevBtnEl)  prevBtnEl.disabled  = atStart;
    if (nextBtnEl)  nextBtnEl.disabled  = atEnd;
    if (lastBtnEl)  lastBtnEl.disabled  = atEnd;
  }

  function selectStep(index) {
    const prev = selectedStepIndex >= 0 ? rulesEl.children[selectedStepIndex] : null;
    if (prev) prev.classList.remove('step-active');

    if (index < 0 || index >= stepStates.length) {
      selectedStepIndex = -1;
      renderGrid(gridEl, currentPuzzle, currentSolvedGrid);
      updateButtons();
      return;
    }

    selectedStepIndex = index;
    const li = rulesEl.children[index];
    if (li) {
      li.classList.add('step-active');
      rulesEl.scrollTop = li.offsetTop - rulesEl.offsetTop;
    }
    const { boardState, highlightCells } = stepStates[index];
    renderStepBoard(gridEl, currentPuzzle, boardState, highlightCells);
    updateButtons();
  }

  function renderRules(rulesUsed) {
    rulesEl.innerHTML = '';
    selectedStepIndex = -1;

    if (!rulesUsed || !rulesUsed.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = 'No rule lines were parsed from solver output.';
      rulesEl.appendChild(li);
      updateButtons();
      return;
    }

    rulesUsed.forEach((rule, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = rule;
      li.addEventListener('click', () => {
        selectStep(selectedStepIndex === index ? -1 : index);
      });
      rulesEl.appendChild(li);
    });

    updateButtons();
  }

  if (firstBtnEl) firstBtnEl.addEventListener('click', () => selectStep(0));
  if (prevBtnEl)  prevBtnEl.addEventListener('click',  () => selectStep(selectedStepIndex <= 0 ? 0 : selectedStepIndex - 1));
  if (nextBtnEl)  nextBtnEl.addEventListener('click',  () => selectStep(selectedStepIndex + 1));
  if (lastBtnEl)  lastBtnEl.addEventListener('click',  () => selectStep(stepStates.length - 1));

  return {
    setup(puzzle, solvedGrid, rulesUsed) {
      currentPuzzle = puzzle;
      currentSolvedGrid = solvedGrid;
      stepStates = buildStepStates(puzzle, rulesUsed);
      renderRules(rulesUsed);
    },
  };
}
