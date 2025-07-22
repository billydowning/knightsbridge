/**
 * Database-based Multiplayer State Management
 * Handles room creation, player joining, escrow management, and real-time synchronization
 * Uses WebSocket connections to the backend server for real-time updates
 */

import { io, Socket } from 'socket.io-client';
import type { GameState, Room, RoomStatus, RoomsData, GameStatesData } from '../types/chess';

// TypeScript Interfaces - Re-export for convenience
export type { PlayerRole, Room, RoomStatus, RoomsData, GameStatesData } from '../types/chess';

interface PlayerInfo {
  wallet: string;
  role: 'white' | 'black';
  isReady: boolean;
}

interface GameRoom {
  roomId: string;
  players: PlayerInfo[];
  escrows: Record<string, number>;
  gameStarted: boolean;
  created: number;
  lastUpdated: number;
}

interface DatabaseMultiplayerStateHook {
  // Room management
  createRoom: (roomId: string, playerWallet: string) => Promise<'white' | null>;
  joinRoom: (roomId: string, playerWallet: string) => Promise<'white' | 'black' | null>;
  getRoomStatus: (roomId: string) => Promise<RoomStatus | null>;
  
  // Escrow management
  addEscrow: (roomId: string, playerWallet: string, amount: number) => Promise<void>;
  clearEscrows: (roomId: string) => Promise<void>;
  
  // Game state management
  saveGameState: (roomId: string, gameState: GameState) => Promise<void>;
  getGameState: (roomId: string) => Promise<(GameState & { lastUpdated: number }) | null>;
  
  // Chat management
  sendChatMessage: (roomId: string, message: string, playerWallet: string, playerRole: string) => Promise<any>;
  getChatMessages: (roomId: string) => Promise<any>;
  
  // Real-time sync
  setupRealtimeSync: (roomId: string, callback: (data: any) => void) => () => void;
  
  // Debug utilities
  debugRoom: (roomId: string) => Promise<Room | undefined>;
  clearAllRooms: () => Promise<void>;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
}

class DatabaseMultiplayerStateManager {
  private socket: Socket | null = null;
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();
  private rooms: Map<string, GameRoom> = new Map();
  private serverUrl: string;

  constructor() {
    this.serverUrl = import.meta.env.VITE_WS_URL || 'wss://knightsbridge-production.up.railway.app';
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Already connected to server');
      return;
    }

    try {
      console.log('🔌 Connecting to server:', this.serverUrl);
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server with ID:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Handle room updates
      this.socket.on('roomUpdated', (data: { roomId: string; room: GameRoom }) => {
        console.log('🔄 Room updated:', data.roomId, data.room);
        this.rooms.set(data.roomId, data.room);
        this.notifyCallbacks('roomUpdated', data);
      });

      // Handle game state updates
      this.socket.on('gameStateUpdated', (data: { roomId: string; gameState: GameState }) => {
        console.log('🔄 Game state updated:', data.roomId);
        this.notifyCallbacks('gameStateUpdated', data);
      });

      // Handle escrow updates
      this.socket.on('escrowUpdated', (data: { roomId: string; escrows: Record<string, number> }) => {
        console.log('💰 Escrow updated:', data.roomId, data.escrows);
        this.notifyCallbacks('escrowUpdated', data);
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (this.socket) {
          this.socket.once('connect', () => resolve());
          this.socket.once('connect_error', (error) => reject(error));
        }
      });

    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Create a new room
   */
  async createRoom(roomId: string, playerWallet: string): Promise<'white' | null> {
    if (!this.isConnected()) {
      console.log('🔌 Not connected, connecting first...');
      await this.connect();
    }

    console.log('📡 Emitting createRoom:', { roomId, playerWallet });
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        console.error('❌ No socket available');
        reject(new Error('Not connected to server'));
        return;
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error('❌ createRoom timeout - no response from server');
        reject(new Error('Request timeout - server not responding'));
      }, 10000); // 10 second timeout

