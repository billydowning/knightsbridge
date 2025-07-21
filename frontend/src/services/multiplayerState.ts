/**
 * Multiplayer State Management
 * Handles room creation, player joining, escrow management, and real-time synchronization
 * Uses localStorage with storage events for cross-tab real-time sync
 */

// Import types from centralized location
import type { GameState, Room, RoomStatus, RoomsData, GameStatesData } from '../types/chess';

// TypeScript Interfaces - Re-export for convenience
export type { PlayerRole, Room, RoomStatus, RoomsData, GameStatesData } from '../types/chess';

/**
 * Mock multiplayer state using localStorage with real-time sync via storage events
 * In production, this would be replaced with WebSocket connections to a real server
 */
class MultiplayerStateManager {
  private readonly STORAGE_KEY = 'chess-rooms-shared';
  private readonly GAME_STATE_KEY = 'chess-game-state';

  /**
   * Set up real-time sync using storage events
   * Returns cleanup function to remove event listeners
   */
  setupStorageSync(callback: () => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      console.log('📡 Storage event detected:', e.key, e.newValue ? 'NEW DATA' : 'NO DATA');
      if (e.key === this.STORAGE_KEY || e.key === this.GAME_STATE_KEY) {
        console.log('🔄 Storage changed, triggering sync...');
        setTimeout(callback, 50); // Small delay to ensure data is written
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also create a manual trigger for same-tab updates
    const handleManualSync = () => {
      console.log('🔄 Manual sync triggered');
      setTimeout(callback, 50);
    };
    
    window.addEventListener('gameStateChanged', handleManualSync);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gameStateChanged', handleManualSync);
    };
  }

  /**
   * Trigger storage event manually for same-tab updates
   */
  triggerSync(): void {
    // Dispatch custom event for same-tab sync
    console.log('📤 Triggering manual sync event');
    window.dispatchEvent(new CustomEvent('gameStateChanged'));
    
    // Also try to trigger storage event by modifying a dummy key
    const timestamp = Date.now();
    localStorage.setItem('chess-sync-trigger', timestamp.toString());
    localStorage.removeItem('chess-sync-trigger');
  }

  /**
   * Get all rooms from localStorage
   */
  getRooms(): RoomsData {
    try {
      const rooms = localStorage.getItem(this.STORAGE_KEY);
      return rooms ? JSON.parse(rooms) : {};
    } catch (error) {
      console.error('Error reading rooms from localStorage:', error);
      return {};
    }
  }

