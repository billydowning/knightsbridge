const { Pool } = require('pg');

// Create pool using the same DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
const roomId = process.argv[2] || 'ROOM-NU4YKH50R';
queryGameRoom(roomId);