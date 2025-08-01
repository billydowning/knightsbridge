---
title: Chess Rules & Mechanics
sidebar_position: 2
---

# Chess Rules & Mechanics

## Standard Chess Rules

Knightsbridge Chess implements complete FIDE (World Chess Federation) rules with full validation.

### Piece Movement

#### Pawns ♙♟
- Move forward one square, or two squares from starting position
- Capture diagonally forward one square
- **En passant**: Capture opponent pawn that moved two squares (must be immediate)
- **Promotion**: Automatically promotes to Queen when reaching end rank

#### Rooks ♖♜
- Move any number of squares horizontally or vertically
- Cannot jump over pieces

#### Knights ♘♞
- Move in "L" shape: 2 squares in one direction, 1 square perpendicular
- Only piece that can jump over others

#### Bishops ♗♝
- Move any number of squares diagonally
- Cannot jump over pieces

#### Queen ♕♛
- Combines Rook and Bishop movement
- Most powerful piece

#### King ♔♚
- Move one square in any direction
- Cannot move into check
- **Castling**: Special move with Rook (see below)

## Special Moves

### Castling
- King moves 2 squares toward Rook
- Rook moves to square King crossed
- **Requirements**:
  - Neither King nor Rook has moved
  - No pieces between them
  - King not in check
  - King doesn't pass through or land in check

### En Passant
- Capture opponent pawn that just moved 2 squares
- Must be done immediately on next turn
- Captured pawn is removed from board

### Pawn Promotion
- When pawn reaches opposite end of board
- Currently auto-promotes to Queen
- Recorded on blockchain with promotion flag

## Game End Conditions

### Checkmate ♔✕
- King is in check and cannot escape
- Game ends immediately
- Attacking player wins

### Stalemate ♔=
- King is not in check but has no legal moves
- Results in draw

### Draw Conditions

#### Fifty-Move Rule
- 50 moves without pawn move or capture
- Player can claim draw
- Automatically tracked

#### Insufficient Material
- K vs K (King vs King)
- K+B vs K (King + Bishop vs King)  
- K+N vs K (King + Knight vs King)
- K+B vs K+B (same color bishops)

#### Threefold Repetition
- Same position occurs 3 times
- Player can claim draw

#### Agreement
- Both players agree to draw
- Via in-game draw offer system

#### Time Control
- Player runs out of time
- Opponent wins by timeout

## Anti-Cheat Measures

### Move Validation
- All moves validated against FIDE rules
- Impossible moves rejected
- Position integrity maintained

### Time Controls
- Configurable time limits (Bullet, Blitz, Rapid)
- Move timing recorded on blockchain
- Suspicious patterns flagged

### Blockchain Recording
- Critical moves recorded on Solana
- Immutable game history
- Transparent verification

## Wagering System

### Stake Requirements
- Both players deposit equal SOL amount
- Held in escrow smart contract
- Minimum: 0.1 SOL, Maximum: 100 SOL

### Fee Structure
- 2% platform fee on total pot
- 98% distributed to winner
- Draws split pot equally (minus fee)

### Automatic Distribution
- Winners receive SOL immediately
- No manual claiming required
- Gas fees covered by winnings

## Time Controls

### Bullet Chess
- Less than 3 minutes per player
- Fast-paced games

### Blitz Chess  
- 3-10 minutes per player
- Popular tournament format

### Rapid Chess
- 10+ minutes per player
- Longer thinking time

### Custom
- Player-defined time limits
- Flexible for casual games

---

**Next**: [Getting Started Guide](./getting-started.md)