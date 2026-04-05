**Tic Tac Toe on CKB**

Game Design & Technical Specification

Built on Nervos CKB

# **1\. Overview**

Tic Tac Toe on CKB is a two-player, on-chain game where players stake CKB to play. The game logic lives entirely in a CKB script that validates each move transaction. No randomness is involved, making it a clean fit for CKB's deterministic validation model.

Each move is a transaction. The script validates that the transaction represents a legal game state transition. State lives in cell data. The script does not execute or modify state, it only approves or rejects proposed transitions.

# **2\. CKB Model Primer**

Before the game design, a quick note on how CKB works since it is different from EVM chains:

* Everything on CKB is a cell. A cell has capacity (CKB), data, a lock script, and an optional type script.

* Scripts are validators, not executors. A script runs to return success or failure. It does not write state.

* Transactions consume input cells and produce output cells. The script on an input cell decides whether the transaction is valid.

* Game state is stored in cell data. Each move produces a new cell with updated board state.

This means Tic Tac Toe on CKB is essentially a state machine. The script defines valid state transitions. Players advance the game by constructing valid transactions.

# **3\. Game Design**

## **3.1 Rules**

* Standard 3x3 Tic Tac Toe rules apply.

* Two players: Player X and Player O.

* Players alternate turns starting with Player X.

* First to get three in a row (horizontal, vertical, diagonal) wins.

* If all 9 squares are filled with no winner, the game is a draw.

## **3.2 Stakes**

| Entry stake | Each player locks an equal amount of CKB to start the game |
| :---- | :---- |
| **Winner payout** | 80% of the total pool goes to the winner |
| **Draw payout** | Each player gets their stake back (50/50 split) |
| **Protocol fee** | 20% of total pool, sent to a defined fee address |

## **3.3 Game Lifecycle**

The game moves through four distinct states stored in the cell:

* WAITING: Game cell created by Player X with stake. Awaiting Player O to join.

* ACTIVE: Player O has joined and matched the stake. The game is in progress.

* FINISHED: A winner has been found or the board is full. Payout triggered.

* CANCELLED: Player X cancels before Player O joins. Full stake returned.

# **4\. Cell Structure**

The game cell data layout (all values packed as bytes):

| Field | Size | Description |
| :---- | :---- | :---- |
| `game_state` | 1 byte | 0 \= WAITING, 1 \= ACTIVE, 2 \= FINISHED, 3 \= CANCELLED |
| `board` | 9 bytes | One byte per square. 0 \= empty, 1 \= X, 2 \= O |
| `current_turn` | 1 byte | 1 \= X's turn, 2 \= O's turn |
| `player_x_lock` | 32 bytes | Lock hash identifying Player X |
| `player_o_lock` | 32 bytes | Lock hash identifying Player O |
| `stake_amount` | 8 bytes | CKB staked per player (u64) |
| `winner` | 1 byte | 0 \= no winner yet, 1 \= X wins, 2 \= O wins, 3 \= draw |

Total cell data: 84 bytes. Compact and cheap to store on-chain.

# **5\. Script Validation Logic**

The type script runs on every transaction involving a game cell. It checks which state transition is being proposed and validates accordingly.

## **5.1 CREATE (WAITING state)**

* Output cell has game\_state \= WAITING

* board is all zeros (empty)

* player\_x\_lock is set to the creator's lock hash

* player\_o\_lock is zeroed out

* stake\_amount is greater than zero

* Cell capacity covers the data size plus the staked amount

## **5.2 JOIN (WAITING to ACTIVE)**

* Input cell has game\_state \= WAITING

* Output cell has game\_state \= ACTIVE

* player\_o\_lock is set to the joiner's lock hash

* Joiner's input capacity matches stake\_amount

* board and current\_turn are unchanged

* player\_x\_lock is unchanged

## **5.3 MOVE (ACTIVE to ACTIVE)**

* Input cell has game\_state \= ACTIVE

