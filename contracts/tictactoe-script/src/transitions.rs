use ckb_std::{
    ckb_constants::Source,
    high_level::{load_cell_capacity, load_cell_lock_hash},
};

use crate::error::Error;
use crate::game::*;
use crate::win::check_winner;

/// Check if a lock_hash is authorized by being present in one of the transaction inputs.
pub fn is_authorized(lock_hash: &[u8; 32]) -> bool {
    let mut index = 0;
    loop {
        match load_cell_lock_hash(index, Source::Input) {
            Ok(hash) => {
                if hash.as_ref() == lock_hash.as_slice() {
                    return true;
                }
                index += 1;
            }
            Err(_) => return false,
        }
    }
}

/// Sum the capacities of all output cells whose lock_hash matches the given hash.
fn sum_output_capacity_by_lock(lock_hash: &[u8; 32]) -> Result<u64, Error> {
    let mut total: u64 = 0;
    let mut index = 0;
    loop {
        match load_cell_lock_hash(index, Source::Output) {
            Ok(hash) => {
                if hash.as_ref() == lock_hash.as_slice() {
                    let cap = load_cell_capacity(index, Source::Output)?;
                    total = total.checked_add(cap).ok_or(Error::InvalidPayout)?;
                }
                index += 1;
            }
            Err(ckb_std::error::SysError::IndexOutOfBound) => break,
            Err(e) => return Err(e.into()),
        }
    }
    Ok(total)
}

// ---------------------------------------------------------------------------
// CREATE: no group input -> 1 group output (WAITING)
// ---------------------------------------------------------------------------

