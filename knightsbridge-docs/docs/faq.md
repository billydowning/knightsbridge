---
title: Frequently Asked Questions
sidebar_position: 10
---

# Frequently Asked Questions

## Getting Started

### What is Knightsbridge Chess?
Knightsbridge Chess is a decentralized chess platform built on Solana where players can compete in skill-based matches with real SOL stakes. Winners are automatically paid through smart contracts.

### How do I start playing?
1. Install a Solana wallet (Phantom recommended)
2. Add some SOL to your wallet (minimum 0.5 SOL recommended)
3. Visit the platform and connect your wallet
4. Create or join a game room
5. Deposit your stake and start playing!

### What wallets are supported?
- **Phantom** (Recommended)
- **Backpack**
- **Solflare** 
- **Slope**

Any wallet that supports Solana and can sign transactions will work.

### How much SOL do I need?
- **Minimum stake**: 0.1 SOL per game
- **Maximum stake**: 100 SOL per game  
- **Transaction fees**: ~0.001 SOL per move
- **Recommended**: 0.5+ SOL for multiple games

## Gameplay

### Are all chess rules supported?
Yes! Knightsbridge implements complete FIDE (World Chess Federation) rules including:
- All standard piece movements
- Castling (kingside and queenside)
- En passant captures
- Pawn promotion (auto-promotes to Queen)
- Check, checkmate, and stalemate detection
- Draw conditions (50-move rule, insufficient material, threefold repetition)

### What time controls are available?
- **Bullet**: Less than 3 minutes per player
- **Blitz**: 3-10 minutes per player
- **Rapid**: 10+ minutes per player  
- **Custom**: Set your own time limits

### Can I play against friends?
Yes! Create a room and share the room ID with your friend. They can join using that ID to play against you specifically.

### What happens if my opponent disconnects?
If a player disconnects:
- The game continues running with their clock ticking
- If they don't return before their time expires, they lose by timeout
- The remaining player wins automatically
- Funds are distributed accordingly

## Wagering & Payouts

### How does the wagering system work?
1. Both players deposit equal SOL amounts into an escrow smart contract
2. The smart contract holds the funds securely during the game
3. When the game ends, the winner automatically receives ~98% of the total pot
4. A 2% platform fee is deducted from the total pot

### When do I get paid?
Payouts are **automatic and immediate** when the game ends. The smart contract distributes funds without any manual claiming required.

### What are the fees?
- **Platform fee**: 2% of the total pot
- **Transaction fees**: ~0.001 SOL per blockchain interaction
- **No withdrawal fees**: Funds go directly to your wallet

### What happens in a draw?
In case of a draw, the pot is split equally between both players (minus the 2% platform fee). Each player receives 49% of the total pot.

### Are my funds safe?
Yes. Your SOL is secured in a smart contract escrow system:
- Funds are locked until the game completes
- No one can withdraw funds except through game completion
- Smart contract code is public and auditable
- Automatic distribution prevents human error

## Technical Questions

### Which blockchain is this built on?
Knightsbridge Chess is built on **Solana** for its:
- Low transaction fees (~$0.00025)
- Fast confirmation times (~400ms)
- High throughput capability
- Gaming-focused ecosystem

### Do all moves go on the blockchain?
No. We use a hybrid approach:
- **Critical moves** (captures, checks, game-ending moves) are recorded on-chain
- **Regular moves** are processed off-chain for speed
- **Game results** and **payouts** are always on-chain
- This provides security while maintaining fast gameplay

### What if the blockchain is slow?
- Most gameplay happens off-chain for speed
- Only critical events require blockchain confirmation
- Games continue even during network congestion
- Payouts may be delayed but funds remain secure

### Can I play offline?
No, Knightsbridge requires an internet connection for:
- Real-time gameplay with opponents
- Blockchain interactions for wagering
- Anti-cheat validation
- Move synchronization

## Security & Fair Play

