const io = require('socket.io-client');

// Connect to the production backend
const socket = io('https://knightsbridge-backend-ezuft.ondigitalocean.app');

function getGameState(roomId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for game state'));
    }, 10000); // 10 second timeout

    socket.on('connect', () => {
      console.log('🔌 Connected to backend');
      
      // Request game state
      socket.emit('getGameState', { roomId }, (response) => {
        clearTimeout(timeout);
        
        if (response && response.success) {
          resolve(response.gameState);
        } else {
          reject(new Error('Failed to get game state: ' + JSON.stringify(response)));
        }
        
        socket.disconnect();
      });
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function analyzeGame(roomId) {
  try {
    console.log(`🔍 Analyzing game: ${roomId}`);
    
    const gameState = await getGameState(roomId);
    
    console.log('\n🎯 GAME STATE ANALYSIS:');
    console.log('Winner:', gameState.winner);
    console.log('Game Active:', gameState.gameActive);
    console.log('Current Player:', gameState.currentPlayer);
    console.log('Draw:', gameState.draw);
    console.log('In Check:', gameState.inCheck);
    console.log('In Checkmate:', gameState.inCheckmate);
    
    if (gameState.moveHistory && gameState.moveHistory.length > 0) {
      console.log('\n📝 MOVE HISTORY:');
      gameState.moveHistory.forEach((move, index) => {
        console.log(`${index + 1}. ${move.from} → ${move.to} (${move.piece}) - Player: ${move.player}`);
      });
      
      console.log('\n♔ FINAL POSITION:');
      const pieces = [];
      for (const [square, piece] of Object.entries(gameState.position)) {
        if (piece && piece !== '') {
          pieces.push(`${square}: ${piece}`);
        }
      }
      pieces.sort().forEach(p => console.log(p));
      
      console.log('\n🎯 CHECKMATE ANALYSIS:');
      const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
      console.log('Last move:', lastMove);
      console.log('Total moves:', gameState.moveHistory.length);
      console.log('Game ended with winner:', gameState.winner);
      
      // Show the exact position in a more readable format
      console.log('\n🏁 FINAL BOARD POSITION:');
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      
      ranks.forEach(rank => {
        let row = `${rank} |`;
        files.forEach(file => {
          const square = file + rank;
          const piece = gameState.position[square];
          if (piece && piece !== '') {
            const shortPiece = piece.replace('white-', 'W').replace('black-', 'B')
              .replace('pawn', 'P').replace('rook', 'R').replace('knight', 'N')
              .replace('bishop', 'B').replace('queen', 'Q').replace('king', 'K');
            row += ` ${shortPiece.padEnd(2)}`;
          } else {
            row += '  .';
          }
        });
        console.log(row);
      });
      console.log('  +------------------------');
      console.log('    a  b  c  d  e  f  g  h');
      
    } else {
      console.log('❌ No move history found');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing game:', error.message);
  }
}

// Run the analysis
const roomId = process.argv[2] || 'ROOM-NU4YKH50R';
analyzeGame(roomId);