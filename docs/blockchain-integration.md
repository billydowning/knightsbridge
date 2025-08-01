# Blockchain Integration

## Why Solana?

Knightsbridge Chess leverages Solana for its unique advantages in gaming:

- **Low Fees**: ~$0.00025 per transaction
- **Fast Finality**: ~400ms confirmation times  
- **High Throughput**: 65,000+ TPS capacity
- **Gaming Focus**: Built for real-time applications

## On-Chain vs Off-Chain Architecture

### On-Chain Components (Solana)
- **Game Creation**: Room initialization
- **Escrow Management**: SOL stake handling
- **Critical Moves**: Important position validation
- **Game Results**: Final outcomes and payouts
- **Anti-Cheat**: Move validation records

### Off-Chain Components (Traditional Backend)
- **Real-time Moves**: Fast move synchronization
- **Chat System**: Player communication
- **Game State**: Position tracking
- **Analytics**: Performance metrics
- **Leaderboards**: Player rankings

## Smart Contract System

### Escrow Contract
Program ID: `F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr`

#### Key Functions
```rust
// Initialize new chess game
initialize_game(room_id, stake_amount, time_limit)

// Second player joins
join_game()

// Players deposit stakes  
deposit_stake()

// Record critical moves
record_move(move_notation, position_hash, ...)

// Declare game result
declare_result(winner, reason)

// Handle timeouts
handle_timeout()
```

### Escrow States
1. **WaitingForPlayers**: Room created, waiting for opponent
2. **WaitingForDeposits**: Both players joined, need stakes
3. **InProgress**: Game active, moves being played
4. **Finished**: Game completed, payouts distributed
5. **Cancelled**: Game cancelled, stakes refunded

## Transaction Flow

### Game Creation Flow
```
1. Player creates room → initialize_game()
2. Opponent joins → join_game()  
3. Both deposit stakes → deposit_stake()
4. Game begins automatically
```

### Move Recording Flow
```
1. Player makes move in UI
2. Move validated locally
3. Critical moves → record_move()
4. Position synced to database
5. Opponent receives update
```

### Game Completion Flow
```
1. Game ends (checkmate/draw/timeout)
2. Result declared → declare_result()
3. Smart contract validates
4. SOL automatically distributed
5. Game marked finished
```

## Fee Structure

### Platform Fees
- **2%** of total pot goes to platform
- **98%** distributed to winner(s)
- **Draw**: Each player gets 49% (98% ÷ 2)

### Transaction Costs
- **Game Creation**: ~0.002 SOL
- **Joining Game**: ~0.001 SOL  
- **Depositing Stake**: ~0.001 SOL
- **Move Recording**: ~0.0005 SOL
- **Claiming Winnings**: Automatic (no cost)

### Example Economics
```
Stake: 1 SOL each (2 SOL total pot)
Platform Fee: 0.04 SOL (2%)
Winner Receives: 1.96 SOL
Transaction Costs: ~0.005 SOL total
```

## Security Features

### Escrow Protection
- **Funds Locked**: SOL secured in smart contract
- **No Withdrawal**: Until game completes
- **Automatic Distribution**: No manual claiming
- **Audit Trail**: All transactions on-chain

### Anti-Cheat Measures
- **Move Validation**: Critical positions verified
- **Time Stamps**: Move timing recorded
- **Position Hashing**: Board state integrity
- **Impossible Move Detection**: Automated rejection

### Smart Contract Security
- **Program Derived Addresses**: Secure key generation
- **Permission Checks**: Only authorized actions
- **State Validation**: Comprehensive checks
- **Error Handling**: Graceful failure modes

## Wallet Integration

### Supported Wallets
- **Phantom** (Primary)
- **Backpack** 
- **Solflare**
- **Slope**

### Required Permissions
- **Connect**: Read wallet address
- **Sign Transactions**: Approve game actions
- **Auto-Approve**: Optional for smooth UX

### Transaction Types
Players will sign these transaction types:
1. **Initialize Game**: Create new chess room
2. **Join Game**: Enter existing room
3. **Deposit Stake**: Lock SOL in escrow
4. **Record Move**: Log critical positions
5. **Declare Result**: Finish game and claim winnings

## Network Configuration

### Mainnet Deployment
- **RPC Endpoint**: `https://api.mainnet-beta.solana.com`
- **Program ID**: `F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr`
- **Fee Collector**: `8nX9YShMbTwfKCEVTHVrFrDspZCKQEfrCwPnA2AknLj4`

### DevNet Testing  
- **RPC Endpoint**: `https://api.devnet.solana.com`
- **Same Program**: Works on both networks
- **Test SOL**: Available from faucets

## Data Storage

### On-Chain Data
```rust
pub struct GameEscrow {
    pub room_id: String,
    pub player_white: Pubkey,
    pub player_black: Pubkey, 
    pub stake_amount: u64,
    pub game_state: GameState,
    pub winner: GameWinner,
    pub move_history: Vec<MoveRecord>,
    pub time_control: TimeControl,
    // ... additional fields
}
```

### Off-Chain Database
- **Real-time Game State**: Positions, moves
- **Player Profiles**: Statistics, ratings  
- **Chat Messages**: Game communication
- **Analytics**: Performance data
- **Leaderboards**: Rankings and tournaments

## Performance Optimization

### Selective Recording
Not every move goes on-chain:
- **Critical Moves**: Captures, checks, special moves
- **Game Events**: Start, end, timeouts
- **Anti-Cheat**: Suspicious patterns
- **Regular Moves**: Database only

### Batching Strategy
- **Multiple Moves**: Batched when possible
- **State Compression**: Efficient encoding
- **Priority Queue**: Important moves first
- **Retry Logic**: Handle network issues

### Caching Layer
- **Game State**: Cached in browser
- **Move History**: Local storage backup
- **Player Data**: Persistent across sessions
- **Network Resilience**: Offline capabilities

---

**Next**: [Smart Contract Details](./smart-contracts.md)