pub fn validate_create(output_data: &[u8]) -> Result<(), Error> {
    let game = GameData::from_bytes(output_data).ok_or(Error::InvalidCellData)?;

    if game.game_state != STATE_WAITING {
        return Err(Error::InvalidGameState);
    }
    if game.board.iter().any(|&c| c != EMPTY) {
        return Err(Error::InvalidBoard);
    }
    if game.current_turn != PLAYER_X {
        return Err(Error::WrongTurn);
    }
    if game.player_x_lock == ZERO_HASH {
        return Err(Error::Unauthorized);
    }
    if game.player_o_lock != ZERO_HASH {
        return Err(Error::InvalidTransition);
    }
    if game.stake_amount == 0 {
        return Err(Error::InvalidStake);
    }
    if game.winner != WINNER_NONE {
        return Err(Error::InvalidWinner);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// JOIN: 1 group input (WAITING) -> 1 group output (ACTIVE)
// ---------------------------------------------------------------------------

pub fn validate_join(input_data: &[u8], output_data: &[u8]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;
    let output = GameData::from_bytes(output_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_WAITING {
        return Err(Error::InvalidGameState);
    }
    if output.game_state != STATE_ACTIVE {
        return Err(Error::InvalidGameState);
    }
    if output.player_o_lock == ZERO_HASH {
        return Err(Error::Unauthorized);
    }
    if input.player_x_lock != output.player_x_lock {
        return Err(Error::InvalidTransition);
    }
    if output.board.iter().any(|&c| c != EMPTY) {
        return Err(Error::InvalidBoard);
    }
    if output.current_turn != PLAYER_X {
        return Err(Error::WrongTurn);
    }
    if input.stake_amount != output.stake_amount {
        return Err(Error::InvalidStake);
    }
    if output.winner != WINNER_NONE {
        return Err(Error::InvalidWinner);
    }

    let input_cap = load_cell_capacity(0, Source::GroupInput)?;
    let output_cap = load_cell_capacity(0, Source::GroupOutput)?;
    let required = input_cap
        .checked_add(input.stake_amount)
        .ok_or(Error::InvalidStake)?;
    if output_cap < required {
        return Err(Error::InvalidStake);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// MOVE: 1 group input (ACTIVE) -> 1 group output (ACTIVE)
//       Exactly one board position changes.
// ---------------------------------------------------------------------------

pub fn validate_move(input_data: &[u8], output_data: &[u8]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;
    let output = GameData::from_bytes(output_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_ACTIVE || output.game_state != STATE_ACTIVE {
        return Err(Error::InvalidGameState);
    }

    // Exactly one board position changed
    let mut changed_count = 0usize;
    let mut changed_idx = 0usize;
    for i in 0..9 {
        if input.board[i] != output.board[i] {
            changed_count += 1;
            changed_idx = i;
        }
    }
    if changed_count != 1 {
        return Err(Error::InvalidMove);
    }
    if input.board[changed_idx] != EMPTY {
        return Err(Error::InvalidMove);
    }
    if output.board[changed_idx] != input.current_turn {
        return Err(Error::InvalidMove);
    }

    // Turn must flip
    let expected_next = if input.current_turn == PLAYER_X {
        PLAYER_O
    } else {
        PLAYER_X
    };
    if output.current_turn != expected_next {
        return Err(Error::WrongTurn);
    }

    // Everything else unchanged
    if input.player_x_lock != output.player_x_lock {
        return Err(Error::InvalidTransition);
    }
    if input.player_o_lock != output.player_o_lock {
        return Err(Error::InvalidTransition);
    }
    if input.stake_amount != output.stake_amount {
        return Err(Error::InvalidStake);
    }
    if input.winner != WINNER_NONE || output.winner != WINNER_NONE {
        return Err(Error::InvalidWinner);
    }

    // Lock must be unchanged
    let input_lock = load_cell_lock_hash(0, Source::GroupInput)?;
    let output_lock = load_cell_lock_hash(0, Source::GroupOutput)?;
    if input_lock.as_ref() != output_lock.as_ref() {
        return Err(Error::InvalidTransition);
    }

    // Authorization: current turn player must have signed
    let current_player_lock = if input.current_turn == PLAYER_X {
        &input.player_x_lock
    } else {
        &input.player_o_lock
    };
    if !is_authorized(current_player_lock) {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// RESET: 1 group input (ACTIVE) -> 1 group output (ACTIVE)
//        Board is full with no winner (draw). Clears board for a new round.
// ---------------------------------------------------------------------------

pub fn validate_reset(input_data: &[u8], output_data: &[u8]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;
    let output = GameData::from_bytes(output_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_ACTIVE || output.game_state != STATE_ACTIVE {
        return Err(Error::InvalidGameState);
    }

    // Input board must be a draw (full, no winner)
    let winner = check_winner(&input.board);
    if winner != WINNER_DRAW {
        return Err(Error::InvalidBoard);
    }

    // Output board must be completely empty
    if output.board.iter().any(|&c| c != EMPTY) {
        return Err(Error::InvalidBoard);
    }

    // Turn resets to PLAYER_X
    if output.current_turn != PLAYER_X {
        return Err(Error::WrongTurn);
    }

    // Players, stake, winner unchanged
    if input.player_x_lock != output.player_x_lock {
        return Err(Error::InvalidTransition);
    }
    if input.player_o_lock != output.player_o_lock {
        return Err(Error::InvalidTransition);
    }
    if input.stake_amount != output.stake_amount {
        return Err(Error::InvalidStake);
    }
    if output.winner != WINNER_NONE {
        return Err(Error::InvalidWinner);
    }

    // Lock must be unchanged
    let input_lock = load_cell_lock_hash(0, Source::GroupInput)?;
    let output_lock = load_cell_lock_hash(0, Source::GroupOutput)?;
    if input_lock.as_ref() != output_lock.as_ref() {
        return Err(Error::InvalidTransition);
    }

    // Either player can submit the reset
    if !is_authorized(&input.player_x_lock) && !is_authorized(&input.player_o_lock) {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// FINISH: 1 group input (ACTIVE) -> 0 group outputs (cell destroyed)
//         Board has a winner (X or O). Pays out 80/20.
// ---------------------------------------------------------------------------

pub fn validate_finish(input_data: &[u8], fee_lock_hash: &[u8; 32]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_ACTIVE {
        return Err(Error::InvalidGameState);
    }

    // Must have a winner on the board (X or O, not draw)
    let winner = check_winner(&input.board);
    if winner != WINNER_X && winner != WINNER_O {
        return Err(Error::InvalidWinner);
    }

    let total_pool = input
        .stake_amount
        .checked_mul(2)
        .ok_or(Error::InvalidPayout)?;

    let winner_lock = if winner == WINNER_X {
        &input.player_x_lock
    } else {
        &input.player_o_lock
    };

    let winner_expected = total_pool / 100 * 80;
    let fee_expected = total_pool / 100 * 20;

    let winner_received = sum_output_capacity_by_lock(winner_lock)?;
    let fee_received = sum_output_capacity_by_lock(fee_lock_hash)?;

    if winner_received < winner_expected {
        return Err(Error::InvalidPayout);
    }
    if fee_received < fee_expected {
        return Err(Error::InvalidPayout);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// FORFEIT: 1 group input (ACTIVE) -> 0 group outputs (cell destroyed)
//          No winner on the board. The submitter forfeits.
//          Entire pool goes to fee address (winner paid from treasury).
// ---------------------------------------------------------------------------

pub fn validate_forfeit(input_data: &[u8], fee_lock_hash: &[u8; 32]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_ACTIVE {
        return Err(Error::InvalidGameState);
    }

    // Must NOT have a winner (otherwise use FINISH)
    let winner = check_winner(&input.board);
    if winner == WINNER_X || winner == WINNER_O {
        return Err(Error::InvalidTransition);
    }

    // The forfeiting player must be authorized
    if !is_authorized(&input.player_x_lock) && !is_authorized(&input.player_o_lock) {
        return Err(Error::Unauthorized);
    }

    // Entire pool goes to fee address
    let total_pool = input
        .stake_amount
        .checked_mul(2)
        .ok_or(Error::InvalidPayout)?;

    let fee_received = sum_output_capacity_by_lock(fee_lock_hash)?;
    if fee_received < total_pool {
        return Err(Error::InvalidPayout);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// CANCEL: 1 group input (WAITING) -> 0 group outputs (cell destroyed)
// ---------------------------------------------------------------------------

pub fn validate_cancel(input_data: &[u8]) -> Result<(), Error> {
    let input = GameData::from_bytes(input_data).ok_or(Error::InvalidCellData)?;

    if input.game_state != STATE_WAITING {
        return Err(Error::InvalidGameState);
    }
    if !is_authorized(&input.player_x_lock) {
        return Err(Error::Unauthorized);
    }

    let returned = sum_output_capacity_by_lock(&input.player_x_lock)?;
    if returned == 0 {
        return Err(Error::InvalidPayout);
    }

    Ok(())
}