* Output cell has game\_state \= ACTIVE

* The transaction is signed by the player whose turn it is

* Exactly one square has changed on the board

* The changed square was empty (value was 0\)

* The new value on that square matches the current player (1 for X, 2 for O)

* current\_turn has flipped (1 becomes 2, 2 becomes 1\)

* stake\_amount, player\_x\_lock, player\_o\_lock are unchanged

## **5.4 FINISH (ACTIVE to FINISHED)**

* Input cell has game\_state \= ACTIVE

* Output cell has game\_state \= FINISHED

* winner field is correctly set based on the final board state

* If winner \= 1 (X wins): 80% of pool goes to player\_x\_lock address, 20% to fee address

* If winner \= 2 (O wins): 80% of pool goes to player\_o\_lock address, 20% to fee address

* If winner \= 3 (draw): each player gets 50% of pool back

* The script verifies all win conditions against the board data

## **5.5 CANCEL (WAITING to CANCELLED)**

* Input cell has game\_state \= WAITING

* Transaction is signed by player\_x\_lock

* Full stake returned to Player X

# **6\. Win Condition Detection**

The script checks all 8 possible winning lines on each FINISH transaction:

**Rows**

`board[0] == board[1] == board[2] != 0`

`board[3] == board[4] == board[5] != 0`

`board[6] == board[7] == board[8] != 0`

**Columns**

`board[0] == board[3] == board[6] != 0`

`board[1] == board[4] == board[7] != 0`

`board[2] == board[5] == board[8] != 0`

**Diagonals**

`board[0] == board[4] == board[8] != 0`

`board[2] == board[4] == board[6] != 0`

Draw is detected when all 9 squares are non-zero and no win condition is met.

# **7\. Tech Stack**

| Layer | Choice |
| :---- | :---- |
| **Script language** | Rust compiled to RISC-V (CKB-VM) |
| **Script framework** | ckb-std |
| **Frontend** | React \+ TypeScript |
| **CKB interaction** | Lumos SDK (JavaScript) |
| **Wallet** | JoyID or CKBull |
| **Testnet** | Pudge Testnet |

# **8\. Build Plan**

| \# | Phase | Deliverable |
| :---- | :---- | :---- |
| **1** | **Script Development** | Write and test the type script in Rust. Unit test all state transitions and win conditions on local CKB node. |
| **2** | **Transaction Builder** | Build the Lumos SDK layer that constructs valid transactions for each game action (create, join, move, finish, cancel). |
| **3** | **Frontend** | React UI with board rendering, wallet connection, move submission, and game state polling. |
| **4** | **Testnet Deploy** | Deploy script to Pudge testnet. End-to-end test with two wallets. |
| **5** | **Mainnet** | Deploy to CKB mainnet. Final security review before going live. |

# **9\. Edge Cases & Considerations**

## **9.1 Player Goes Offline**

If a player stops responding mid-game, the other player is stuck. A timeout mechanism should be added: if no move is made within N blocks, the waiting player can claim the full pool. This requires storing a last\_move\_block field in cell data and checking it in the script.

## **9.2 Front-running**

Move transactions are visible in the mempool before confirmation. An opponent could theoretically submit a conflicting transaction. Since only the correct player can sign a valid move (enforced by lock hash), front-running a move is not possible. The script will reject any move not signed by the current turn holder.

## **9.3 Fee Address**

The 20% protocol fee destination should be a well-known, documented address. For testnet, this can be a dev wallet. For mainnet, consider a multisig or DAO-controlled address.

## **9.4 Minimum Stake**

A minimum stake amount should be enforced to prevent dust games and ensure transaction fees are economically rational relative to the pool size.

# **10\. Summary**

Tic Tac Toe on CKB is a well-scoped, fully on-chain game that plays to CKB's strengths. The state machine is simple, the validation logic is finite and auditable, no randomness is needed, and the economic model is clean. It serves as a solid first project for on-chain gaming on CKB and a good foundation for more complex games later.