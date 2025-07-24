/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 * Clean setup for DigitalOcean App Platform
 */

const { Pool } = require('pg');

// Remove the sslmode from the connection string if it exists
let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?sslmode=')) {
  dbUrl = dbUrl.split('?')[0];
  console.log('🔧 Removed sslmode from DATABASE_URL for DigitalOcean SSL handling');
}

if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
  console.error('❌ Invalid DATABASE_URL - must start with postgresql://');
  process.exit(1);
}
console.log('✅ DATABASE_URL loaded:', dbUrl.replace(/:([^@]+)@/, ':***@'));

// Create the pool configuration with DigitalOcean's recommended SSL handling
const poolConfig = {
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false  // Recommended for DigitalOcean managed databases
  }
};

console.log('🔧 SSL configuration: Using DigitalOcean managed database SSL (encrypted but relaxed verification)');

const pool = new Pool(poolConfig);

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Test connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Test connection failed:', error.message, '- Code:', error.code);
    throw error;
  }
}

// Room service functions
async function roomService(action, data) {
  try {
    switch (action) {
      case 'create':
        return await pool.query(
          'INSERT INTO rooms (room_id, player1, status) VALUES ($1, $2, $3) RETURNING *',
          [data.roomId, data.player1, 'waiting']
        );
      case 'join':
        return await pool.query(
          'UPDATE rooms SET player2 = $1, status = $2 WHERE room_id = $3 RETURNING *',
          [data.player2, 'active', data.roomId]
        );
      case 'get':
        return await pool.query('SELECT * FROM rooms WHERE room_id = $1', [data.roomId]);
      case 'update':
        return await pool.query(
          'UPDATE rooms SET status = $1, game_state = $2 WHERE room_id = $3 RETURNING *',
          [data.status, data.gameState, data.roomId]
        );
      default:
        throw new Error('Invalid room action');
    }
  } catch (error) {
    console.error('Room service error:', error);
    throw error;
  }
}

// Chat service functions
async function chatService(action, data) {
  try {
    switch (action) {
      case 'save':
        return await pool.query(
          'INSERT INTO chat_messages (room_id, player, message, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
          [data.roomId, data.player, data.message, new Date()]
        );
      case 'get':
        return await pool.query(
          'SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY timestamp ASC',
          [data.roomId]
        );
      default:
        throw new Error('Invalid chat action');
    }
  } catch (error) {
    console.error('Chat service error:', error);
    throw error;
  }
}

module.exports = { pool, testConnection, roomService, chatService }; 