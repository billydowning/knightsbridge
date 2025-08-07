const { Pool } = require('pg');

// DigitalOcean SSL solution - remove sslmode from connection string
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

async function checkEscrowStatus() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Check what tables exist that might contain escrow data
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 AVAILABLE TABLES:');
    tables.rows.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Check specific room ROOM-2LDY7LBLO
    console.log('\n🔍 CHECKING ROOM-2LDY7LBLO SPECIFICALLY:');
    const specificRoom = await pool.query(`
      SELECT * FROM games WHERE room_id = 'ROOM-2LDY7LBLO'
    `);
    
    if (specificRoom.rows.length > 0) {
      const room = specificRoom.rows[0];
      console.log('Room found:');
      Object.keys(room).forEach(key => {
        if (key.toLowerCase().includes('escrow') || key.toLowerCase().includes('stake') || key.toLowerCase().includes('deposit')) {
          console.log(`  ${key}: ${room[key]}`);
        }
      });
      console.log(`  stake_amount: ${room.stake_amount}`);
      console.log(`  blockchain_tx_id: ${room.blockchain_tx_id}`);
      console.log(`  platform_fee: ${room.platform_fee}`);
    } else {
      console.log('Room not found');
    }
    
    // Get the most recent rooms with available columns
    const recentRooms = await pool.query(`
      SELECT room_id, player_white_wallet, player_black_wallet, game_state, created_at
      FROM games 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n🔍 RECENT ROOMS (last 5):');
    recentRooms.rows.forEach((room, i) => {
      console.log(`\nRoom ${i+1}: ${room.room_id}`);
      console.log(`  White: ${room.player_white_wallet || 'NULL'}`);
      console.log(`  Black: ${room.player_black_wallet || 'NULL'}`);
      console.log(`  Created: ${room.created_at}`);
      
      // Check if game state has draw
      if (room.game_state && typeof room.game_state === 'object') {
        console.log(`  Draw Status: ${room.game_state.draw || false}`);
        console.log(`  Game Active: ${room.game_state.gameActive || false}`);
        console.log(`  Winner: ${room.game_state.winner || 'none'}`);
        console.log(`  Move Count: ${room.game_state.moveHistory ? room.game_state.moveHistory.length : 0}`);
      }
    });
    
    // Look specifically for games with draw status
    const drawGames = await pool.query(`
      SELECT room_id, created_at, game_state
      FROM games 
      WHERE game_state::text LIKE '%"draw":true%'
      ORDER BY created_at DESC
      LIMIT 3
    `);
    
    console.log('\n🤝 GAMES WITH DRAW=TRUE:');
    if (drawGames.rows.length === 0) {
      console.log('No games found with draw=true');
    } else {
      drawGames.rows.forEach(game => {
        console.log(`\nRoom: ${game.room_id}`);
        console.log(`  Created: ${game.created_at}`);
        if (game.game_state) {
          console.log(`  Draw: ${game.game_state.draw}`);
          console.log(`  Game Active: ${game.game_state.gameActive}`);
          console.log(`  Move Count: ${game.game_state.moveHistory ? game.game_state.moveHistory.length : 0}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEscrowStatus();