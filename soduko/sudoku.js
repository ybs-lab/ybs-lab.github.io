/**
 * Vanilla JS Sudoku Generator & Logic
 * Generates solvable Sudoku puzzles
 */

export class SudokuGame {
    constructor() {
        this.board = Array(81).fill(0);
        this.solution = Array(81).fill(0);
    }

    // Helper functions
    getRow(index) { return Math.floor(index / 9); }
    getCol(index) { return index % 9; }
    getBlock(index) { return Math.floor(this.getRow(index) / 3) * 3 + Math.floor(this.getCol(index) / 3); }

    isValid(board, index, value) {
        const row = this.getRow(index);
        const col = this.getCol(index);
        const block = this.getBlock(index);

        for (let i = 0; i < 81; i++) {
            if (i === index) continue;
            if (board[i] === value) {
                if (this.getRow(i) === row || this.getCol(i) === col || this.getBlock(i) === block) {
                    return false;
                }
            }
        }
        return true;
    }

    solve(board) {
        for (let i = 0; i < 81; i++) {
            if (board[i] === 0) {
                for (let v = 1; v <= 9; v++) {
                    if (this.isValid(board, i, v)) {
                        board[i] = v;
                        if (this.solve(board)) return true;
                        board[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    fillDiagonalBlocks() {
        for (let base = 0; base < 81; base += 30) { // blocks 0, 4, 8
            const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            this.shuffle(nums);
            let nIdx = 0;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    this.solution[base + i * 9 + j] = nums[nIdx++];
                }
            }
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    generateSolution() {
        this.solution = Array(81).fill(0);
        this.fillDiagonalBlocks();
        this.solve(this.solution);
    }

    createPuzzle(difficulty) {
        this.generateSolution();
        this.board = [...this.solution];

        // Numbers to remove based on difficulty
        let attempts;
        if (difficulty === 'easy') attempts = 30; // Will leave ~51 clues
        else if (difficulty === 'medium') attempts = 40; // Leaves ~41 clues
        else if (difficulty === 'hard') attempts = 50; // Leaves ~31 clues
        else attempts = 60; // Expert Leaves ~21 clues

        while (attempts > 0) {
            let row = Math.floor(Math.random() * 9);
            let col = Math.floor(Math.random() * 9);
            let idx = row * 9 + col;
            
            while (this.board[idx] === 0) {
                row = Math.floor(Math.random() * 9);
                col = Math.floor(Math.random() * 9);
                idx = row * 9 + col;
            }

            const backup = this.board[idx];
            this.board[idx] = 0;

            const copy = [...this.board];
            let solutions = 0;

            // Simple check if still uniquely solvable
            const countSolutions = (b, index = 0) => {
                if (index === 81) {
                    solutions++;
                    return solutions > 1;
                }
                if (b[index] !== 0) return countSolutions(b, index + 1);

                for (let v = 1; v <= 9; v++) {
                    if (this.isValid(b, index, v)) {
                        b[index] = v;
                        if (countSolutions(b, index + 1)) return true;
                        b[index] = 0;
                    }
                }
                return false;
            };

            countSolutions(copy);
            if (solutions !== 1) {
                this.board[idx] = backup; // Cannot remove this, puts it back
            }
            attempts--;
        }

        return {
            initial: [...this.board],
            solution: [...this.solution]
        };
    }
}
