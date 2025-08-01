# Developer Guide

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Rust** 1.70+ and Cargo
- **Solana CLI** 1.16+
- **Anchor Framework** 0.28+
- **Git** for version control

### Repository Structure
```
knightsbridge/
├── frontend/           # React TypeScript app
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/     # React hooks  
│   │   ├── engine/    # Chess engine
│   │   ├── services/  # API services
│   │   └── types/     # TypeScript types
│   └── package.json
├── backend/           # Node.js server
│   ├── routes/       # API endpoints
│   ├── database.js   # Database connection
│   └── server.js     # Main server file
├── programs/         # Solana smart contracts
│   └── escrow/
│       ├── src/      # Rust contract code
│       └── tests/    # Contract tests
└── docs/            # Documentation
```

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/knightsbridge
cd knightsbridge
```

### 2. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend  
cd ../backend
npm install

# Smart contracts
cd ../programs/escrow
npm install
```

### 3. Environment Configuration
Create `.env` files in each directory:

**Frontend `.env`:**
```env
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr
VITE_BACKEND_URL=http://localhost:3001
```

**Backend `.env`:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/knightsbridge
REDIS_URL=redis://localhost:6379
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 4. Database Setup
```bash
# Install PostgreSQL locally
# Create database
createdb knightsbridge

# Run migrations
cd backend
npm run migrate
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: Smart contract (if needed)
cd programs/escrow
anchor test
```

## Smart Contract Development

### Building Contracts
```bash
cd programs/escrow
anchor build
```

### Testing Contracts
```bash
# Run test suite
anchor test

# Test specific function
anchor test --grep "initialize_game"
```

### Deploying to DevNet
```bash
# Configure Solana CLI
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json

# Get test SOL
solana airdrop 2

# Deploy program
anchor deploy
```

### Contract Structure
```rust
// lib.rs - Main contract module
#[program]
pub mod chess_escrow {
    use super::*;
    
    // Initialize new game
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        room_id: String,
        stake_amount: u64,
        time_limit_seconds: i64
    ) -> Result<()> {
        // Implementation
    }
    
    // Additional functions...
}

// Account contexts
#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(init, payer = player, space = 8 + GameEscrow::INIT_SPACE)]
    pub game_escrow: Account<'info, GameEscrow>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

## Frontend Development

### Component Architecture
```typescript
// Component hierarchy
App
├── Header              # Wallet connection
├── MenuView           # Main menu
├── LobbyView          # Room creation/joining
├── GameView           # Chess gameplay
│   ├── ChessBoard     # Board display
│   ├── MoveHistory    # Move list
│   ├── ChatBox        # Player chat
│   └── GameControls   # Actions (resign, draw)
└── Leaderboard        # Player rankings
```

### Chess Engine Integration
```typescript
// hooks/useGameState.ts
export const useGameState = (): GameStateHook => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  
  const makeMove = async (from: string, to: string) => {
    // Validate move
    if (!ChessEngine.isLegalMove(from, to, gameState.position)) {
      return { success: false, message: 'Illegal move' };
    }
    
    // Apply move
    const result = ChessEngine.makeMove(from, to, gameState.position);
    setGameState(prev => ({
      ...prev,
      position: result.position,
      currentPlayer: prev.currentPlayer === 'white' ? 'black' : 'white'
    }));
    
    return { success: true, message: 'Move successful' };
  };
  
  return { gameState, makeMove };
};
```

### Wallet Integration
```typescript
// hooks/useSolanaWallet.ts
export const useSolanaWallet = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const createEscrow = async (roomId: string, betAmount: number) => {
    const program = await getProgram();
    
    const tx = await program.methods
      .initializeGame(roomId, betAmount * LAMPORTS_PER_SOL, 600)
      .accounts({
        gameEscrow: gameEscrowPda,
        player: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    return tx;
  };
  
  return { createEscrow, connected, publicKey };
};
```

## Backend Development

### API Endpoints
```javascript
// routes/api.js
const express = require('express');
const router = express.Router();

// Get game state
router.get('/games/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const game = await db.query('SELECT * FROM games WHERE room_id = $1', [roomId]);
  res.json({ game: game.rows[0] });
});

// Record move
router.post('/games/:roomId/moves', async (req, res) => {
  const { roomId } = req.params;
  const moveData = req.body;
  
  await db.query(
    'INSERT INTO game_moves (game_id, move_number, player, from_square, to_square, piece) VALUES ($1, $2, $3, $4, $5, $6)',
    [gameId, moveData.moveNumber, moveData.player, moveData.from, moveData.to, moveData.piece]
  );
  
  res.json({ success: true });
});
```

### WebSocket Events
```javascript
// server.js
io.on('connection', (socket) => {
  // Join game room
  socket.on('joinRoom', async ({ roomId, playerWallet }) => {
    socket.join(roomId);
    socket.to(roomId).emit('playerJoined', { player: playerWallet });
  });
  
  // Handle move
  socket.on('makeMove', async (moveData) => {
    // Validate and store move
    await storeMove(moveData);
    
    // Broadcast to room
    socket.to(moveData.roomId).emit('moveMade', moveData);
  });
});
```

## Testing

### Unit Tests
```typescript
// tests/chess-engine.test.ts
describe('ChessEngine', () => {
  test('should validate legal pawn moves', () => {
    const position = ChessEngine.getInitialPosition();
    const isLegal = ChessEngine.isLegalMove('e2', 'e4', position, 'white');
    expect(isLegal).toBe(true);
  });
  
  test('should detect checkmate', () => {
    const position = { /* checkmate position */ };
    const isCheckmate = ChessEngine.isCheckmate(position, 'black');
    expect(isCheckmate).toBe(true);
  });
});
```

### Integration Tests
```typescript
// tests/game-flow.test.ts
describe('Complete Game Flow', () => {
  test('should complete a full game', async () => {
    // Create game
    const gameId = await createTestGame();
    
    // Make moves
    await makeMove(gameId, 'e2', 'e4');
    await makeMove(gameId, 'e7', 'e5');
    
    // Verify state
    const gameState = await getGameState(gameId);
    expect(gameState.moveHistory.length).toBe(2);
  });
});
```

### Smart Contract Tests
```rust
// tests/escrow.rs
#[tokio::test]
async fn test_complete_game() {
    let program = client();
    
    // Initialize game
    let tx = program
        .request()
        .instruction(initialize_game_ix)
        .send()
        .await;
    
    assert!(tx.is_ok());
}
```

## Contributing Guidelines

### Code Style
- **TypeScript**: Use strict mode
- **Rust**: Follow clippy suggestions
- **Formatting**: Prettier for TS, rustfmt for Rust
- **Naming**: camelCase for TS, snake_case for Rust

### Git Workflow
1. Fork repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes with tests
4. Commit: `git commit -m "feat: add new feature"`
5. Push: `git push origin feature/new-feature`
6. Create pull request

### Pull Request Process
1. **Description**: Clear explanation of changes
2. **Tests**: All tests must pass
3. **Documentation**: Update relevant docs
4. **Review**: At least one maintainer approval
5. **Merge**: Squash and merge to main

## Build & Deployment

### Frontend Build
```bash
cd frontend
npm run build
npm run preview  # Test production build
```

### Backend Deployment
```bash
cd backend
npm run build
npm start  # Production server
```

### Smart Contract Deployment
```bash
cd programs/escrow
anchor build
anchor deploy --provider.cluster mainnet
```

### Environment Variables
Production deployments require:
- **Database URLs**: PostgreSQL connection strings
- **Redis URLs**: Cache connection strings  
- **Solana RPCs**: Mainnet endpoint URLs
- **Program IDs**: Deployed contract addresses

## Debugging

### Frontend Debugging
```typescript
// Enable debug logs
localStorage.setItem('debug', 'chess:*');

// Component debugging
const DebugPanel = () => {
  return (
    <div>
      <h3>Game State Debug</h3>
      <pre>{JSON.stringify(gameState, null, 2)}</pre>
    </div>
  );
};
```

### Backend Debugging
```javascript
// Debug database queries
const debug = require('debug')('chess:db');
debug('Executing query:', query, params);

// Debug WebSocket events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.onAny((event, ...args) => {
    console.log('Event received:', event, args);
  });
});
```

### Smart Contract Debugging
```rust
use anchor_lang::prelude::*;

#[program]
pub mod chess_escrow {
    use super::*;
    
    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        msg!("Initializing game with room_id: {}", room_id);
        // Implementation
        Ok(())
    }
}
```

## Performance Tips

### Frontend Optimization
- Use `React.memo` for expensive components
- Implement virtual scrolling for move history
- Debounce move validation
- Cache position evaluations

### Backend Optimization  
- Index database columns used in queries
- Use connection pooling
- Implement Redis caching
- Batch database operations

### Smart Contract Optimization
- Minimize account size
- Use efficient data structures
- Batch multiple operations
- Optimize compute usage

---

**Next**: [Security & Audits](./security.md)