# ♚ Knightsbridge Chess - Solana-Powered Chess with Escrow Betting

A decentralized chess application built on Solana blockchain that enables players to bet SOL on chess games with secure escrow management.

## 🎯 Features

### 🏗️ **Architecture**
- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js with Socket.io for real-time communication
- **Blockchain**: Solana program (Anchor) for escrow management
- **Wallet Integration**: Phantom and Backpack wallet support

### 🎮 **Game Features**
- **FIDE-Compliant Chess**: Complete chess engine with all official rules
- **Real-time Multiplayer**: Cross-tab synchronization using localStorage events
- **Move Validation**: Advanced chess move validation and legal move highlighting
- **Game Analytics**: Detailed statistics and move history analysis
- **Visual Feedback**: Enhanced UI with hover effects and move animations

### 💰 **Solana Integration**
- **Escrow Management**: Secure stake deposits from both players
- **Winner Payout**: Automatic fund distribution with 5% platform fee
- **Move Recording**: On-chain move recording with position hashing
- **Timeout Handling**: Automatic game resolution for inactive players
- **Balance Management**: Real-time wallet balance checking

### 🔐 **Security Features**
- **Smart Contract Verification**: All transactions verified on-chain
- **Escrow Security**: Funds locked until game completion
- **Anti-Cheating**: Position hashing prevents move tampering
- **Fee Collection**: Transparent platform fee structure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Yarn or npm
- Solana CLI tools
- Anchor framework

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd knightsbridge
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Solana Program
cd ../programs/escrow
yarn install
```

3. **Configure Solana**
```bash
# Set to devnet for testing
solana config set --url devnet

# Create wallet if needed
solana-keygen new
```

4. **Deploy the program**
```bash
cd programs/escrow
anchor build
anchor deploy
```

5. **Update program ID**
Update the `CHESS_PROGRAM_ID` in `frontend/src/config/solanaConfig.ts` with your deployed program ID.

6. **Start the application**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🏗️ Project Structure

```
knightsbridge/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Business logic services
│   │   ├── engine/         # Chess engine implementation
│   │   ├── config/         # Configuration files
│   │   └── types/          # TypeScript type definitions
├── backend/                 # Express.js backend server
│   └── server.js           # Socket.io server for real-time communication
├── programs/               # Solana smart contracts
│   └── escrow/            # Chess escrow program
└── README.md              # This file
```

## 🎮 How to Play

### 1. **Connect Wallet**
- Click "Connect Wallet" button
- Select Phantom or Backpack wallet
- Ensure you have SOL in your wallet

### 2. **Create or Join Room**
- **Create Room**: Leave room ID empty and click "Create Room"
- **Join Room**: Enter existing room ID and click "Join Room"
- Set your bet amount (0.1 - 100 SOL)

### 3. **Create Escrow**
- Both players must create escrows to start
- Funds are locked in smart contract
- 5% platform fee is deducted

### 4. **Play Chess**
- White moves first
- Click pieces to see legal moves
- Make moves to advance the game
- Resign or play to checkmate

### 5. **Claim Winnings**
- Winner automatically receives funds minus fee
- Loser's stake goes to winner
- Platform fee goes to fee collector

## 🔧 Technical Details

### Solana Program Features

```rust
// Key program functions
initialize_game()     // Create new game escrow
join_game()          // Second player joins
deposit_stake()      // Player deposits SOL
record_move()        // Record move on-chain
declare_result()     // End game and distribute funds
handle_timeout()     // Handle inactive players
cancel_game()        // Cancel game and refund
```

### Frontend Architecture

- **State Management**: Custom hooks for game state and wallet management
- **Real-time Sync**: localStorage events for cross-tab synchronization
- **Chess Engine**: FIDE-compliant chess rules implementation
- **Wallet Integration**: Solana wallet adapter with transaction handling

### Backend Services

- **Socket.io Server**: Real-time game state synchronization
- **Room Management**: Player assignment and game room handling
- **Move Broadcasting**: Real-time move transmission between players

## 🎯 Game Rules

### Standard Chess Rules
- All FIDE-compliant chess rules implemented
- Castling, en passant, pawn promotion
- Check, checkmate, stalemate detection
- Threefold repetition and fifty-move rule

### Betting Rules
- Minimum bet: 0.1 SOL
- Maximum bet: 100 SOL
- Platform fee: 5% of total pot
- Both players must deposit equal amounts
- Winner takes all minus platform fee

### Time Controls
- No time limit by default
- Players can set custom time limits
- Automatic timeout handling available

## 🔐 Security Considerations

### Smart Contract Security
- All game logic verified on-chain
- Escrow funds locked until game completion
- Position hashing prevents move tampering
- Fee collection transparent and automatic

### Frontend Security
- Wallet connection validation
- Transaction signature verification
- Input sanitization and validation
- Error handling for failed transactions

## 🚀 Deployment

### Development
```bash
# Local development
npm run dev

# Build for production
npm run build
```

### Production Deployment
1. Deploy Solana program to mainnet
2. Update RPC endpoints and program IDs
3. Deploy frontend to hosting service
4. Deploy backend to cloud provider
5. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chess.js**: Chess move validation library
- **Solana**: Blockchain platform
- **Anchor**: Solana development framework
- **React**: Frontend framework
- **Socket.io**: Real-time communication

## 📞 Support

For support and questions:
- Create an issue in the repository
- Join our Discord community
- Email: support@knightsbridge.chess

---

**♚ Knightsbridge Chess** - Where strategy meets blockchain technology. 