use ckb_std::error::SysError;

/// Error codes for the Tic Tac Toe script.
#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing = 2,
    LengthNotEnough = 3,
    Encoding = 4,
    InvalidCellData = 5,
    InvalidGameState = 6,
    InvalidBoard = 7,
    InvalidTransition = 8,
    WrongTurn = 9,
    InvalidMove = 10,
    InvalidStake = 11,
    InvalidPayout = 12,
    Unauthorized = 13,
    InvalidWinner = 14,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Error::IndexOutOfBound,
            SysError::ItemMissing => Error::ItemMissing,
            SysError::LengthNotEnough(_) => Error::LengthNotEnough,
            SysError::Encoding => Error::Encoding,
            SysError::Unknown(_) => Error::InvalidCellData,
            _ => Error::InvalidCellData,
        }
    }
}
