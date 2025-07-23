/**
 * Database Service for Frontend
 * Handles all API calls to the backend database
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://knightsbridge-vtfhf.ondigitalocean.app') + '/api';

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  rating_rapid: number;
  rating_blitz: number;
  rating_bullet: number;
  games_played: number;
  games_won: number;
  games_drawn: number;
  total_winnings: string;
  total_losses: string;
  best_win_streak: number;
  current_win_streak: number;
  created_at: string;
  updated_at: string;
  last_active: string;
  is_active: boolean;
}

export interface Game {
  id: string;
  room_id: string;
  blockchain_tx_id?: string;
  player_white_id?: string;
  player_black_id?: string;
  player_white_wallet: string;
  player_black_wallet: string;
  stake_amount: string;
  platform_fee: string;
  winner?: 'white' | 'black' | 'draw';
  game_result?: string;
  time_control: string;
  time_limit: number;
  increment: number;
  game_state: 'waiting' | 'active' | 'finished' | 'cancelled';
  move_count: number;
  final_position?: string;
  pgn?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  player_white_username?: string;
  player_black_username?: string;
}

export interface GameMove {
  id: string;
  game_id: string;
  move_number: number;
  player: 'white' | 'black';
  from_square: string;
  to_square: string;
  piece: string;
  captured_piece?: string;
  move_notation: string;
  position_hash?: string;
  time_spent?: number;
  is_check: boolean;
  is_checkmate: boolean;
  is_castle: boolean;
  is_en_passant: boolean;
  is_promotion: boolean;
  promotion_piece?: string;
  blockchain_tx_id?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username?: string;
  wallet_address: string;
  rating: number;
  games_played: number;
  games_won: number;
  win_rate: string;
  total_winnings: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface Analytics {
  total_games: string;
  completed_games: string;
  total_volume: string;
  platform_fees: string;
  active_users: string;
}

class DatabaseService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  async registerUser(walletAddress: string, userData: {
    username?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const response = await this.request<{ success: boolean; user: User }>('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        ...userData,
      }),
    });
    return response.user;
  }

  async getUserProfile(walletAddress: string): Promise<User | null> {
    try {
      const response = await this.request<{ success: boolean; user: User }>(`/users/profile/${walletAddress}`);
      return response.user;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getUserStatistics(userId: string, timeControl?: string): Promise<any> {
    const params = timeControl ? `?timeControl=${timeControl}` : '';
    const response = await this.request<{ success: boolean; statistics: any }>(`/users/${userId}/statistics${params}`);
    return response.statistics;
  }

  // ========================================
  // GAME MANAGEMENT
  // ========================================

  async createGame(gameData: {
    roomId: string;
    blockchainTxId?: string;
    playerWhiteWallet: string;
    playerBlackWallet: string;
    stakeAmount: number;
    timeControl?: string;
    timeLimit?: number;
    increment?: number;
  }): Promise<Game> {
    const response = await this.request<{ success: boolean; game: Game }>('/games/create', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
    return response.game;
  }

  async getGame(roomId: string): Promise<Game | null> {
    try {
      const response = await this.request<{ success: boolean; game: Game }>(`/games/${roomId}`);
      return response.game;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateGame(roomId: string, updateData: Partial<Game>): Promise<Game> {
    const response = await this.request<{ success: boolean; game: Game }>(`/games/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.game;
  }

  async recordMove(roomId: string, moveData: {
    moveNumber: number;
    player: 'white' | 'black';
    fromSquare: string;
    toSquare: string;
    piece: string;
    capturedPiece?: string;
    moveNotation: string;
    positionHash?: string;
    timeSpent?: number;
    isCheck?: boolean;
    isCheckmate?: boolean;
    isCastle?: boolean;
    isEnPassant?: boolean;
    isPromotion?: boolean;
    promotionPiece?: string;
    blockchainTxId?: string;
  }): Promise<GameMove> {
    const response = await this.request<{ success: boolean; move: GameMove }>(`/games/${roomId}/moves`, {
      method: 'POST',
      body: JSON.stringify(moveData),
    });
    return response.move;
  }

  async getGameMoves(roomId: string): Promise<GameMove[]> {
    const response = await this.request<{ success: boolean; moves: GameMove[] }>(`/games/${roomId}/moves`);
    return response.moves;
  }

  // ========================================
  // TOURNAMENT MANAGEMENT
  // ========================================

  async createTournament(tournamentData: {
    name: string;
    description?: string;
    tournamentType: string;
    timeControl: string;
    entryFee?: number;
    prizePool?: number;
    maxParticipants?: number;
    startDate?: string;
    endDate?: string;
    createdBy: string;
  }): Promise<any> {
    const response = await this.request<{ success: boolean; tournament: any }>('/tournaments/create', {
      method: 'POST',
      body: JSON.stringify(tournamentData),
    });
    return response.tournament;
  }

  async getTournaments(params?: { status?: string; timeControl?: string }): Promise<any[]> {
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<{ success: boolean; tournaments: any[] }>(`/tournaments${queryParams}`);
    return response.tournaments;
  }

  async joinTournament(tournamentId: string, userId: string): Promise<any> {
    const response = await this.request<{ success: boolean; participant: any }>(`/tournaments/${tournamentId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.participant;
  }

  // ========================================
  // LEADERBOARDS
  // ========================================

  async getLeaderboard(timeControl: string, period: string = 'all_time', limit: number = 50): Promise<LeaderboardEntry[]> {
    const response = await this.request<{ success: boolean; leaderboard: LeaderboardEntry[] }>(
      `/leaderboards/${timeControl}?period=${period}&limit=${limit}`
    );
    return response.leaderboard;
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getDailyAnalytics(date?: string): Promise<Analytics> {
    const params = date ? `?date=${date}` : '';
    const response = await this.request<{ success: boolean; analytics: Analytics }>(`/analytics/daily${params}`);
    return response.analytics;
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  async createNotification(notificationData: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<Notification> {
    const response = await this.request<{ success: boolean; notification: Notification }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
    return response.notification;
  }

  async getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    const response = await this.request<{ success: boolean; notifications: Notification[] }>(
      `/users/${userId}/notifications?limit=${limit}`
    );
    return response.notifications;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const response = await this.request<{ success: boolean; notification: Notification }>(
      `/notifications/${notificationId}/read`,
      {
        method: 'PUT',
      }
    );
    return response.notification;
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<{ success: boolean; message: string; database: string; timestamp: string }> {
    return this.request('/health');
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService; 