  /**
   * Save rooms to localStorage and trigger sync
   */
  saveRooms(rooms: RoomsData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rooms));
      this.triggerSync();
    } catch (error) {
      console.error('Error saving rooms to localStorage:', error);
    }
  }

  /**
   * Get game state for a specific room
   */
  getGameState(roomId: string): (GameState & { lastUpdated: number }) | null {
    try {
      const gameStates: GameStatesData = JSON.parse(
        localStorage.getItem(this.GAME_STATE_KEY) || '{}'
      );
      return gameStates[roomId] || null;
    } catch (error) {
      console.error('Error reading game state from localStorage:', error);
      return null;
    }
  }

  /**
   * Save game state for a specific room
   */
  saveGameState(roomId: string, gameState: GameState): void {
    try {
      const gameStates: GameStatesData = JSON.parse(
        localStorage.getItem(this.GAME_STATE_KEY) || '{}'
      );
      
      gameStates[roomId] = {
        ...gameState,
        lastUpdated: Date.now()
      };
      
      console.log('💾 Saving game state for room:', roomId, gameStates[roomId]);
      localStorage.setItem(this.GAME_STATE_KEY, JSON.stringify(gameStates));
      
      // Force trigger sync
      this.triggerSync();
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }

  /**
   * Create a new room with the first player
   */
  createRoom(roomId: string, playerWallet: string): 'white' | null {
    const rooms = this.getRooms();
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [{ wallet: playerWallet, role: 'white' }],
        escrows: {},
        gameStarted: false,
        created: Date.now()
      };
      this.saveRooms(rooms);
      console.log('✅ Created room:', roomId, 'for player:', playerWallet);
      return 'white';
    } else {
      console.log('❌ Room already exists:', roomId);
      return null;
    }
  }

  /**
   * Join an existing room or return existing role if already joined
   */
  joinRoom(roomId: string, playerWallet: string): 'white' | 'black' | null {
    const rooms = this.getRooms();
    const room = rooms[roomId];
    
    console.log('🔍 Attempting to join room:', roomId);
    console.log('🔍 Available rooms:', Object.keys(rooms));
    console.log('🔍 Room data:', room);
    
    if (room) {
      // Check if player is already in the room
      const existingPlayer = room.players.find(p => p.wallet === playerWallet);
      if (existingPlayer) {
        console.log('✅ Player already in room:', playerWallet, 'role:', existingPlayer.role);
        return existingPlayer.role;
      }
      
      // Add new player if room has space
      if (room.players.length < 2) {
        const newRole: 'white' | 'black' = room.players.length === 0 ? 'white' : 'black';
        room.players.push({ wallet: playerWallet, role: newRole });
        this.saveRooms(rooms);
        console.log('✅ Player joined room:', roomId, 'player:', playerWallet, 'role:', newRole);
        return newRole;
      } else {
        console.log('❌ Room is full:', roomId);
        return null;
      }
    } else {
      console.log('❌ Room does not exist:', roomId);
      return null;
    }
  }

  /**
   * Get current status of a room
   */
  getRoomStatus(roomId: string): RoomStatus | null {
    try {
      const rooms = this.getRooms();
      const room = rooms[roomId];
      
      if (room) {
        // Ensure escrows is always an object
        const escrows = room.escrows || {};
        
        return {
          playerCount: room.players ? room.players.length : 0,
          players: room.players || [],
          escrowCount: Object.keys(escrows).length,
          escrows: escrows,
          gameStarted: room.gameStarted || false
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error in getRoomStatus:', error);
      return null;
    }
  }

  /**
   * Add escrow for a player in a room
   * Auto-starts game if both escrows are created
   */
  addEscrow(roomId: string, playerWallet: string, amount: number): void {
    const rooms = this.getRooms();
    const room = rooms[roomId];
    
    if (room) {
      room.escrows[playerWallet] = amount;
      
      // Auto-start game if both escrows are created
      if (Object.keys(room.escrows).length === 2 && !room.gameStarted) {
        room.gameStarted = true;
        console.log('🎮 Auto-starting game in room:', roomId);
      }
      
      this.saveRooms(rooms);
      console.log('✅ Escrow added:', roomId, playerWallet, amount);
    } else {
      console.error('❌ Room not found when adding escrow:', roomId);
    }
  }

  /**
   * Clear escrows for a room (for starting new games)
   */
  clearEscrows(roomId: string): void {
    const rooms = this.getRooms();
    const room = rooms[roomId];
    
    if (room) {
      room.escrows = {};
      room.gameStarted = false;
      this.saveRooms(rooms);
      console.log('🔄 Cleared escrows for room:', roomId);
    } else {
      console.error('❌ Room not found when clearing escrows:', roomId);
    }
  }

  /**
   * Debug function to see room state
   */
  debugRoom(roomId: string): Room | undefined {
    const rooms = this.getRooms();
    const room = rooms[roomId];
    console.log('🔍 Debug Room:', roomId);
    console.log('🔍 Room data:', room);
    console.log('🔍 All rooms:', rooms);
    return room;
  }

  /**
   * Clear all rooms (for testing/debugging)
   */
  clearAllRooms(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.GAME_STATE_KEY);
    console.log('🧹 All rooms cleared');
  }

  /**
   * Force create a room for testing
   */
  forceCreateRoom(roomId: string, playerWallet: string): 'white' {
    const rooms = this.getRooms();
    rooms[roomId] = {
      players: [{ wallet: playerWallet, role: 'white' }],
      escrows: {},
      gameStarted: false,
      created: Date.now()
    };
    this.saveRooms(rooms);
    console.log('🔧 Force created room:', roomId);
    return 'white';
  }

  /**
   * Get all room IDs (for debugging)
   */
  getAllRoomIds(): string[] {
    const rooms = this.getRooms();
    return Object.keys(rooms);
  }

  /**
   * Check if a room exists
   */
  roomExists(roomId: string): boolean {
    const rooms = this.getRooms();
    return roomId in rooms;
  }

  /**
   * Get player count for a room
   */
  getPlayerCount(roomId: string): number {
    const roomStatus = this.getRoomStatus(roomId);
    return roomStatus ? roomStatus.playerCount : 0;
  }

  /**
   * Check if both players have created escrows
   */
  bothEscrowsCreated(roomId: string): boolean {
    const roomStatus = this.getRoomStatus(roomId);
    return roomStatus ? roomStatus.escrowCount === 2 : false;
  }

  /**
   * Check if game has started in a room
   */
  isGameStarted(roomId: string): boolean {
    const roomStatus = this.getRoomStatus(roomId);
    return roomStatus ? roomStatus.gameStarted : false;
  }
}

// Create and export singleton instance
const multiplayerState = new MultiplayerStateManager();

export default multiplayerState;