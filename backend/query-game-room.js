const { Pool } = require('pg');

// Remove the sslmode from the connection string if it exists
let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?sslmode=')) {
  dbUrl = dbUrl.split('?')[0];
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function queryGameRoom(roomId) {
  try {
    console.log(`🔍 Querying database for room: ${roomId}`);
    
    // Get game state with move history
    const gameStateResult = await pool.query(
      'SELECT room_id, game_state, updated_at FROM game_states WHERE room_id = $1',
      [roomId]
    );
    
    if (gameStateResult.rows.length === 0) {
      console.log('❌ No game state found for room:', roomId);
      return;
    }
    
    const gameData = gameStateResult.rows[0];
    console.log('✅ Found game state for room:', roomId);
    console.log('📅 Last updated:', gameData.updated_at);
    
    const gameState = gameData.game_state;
    console.log('\n🎯 GAME STATE ANALYSIS:');
    console.log('Winner:', gameState.winner);
    console.log('Game Active:', gameState.gameActive);
    console.log('Current Player:', gameState.currentPlayer);
    console.log('Draw:', gameState.draw);
    console.log('In Check:', gameState.inCheck);
    
    console.log('\n🏰 CASTLING RIGHTS ANALYSIS:');
    console.log('Castling Rights:', gameState.castlingRights);
    console.log('King Position (e1):', gameState.position?.e1);
    console.log('Kingside Rook (h1):', gameState.position?.h1);
    console.log('Queenside Rook (a1):', gameState.position?.a1);
    console.log('f1 empty?:', !gameState.position?.f1 ? 'YES' : `NO (${gameState.position.f1})`);
    console.log('g1 empty?:', !gameState.position?.g1 ? 'YES' : `NO (${gameState.position.g1})`);
    console.log('d1 empty?:', !gameState.position?.d1 ? 'YES' : `NO (${gameState.position.d1})`);
    console.log('c1 empty?:', !gameState.position?.c1 ? 'YES' : `NO (${gameState.position.c1})`);
    console.log('b1 empty?:', !gameState.position?.b1 ? 'YES' : `NO (${gameState.position.b1})`);
    
    if (gameState.moveHistory && gameState.moveHistory.length > 0) {
      console.log('\n📝 MOVE HISTORY:');
      gameState.moveHistory.forEach((move, index) => {
        console.log(`${index + 1}. ${move.from} → ${move.to} (${move.piece}) - Player: ${move.player}`);
      });
      
      console.log('\n♔ FINAL POSITION:');
      for (const [square, piece] of Object.entries(gameState.position)) {
        if (piece) {
          console.log(`${square}: ${piece}`);
        }
      }
      
      console.log('\n🎯 CHECKMATE ANALYSIS:');
      console.log('Last move:', gameState.moveHistory[gameState.moveHistory.length - 1]);
      console.log('Game ended with winner:', gameState.winner);
    } else {
      console.log('❌ No move history found');
    }
    
  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    await pool.end();
  }
}

// Run the query
const roomId = process.argv[2] || 'ROOM-1M14VDB0R';
queryGameRoom(roomId);