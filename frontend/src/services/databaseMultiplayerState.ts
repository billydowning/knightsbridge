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
  private isConnecting: boolean = false; // Add connection state tracking
  private connectionAttempts: number = 0; // Track connection attempts
  private maxConnectionAttempts: number = 3; // Limit connection attempts
  private useHttpFallback: boolean = false; // Flag to use HTTP fallback
  private httpPollingInterval: NodeJS.Timeout | null = null; // HTTP polling interval

  constructor() {
    this.serverUrl = import.meta.env.VITE_WS_URL || 'wss://knightsbridge-production.up.railway.app';
  }

  /**
   * Connect to the WebSocket server with retry logic
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Already connected to server');
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ Connection already in progress, waiting...');
      // Wait for current connection attempt to complete
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Check if we've exceeded max connection attempts
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('❌ Max WebSocket connection attempts reached, switching to HTTP fallback');
      this.useHttpFallback = true;
      this.startHttpPolling();
      return;
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log('🔌 Connecting to server:', this.serverUrl, `(attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      
      // First, check if server is healthy via HTTP
      try {
        const healthResponse = await fetch(`${this.serverUrl.replace('wss://', 'https://')}/health`);
        if (!healthResponse.ok) {
          console.log('⚠️ Server health check failed, switching to HTTP fallback');
          this.useHttpFallback = true;
          this.startHttpPolling();
          return;
        }
        console.log('✅ Server health check passed');
      } catch (error) {
        console.log('⚠️ Server health check failed, switching to HTTP fallback');
        this.useHttpFallback = true;
        this.startHttpPolling();
        return;
      }
      
      // Clean up any existing socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket'], // Only use websocket, not polling
        timeout: 10000, // Reduce timeout for faster failure detection
        reconnection: true,
        reconnectionAttempts: 1, // Reduce attempts to fail faster
        reconnectionDelay: 500, // Faster initial delay
        reconnectionDelayMax: 2000, // Faster max delay
        forceNew: false, // Don't force new connections
        autoConnect: true,
        upgrade: false, // Disable upgrade to prevent connection issues
        rememberUpgrade: false
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server with ID:', this.socket?.id);
        this.isConnecting = false;
        this.connectionAttempts = 0; // Reset on successful connection
        this.useHttpFallback = false; // Disable HTTP fallback
        if (this.httpPollingInterval) {
          clearInterval(this.httpPollingInterval);
          this.httpPollingInterval = null;
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
        this.isConnecting = false;
        
        // If disconnection happens frequently, switch to HTTP fallback
        if (reason === 'transport close' || reason === 'ping timeout' || reason === 'io server disconnect') {
          console.log('🔄 Frequent disconnections detected, switching to HTTP fallback');
          this.useHttpFallback = true;
          this.startHttpPolling();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
        this.isConnecting = false;
        this.connectionAttempts = 0; // Reset on successful reconnection
        this.useHttpFallback = false; // Disable HTTP fallback
        if (this.httpPollingInterval) {
          clearInterval(this.httpPollingInterval);
          this.httpPollingInterval = null;
        }
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
        this.isConnecting = false;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        this.isConnecting = false;
        // Switch to HTTP fallback
        this.useHttpFallback = true;
        this.startHttpPolling();
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        this.isConnecting = false;
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

      // Wait for connection with shorter timeout
      await new Promise<void>((resolve, reject) => {
        if (this.socket) {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 8000); // 8 second timeout

          this.socket.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          this.socket.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        }
      });

      // Start heartbeat to keep connection alive
      this.startHeartbeat();

    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
      this.isConnecting = false;
      
      // If WebSocket fails, switch to HTTP fallback immediately
      console.log('🔄 Switching to HTTP fallback mode');
      this.useHttpFallback = true;
      this.startHttpPolling();
      
      throw error;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (!this.socket) return;

    // Clear any existing heartbeat
    if ((this.socket as any).heartbeatInterval) {
      clearInterval((this.socket as any).heartbeatInterval);
    }

    const heartbeat = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', (response: any) => {
          if (response?.pong) {
            console.log('💓 Heartbeat successful');
          }
        });
      } else {
        console.log('💓 Heartbeat skipped - not connected');
        clearInterval(heartbeat);
      }
    }, 60000); // Send heartbeat every 60 seconds (reduced frequency)

    // Store the interval ID for cleanup
    (this.socket as any).heartbeatInterval = heartbeat;
  }

  /**
   * Start HTTP polling as fallback when WebSocket fails
   */
  private startHttpPolling(): void {
    if (this.httpPollingInterval) {
      clearInterval(this.httpPollingInterval);
    }

    console.log('🔄 Starting HTTP polling fallback');
    this.httpPollingInterval = setInterval(async () => {
      try {
        // Only poll if we have active rooms
        if (this.rooms.size === 0) {
          return;
        }

        console.log('🔄 HTTP polling for', this.rooms.size, 'rooms');
        
        // Poll for room updates every 3 seconds (faster than before)
        for (const [roomId, room] of this.rooms.entries()) {
          try {
            const roomStatus = await this.getRoomStatus(roomId);
            if (roomStatus) {
              console.log('🔄 HTTP poll updated room:', roomId);
              this.notifyCallbacks('roomUpdated', { roomId, room: roomStatus });
            }
          } catch (error) {
            console.error('❌ HTTP polling error for room', roomId, ':', error);
          }
        }
      } catch (error) {
        console.error('❌ HTTP polling error:', error);
      }
    }, 3000); // Poll every 3 seconds (faster for better responsiveness)
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false; // Reset connection state
    if (this.httpPollingInterval) {
      clearInterval(this.httpPollingInterval);
      this.httpPollingInterval = null;
    }
  }

  /**
   * Check if connected to server (including HTTP fallback)
   */
  isConnected(): boolean {
    const connected = this.socket?.connected || this.useHttpFallback;
    console.log('🔍 Connection status - WebSocket:', this.socket?.connected, 'HTTP fallback:', this.useHttpFallback, 'Total:', connected);
    return connected;
  }

  /**
   * Test connection to backend
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      console.log('🧪 Testing backend connection...');
      this.socket.emit('test', { message: 'Hello backend!' }, (response: any) => {
        console.log('🧪 Test response:', response);
        if (response && response.success) {
          console.log('✅ Backend connection test successful');
          resolve(true);
        } else {
          console.error('❌ Backend connection test failed');
          resolve(false);
        }
      });
    });
  }

  /**
   * Check if connected and reconnect if needed
   */
  private async ensureConnected(): Promise<void> {
    if (!this.socket?.connected) {
      console.log('🔌 Not connected, attempting to connect...');
      await this.connect();
    }
  }

  /**
   * Create a new room
   */
  async createRoom(roomId: string, playerWallet: string): Promise<'white' | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    // If using HTTP fallback, use HTTP API
    if (this.useHttpFallback) {
      try {
        const response = await fetch(`${this.serverUrl.replace('wss://', 'https://')}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerWallet })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Room created via HTTP:', roomId);
          return 'white';
        } else {
          throw new Error('Failed to create room via HTTP');
        }
      } catch (error) {
        console.error('❌ HTTP createRoom failed:', error);
        throw error;
      }
    }

    // Use WebSocket if available
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('createRoom', { roomId, playerWallet }, (response: any) => {
        if (response.success) {
          console.log('✅ Room created:', roomId);
          resolve(response.role);
        } else {
          console.error('❌ Failed to create room:', response.error);
          reject(new Error(response.error));
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

    // If using HTTP fallback, use HTTP API
    if (this.useHttpFallback) {
      try {
        const response = await fetch(`${this.serverUrl.replace('wss://', 'https://')}/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerWallet })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Player joined room via HTTP:', roomId, 'player:', playerWallet, 'role:', data.role);
          return data.role;
        } else {
          throw new Error('Failed to join room via HTTP');
        }
      } catch (error) {
        console.error('❌ HTTP joinRoom failed:', error);
        throw error;
      }
    }

    // Add retry mechanism for timing issues
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to join room:`, roomId);
        
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
              console.error(`❌ Failed to join room (attempt ${attempt}):`, response.error);
              reject(new Error(response.error));
            }
          });
        });
      } catch (error) {
        lastError = error as Error;
        console.log(`⚠️ Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All attempts failed
    console.error('❌ All attempts to join room failed');
    throw lastError || new Error('Failed to join room after all retries');
  }

  /**
   * Get current status of a room
   */
  async getRoomStatus(roomId: string): Promise<RoomStatus | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    // If using HTTP fallback, use HTTP API
    if (this.useHttpFallback) {
      try {
        const response = await fetch(`${this.serverUrl.replace('wss://', 'https://')}/api/rooms/${roomId}/status`);
        
        if (response.ok) {
          const data = await response.json();
          return data.roomStatus;
        } else {
          console.error('❌ Failed to get room status via HTTP:', response.status);
          return null;
        }
      } catch (error) {
        console.error('❌ HTTP getRoomStatus failed:', error);
        return null;
      }
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
   * Add escrow for a player
   */
  async addEscrow(roomId: string, playerWallet: string, amount: number): Promise<void> {
    await this.ensureConnected();

    // If using HTTP fallback, use HTTP API
    if (this.useHttpFallback) {
      try {
        const response = await fetch(`${this.serverUrl.replace('wss://', 'https://')}/api/rooms/${roomId}/escrow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerWallet, amount })
        });
        
        if (response.ok) {
          console.log('✅ Escrow added via HTTP:', roomId, 'player:', playerWallet, 'amount:', amount);
          return;
        } else {
          throw new Error('Failed to add escrow via HTTP');
        }
      } catch (error) {
        console.error('❌ HTTP addEscrow failed:', error);
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      console.log('📤 Sending addEscrow event to server...');
      this.socket.emit('addEscrow', { roomId, playerWallet, amount }, (response: any) => {
        console.log('📨 Received addEscrow response:', response);
        if (response.success) {
          console.log('✅ Escrow added successfully');
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

  /**
   * Force HTTP fallback mode (for testing)
   */
  forceHttpFallback(): void {
    console.log('🔄 Forcing HTTP fallback mode');
    this.useHttpFallback = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.startHttpPolling();
  }

  /**
   * Get connection mode for debugging
   */
  getConnectionMode(): string {
    if (this.useHttpFallback) {
      return 'HTTP_FALLBACK';
    } else if (this.socket?.connected) {
      return 'WEBSOCKET';
    } else {
      return 'DISCONNECTED';
    }
  }
}

// Create singleton instance
const databaseMultiplayerState = new DatabaseMultiplayerStateManager();

export default databaseMultiplayerState; 