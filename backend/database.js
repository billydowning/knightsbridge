/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 * Clean setup for DigitalOcean App Platform
 */

const { Pool } = require('pg');

let pool = null;

function initializePool() {
  if (pool) return pool; // Already initialized
  
  // Remove the sslmode from the connection string if it exists
  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL not configured');
  }
  
  if (dbUrl.includes('?sslmode=')) {
    dbUrl = dbUrl.split('?')[0];
    console.log('🔧 Removed sslmode from DATABASE_URL for DigitalOcean SSL handling');
  }

  if (!dbUrl.startsWith('postgresql://')) {
    console.error('❌ Invalid DATABASE_URL - must start with postgresql://');
    throw new Error('Invalid DATABASE_URL format');
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

  pool = new Pool(poolConfig);
  return pool;
}

async function testConnection() {
  try {
    const poolInstance = initializePool();
    const client = await poolInstance.connect();
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
    const poolInstance = initializePool();
    switch (action) {
      case 'create':
        return await poolInstance.query(
          'INSERT INTO rooms (room_id, player1, status) VALUES ($1, $2, $3) RETURNING *',
          [data.roomId, data.player1, 'waiting']
        );
      case 'join':
        return await poolInstance.query(
          'UPDATE rooms SET player2 = $1, status = $2 WHERE room_id = $3 RETURNING *',
          [data.player2, 'active', data.roomId]
        );
      case 'get':
        return await poolInstance.query('SELECT * FROM rooms WHERE room_id = $1', [data.roomId]);
      case 'update':
        return await poolInstance.query(
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
    const poolInstance = initializePool();
    switch (action) {
      case 'save':
        return await poolInstance.query(
          'INSERT INTO chat_messages (room_id, player, message, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
          [data.roomId, data.player, data.message, new Date()]
        );
      case 'get':
        return await poolInstance.query(
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

module.exports = { pool: initializePool(), initializePool, testConnection, roomService, chatService }; 