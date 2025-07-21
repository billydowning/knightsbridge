const express = require('express');
const router = express.Router();
const { dbService } = require('../database');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'knightsbridge-chess-backend'
  });
});

// ========================================
// USER MANAGEMENT
// ========================================

// Register/Update user
router.post('/users/register', async (req, res) => {
  try {
    const { walletAddress, username, email, avatarUrl } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const user = await dbService.createOrUpdateUser(walletAddress, {
      username,
      email,
      avatar_url: avatarUrl
    });
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user profile
router.get('/users/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await dbService.getUserByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user statistics
router.get('/users/:userId/statistics', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeControl } = req.query;
    
    const statistics = await dbService.getUserStatistics(userId, timeControl);
    
    if (!statistics) {
      return res.status(404).json({ error: 'User statistics not found' });
    }
    
    res.json({ success: true, statistics });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// ========================================
// GAME MANAGEMENT
// ========================================

// Create new game
router.post('/games/create', async (req, res) => {
  try {
    const {
      roomId,
      blockchainTxId,
      playerWhiteWallet,
      playerBlackWallet,
      stakeAmount,
      timeControl,
      timeLimit,
      increment
    } = req.body;
    
    if (!roomId || !playerWhiteWallet || !playerBlackWallet || !stakeAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const game = await dbService.createGame({
      roomId,
      blockchainTxId,
      playerWhiteWallet,
      playerBlackWallet,
      stakeAmount,
      timeControl,
      timeLimit,
      increment
    });
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game by room ID
router.get('/games/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await dbService.getGameByRoomId(roomId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Update game
router.put('/games/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const updateData = req.body;
    
    const game = await dbService.updateGame(roomId, updateData);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Record move
router.post('/games/:roomId/moves', async (req, res) => {
  try {
    const { roomId } = req.params;
    const moveData = req.body;
    
    // Get game first
    const game = await dbService.getGameByRoomId(roomId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const move = await dbService.recordMove(game.id, moveData);
    
    res.json({ success: true, move });
  } catch (error) {
    console.error('Record move error:', error);
    res.status(500).json({ error: 'Failed to record move' });
  }
});

// Get game moves
router.get('/games/:roomId/moves', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Get game first
    const game = await dbService.getGameByRoomId(roomId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const moves = await dbService.getGameMoves(game.id);
    
    res.json({ success: true, moves });
  } catch (error) {
    console.error('Get game moves error:', error);
    res.status(500).json({ error: 'Failed to get game moves' });
  }
});

// ========================================
// TOURNAMENT MANAGEMENT
// ========================================

// Create tournament
router.post('/tournaments/create', async (req, res) => {
  try {
    const {
      name,
      description,
      tournamentType,
      timeControl,
      entryFee,
      prizePool,
      maxParticipants,
      startDate,
      endDate,
      createdBy
    } = req.body;
    
    if (!name || !tournamentType || !timeControl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const tournament = await dbService.createTournament({
      name,
      description,
      tournamentType,
      timeControl,
      entryFee,
      prizePool,
      maxParticipants,
      startDate,
      endDate,
      createdBy
    });
    
    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const { status, timeControl } = req.query;
    
    // This would need to be implemented in the database service
    // For now, we'll return a placeholder
    res.json({ success: true, tournaments: [] });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Join tournament
router.post('/tournaments/:tournamentId/join', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const participant = await dbService.joinTournament(tournamentId, userId);
    
    res.json({ success: true, participant });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// ========================================
// LEADERBOARDS
// ========================================

// Get leaderboard
router.get('/leaderboards/:timeControl', async (req, res) => {
  try {
    const { timeControl } = req.params;
    const { period = 'all_time', limit = 50 } = req.query;
    
    const leaderboard = await dbService.getLeaderboard(timeControl, period, limit);
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ========================================
// ANALYTICS
// ========================================

// Get daily analytics
router.get('/analytics/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const analytics = await dbService.getDailyAnalytics(targetDate);
    
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ========================================
// NOTIFICATIONS
// ========================================

// Create notification
router.post('/notifications', async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;
    
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const notification = await dbService.createNotification(userId, {
      type,
      title,
      message,
      data
    });
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get user notifications
router.get('/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const notifications = await dbService.getUserNotifications(userId, limit);
    
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await dbService.markNotificationAsRead(notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const isConnected = await dbService.testConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'API is healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database connection failed',
        database: 'disconnected'
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      success: false, 
      message: 'Health check failed',
      error: error.message
    });
  }
});

module.exports = router; 