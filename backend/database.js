/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

/**
 * Database Service Class
 * Handles all database operations
 */
class DatabaseService {
  
  /**
   * User Management
   */
  
  // Create or update user
  async createOrUpdateUser(walletAddress, userData = {}) {
    const query = `
      INSERT INTO users (wallet_address, username, email, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        username = COALESCE(EXCLUDED.username, users.username),
        email = COALESCE(EXCLUDED.email, users.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        last_active = NOW(),
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [
      walletAddress,
      userData.username || null,
      userData.email || null,
      userData.avatar_url || null
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }
  
  // Get user by wallet address
  async getUserByWallet(walletAddress) {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    try {
      const result = await pool.query(query, [walletAddress]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
  
  // Get user statistics
  async getUserStatistics(userId, timeControl = null) {
    let query = `
      SELECT 
        u.*,
        us.games_played,
        us.games_won,
        us.games_drawn,
        us.average_game_duration,
        us.total_moves_played
      FROM users u
      LEFT JOIN user_statistics us ON u.id = us.user_id
      WHERE u.id = $1
    `;
    
    const values = [userId];
    
    if (timeControl) {
      query += ' AND us.time_control = $2';
      values.push(timeControl);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }
  
  /**
   * Game Management
   */
  
  // Create new game
  async createGame(gameData) {
    const query = `
      INSERT INTO games (
        room_id, blockchain_tx_id, player_white_wallet, player_black_wallet,
        stake_amount, time_control, time_limit, increment, game_state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      gameData.roomId,
      gameData.blockchainTxId || null,
      gameData.playerWhiteWallet,
      gameData.playerBlackWallet,
      gameData.stakeAmount,
      gameData.timeControl || 'rapid',
      gameData.timeLimit || 600, // 10 minutes default
      gameData.increment || 0,
      gameData.gameState || 'waiting'
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }
  
  // Update game
  async updateGame(roomId, updateData) {
    const setFields = [];
    const values = [];
    let paramCount = 1;
    
    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        setFields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });
    
    if (setFields.length === 0) return null;
    
    setFields.push(`updated_at = NOW()`);
    values.push(roomId);
    
    const query = `
      UPDATE games 
      SET ${setFields.join(', ')}
      WHERE room_id = $${paramCount}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }
  
  // Get game by room ID
  async getGameByRoomId(roomId) {
    const query = `
      SELECT 
        g.*,
        u1.username as player_white_username,
        u2.username as player_black_username
      FROM games g
      LEFT JOIN users u1 ON g.player_white_id = u1.id
      LEFT JOIN users u2 ON g.player_black_id = u2.id
      WHERE g.room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting game:', error);
      throw error;
    }
  }
  
  // Record move
  async recordMove(gameId, moveData) {
    const query = `
      INSERT INTO game_moves (
        game_id, move_number, player, from_square, to_square,
        piece, captured_piece, move_notation, position_hash,
        time_spent, is_check, is_checkmate, is_castle,
        is_en_passant, is_promotion, promotion_piece, blockchain_tx_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      gameId,
      moveData.moveNumber,
      moveData.player,
      moveData.fromSquare,
      moveData.toSquare,
      moveData.piece,
      moveData.capturedPiece || null,
      moveData.moveNotation,
      moveData.positionHash || null,
      moveData.timeSpent || null,
      moveData.isCheck || false,
      moveData.isCheckmate || false,
      moveData.isCastle || false,
      moveData.isEnPassant || false,
      moveData.isPromotion || false,
      moveData.promotionPiece || null,
      moveData.blockchainTxId || null
    ];
    
    try {
      const result = await pool.query(query, values);
      
      // Update game move count
      await pool.query(
        'UPDATE games SET move_count = move_count + 1 WHERE id = $1',
        [gameId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error recording move:', error);
      throw error;
    }
  }
  
  // Get game moves
  async getGameMoves(gameId) {
    const query = `
      SELECT * FROM game_moves 
      WHERE game_id = $1 
      ORDER BY move_number ASC
    `;
    
    try {
      const result = await pool.query(query, [gameId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting game moves:', error);
      throw error;
    }
  }
  
  /**
   * Tournament Management
   */
  
  // Create tournament
  async createTournament(tournamentData) {
    const query = `
      INSERT INTO tournaments (
        name, description, tournament_type, time_control,
        entry_fee, prize_pool, max_participants, start_date, end_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      tournamentData.name,
      tournamentData.description,
      tournamentData.tournamentType,
      tournamentData.timeControl,
      tournamentData.entryFee || 0,
      tournamentData.prizePool || 0,
      tournamentData.maxParticipants,
      tournamentData.startDate,
      tournamentData.endDate,
      tournamentData.createdBy
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }
  
  // Join tournament
  async joinTournament(tournamentId, userId) {
    const query = `
      INSERT INTO tournament_participants (tournament_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (tournament_id, user_id) DO NOTHING
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [tournamentId, userId]);
      
      // Update participant count
      await pool.query(
        'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = $1',
        [tournamentId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw error;
    }
  }
  
  /**
   * Leaderboard Management
   */
  
  // Get leaderboard
  async getLeaderboard(timeControl = 'rapid', period = 'all_time', limit = 50) {
    const query = `
      SELECT 
        u.id, u.username, u.wallet_address,
        u.rating_${timeControl} as rating,
        u.games_played, u.games_won,
        CASE 
          WHEN u.games_played > 0 
          THEN ROUND((u.games_won::DECIMAL / u.games_played) * 100, 2)
          ELSE 0 
        END as win_rate,
        u.total_winnings
      FROM users u
      WHERE u.is_active = true
      ORDER BY u.rating_${timeControl} DESC
      LIMIT $1
    `;
    
    try {
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Analytics
   */
  
  // Get daily analytics
  async getDailyAnalytics(date) {
    const query = `
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN game_state = 'finished' THEN 1 END) as completed_games,
        COALESCE(SUM(stake_amount), 0) as total_volume,
        COALESCE(SUM(platform_fee), 0) as platform_fees,
        COUNT(DISTINCT player_white_id) + COUNT(DISTINCT player_black_id) as active_users
      FROM games
      WHERE DATE(created_at) = $1
    `;
    
    try {
      const result = await pool.query(query, [date]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting daily analytics:', error);
      throw error;
    }
  }
  
  /**
   * Notifications
   */
  
  // Create notification
  async createNotification(userId, notificationData) {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      userId,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {})
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Get user notifications
  async getUserNotifications(userId, limit = 20) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }
  
  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [notificationId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Chat Message Management
   */
  
  // Add a chat message
  async addChatMessage(gameId, messageData) {
    const query = `
      INSERT INTO chat_messages (game_id, player_id, player_name, message, message_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      gameId,
      messageData.playerId,
      messageData.playerName,
      messageData.message,
      messageData.messageType || 'chat'
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw error;
    }
  }
  
  // Get chat messages for a game
  async getChatMessages(gameId, limit = 100) {
    const query = `
      SELECT * FROM chat_messages 
      WHERE game_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [gameId, limit]);
      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }
  
  // Add a move to the database
  async addMove(gameId, moveData) {
    const query = `
      INSERT INTO moves (game_id, from_square, to_square, piece, player_id, color, move_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      gameId,
      moveData.from,
      moveData.to,
      moveData.piece,
      moveData.playerId,
      moveData.color,
      moveData.moveNumber || 1
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding move:', error);
      throw error;
    }
  }
  
  /**
   * Utility Functions
   */
  
  // Generate position hash
  generatePositionHash(position) {
    const positionString = JSON.stringify(position);
    return crypto.createHash('sha256').update(positionString).digest();
  }
  
  // Test database connection
  async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }
  
  // Close database connection
  async close() {
    await pool.end();
  }
}

// Create singleton instance
const dbService = new DatabaseService();

module.exports = {
  pool,
  dbService,
  DatabaseService
}; 