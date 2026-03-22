import { SudokuGame } from './sudoku.js';

// Game State
const state = {
    difficulty: 'medium',
    board: Array(81).fill(0),
    initialBoard: Array(81).fill(0),
    solution: Array(81).fill(0),
    notes: Array.from({ length: 81 }, () => new Set()),
    activeNum: null,
    notesMode: false,
    selectedCell: null,
    isDragging: false,
    draggedCells: new Set(),
    history: [],
    pendingSave: false,
    timer: 0,
    timerInterval: null,
    isPlaying: false
};

// DOM Elements
const els = {
    app: document.getElementById('app'),
    difficultyModal: document.getElementById('difficulty-modal'),
    diffDisplay: document.getElementById('difficulty-display'),
    diffText: document.getElementById('current-diff-text'),
    gameScreen: document.getElementById('game-screen'),
    board: document.getElementById('sudoku-board'),
    numpad: document.getElementById('numpad'),
    undoBtn: document.getElementById('undo-btn'),
    restartBtn: document.getElementById('restart-btn'),
    notesToggle: document.getElementById('notes-toggle'),
    eraseBtn: document.getElementById('erase-btn'),
    timer: document.getElementById('timer'),
    winModal: document.getElementById('win-modal'),
    loseModal: document.getElementById('lose-modal'),
    winTime: document.getElementById('win-time')
};

// Initialize the app
function init() {
    setupDifficultyButtons();
    setupControls();
    setupModals();
    generateNumpad();
    
    // Auto-start on Expert
    startGame('very-hard');
}

function startGame(difficulty) {
    state.difficulty = difficulty;
    
    // Update UI text
    const displayMap = {
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard',
        'very-hard': 'Expert'
    };
    els.diffText.innerText = displayMap[difficulty] || 'Expert';
    
    const game = new SudokuGame();
    const puzzle = game.createPuzzle(difficulty);

    state.initialBoard = puzzle.initial;
    state.board = [...puzzle.initial];
    state.solution = puzzle.solution;
    state.notes = Array.from({ length: 81 }, () => new Set());
    state.activeNum = null;
    state.selectedCell = null;
    state.isDragging = false;
    state.draggedCells.clear();
    state.history = [];
    state.pendingSave = false;

    startTimer();
    renderBoard();
    updateNumpad();

    els.gameScreen.classList.add('active');
    state.isPlaying = true;
}

// UI Setup
function setupDifficultyButtons() {
    els.diffDisplay.addEventListener('click', (e) => {
        els.difficultyModal.classList.remove('hidden');
    });

    document.getElementById('close-diff-btn').addEventListener('click', (e) => {
        els.difficultyModal.classList.add('hidden');
    });

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            els.difficultyModal.classList.add('hidden');
            const diffName = e.target.innerText;
            const targetDiff = e.target.dataset.difficulty;
            
            // Minimal timeout just for rendering flush, but click is safe
            setTimeout(() => {
                if (confirm('Start a new ' + diffName + ' game? Current progress will be lost.')) {
                    startGame(targetDiff);
                }
            }, 10);
        });
    });

    els.restartBtn.addEventListener('click', (e) => {
        if (state.isPlaying) {
            setTimeout(() => {
                if (confirm('Are you sure you want to restart this puzzle? All your progress will be erased.')) {
                    state.board = [...state.initialBoard];
                    state.notes = Array.from({ length: 81 }, () => new Set());
                    state.history = [];
                    state.selectedCell = null;
                    state.activeNum = null;
                    startTimer();
                    updateHighlights();
                }
            }, 10);
        }
    });

    // Confirm before closing tab or reloading
    window.addEventListener('beforeunload', (e) => {
        if (state.isPlaying) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function setupControls() {
    els.undoBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
    });

    els.notesToggle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.notesMode = !state.notesMode;
        els.notesToggle.classList.toggle('active', state.notesMode);
        els.notesToggle.querySelector('span').innerText = `Notes: ${state.notesMode ? 'ON' : 'OFF'}`;
    });

    els.eraseBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.selectedCell !== null) {
            state.pendingSave = true;
            handleErase(state.selectedCell);
            state.pendingSave = false;
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!state.isPlaying) return;

        if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            handleNumSelect(num);
            if (state.selectedCell !== null && state.activeNum !== null) {
                state.pendingSave = true;
                handleCellInput(state.selectedCell, num);
                state.pendingSave = false;
            }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            if (state.selectedCell !== null) {
                state.pendingSave = true;
                handleErase(state.selectedCell);
                state.pendingSave = false;
            }
        } else if (e.key === 'n' || e.key === 'N') {
            els.notesToggle.click();
        } else if (e.key === 'z' || e.key === 'Z') {
            handleUndo();
        } else if (e.key === 'Escape') {
            state.selectedCell = null;
            state.activeNum = null;
            updateHighlights();
        }
    });

    // Deselect if clicking outside board/controls
    document.addEventListener('pointerdown', (e) => {
        if (!state.isPlaying) return;
        const clickedInGame = e.target.closest('.sudoku-board') || e.target.closest('.controls') || e.target.closest('.game-header');
        if (!clickedInGame) {
            state.activeNum = null;
            state.selectedCell = null;
            updateHighlights();
        }
    });

    document.addEventListener('pointerup', () => {
        state.isDragging = false;
        state.draggedCells.clear();
    });

    document.addEventListener('pointercancel', () => {
        state.isDragging = false;
        state.draggedCells.clear();
    });

    document.addEventListener('pointermove', (e) => {
        if (!state.isDragging || !state.notesMode || state.activeNum === null) return;

        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el) return;

        const cell = el.closest('.cell');
        if (!cell) return;

        const index = parseInt(cell.dataset.index);
        if (!isNaN(index) && !state.draggedCells.has(index)) {
            state.draggedCells.add(index);
            handleCellInput(index, state.activeNum);
        }
    });

    // Prevent default touch actions (like scrolling) while dragging on the board
    els.board.addEventListener('touchmove', (e) => {
        if (state.isDragging) e.preventDefault();
    }, { passive: false });
}

