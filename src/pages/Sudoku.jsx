import { useState, useCallback } from 'react';
import '../styles/Sudoku.css';

// ── Puzzle generation ────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board, row, col, num) {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  // Check 3×3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function fillBoard(board, pos) {
  if (pos === 81) return true;
  const row = Math.floor(pos / 9);
  const col = pos % 9;
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const d of digits) {
    if (isValid(board, row, col, d)) {
      board[row][col] = d;
      if (fillBoard(board, pos + 1)) return true;
      board[row][col] = null;
    }
  }
  return false;
}

function generateSolution() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(null));
  fillBoard(board, 0);
  return board;
}

const CLUE_COUNTS = { easy: 45, medium: 36, hard: 28, expert: 22 };

function createPuzzle(solution, difficulty) {
  const clues = CLUE_COUNTS[difficulty];
  const toRemove = 81 - clues;

  // Build list of all positions, shuffle them
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));

  const puzzle = solution.map(row => [...row]);

  // Track how many clues remain per row, col, and box
  const rowCount  = Array(9).fill(9);
  const colCount  = Array(9).fill(9);
  const boxCount  = Array(9).fill(9);

  let removed = 0;
  for (const pos of positions) {
    if (removed >= toRemove) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);

    // Always leave at least 1 clue per row, col, and box
    if (rowCount[r] > 1 && colCount[c] > 1 && boxCount[box] > 1) {
      puzzle[r][c] = null;
      rowCount[r]--;
      colCount[c]--;
      boxCount[box]--;
      removed++;
    }
  }

  return puzzle;
}

// ── Highlighting helpers ─────────────────────────────────────────────────────

