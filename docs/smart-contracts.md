# Smart Contract Documentation

## Contract Overview

The Knightsbridge Chess smart contract is built using the Anchor framework on Solana, providing secure escrow functionality for chess games with automatic payout distribution.

**Program ID**: `F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr`

## Core Data Structures

### GameEscrow Account
The main state account for each chess game:

```rust
#[account]
pub struct GameEscrow {
    pub room_id: String,                    // Unique game identifier
    pub player_white: Pubkey,              // White player's wallet
    pub player_black: Pubkey,              // Black player's wallet  
    pub stake_amount: u64,                 // SOL amount in lamports
    pub total_deposited: u64,              // Total SOL deposited
    pub game_state: GameState,             // Current game status
    pub winner: GameWinner,                // Game result
    pub created_at: i64,                   // Unix timestamp
    pub started_at: i64,                   // Game start time
    pub finished_at: i64,                  // Game end time
    pub time_limit_seconds: i64,           // Time control
    pub fee_collector: Pubkey,             // Platform fee recipient
    pub white_deposited: bool,             // White stake status
    pub black_deposited: bool,             // Black stake status
    pub move_count: u32,                   // Total moves played
    pub last_move_time: i64,               // Last move timestamp
    
    // Enhanced features
    pub time_control: TimeControl,         // Detailed time settings
    pub position_hash: [u8; 32],          // Current position hash
    pub move_history: Vec<MoveRecord>,     // Critical moves
    pub anti_cheat_flags: u32,            // Cheat detection flags
    pub rating_white: u32,                 // White player rating
    pub rating_black: u32,                 // Black player rating
    pub tournament_id: Option<String>,     // Tournament game ID
    pub game_flags: GameFlags,             // Game configuration
}
```

### Game States
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameState {
    WaitingForPlayers,    // Room created, need opponent
    WaitingForDeposits,   // Both joined, need stakes
    InProgress,           // Game active
    Finished,             // Game completed
    Cancelled,            // Game cancelled
}
```

### Game Winners
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameWinner {
    None,     // Game ongoing
    White,    // White player wins
    Black,    // Black player wins  
    Draw,     // Draw result
}
```

