const { Pool } = require('pg');

// Use DigitalOcean database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.split('?')[0],
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkMoveCount() {
  try {
    console.log('🔍 Checking move_count vs game_moves data...\n');
    
    // Get some games with their move_count from games table
    const gamesQuery = `
      SELECT 
        room_id,
        move_count,
        game_state,
        player_white_wallet,
        player_black_wallet
      FROM games 
      WHERE (player_white_wallet = $1 OR player_black_wallet = $1)
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const wallet = 'UFGCHLdHGYQDwCag4iUTTYmvTyayvdjo9BsbDBs56r1';
    const gamesResult = await pool.query(gamesQuery, [wallet]);
    
    console.log('📊 Games with move_count from games table:');
    for (const game of gamesResult.rows) {
      console.log(`  ${game.room_id}: move_count=${game.move_count}, state=${game.game_state}`);
      
      // Check if this game has moves in game_moves table
      const movesQuery = `
        SELECT COUNT(*) as actual_moves
        FROM game_moves gm
        JOIN games g ON g.id = gm.game_id
        WHERE g.room_id = $1
      `;
      
      const movesResult = await pool.query(movesQuery, [game.room_id]);
      const actualMoves = movesResult.rows[0].actual_moves;
      
      console.log(`    └─ game_moves table: ${actualMoves} moves`);
      
      if (game.move_count > 0 || actualMoves > 0) {
        console.log(`    🎯 FOUND MOVES! move_count=${game.move_count}, game_moves=${actualMoves}`);
      }
    }
    
    // Also check the specific castling room
    console.log('\n🏰 Checking specific castling test room ROOM-JKV0M7CJS...');
    const castlingQuery = `
      SELECT 
        room_id,
        move_count,
        game_state,
        (SELECT COUNT(*) FROM game_moves gm WHERE gm.game_id = g.id) as game_moves_count
      FROM games g
      WHERE room_id = 'ROOM-JKV0M7CJS'
    `;
    
    const castlingResult = await pool.query(castlingQuery);
    if (castlingResult.rows.length > 0) {
      const castling = castlingResult.rows[0];
      console.log(`  ${castling.room_id}: move_count=${castling.move_count}, game_moves=${castling.game_moves_count}`);
    } else {
      console.log('  ROOM-JKV0M7CJS not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMoveCount();