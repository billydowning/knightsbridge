/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 */

const { Pool } = require('pg');

// Robust database connection pool with proper SSL handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Required for DigitalOcean managed database
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for VPC
});

// Test database connection with better error handling
async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🔌 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔌 SSL Config: DigitalOcean managed database (rejectUnauthorized: false)');
    
    // Debug: Show the connection string (without password)
    if (process.env.DATABASE_URL) {
      const urlParts = process.env.DATABASE_URL.split('@');
      if (urlParts.length > 1) {
        const hostPart = urlParts[1];
        console.log('🔌 Database host:', hostPart.split('/')[0]);
      }
    }
    
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', error);
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
      if (result.rows.length === 0) {
        throw new Error('Room is full or does not exist');
      }
      console.log('✅ Player joined room in database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  },

  // Get room status
  async getRoomStatus(roomId) {
    const query = `
      SELECT 
        room_id, 
        player_white_wallet, 
        player_black_wallet,
        game_state,
        stake_amount,
        created_at,
        updated_at
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const room = result.rows[0];
      const playerCount = [room.player_white_wallet, room.player_black_wallet].filter(Boolean).length;
      
      return {
        roomId: room.room_id,
        playerCount,
        players: [
          room.player_white_wallet && { wallet: room.player_white_wallet, role: 'white' },
          room.player_black_wallet && { wallet: room.player_black_wallet, role: 'black' }
        ].filter(Boolean),
        gameStarted: room.game_state === 'active',
        escrows: {}, // Will be implemented separately
        created: room.created_at,
        lastUpdated: room.updated_at
      };
    } catch (error) {
      console.error('❌ Error getting room status:', error);
      throw error;
    }
  },

  // Add escrow to room
  async addEscrow(roomId, playerWallet, amount) {
    const query = `
      UPDATE games 
      SET stake_amount = $3, updated_at = NOW()
      WHERE room_id = $1 AND (player_white_wallet = $2 OR player_black_wallet = $2)
      RETURNING id, room_id, stake_amount
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, amount]);
      if (result.rows.length === 0) {
        throw new Error('Player not found in room');
      }
      console.log('✅ Escrow added to database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      throw error;
    }
  },

  // Save game state
  async saveGameState(roomId, gameState) {
    const query = `
      UPDATE games 
      SET 
        final_position = $2,
        pgn = $3,
        move_count = $4,
        updated_at = NOW()
      WHERE room_id = $1
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        roomId, 
        gameState.position ? JSON.stringify(gameState.position) : null,
        gameState.moveHistory ? JSON.stringify(gameState.moveHistory) : null,
        gameState.moveHistory ? gameState.moveHistory.length : 0
      ]);
      console.log('✅ Game state saved to database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error saving game state:', error);
      throw error;
    }
  },

  // Get game state
  async getGameState(roomId) {
    const query = `
      SELECT 
        final_position,
        pgn,
        move_count,
        updated_at
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const game = result.rows[0];
      return {
        position: game.final_position ? JSON.parse(game.final_position) : null,
        moveHistory: game.pgn ? JSON.parse(game.pgn) : [],
        lastUpdated: game.updated_at.getTime()
      };
    } catch (error) {
      console.error('❌ Error getting game state:', error);
      throw error;
    }
  }
};

// Chat service
const chatService = {
  // Send chat message
  async sendMessage(roomId, playerWallet, message) {
    const query = `
      INSERT INTO chat_messages (game_id, player_id, message)
      SELECT id, $2, $3
      FROM games 
      WHERE room_id = $1
      RETURNING id, player_id, message, created_at
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, message]);
      console.log('✅ Chat message saved to database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw error;
    }
  },

  // Get chat messages
  async getMessages(roomId) {
    const query = `
      SELECT 
        cm.player_id,
        cm.message,
        cm.created_at
      FROM chat_messages cm
      JOIN games g ON cm.game_id = g.id
      WHERE g.room_id = $1
      ORDER BY cm.created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      console.log('✅ Retrieved chat messages from database:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }
};

module.exports = {
  pool,
  testConnection,
  roomService,
  chatService
}; 