      this.socket.emit('createRoom', { roomId, playerWallet }, (response: any) => {
        clearTimeout(timeout);
        console.log('📨 Received createRoom response:', response);
        if (response && response.success) {
          console.log('✅ Room created:', roomId, 'for player:', playerWallet);
          resolve('white');
        } else {
          console.error('❌ Failed to create room:', response?.error || 'No response');
          reject(new Error(response?.error || 'Failed to create room'));
        }
      });
    });
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId: string, playerWallet: string): Promise<'white' | 'black' | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('joinRoom', { roomId, playerWallet }, (response: any) => {
        if (response.success) {
          console.log('✅ Player joined room:', roomId, 'player:', playerWallet, 'role:', response.role);
          resolve(response.role);
        } else {
          console.error('❌ Failed to join room:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Get current status of a room
   */
  async getRoomStatus(roomId: string): Promise<RoomStatus | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('getRoomStatus', { roomId }, (response: any) => {
        if (response.success) {
          resolve(response.roomStatus);
        } else {
          console.error('❌ Failed to get room status:', response.error);
          resolve(null);
        }
      });
    });
  }

  /**
   * Add escrow for a player in a room
   */
  async addEscrow(roomId: string, playerWallet: string, amount: number): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('addEscrow', { roomId, playerWallet, amount }, (response: any) => {
        if (response.success) {
          console.log('✅ Escrow added:', roomId, playerWallet, amount);
          resolve();
        } else {
          console.error('❌ Failed to add escrow:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Clear escrows for a room
   */
  async clearEscrows(roomId: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('clearEscrows', { roomId }, (response: any) => {
        if (response.success) {
          console.log('🔄 Cleared escrows for room:', roomId);
          resolve();
        } else {
          console.error('❌ Failed to clear escrows:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Save game state
   */
  async saveGameState(roomId: string, gameState: GameState): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('saveGameState', { roomId, gameState }, (response: any) => {
        if (response.success) {
          console.log('✅ Game state saved:', roomId);
          resolve();
        } else {
          console.error('❌ Failed to save game state:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Get game state
   */
  async getGameState(roomId: string): Promise<(GameState & { lastUpdated: number }) | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('getGameState', { roomId }, (response: any) => {
        if (response.success) {
          resolve(response.gameState);
        } else {
          console.error('❌ Failed to get game state:', response.error);
          resolve(null);
        }
      });
    });
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(roomId: string, message: string, playerWallet: string, playerRole: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('sendChatMessage', { roomId, message, playerWallet, playerRole }, (response: any) => {
        if (response.success) {
          console.log('✅ Chat message sent:', roomId, message);
          resolve(response);
        } else {
          console.error('❌ Failed to send chat message:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Get chat messages for a room
   */
  async getChatMessages(roomId: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('getChatMessages', { roomId }, (response: any) => {
        if (response.success) {
          console.log('✅ Chat messages retrieved:', roomId);
          resolve(response.messages);
        } else {
          console.error('❌ Failed to get chat messages:', response.error);
          resolve([]); // Return empty array on error
        }
      });
    });
  }

  /**
   * Set up real-time sync for a room
   */
  setupRealtimeSync(roomId: string, callback: (data: any) => void): () => void {
    const eventKey = `room_${roomId}`;
    
    if (!this.callbacks.has(eventKey)) {
      this.callbacks.set(eventKey, new Set());
    }
    
    this.callbacks.get(eventKey)!.add(callback);
    
    // Join the room for real-time updates
    if (this.socket) {
      this.socket.emit('joinRoom', { roomId });
    }
    
    // Return cleanup function
    return () => {
      const callbacks = this.callbacks.get(eventKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(eventKey);
        }
      }
    };
  }

  /**
   * Set up storage sync (compatibility method for transition)
   */
  setupStorageSync(callback: (data: any) => void): () => void {
    // For database-based system, we use real-time sync instead
    // This is a compatibility method for the transition
    console.log('🔄 Setting up real-time sync (database mode)');
    
    // Return a cleanup function that does nothing for now
    return () => {
      console.log('🔄 Cleanup called for storage sync');
    };
  }

  /**
   * Notify all callbacks for an event
   */
  private notifyCallbacks(eventType: string, data: any): void {
    // Notify all callbacks for the specific room
    const roomId = data.roomId;
    const eventKey = `room_${roomId}`;
    const callbacks = this.callbacks.get(eventKey);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in callback:', error);
        }
      });
    }
  }

  /**
   * Debug function to see room state
   */
  async debugRoom(roomId: string): Promise<Room | undefined> {
    const roomStatus = await this.getRoomStatus(roomId);
    if (roomStatus) {
      console.log('🔍 Debug Room:', roomId);
      console.log('🔍 Room status:', roomStatus);
      // Convert RoomStatus to Room by adding missing properties
      return {
        ...roomStatus,
        created: Date.now(),
        lastUpdated: Date.now()
      } as Room;
    }
    return undefined;
  }

  /**
   * Clear all rooms (for testing/debugging)
   */
  async clearAllRooms(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('clearAllRooms', {}, (response: any) => {
        if (response.success) {
          console.log('🧹 All rooms cleared');
          resolve();
        } else {
          console.error('❌ Failed to clear rooms:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }
}

// Create singleton instance
const databaseMultiplayerState = new DatabaseMultiplayerStateManager();

export default databaseMultiplayerState; 