### Move Records
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MoveRecord {
    pub move_number: u32,
    pub from_square: String,
    pub to_square: String,
    pub piece: String,
    pub captured_piece: Option<String>,
    pub move_notation: String,
    pub position_hash: [u8; 32],
    pub timestamp: i64,
    pub time_spent: u64,
    pub is_check: bool,
    pub is_checkmate: bool,
    pub is_castle: bool,
    pub is_en_passant: bool,
    pub is_promotion: bool,
    pub promotion_piece: Option<String>,
}
```

## Contract Instructions

### 1. Initialize Game
Creates a new chess game room.

```rust
pub fn initialize_game(
    ctx: Context<InitializeGame>, 
    room_id: String,
    stake_amount: u64,
    time_limit_seconds: i64
) -> Result<()>
```

**Accounts**:
- `game_escrow`: PDA for game state
- `player`: White player (signer)
- `fee_collector`: Platform fee recipient
- `system_program`: Solana system program

**Validation**:
- Room ID ≤ 32 characters
- Stake amount > 0
- Time limit > 0

### 2. Join Game
Second player joins existing game.

```rust
pub fn join_game(ctx: Context<JoinGame>) -> Result<()>
```

**Requirements**:
- Game in `WaitingForPlayers` state
- Different player than white
- Updates state to `WaitingForDeposits`

### 3. Deposit Stake
Players deposit their SOL stakes.

```rust
pub fn deposit_stake(ctx: Context<DepositStake>) -> Result<()>
```

**Process**:
1. Validates player authorization
2. Transfers SOL to game vault
3. Updates deposit flags
4. Starts game when both deposited

### 4. Record Move
Records critical moves on-chain.

```rust
pub fn record_move(
    ctx: Context<RecordMove>,
    move_notation: String,
    game_position_hash: [u8; 32],
    from_square: String,
    to_square: String,
    piece: String,
    captured_piece: Option<String>,
    time_spent: u64,
    is_check: bool,
    is_checkmate: bool,
    is_castle: bool,
    is_en_passant: bool,
    is_promotion: bool,
    promotion_piece: Option<String>
) -> Result<()>
```

**Anti-Cheat Features**:
- Move format validation
- Impossible move detection
- Suspicious timing patterns
- Position integrity checks

### 5. Declare Result  
Declares game outcome and distributes funds.

```rust
pub fn declare_result(
    ctx: Context<DeclareResult>, 
    winner: GameWinner,
    reason: GameEndReason
) -> Result<()>
```

**Winner Validation**:
- Only authorized players can declare
- Resignation: opposing player declares
- Timeout: either player can declare
- Checkmate: winning player declares

**Payout Distribution**:
- 2% platform fee
- 98% to winner(s)
- Draws split equally

### 6. Handle Timeout
Anyone can call after time limit exceeded.

```rust
pub fn handle_timeout(ctx: Context<HandleTimeout>) -> Result<()>
```

**Logic**:
- Validates time exceeded
- Determines winner by turn
- Distributes funds automatically

## Program Derived Addresses (PDAs)

### Game Escrow PDA
```rust
let (game_escrow_pda, bump) = Pubkey::find_program_address(
    &[b"game", room_id.as_bytes()],
    &program_id
);
```

### Game Vault PDA
```rust
let (game_vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", game_escrow_pda.as_ref()],
    &program_id
);
```

## Security Model

### Access Control
- **Initialize**: Anyone can create games
- **Join**: Only different player can join
- **Deposit**: Only game participants
- **Record Move**: Only current turn player
- **Declare Result**: Only game participants
- **Timeout**: Anyone after time limit

### Fund Security
- **Escrow Lock**: SOL secured in vault PDA
- **Automatic Distribution**: No manual claiming
- **Atomic Operations**: All-or-nothing transactions
- **State Validation**: Comprehensive checks

### Anti-Cheat Protection
- **Move Validation**: Basic impossible move detection
- **Time Analysis**: Suspicious pattern flagging
- **Position Hashing**: Board state integrity
- **Turn Enforcement**: Strict player alternation

## Error Handling

### Custom Errors
```rust
#[error_code]
pub enum ChessError {
    #[msg("Room ID too long (max 32 characters)")]
    RoomIdTooLong,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    #[msg("Move time exceeded")]
    MoveTimeExceeded,
    #[msg("Impossible move")]
    ImpossibleMove,
    // ... additional errors
}
```

### Error Recovery
- **Graceful Failures**: Preserve game state
- **Refund Logic**: Return stakes on errors
- **State Rollback**: Maintain consistency
- **User Feedback**: Clear error messages

## Events

### Game Events
```rust
#[event]
pub struct GameCreated {
    pub room_id: String,
    pub player_white: Pubkey,
    pub stake_amount: u64,
    pub created_at: i64,
}

#[event]  
pub struct GameStarted {
    pub room_id: String,
    pub started_at: i64,
}

#[event]
pub struct MoveRecorded {
    pub room_id: String,
    pub player: Pubkey,
    pub move_count: u32,
    pub move_notation: String,
    pub position_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct GameFinished {
    pub room_id: String,
    pub winner: GameWinner,
    pub reason: GameEndReason,
    pub finished_at: i64,
}
```

## Gas Optimization

### Efficient Storage
- **Packed Structs**: Minimize account size
- **Optional Fields**: Save space when unused
- **Compression**: Efficient move encoding

### Batch Operations
- **Multiple Moves**: Single transaction when possible
- **State Updates**: Combine related changes
- **Event Batching**: Reduce transaction count

### Compute Budget
- **Move Validation**: Optimized algorithms
- **Hash Functions**: Efficient position hashing
- **Memory Management**: Minimal allocations

## Upgrade Strategy

### Program Upgrades
- **Anchor Framework**: Built-in upgrade capability
- **State Migration**: Backward compatibility
- **Gradual Rollout**: Phased deployment
- **Emergency Patches**: Critical bug fixes

### Account Versioning
- **Schema Evolution**: Handle structure changes
- **Migration Scripts**: Update existing games
- **Compatibility Layers**: Support old versions

---

**Next**: [Technical Architecture](./technical-architecture.md)