### How do you prevent cheating?
Multiple anti-cheat measures are in place:
- **Move validation**: All moves checked against chess rules
- **Timing analysis**: Suspicious patterns flagged
- **Position verification**: Board states cryptographically verified
- **Engine detection**: Statistical analysis to identify computer play
- **Blockchain recording**: Immutable move history

### What if I suspect my opponent is cheating?
Report suspected cheating through:
- In-game reporting system
- Discord community moderation
- Email: support@knightsbridge-chess.com

Our anti-cheat systems will investigate and take appropriate action.

### Is my personal information safe?
We collect minimal information:
- **Wallet address**: Required for gameplay
- **Game statistics**: Win/loss records
- **No personal data**: Names, emails, or identity information
- **Privacy-first**: Decentralized architecture protects your data

### What happens if there's a bug?
- **Game bugs**: Contact support for resolution
- **Smart contract bugs**: Emergency procedures in place
- **Fund safety**: Multiple security measures protect user funds
- **Bug bounty**: Rewards for finding security issues

## Troubleshooting

### My wallet won't connect
Try these steps:
1. Refresh the page and try again
2. Check that your wallet is unlocked
3. Ensure you're on the correct network (Mainnet)
4. Clear browser cache and cookies
5. Try a different browser or wallet

### My move was rejected
Common reasons:
- **Illegal move**: Move violates chess rules
- **Wrong turn**: Not your turn to move
- **In check**: Move doesn't get you out of check
- **Time expired**: You ran out of time

### Transaction failed
Possible causes:
- **Insufficient SOL**: Add more balance to your wallet
- **Network congestion**: Wait and try again
- **Wrong network**: Switch to Solana Mainnet
- **Wallet locked**: Unlock your wallet

### Game is stuck loading
- **Wait for confirmation**: Blockchain transactions need time
- **Check network status**: Solana network might be busy
- **Refresh page**: Reload to resync game state
- **Contact support**: If issue persists

## Community & Support

### Where can I get help?
- **Discord**: [Join our community](https://discord.gg/knightsbridge)
- **Twitter**: [@KnightsbridgeChess](https://twitter.com/knightsbridgechess)
- **Email**: support@knightsbridge-chess.com
- **Documentation**: This comprehensive guide

### How can I provide feedback?
We welcome feedback through:
- Discord suggestions channel
- GitHub issues for technical feedback
- Email for general comments
- Twitter for public discussions

### Is there a mobile app?
Currently, Knightsbridge Chess is available as a web application that works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)
- Tablet browsers

A dedicated mobile app may be developed based on user demand.

### Can I contribute to the project?
Yes! Knightsbridge Chess is open source:
- **Code contributions**: Submit pull requests on GitHub
- **Bug reports**: Report issues you find
- **Feature requests**: Suggest improvements
- **Documentation**: Help improve guides and docs

See our [Developer Guide](./developer-guide.md) for contribution guidelines.

## Business & Legal

### Who owns Knightsbridge Chess?
Knightsbridge Chess is developed as an open-source project. The smart contracts are deployed on Solana and operate autonomously.

### What are the legal implications?
- **Skill-based gaming**: Chess is a game of skill, not chance
- **Peer-to-peer**: Players compete directly against each other
- **Tax responsibility**: Players are responsible for tax reporting
- **Local laws**: Check your local regulations regarding online gaming

### How do you make money?
Revenue comes from:
- **Platform fees**: 2% of each game's total pot
- **Optional features**: Future premium features (TBD)
- **No subscription**: Free to play, pay only when you wager

### What's the roadmap?
Upcoming features:
- **Tournaments**: Multi-player competitive events
- **Ratings system**: ELO-based player rankings  
- **Spectator mode**: Watch games in progress
- **Mobile app**: Native mobile experience
- **Additional games**: Beyond chess (checkers, etc.)

---

**Still have questions?** Join our [Discord community](https://discord.gg/knightsbridge) or email us at support@knightsbridge-chess.com