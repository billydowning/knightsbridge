const { Pool } = require('pg');

// Use DigitalOcean database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.split('?')[0],
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSpecificRoom(roomId) {
  try {
    console.log(`🔍 Checking move storage for room: ${roomId}\n`);
    
    // First, get the game info
    const gameQuery = `
      SELECT 
        id,
        room_id,
        move_count,
        game_state,
        player_white_wallet,
        player_black_wallet,
        created_at
      FROM games 
      WHERE room_id = $1
    `;
    
    const gameResult = await pool.query(gameQuery, [roomId]);
    
    if (gameResult.rows.length === 0) {
      console.log(`❌ No game found for room ${roomId}`);
      return;
    }
    
    const game = gameResult.rows[0];
    console.log('🎮 Game Info:');
    console.log(`  Room ID: ${game.room_id}`);
    console.log(`  Game UUID: ${game.id}`);
    console.log(`  Move Count: ${game.move_count}`);
    console.log(`  Status: ${game.game_state}`);
    console.log(`  White: ${game.player_white_wallet}`);
    console.log(`  Black: ${game.player_black_wallet}`);
    console.log(`  Created: ${game.created_at}`);
    
    // Now check for actual moves in game_moves table
    const movesQuery = `
      SELECT 
        move_number,
        player,
        from_square,
        to_square,
        piece,
        move_notation,
        is_check,
        is_checkmate,
        is_castle,
        is_en_passant,
        is_promotion,
        created_at
      FROM game_moves 
      WHERE game_id = $1 
      ORDER BY move_number ASC
    `;
    
    const movesResult = await pool.query(movesQuery, [game.id]);
    
    console.log(`\n📋 Stored Moves: ${movesResult.rows.length} moves found`);
    
    if (movesResult.rows.length > 0) {
      console.log('✅ MOVES ARE BEING STORED! 🎉');
      movesResult.rows.forEach((move, index) => {
        console.log(`  ${move.move_number}. ${move.player}: ${move.from_square}-${move.to_square} (${move.piece}) ${move.move_notation}`);
        if (move.is_castle) console.log(`    🏰 Castling move!`);
        if (move.is_check) console.log(`    ♔ Check!`);
        if (move.is_promotion) console.log(`    ♕ Promotion!`);
        if (move.is_en_passant) console.log(`    👻 En passant!`);
      });
    } else {
      if (game.game_state === 'active') {
        console.log('⏱️  Game is active but no moves stored yet (possibly just started)');
      } else {
        console.log('❌ No moves found - move storage might not be working');
      }
    }
    
    // Check total moves in database now
    const totalQuery = `SELECT COUNT(*) as total FROM game_moves`;
    const totalResult = await pool.query(totalQuery);
    console.log(`\n📊 Total moves in entire database: ${totalResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Get room ID from command line or use the specific one
const roomId = process.argv[2] || 'ROOM-Q4XXINTDU';
checkSpecificRoom(roomId);