# Technical Architecture

## System Overview

Knightsbridge Chess uses a hybrid architecture combining blockchain and traditional web technologies for optimal performance and user experience.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend     │    │     Solana      │
│   (React/TS)    │◄──►│   (Node.js)     │◄──►│  (Smart Contract)│
│                 │    │                 │    │                 │
│  • Game UI      │    │  • WebSocket    │    │  • Escrow       │
│  • Wallet       │    │  • Database     │    │  • Validation   │  
│  • Chess Engine │    │  • Real-time    │    │  • Payouts      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Architecture

### Frontend Layer

#### Framework & Libraries
- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tooling
- **Anchor**: Solana program interaction

#### Chess Engine
- **FIDE Compliant**: Complete rule implementation
- **Move Validation**: Client-side verification
- **Position Analysis**: Check/checkmate detection
- **Special Moves**: Castling, en passant, promotion

#### Wallet Integration
- **Solana Web3.js**: Blockchain interaction
- **Wallet Adapter**: Multi-wallet support
- **Transaction Management**: Batching and retries
- **Error Handling**: User-friendly feedback

#### State Management
```typescript
interface GameState {
  position: Position;           // Board state
  currentPlayer: 'white' | 'black';
  gameActive: boolean;
  moveHistory: Move[];
  enPassantTarget: string | null;
  castlingRights: string;
  timeControl: TimeControl;
  // ... additional fields
}
```

### Backend Layer

#### Node.js Server
- **Express.js**: Web framework
- **Socket.IO**: Real-time communication  
- **PostgreSQL**: Game data storage
- **Redis**: Session and caching

#### Database Schema
```sql
-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(32) UNIQUE,
    player_white VARCHAR(44),
    player_black VARCHAR(44),
    stake_amount DECIMAL(20,9),
    game_state VARCHAR(20),
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

-- Moves table  
CREATE TABLE game_moves (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    move_number INTEGER,
    player VARCHAR(10),
    from_square VARCHAR(2),
    to_square VARCHAR(2),
    piece VARCHAR(10),
    move_notation VARCHAR(10),
    is_en_passant BOOLEAN,
    is_castle BOOLEAN,
    is_promotion BOOLEAN,
    timestamp TIMESTAMP
);
```

#### WebSocket Events
```typescript
// Client → Server
'joinRoom'       // Join game room
'makeMove'       // Submit move
'sendMessage'    // Chat message
'offerDraw'      // Propose draw
'resignGame'     // Resign game

// Server → Client  
'gameStarted'    // Game begins
'moveMade'       // Opponent move
'gameEnded'      // Game finished
'chatMessage'    // Chat update
'drawOffered'    // Draw proposal
```

### Blockchain Layer

#### Solana Integration
- **Program ID**: `F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr`
- **Anchor Framework**: Type-safe smart contracts
- **PDAs**: Deterministic addresses
- **Events**: Transaction logging

#### Account Structure
```rust
// Game escrow account (per game)
GameEscrow {
    room_id: String,
    players: [Pubkey; 2],
    stake_amount: u64,
    state: GameState,
    move_history: Vec<MoveRecord>,
}

// Vault account (holds SOL)
GameVault {
    escrow: Pubkey,
    total_deposited: u64,
}
```

## Data Flow

### Game Creation Flow
```
1. Frontend: User creates room
2. Backend: Store room in database  
3. Frontend: Call initialize_game()
4. Solana: Create GameEscrow account
5. Backend: Update room status
6. Frontend: Display room info
```

### Move Processing Flow
```
1. Frontend: Player makes move
2. Frontend: Validate move locally
3. Backend: Update game state via WebSocket
4. Backend: Broadcast to opponent
5. Frontend: Update UI for both players
6. Solana: Record critical moves (optional)
```

### Game Completion Flow  
```
1. Frontend: Detect game end condition
2. Backend: Update game status
3. Frontend: Call declare_result()
4. Solana: Validate result and payout
5. Backend: Record final state
6. Frontend: Show game result
```

## Performance Optimizations

### Frontend Optimizations
- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Cache expensive calculations
- **Code Splitting**: Lazy load components
- **Service Worker**: Cache static assets

### Backend Optimizations
- **Connection Pooling**: Efficient database access
- **Redis Caching**: Session and game state
- **WebSocket Optimization**: Minimal message overhead
- **Database Indexing**: Fast query performance

### Blockchain Optimizations
- **Selective Recording**: Only critical moves on-chain
- **Transaction Batching**: Multiple operations per tx
- **Compute Optimization**: Efficient smart contract code
- **Account Compression**: Minimal storage usage

## Security Architecture

### Frontend Security
- **Input Validation**: Sanitize all user inputs
- **CSP Headers**: Content Security Policy
- **HTTPS Only**: Encrypted communication
- **Wallet Validation**: Verify signatures

### Backend Security
- **Rate Limiting**: Prevent spam/abuse
- **SQL Injection**: Parameterized queries
- **CORS Policy**: Restricted cross-origin requests
- **Authentication**: JWT token validation

### Blockchain Security  
- **Access Control**: Function-level permissions
- **State Validation**: Comprehensive checks
- **Reentrancy Protection**: Secure fund handling
- **Integer Overflow**: Safe math operations

## Scalability Considerations

### Horizontal Scaling
- **Load Balancers**: Distribute traffic
- **Database Sharding**: Partition game data
- **Microservices**: Separate concerns
- **CDN**: Global content delivery

### Vertical Scaling
- **Database Optimization**: Query performance
- **Memory Management**: Efficient resource usage
- **CPU Optimization**: Algorithm improvements
- **Storage Efficiency**: Data compression

### Blockchain Scaling
- **Layer 2 Solutions**: Future expansion options
- **State Compression**: Reduce on-chain footprint
- **Batch Processing**: Aggregate transactions
- **Rollup Integration**: Scale with ecosystem

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Sentry integration
- **Performance Metrics**: Response times
- **User Analytics**: Game statistics
- **Health Checks**: System status

### Blockchain Monitoring
- **Transaction Success**: Confirmation rates
- **Gas Usage**: Cost optimization
- **Account States**: Data integrity
- **Event Logging**: Audit trails

### Business Analytics
- **Player Metrics**: Retention and engagement
- **Game Statistics**: Win rates and patterns
- **Revenue Tracking**: Fee collection
- **Growth Analytics**: User acquisition

## Development Workflow

### Environment Management
```
Development  → Testing → Staging → Production
    ↓           ↓         ↓          ↓
Local DB    TestNet   DevNet    Mainnet
```

### Deployment Pipeline
1. **Code Review**: GitHub pull requests
2. **Automated Testing**: Unit and integration tests
3. **Build Process**: TypeScript compilation
4. **Container Deployment**: Docker containers
5. **Smart Contract**: Anchor deployment
6. **Database Migration**: Schema updates

### Quality Assurance
- **Unit Tests**: Component testing
- **Integration Tests**: End-to-end flows
- **Smart Contract Tests**: Anchor test suite
- **Manual Testing**: User acceptance testing
- **Security Audits**: Third-party reviews

---

**Next**: [Developer Guide](./developer-guide.md)