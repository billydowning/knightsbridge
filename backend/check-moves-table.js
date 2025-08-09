const { Pool } = require('pg');

// Use DigitalOcean database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.split('?')[0],
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkMovesTable() {
  try {
    console.log('🔍 Checking moves table...\n');
    
    // Check if moves table exists and its structure
    const tableInfoQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'moves' 
      ORDER BY ordinal_position
    `;
    
    const tableInfo = await pool.query(tableInfoQuery);
    if (tableInfo.rows.length === 0) {
      console.log('❌ No "moves" table found');
      
      // Check what tables do exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      const tables = await pool.query(tablesQuery);
      console.log('📋 Available tables:', tables.rows.map(r => r.table_name).join(', '));
      
    } else {
      console.log('✅ Found "moves" table with columns:');
      tableInfo.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check for data in moves table
    try {
      const movesCountQuery = `SELECT COUNT(*) as total FROM moves`;
      const movesCount = await pool.query(movesCountQuery);
      console.log(`\n📊 Total moves in "moves" table: ${movesCount.rows[0].total}`);
      
      if (movesCount.rows[0].total > 0) {
        const sampleQuery = `
          SELECT room_id, player_id, color, move_data, timestamp 
          FROM moves 
          ORDER BY timestamp DESC 
          LIMIT 5
        `;
        const sample = await pool.query(sampleQuery);
        console.log('\n🎯 Sample moves:');
        sample.rows.forEach(move => {
          console.log(`  ${move.room_id}: ${move.color} ${move.move_data} (${move.timestamp})`);
        });
        
        // Check specific castling room
        const castlingQuery = `
          SELECT COUNT(*) as castling_moves 
          FROM moves 
          WHERE room_id = 'ROOM-JKV0M7CJS'
        `;
        const castling = await pool.query(castlingQuery);
        console.log(`\n🏰 Moves in ROOM-JKV0M7CJS: ${castling.rows[0].castling_moves}`);
      }
      
    } catch (moveError) {
      console.log('❌ Error querying moves table:', moveError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMovesTable();