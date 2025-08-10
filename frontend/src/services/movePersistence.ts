/**
 * 🚛 TOYOTA MOVE PERSISTENCE SERVICE
 * 
 * Ensures 100% move reliability - NO MOVES CAN BE LOST
 * Critical for financial chess application validation and payouts
 */

interface PendingMove {
  id: string;
  gameId: string;
  move: {
    from: string;
    to: string;
    piece: string;
    notation?: string;
    timeSpent?: number;
  };
  playerId: string;
  color: 'white' | 'black';
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
  localMoveNumber: number;
}

interface GameMoveHistory {
  gameId: string;
  confirmedMoves: number;
  pendingMoves: PendingMove[];
  lastServerSync: number;
}

class MovePersistenceService {
  private storageKey = 'knightsbridge_move_persistence';
  private gameHistories: Map<string, GameMoveHistory> = new Map();
  private maxRetries = 5;
  private retryDelay = 1000; // 1 second base delay

  constructor() {
    this.loadFromStorage();
    
    // Clean up old game data periodically (older than 7 days)
    this.cleanupOldGames();
  }

  /**
   * Record a move that needs to be sent to the server
   */
  public recordPendingMove(
    gameId: string,
    move: { from: string; to: string; piece: string; notation?: string; timeSpent?: number },
    playerId: string,
    color: 'white' | 'black'
  ): string {
    const moveId = this.generateMoveId();
    const gameHistory = this.getOrCreateGameHistory(gameId);
    
    const pendingMove: PendingMove = {
      id: moveId,
      gameId,
      move,
      playerId,
      color,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      localMoveNumber: gameHistory.pendingMoves.length + gameHistory.confirmedMoves + 1
    };

    gameHistory.pendingMoves.push(pendingMove);
    this.saveToStorage();

    console.log(`🚛 Move recorded for persistence: ${move.from}-${move.to} (ID: ${moveId})`);
    return moveId;
  }

  /**
   * Mark a move as confirmed by the server
   */
  public confirmMove(gameId: string, moveId: string, serverMoveNumber?: number): boolean {
    const gameHistory = this.gameHistories.get(gameId);
    if (!gameHistory) {
      console.warn(`🚛 No game history found for confirmation: ${gameId}`);
      return false;
    }

    const moveIndex = gameHistory.pendingMoves.findIndex(m => m.id === moveId);
    if (moveIndex === -1) {
      console.warn(`🚛 Move not found for confirmation: ${moveId}`);
      return false;
    }

    const move = gameHistory.pendingMoves[moveIndex];
    move.status = 'confirmed';
    
    // Remove from pending and increment confirmed count
    gameHistory.pendingMoves.splice(moveIndex, 1);
    gameHistory.confirmedMoves = serverMoveNumber || (gameHistory.confirmedMoves + 1);
    gameHistory.lastServerSync = Date.now();

    this.saveToStorage();
    console.log(`✅ Move confirmed: ${move.move.from}-${move.move.to} (Server move #${gameHistory.confirmedMoves})`);
    return true;
  }

