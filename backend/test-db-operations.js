const { pool, initializeDatabase } = require('./database');

async function testDatabaseOperations() {
  console.log('🧪 Starting comprehensive database tests...\n');
  
  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Test 2: Initialize database (create tables)
    console.log('\n2️⃣ Testing database initialization...');
    await initializeDatabase();
    console.log('✅ Database tables initialized');
    
    // Test 3: Create a test room
    console.log('\n3️⃣ Testing room creation...');
    const roomId = 'test-room-' + Date.now();
    const escrowAddress = 'test-escrow-' + Date.now();
    
    const createRoomQuery = `
      INSERT INTO rooms (room_id, player1_id, player2_id, stake_amount, escrow_address, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const roomResult = await pool.query(createRoomQuery, [
      roomId,
      'player1-test',
      'player2-test', 
      0.1,
      escrowAddress,
      'waiting_for_deposits'
    ]);
    
    console.log('✅ Room created:', roomResult.rows[0]);
    
    // Test 4: Update room status
    console.log('\n4️⃣ Testing room status update...');
    const updateQuery = `
      UPDATE rooms 
      SET status = $1, updated_at = NOW()
      WHERE room_id = $2
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, ['both_deposited', roomId]);
    console.log('✅ Room status updated:', updateResult.rows[0]);
    
    // Test 5: Record a game move
    console.log('\n5️⃣ Testing game move recording...');
    const moveQuery = `
      INSERT INTO game_moves (room_id, player_id, move_notation, board_state, move_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const moveResult = await pool.query(moveQuery, [
      roomId,
      'player1-test',
      'e4',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      1
    ]);
    
    console.log('✅ Game move recorded:', moveResult.rows[0]);
    
    // Test 6: Query room with moves
    console.log('\n6️⃣ Testing complex query (room with moves)...');
    const complexQuery = `
      SELECT 
        r.*,
        COUNT(gm.id) as move_count,
        MAX(gm.created_at) as last_move_time
      FROM rooms r
      LEFT JOIN game_moves gm ON r.room_id = gm.room_id
      WHERE r.room_id = $1
      GROUP BY r.id
    `;
    
    const complexResult = await pool.query(complexQuery, [roomId]);
    console.log('✅ Complex query result:', complexResult.rows[0]);
    
    // Test 7: Test database constraints (should fail gracefully)
    console.log('\n7️⃣ Testing database constraints...');
    try {
      await pool.query(createRoomQuery, [
        roomId, // Same room_id should fail due to unique constraint
        'player3-test',
        'player4-test',
        0.2,
        'different-escrow',
        'waiting_for_deposits'
      ]);
      console.log('❌ Constraint test failed - duplicate was allowed');
    } catch (error) {
      console.log('✅ Database constraints working - duplicate rejected:', error.message);
    }
    
    // Test 8: Clean up test data
    console.log('\n8️⃣ Cleaning up test data...');
    await pool.query('DELETE FROM game_moves WHERE room_id = $1', [roomId]);
    await pool.query('DELETE FROM rooms WHERE room_id = $1', [roomId]);
    console.log('✅ Test data cleaned up');
    
    // Test 9: Check database statistics
    console.log('\n9️⃣ Database statistics...');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT COUNT(*) FROM game_moves) as total_moves,
        (SELECT COUNT(*) FROM rooms WHERE status = 'waiting_for_deposits') as waiting_rooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'active') as active_games
    `;
    
    const statsResult = await pool.query(statsQuery);
    console.log('✅ Database statistics:', statsResult.rows[0]);
    
    console.log('\n🎉 All database tests passed successfully! 🎉');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔐 Database connection pool closed');
  }
}

// Run the tests
if (require.main === module) {
  testDatabaseOperations();
}

module.exports = { testDatabaseOperations }; 