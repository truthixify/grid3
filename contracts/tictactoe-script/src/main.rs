#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

mod error;
mod game;
mod transitions;
mod win;

use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
default_alloc!();

use ckb_std::{
    ckb_constants::Source,
    high_level::{load_cell_data, load_script},
};

use error::Error;
use game::*;
use transitions::*;

pub fn program_entry() -> i8 {
    match entry_inner() {
        Ok(()) => 0,
        Err(e) => e as i8,
    }
}

fn entry_inner() -> Result<(), Error> {
    let script = load_script()?;
    let args: &[u8] = script.as_reader().args().raw_data();

    if args.is_empty() {
        return Err(Error::InvalidCellData);
    }

    match args[0] {
        // Type script mode: args = 0x00 + fee_lock_hash(32)
        0x00 => {
            if args.len() < 33 {
                return Err(Error::InvalidCellData);
            }
            let mut fee_lock_hash = [0u8; 32];
            fee_lock_hash.copy_from_slice(&args[1..33]);
            run_as_type(&fee_lock_hash)
        }
        // Lock script mode: args = 0x01 + player_x_lock(32) + player_o_lock(32)
        0x01 => {
            if args.len() < 65 {
                return Err(Error::InvalidCellData);
            }
            let mut player_x = [0u8; 32];
            let mut player_o = [0u8; 32];
            player_x.copy_from_slice(&args[1..33]);
            player_o.copy_from_slice(&args[33..65]);
            run_as_lock(&player_x, &player_o)
        }
        _ => Err(Error::InvalidCellData),
    }
}

/// Lock script mode — controls who can spend the game cell.
///
/// WAITING (player_o = zeros): anyone can spend, type script provides security.
/// ACTIVE (both set): only player_x or player_o can spend.
fn run_as_lock(player_x: &[u8; 32], player_o: &[u8; 32]) -> Result<(), Error> {
    if *player_o == ZERO_HASH {
        // WAITING: type script validates all transitions
        Ok(())
    } else {
        // ACTIVE: require either player to have an input cell in the tx
        if is_authorized(player_x) || is_authorized(player_o) {
            Ok(())
        } else {
            Err(Error::Unauthorized)
        }
    }
}

/// Type script mode — validates game state transitions.
fn run_as_type(fee_lock_hash: &[u8; 32]) -> Result<(), Error> {
    let input_result = load_cell_data(0, Source::GroupInput);
    let output_result = load_cell_data(0, Source::GroupOutput);

    let has_input = match &input_result {
        Ok(_) => true,
        Err(ckb_std::error::SysError::IndexOutOfBound) => false,
        Err(e) => return Err(Error::from(*e)),
    };

    let has_output = match &output_result {
        Ok(_) => true,
        Err(ckb_std::error::SysError::IndexOutOfBound) => false,
        Err(e) => return Err(Error::from(*e)),
    };

    match (has_input, has_output) {
        (false, true) => {
            let output_data = output_result.unwrap();
            validate_create(&output_data)
        }
        (true, true) => {
            let input_data = input_result.unwrap();
            let output_data = output_result.unwrap();
            let input_game =
                GameData::from_bytes(&input_data).ok_or(Error::InvalidCellData)?;
            let output_game =
                GameData::from_bytes(&output_data).ok_or(Error::InvalidCellData)?;

            match (input_game.game_state, output_game.game_state) {
                (STATE_WAITING, STATE_ACTIVE) => validate_join(&input_data, &output_data),
                (STATE_ACTIVE, STATE_ACTIVE) => {
                    // MOVE or RESET — if output board is empty, it's a reset
                    if output_game.board.iter().all(|&c| c == EMPTY) {
                        validate_reset(&input_data, &output_data)
                    } else {
                        validate_move(&input_data, &output_data)
                    }
                }
                _ => Err(Error::InvalidTransition),
            }
        }
        (true, false) => {
            let input_data = input_result.unwrap();
            let input_game =
                GameData::from_bytes(&input_data).ok_or(Error::InvalidCellData)?;

            match input_game.game_state {
                STATE_WAITING => validate_cancel(&input_data),
                STATE_ACTIVE => {
                    let winner = crate::win::check_winner(&input_game.board);
                    if winner == WINNER_X || winner == WINNER_O {
                        validate_finish(&input_data, fee_lock_hash)
                    } else {
                        validate_forfeit(&input_data, fee_lock_hash)
                    }
                }
                _ => Err(Error::InvalidTransition),
            }
        }
        (false, false) => Err(Error::InvalidTransition),
    }
}