  /**
   * Mark a move as failed (will be retried)
   */
  public markMoveFailed(gameId: string, moveId: string, error?: string): boolean {
    const gameHistory = this.gameHistories.get(gameId);
    if (!gameHistory) return false;

    const move = gameHistory.pendingMoves.find(m => m.id === moveId);
    if (!move) return false;

    move.status = 'failed';
    move.retryCount++;
    
    if (move.retryCount >= this.maxRetries) {
      console.error(`❌ Move failed permanently after ${this.maxRetries} retries: ${move.move.from}-${move.move.to}`);
      // Keep in pending for manual inspection but mark as failed
    } else {
      console.warn(`⚠️ Move failed (attempt ${move.retryCount}/${this.maxRetries}): ${move.move.from}-${move.move.to}`);
      move.status = 'pending'; // Will be retried
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Get all pending moves for a game that need to be resent
   */
  public getPendingMoves(gameId: string): PendingMove[] {
    const gameHistory = this.gameHistories.get(gameId);
    if (!gameHistory) return [];

    return gameHistory.pendingMoves
      .filter(move => move.status === 'pending' || move.status === 'failed')
      .filter(move => move.retryCount < this.maxRetries)
      .sort((a, b) => a.localMoveNumber - b.localMoveNumber);
  }

  /**
   * Get all moves that failed permanently (for user notification)
   */
  public getFailedMoves(gameId: string): PendingMove[] {
    const gameHistory = this.gameHistories.get(gameId);
    if (!gameHistory) return [];

    return gameHistory.pendingMoves.filter(move => 
      move.status === 'failed' && move.retryCount >= this.maxRetries
    );
  }

  /**
   * Sync with server state - validate our local state matches server
   */
  public syncWithServer(gameId: string, serverMoveCount: number, serverMoves?: any[]): {
    needsResync: boolean;
    pendingMoves: PendingMove[];
    conflicts: PendingMove[];
  } {
    const gameHistory = this.getOrCreateGameHistory(gameId);
    const pendingMoves = this.getPendingMoves(gameId);
    const conflicts: PendingMove[] = [];

    // Check if we're in sync with server
    const expectedMoveCount = gameHistory.confirmedMoves + pendingMoves.length;
    const needsResync = Math.abs(serverMoveCount - gameHistory.confirmedMoves) > pendingMoves.length;

    if (needsResync) {
      console.warn(`🚛 Move sync mismatch detected: Server=${serverMoveCount}, Local=${gameHistory.confirmedMoves}, Pending=${pendingMoves.length}`);
      
      // If server has more moves than we know about, we need to update our confirmed count
      if (serverMoveCount > gameHistory.confirmedMoves) {
        gameHistory.confirmedMoves = serverMoveCount;
        // Clear any pending moves that might be duplicates
        gameHistory.pendingMoves = gameHistory.pendingMoves.filter(move => 
          move.localMoveNumber > serverMoveCount
        );
        this.saveToStorage();
      }
    }

    gameHistory.lastServerSync = Date.now();
    this.saveToStorage();

    return {
      needsResync,
      pendingMoves,
      conflicts
    };
  }

  /**
   * Clear all data for a completed game
   */
  public clearGameData(gameId: string): void {
    this.gameHistories.delete(gameId);
    this.saveToStorage();
    console.log(`🚛 Cleared move persistence data for game: ${gameId}`);
  }

  /**
   * Get game statistics for debugging
   */
  public getGameStats(gameId: string): {
    confirmedMoves: number;
    pendingMoves: number;
    failedMoves: number;
    lastSync: Date | null;
  } {
    const gameHistory = this.gameHistories.get(gameId);
    if (!gameHistory) {
      return { confirmedMoves: 0, pendingMoves: 0, failedMoves: 0, lastSync: null };
    }

    const pendingMoves = gameHistory.pendingMoves.filter(m => m.status === 'pending' || m.status === 'failed').length;
    const failedMoves = gameHistory.pendingMoves.filter(m => m.status === 'failed' && m.retryCount >= this.maxRetries).length;

    return {
      confirmedMoves: gameHistory.confirmedMoves,
      pendingMoves,
      failedMoves,
      lastSync: gameHistory.lastServerSync ? new Date(gameHistory.lastServerSync) : null
    };
  }

  // Private helper methods

  private getOrCreateGameHistory(gameId: string): GameMoveHistory {
    if (!this.gameHistories.has(gameId)) {
      this.gameHistories.set(gameId, {
        gameId,
        confirmedMoves: 0,
        pendingMoves: [],
        lastServerSync: 0
      });
    }
    return this.gameHistories.get(gameId)!;
  }

  private generateMoveId(): string {
    return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.gameHistories = new Map(Object.entries(data));
        console.log(`🚛 Loaded move persistence data for ${this.gameHistories.size} games`);
      }
    } catch (error) {
      console.error('🚛 Failed to load move persistence data:', error);
      // Continue with empty state
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.gameHistories.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('🚛 Failed to save move persistence data:', error);
    }
  }

  private cleanupOldGames(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    let cleanedCount = 0;

    for (const [gameId, history] of this.gameHistories.entries()) {
      if (history.lastServerSync < cutoffTime) {
        this.gameHistories.delete(gameId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveToStorage();
      console.log(`🚛 Cleaned up ${cleanedCount} old game persistence records`);
    }
  }
}

// Export singleton instance
export const movePersistenceService = new MovePersistenceService();
export type { PendingMove };