function setupModals() {
    document.getElementById('new-game-btn').addEventListener('click', (e) => {
        els.winModal.classList.add('hidden');
        startGame(state.difficulty);
    });

    document.getElementById('try-again-btn').addEventListener('click', (e) => {
        els.loseModal.classList.add('hidden');
        startGame(state.difficulty);
    });
}

function generateNumpad() {
    els.numpad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.innerText = i;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNumSelect(i);
        });
        els.numpad.appendChild(btn);
    }
}

// Game Actions
function handleNumSelect(num) {
    if (state.activeNum === num) {
        state.activeNum = null; // Toggle off
    } else {
        state.activeNum = num;
    }

    // If a cell was selected, input the number
    if (state.selectedCell !== null && state.activeNum !== null) {
        state.pendingSave = true;
        handleCellInput(state.selectedCell, state.activeNum);
        state.pendingSave = false;
    }

    updateHighlights();
}

function handleCellClick(index) {
    if (state.initialBoard[index] !== 0) return; // Given cell

    if (state.activeNum !== null) {
        // Num pad is active, clicking cell fills it
        state.pendingSave = true;
        handleCellInput(index, state.activeNum);
        state.pendingSave = false;
    } else {
        // Just selecting the cell for keyboard/post-selection workflow
        if (state.selectedCell === index) {
            state.selectedCell = null;
        } else {
            state.selectedCell = index;
        }
        updateHighlights();
    }
}

function handleCellInput(index, num) {
    if (state.initialBoard[index] !== 0) return;

    if (state.notesMode) {
        // Toggle note
        if (state.board[index] !== 0) return; // Don't add note to filled cell
        triggerSave();
        if (state.notes[index].has(num)) {
            state.notes[index].delete(num);
        } else {
            state.notes[index].add(num);
        }
    } else {
        // Fill value
        if (state.board[index] === num) {
            triggerSave();
            state.board[index] = 0; // Toggle off
        } else {
            triggerSave();
            state.board[index] = num;
            // Always remove notes that intersect
            clearNotesOnFill(index, num);
            checkWin();
        }
    }
    updateHighlights();
}

function handleErase(index) {
    if (state.initialBoard[index] !== 0) return;
    if (state.board[index] === 0 && state.notes[index].size === 0) return;
    triggerSave();
    state.board[index] = 0;
    state.notes[index].clear();
    updateHighlights();
}

function clearNotesOnFill(index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const blockRow = Math.floor(row / 3) * 3;
    const blockCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        if (r === row || c === col || (r >= blockRow && r < blockRow + 3 && c >= blockCol && c < blockCol + 3)) {
            state.notes[i].delete(num);
        }
    }
}

function checkWin() {
    for (let i = 0; i < 81; i++) {
        if (state.board[i] !== state.solution[i]) return;
    }
    stopTimer();
    els.winTime.innerText = `Time: ${formatTime(state.timer)}`;
    els.winModal.classList.remove('hidden');
}

function triggerSave() {
    if (state.pendingSave) {
        state.history.push({
            board: [...state.board],
            notes: state.notes.map(n => new Set(n))
        });
        state.pendingSave = false;
    }
}

function handleUndo() {
    if (state.history.length === 0) return;
    const lastAction = state.history.pop();
    state.board = [...lastAction.board];
    state.notes = lastAction.notes.map(n => new Set(n));
    updateHighlights();
}

function renderBoard() {
    // Only create cells if the board is empty
    if (els.board.children.length === 0) {
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;

            cell.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Don't release pointer capture here, CSS touch-action manipulation handles it

                if (state.activeNum !== null && state.notesMode) {
                    state.isDragging = true;
                    state.draggedCells.add(i);
                }
                handleCellClick(i);
            });

            els.board.appendChild(cell);
        }
    }

    updateHighlights();
}

function updateHighlights() {

    const activeRows = new Set();
    const activeCols = new Set();
    const activeBlocks = new Set();

    if (state.activeNum !== null) {
        for (let i = 0; i < 81; i++) {
            if (state.board[i] === state.activeNum) {
                activeRows.add(Math.floor(i / 9));
                activeCols.add(i % 9);
                activeBlocks.add(Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3));
            }
        }
    }

    for (let i = 0; i < 81; i++) {
        const cell = els.board.children[i];
        cell.className = 'cell'; // reset classes
        cell.innerHTML = ''; // reset content

        if (state.initialBoard[i] !== 0) {
            cell.classList.add('given');
            cell.innerText = state.initialBoard[i];
        } else if (state.board[i] !== 0) {
            cell.innerText = state.board[i];
        } else {
            // Render notes
            if (state.notes[i].size > 0) {
                const notesGrid = document.createElement('div');
                notesGrid.className = 'notes-grid';
                for (let n = 1; n <= 9; n++) {
                    const noteSpan = document.createElement('div');
                    noteSpan.className = 'note';
                    if (state.notes[i].has(n)) {
                        noteSpan.innerText = n;
                        
                        // Check if this note matches the currently actively highlighted digit
                        const isMatch = (state.activeNum !== null && state.activeNum === n) || 
                                        (state.selectedCell !== null && state.board[state.selectedCell] === n);
                        
                        if (isMatch) {
                            noteSpan.classList.add('bold-note');
                        }
                    }
                    notesGrid.appendChild(noteSpan);
                }
                cell.appendChild(notesGrid);
            }
        }

        // Add highlight classes
        if (i === state.selectedCell) cell.classList.add('selected');

        const row = Math.floor(i / 9);
        const col = i % 9;
        const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);

        // Highlight active number occurrences and their rows/cols
        if (state.activeNum !== null) {
            if (state.board[i] === state.activeNum) {
                cell.classList.add('highlighted');
            } else if (activeRows.has(row) || activeCols.has(col) || activeBlocks.has(block)) {
                cell.classList.add('soft-highlight');
            }
        } else if (state.selectedCell !== null && state.board[state.selectedCell] !== 0) {
            // Highlight occurrences of the number in the selected cell
            const selectedVal = state.board[state.selectedCell];
            if (state.board[i] === selectedVal) {
                cell.classList.add('highlighted');
            }
        }
    }
    updateNumpad();
}

function updateNumpad() {
    const btns = els.numpad.querySelectorAll('.num-btn');

    // Count occurrences to disable button if all 9 are placed correctly
    const counts = Array(10).fill(0);
    for (let i = 0; i < 81; i++) {
        if (state.board[i] === state.solution[i] && state.board[i] !== 0) {
            counts[state.board[i]]++;
        }
    }

    btns.forEach((btn, index) => {
        const num = index + 1;
        btn.classList.toggle('active', state.activeNum === num);
        btn.disabled = counts[num] >= 9;
    });
}

function startTimer() {
    stopTimer();
    state.timer = 0;
    renderTimer();
    state.timerInterval = setInterval(() => {
        state.timer++;
        renderTimer();
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
}

function renderTimer() {
    els.timer.innerText = formatTime(state.timer);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Boot
init();
