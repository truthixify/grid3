use crate::game::{EMPTY, WINNER_DRAW, WINNER_NONE, WINNER_O, WINNER_X};

/// The 8 possible winning lines on a 3x3 board:
/// 3 rows, 3 columns, 2 diagonals.
const WIN_LINES: [[usize; 3]; 8] = [
    // rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // diagonals
    [0, 4, 8],
    [2, 4, 6],
];

/// Check the board for a winner.
///
/// Returns:
///   0 (WINNER_NONE) - no winner yet and board not full
///   1 (WINNER_X)    - X wins
///   2 (WINNER_O)    - O wins
///   3 (WINNER_DRAW) - board is full with no winner
pub fn check_winner(board: &[u8; 9]) -> u8 {
    for line in &WIN_LINES {
        let a = board[line[0]];
        let b = board[line[1]];
        let c = board[line[2]];

        if a != EMPTY && a == b && b == c {
            return if a == 1 { WINNER_X } else { WINNER_O };
        }
    }

    // Check if board is full (draw)
    let board_full = board.iter().all(|&cell| cell != EMPTY);
    if board_full {
        WINNER_DRAW
    } else {
        WINNER_NONE
    }
}
