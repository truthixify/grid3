/// Total size of the game cell data in bytes.
pub const GAME_DATA_LEN: usize = 84;

// Game state constants
pub const STATE_WAITING: u8 = 0;
pub const STATE_ACTIVE: u8 = 1;
pub const STATE_FINISHED: u8 = 2;
pub const STATE_CANCELLED: u8 = 3;

// Player constants
pub const EMPTY: u8 = 0;
pub const PLAYER_X: u8 = 1;
pub const PLAYER_O: u8 = 2;

// Winner constants
pub const WINNER_NONE: u8 = 0;
pub const WINNER_X: u8 = 1;
pub const WINNER_O: u8 = 2;
pub const WINNER_DRAW: u8 = 3;

/// 32-byte zero hash used for comparisons.
pub const ZERO_HASH: [u8; 32] = [0u8; 32];

/// Represents the on-chain data of a Tic Tac Toe game cell.
///
/// Layout (84 bytes total):
///   offset  0: game_state       (1 byte)
///   offset  1: board[0..9]      (9 bytes)
///   offset 10: current_turn     (1 byte)
///   offset 11: player_x_lock    (32 bytes)
///   offset 43: player_o_lock    (32 bytes)
///   offset 75: stake_amount     (8 bytes, u64 LE)
///   offset 83: winner           (1 byte)
pub struct GameData {
    pub game_state: u8,
    pub board: [u8; 9],
    pub current_turn: u8,
    pub player_x_lock: [u8; 32],
    pub player_o_lock: [u8; 32],
    pub stake_amount: u64,
    pub winner: u8,
}

impl GameData {
    /// Deserialize game data from a byte slice. Returns None if the length is wrong.
    pub fn from_bytes(data: &[u8]) -> Option<Self> {
        if data.len() != GAME_DATA_LEN {
            return None;
        }

        let game_state = data[0];

        let mut board = [0u8; 9];
        board.copy_from_slice(&data[1..10]);

        let current_turn = data[10];

        let mut player_x_lock = [0u8; 32];
        player_x_lock.copy_from_slice(&data[11..43]);

        let mut player_o_lock = [0u8; 32];
        player_o_lock.copy_from_slice(&data[43..75]);

        let mut stake_bytes = [0u8; 8];
        stake_bytes.copy_from_slice(&data[75..83]);
        let stake_amount = u64::from_le_bytes(stake_bytes);

        let winner = data[83];

        Some(GameData {
            game_state,
            board,
            current_turn,
            player_x_lock,
            player_o_lock,
            stake_amount,
            winner,
        })
    }

    /// Serialize game data to a fixed-size byte array.
    pub fn to_bytes(&self) -> [u8; GAME_DATA_LEN] {
        let mut buf = [0u8; GAME_DATA_LEN];

        buf[0] = self.game_state;
        buf[1..10].copy_from_slice(&self.board);
        buf[10] = self.current_turn;
        buf[11..43].copy_from_slice(&self.player_x_lock);
        buf[43..75].copy_from_slice(&self.player_o_lock);
        buf[75..83].copy_from_slice(&self.stake_amount.to_le_bytes().as_ref());
        buf[83] = self.winner;

        buf
    }
}
