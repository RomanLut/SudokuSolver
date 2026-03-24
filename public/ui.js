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
  // given cells start with no candidates; empty cells start with all 9
  const cands = board.map(v => v ? new Set() : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));

  return rulesUsed.map(rule => {
    // assignments: rXcY=Z  (not preceded by !)
    const assignRegex = /r(\d)c(\d)=(\d)/g;
    let m;
    while ((m = assignRegex.exec(rule)) !== null) {
      const row = parseInt(m[1]) - 1;
      const col = parseInt(m[2]) - 1;
      const digit = parseInt(m[3]);
      const idx = row * 9 + col;
      board[idx] = m[3];
      cands[idx] = new Set();
      // remove digit from peers that already have notes (size < 9 means at least one elimination happened)
      const peers = new Set();
      for (let c = 0; c < 9; c++) peers.add(row * 9 + c);
      for (let r = 0; r < 9; r++) peers.add(r * 9 + col);
      const boxR = Math.floor(row / 3) * 3;
      const boxC = Math.floor(col / 3) * 3;
      for (let r = boxR; r < boxR + 3; r++)
        for (let c = boxC; c < boxC + 3; c++)
          peers.add(r * 9 + c);
      for (const p of peers)
        if (cands[p].size < 9) cands[p].delete(digit);
    }
    // eliminations: rXcY≠Z
    const elimRegex = /r(\d)c(\d)≠(\d)/g;
    while ((m = elimRegex.exec(rule)) !== null) {
      const row = parseInt(m[1]) - 1;
      const col = parseInt(m[2]) - 1;
      const idx = row * 9 + col;
      if (cands[idx].size === 9) {
        // first elimination for this cell — remove digits already placed in peer cells
        for (let c = 0; c < 9; c++) { const d = parseInt(board[row * 9 + c]); if (d) cands[idx].delete(d); }
        for (let r = 0; r < 9; r++) { const d = parseInt(board[r * 9 + col]); if (d) cands[idx].delete(d); }
        const bR = Math.floor(row / 3) * 3, bC = Math.floor(col / 3) * 3;
        for (let r = bR; r < bR + 3; r++)
          for (let c = bC; c < bC + 3; c++) { const d = parseInt(board[r * 9 + c]); if (d) cands[idx].delete(d); }
      }
      cands[idx].delete(parseInt(m[3]));
    }
    return {
      boardState: [...board],
      candsState: cands.map(s => new Set(s)),
      highlightCells: parseCellRefs(rule),
    };
  });
}

function renderStepBoard(gridEl, originalPuzzle, boardState, candsState, highlightCells) {
  gridEl.innerHTML = '';
  const source = normalizePuzzle(originalPuzzle);
  const highlightSet = new Set(highlightCells);

  for (let i = 0; i < 81; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (source[i] !== '.' && source[i] !== '0') cell.classList.add('given');
    if (highlightSet.has(i)) cell.classList.add('step-highlight');

    if (boardState[i]) {
      cell.textContent = boardState[i];
    } else if (candsState[i].size < 9) {
      const notes = document.createElement('div');
      notes.className = 'notes';
      for (let n = 1; n <= 9; n += 1) {
        const span = document.createElement('span');
        if (candsState[i].has(n)) span.textContent = n;
        notes.appendChild(span);
      }
      cell.appendChild(notes);
    }

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
    const noSteps = total === 0;
    const atStart = !noSteps && selectedStepIndex === 0;
    const atEnd   = !noSteps && selectedStepIndex === total - 1;
    if (firstBtnEl) firstBtnEl.disabled = noSteps || atStart;
    if (prevBtnEl)  prevBtnEl.disabled  = noSteps || atStart;
    if (nextBtnEl)  nextBtnEl.disabled  = noSteps || atEnd;
    if (lastBtnEl)  lastBtnEl.disabled  = noSteps || atEnd;
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
    const { boardState, candsState, highlightCells } = stepStates[index];
    renderStepBoard(gridEl, currentPuzzle, boardState, candsState, highlightCells);
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
