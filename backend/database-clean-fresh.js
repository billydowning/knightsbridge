/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 * Clean setup for DigitalOcean App Platform
 */

const { Pool } = require('pg');

// Load the CA cert from environment variable (automatically set by DigitalOcean)
const caCert = process.env.DATABASE_CA_CERT;

if (!caCert) {
  console.log('⚠️ DATABASE_CA_CERT not set, using default SSL configuration');
} else {
  console.log('✅ CA certificate loaded from environment variable');
}

// Create the connection pool with SSL config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Automatically set by DigitalOcean
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,  // Enforce verification for security
    ca: caCert  // Use the CA certificate if available
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

// Test connection function
async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🔌 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔌 CA Certificate:', caCert ? 'Loaded' : 'Not found');
    
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Test connection failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    // Provide specific guidance for SSL errors
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('🔧 SSL Fix: Certificate chain issue detected.');
      console.error('🔧 Solution: Ensure DATABASE_CA_CERT is set in environment variables');
    }
    
    return false;
  }
}

// Room management functions
const roomService = {
  // Create a new room
  async createRoom(roomId, playerWallet) {
    const query = `
      INSERT INTO games (room_id, player_white_wallet, game_state, stake_amount)
      VALUES ($1, $2, 'waiting', 0)
      RETURNING id, room_id, player_white_wallet
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet]);
      console.log('✅ Room created in database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating room:', error);
      throw error;
    }
  },

  // Join an existing room
  async joinRoom(roomId, playerWallet) {
    const query = `
      UPDATE games 
      SET player_black_wallet = $2, game_state = 'active', updated_at = NOW()
      WHERE room_id = $1 AND player_black_wallet IS NULL
      RETURNING id, room_id, player_white_wallet, player_black_wallet
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet]);
      if (result.rows.length > 0) {
        console.log('✅ Player joined room:', result.rows[0]);
        return result.rows[0];
      } else {
        throw new Error('Room not found or already full');
      }
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  },

  // Get room status
  async getRoomStatus(roomId) {
    const query = `
      SELECT 
        id, room_id, player_white_wallet, player_black_wallet, 
        game_state, stake_amount, created_at, updated_at
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting room status:', error);
      throw error;
    }
  },

  // Add escrow to room
  async addEscrow(roomId, playerWallet, amount) {
    const query = `
      UPDATE games 
      SET stake_amount = stake_amount + $3, updated_at = NOW()
      WHERE room_id = $1 AND (player_white_wallet = $2 OR player_black_wallet = $2)
      RETURNING id, room_id, stake_amount
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, amount]);
      if (result.rows.length > 0) {
        console.log('✅ Escrow added to room:', result.rows[0]);
        return result.rows[0];
      } else {
        throw new Error('Room not found or player not in room');
      }
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      throw error;
    }
  },

  // Save game state
  async saveGameState(roomId, gameState) {
    const query = `
      UPDATE games 
      SET game_state = $2, updated_at = NOW()
      WHERE room_id = $1
      RETURNING id, room_id, game_state
    `;
    
    try {
      const result = await pool.query(query, [roomId, gameState]);
      if (result.rows.length > 0) {
        console.log('✅ Game state saved for room:', result.rows[0]);
        return result.rows[0];
      } else {
        throw new Error('Room not found');
      }
    } catch (error) {
      console.error('❌ Error saving game state:', error);
      throw error;
    }
  },

  // Get game state
  async getGameState(roomId) {
    const query = `
      SELECT game_state, player_white_wallet, player_black_wallet, stake_amount
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting game state:', error);
      throw error;
    }
  }
};

// Chat service functions
const chatService = {
  // Send a message
  async sendMessage(roomId, playerWallet, message) {
    const query = `
      INSERT INTO chat_messages (room_id, player_wallet, message)
      VALUES ($1, $2, $3)
      RETURNING id, room_id, player_wallet, message, created_at
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, message]);
      console.log('✅ Message sent:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a room
  async getMessages(roomId) {
    const query = `
      SELECT id, room_id, player_wallet, message, created_at
      FROM chat_messages 
      WHERE room_id = $1
      ORDER BY created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      throw error;
    }
  }
};

module.exports = { pool, testConnection, roomService, chatService }; 