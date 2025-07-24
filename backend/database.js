/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 * Clean setup for DigitalOcean App Platform
 */

const { Pool } = require('pg');

// Parse the DATABASE_URL to get connection details
const connectionString = process.env.DATABASE_URL;

if (!connectionString || !connectionString.startsWith('postgresql://')) {
  console.error('❌ Invalid DATABASE_URL - must start with postgresql://');
  process.exit(1);
}
console.log('✅ DATABASE_URL loaded:', connectionString.replace(/:([^@]+)@/, ':***@'));

// Create the pool configuration with proper SSL handling
const poolConfig = {
  connectionString: connectionString,
  ssl: process.env.DATABASE_CA_CERT ? {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT
  } : false
};

if (process.env.DATABASE_CA_CERT) {
  console.log('✅ CA certificate loaded from environment variable (length:', process.env.DATABASE_CA_CERT.length, 'chars).');
  console.log('🔧 SSL configuration: Using CA certificate with strict verification');
} else {
  console.log('⚠️ No CA certificate found, SSL verification disabled');
}

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