function getCellClasses(r, c, puzzle, board, errors, selectedCell, selectedNum) {
  const classes = ['cell'];
  const isGiven = puzzle[r][c] !== null;
  const value = board[r][c];
  const key = `${r},${c}`;

  if (isGiven) {
    classes.push('given');
  } else if (value !== null) {
    classes.push('user-entry');
  }

  if (!isGiven && errors.has(key)) {
    classes.push('error');
  }

  const [sr, sc] = selectedCell ?? [-1, -1];
  const isSelected = sr === r && sc === c;

  if (isSelected) {
    classes.push('selected');
  } else if (sr !== -1) {
    // Highlight same row, col, or 3×3 box as the selected cell
    const sameBox =
      Math.floor(sr / 3) === Math.floor(r / 3) &&
      Math.floor(sc / 3) === Math.floor(c / 3);
    if (sr === r || sc === c || sameBox) {
      classes.push('highlighted');
    }
  }

  // Highlight cells with the same number as selectedNum (or selected cell's value)
  const highlightNum = selectedNum ?? (selectedCell ? board[sr]?.[sc] ?? puzzle[sr]?.[sc] : null);
  if (!isSelected && value !== null && value === highlightNum) {
    classes.push('same-number');
  }

  return classes.join(' ');
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Sudoku() {
  const [gamePhase, setGamePhase] = useState('setup');   // 'setup' | 'playing' | 'won'
  const [difficulty, setDifficulty] = useState('easy');
  const [solution, setSolution] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoard] = useState(null);
  const [selectedNum, setSelectedNum] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(new Set());

  // Start a new game
  const startGame = useCallback((diff = difficulty) => {
    const sol = generateSolution();
    const puz = createPuzzle(sol, diff);
    setSolution(sol);
    setPuzzle(puz);
    setBoard(puz.map(row => [...row]));
    setSelectedNum(null);
    setSelectedCell(null);
    setErrors(new Set());
    setGamePhase('playing');
  }, [difficulty]);

  // Place a number in a cell and validate
  const placeNumber = useCallback((r, c, num, currentBoard, currentSolution, currentPuzzle) => {
    if (currentPuzzle[r][c] !== null) return; // given cell — ignore

    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = num;

    const newErrors = new Set(errors);
    const key = `${r},${c}`;
    if (currentSolution[r][c] !== num) {
      newErrors.add(key);
    } else {
      newErrors.delete(key);
    }

    setBoard(newBoard);
    setErrors(newErrors);

    // Check win: all cells filled and no errors
    const allFilled = newBoard.every(row => row.every(v => v !== null));
    if (allFilled && newErrors.size === 0) {
      setGamePhase('won');
    }
  }, [errors]);

  // Handle cell tap
  const handleCellTap = useCallback((r, c) => {
    if (!puzzle || !board || !solution) return;
    if (puzzle[r][c] !== null) {
      // Tapped a given clue — just update highlight context
      setSelectedCell([r, c]);
      return;
    }

    if (selectedNum !== null) {
      // Number already chosen — fill immediately
      placeNumber(r, c, selectedNum, board, solution, puzzle);
      setSelectedCell([r, c]);
    } else {
      // No number chosen — select the cell
      setSelectedCell([r, c]);
    }
  }, [puzzle, board, solution, selectedNum, placeNumber]);

  // Handle number pad tap
  const handleNumTap = useCallback((num) => {
    if (!puzzle || !board || !solution) return;

    if (selectedNum === num) {
      setSelectedNum(null);
      return;
    }

    setSelectedNum(num);

    // If a cell is already selected, fill it immediately
    if (selectedCell) {
      const [r, c] = selectedCell;
      if (puzzle[r][c] === null) {
        placeNumber(r, c, num, board, solution, puzzle);
      }
    }
  }, [puzzle, board, solution, selectedNum, selectedCell, placeNumber]);

  // Handle erase
  const handleErase = useCallback(() => {
    if (!selectedCell || !puzzle || !board) return;
    const [r, c] = selectedCell;
    if (puzzle[r][c] !== null) return; // can't erase given

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = null;
    const newErrors = new Set(errors);
    newErrors.delete(`${r},${c}`);
    setBoard(newBoard);
    setErrors(newErrors);
  }, [selectedCell, puzzle, board, errors]);

  // Count remaining uses of each digit
  const digitCounts = useCallback(() => {
    if (!board) return {};
    const counts = {};
    for (let d = 1; d <= 9; d++) {
      let used = 0;
      board.forEach(row => row.forEach(v => { if (v === d) used++; }));
      counts[d] = 9 - used; // remaining
    }
    return counts;
  }, [board]);

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (gamePhase === 'setup') {
    return (
      <div className="sudoku-container">
        <div className="sudoku-setup">
          <h1>Sudoku</h1>
          <p>Choose a difficulty to start playing</p>

          <div className="difficulty-grid">
            {[
              { key: 'easy',   label: 'Easy',   clues: CLUE_COUNTS.easy },
              { key: 'medium', label: 'Medium', clues: CLUE_COUNTS.medium },
              { key: 'hard',   label: 'Hard',   clues: CLUE_COUNTS.hard },
              { key: 'expert', label: 'Expert', clues: CLUE_COUNTS.expert },
            ].map(({ key, label, clues }) => (
              <button
                key={key}
                className={`difficulty-btn ${key}${difficulty === key ? ' selected' : ''}`}
                onClick={() => setDifficulty(key)}
              >
                <span className="diff-label">{label}</span>
                <span className="diff-clues">{clues} clues</span>
              </button>
            ))}
          </div>

          <button className="btn-start" onClick={() => startGame(difficulty)}>
            New Game
          </button>
        </div>
      </div>
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const counts = digitCounts();

  return (
    <div className="sudoku-container">
      {/* Header */}
      <div className="sudoku-header">
        <span className={`diff-badge ${difficulty}`}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
        <button className="btn-new-game" onClick={() => setGamePhase('setup')}>
          New Game
        </button>
      </div>

      {/* Board */}
      <div className="board-wrapper">
        <div className="board">
          {puzzle && board && Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => {
              const value = board[r][c];
              return (
                <div
                  key={`${r}-${c}`}
                  className={getCellClasses(r, c, puzzle, board, errors, selectedCell, selectedNum)}
                  onClick={() => handleCellTap(r, c)}
                >
                  {value ?? ''}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Number Pad */}
      <div className="numpad-section">
        <p className="numpad-hint">
          {selectedNum
            ? `Tap a cell to place ${selectedNum}`
            : selectedCell
              ? 'Select a number to fill the highlighted cell'
              : 'Select a number or tap a cell'}
        </p>
        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              className={`numpad-btn${selectedNum === n ? ' active' : ''}`}
              onClick={() => handleNumTap(n)}
            >
              {n}
              {counts[n] !== undefined && counts[n] > 0 && (
                <span className="num-count">{counts[n]}</span>
              )}
            </button>
          ))}
          <button className="numpad-btn erase" onClick={handleErase}>
            ⌫
          </button>
        </div>
      </div>

      {/* Win overlay */}
      {gamePhase === 'won' && (
        <div className="win-overlay">
          <div className="win-card">
            <div className="win-emoji">🎉</div>
            <h2>Puzzle Solved!</h2>
            <p>
              You completed the{' '}
              <strong style={{ color: '#3b82f6' }}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </strong>{' '}
              puzzle.
            </p>
            <button className="btn-play-again" onClick={() => setGamePhase('setup')}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
