const { Pool } = require('pg');

// Use DigitalOcean database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.split('?')[0],
  ssl: {
    rejectUnauthorized: false
  }
});

async function testMoveStorage() {
  try {
    console.log('🧪 Testing move storage after fix...\n');
    
    // Check current total moves before test
    const beforeQuery = `SELECT COUNT(*) as total_moves FROM game_moves`;
    const beforeResult = await pool.query(beforeQuery);
    const movesBefore = parseInt(beforeResult.rows[0].total_moves);
    console.log(`📊 Total moves in database before test: ${movesBefore}`);
    
    // Also check recent games' move counts
    const recentGamesQuery = `
      SELECT 
        room_id, 
        move_count,
        game_state,
        created_at,
        (SELECT COUNT(*) FROM game_moves gm WHERE gm.game_id = g.id) as actual_moves_stored
      FROM games g 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const recentGames = await pool.query(recentGamesQuery);
    console.log('\n📋 Recent games move counts:');
    recentGames.rows.forEach(game => {
      console.log(`  ${game.room_id}: move_count=${game.move_count}, stored_moves=${game.actual_moves_stored}, status=${game.game_state}`);
    });
    
    console.log('\n🎯 NEXT STEP: Play a few moves in a new game to test the fix!');
    console.log('   1. Create a new game room');
    console.log('   2. Make 2-3 moves');
    console.log('   3. Run this script again to verify moves are stored');
    
    // Monitor for new moves (we can run this script again after testing)
    console.log('\n⏱️  Monitoring setup complete. Make some moves and run this script again!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testMoveStorage();