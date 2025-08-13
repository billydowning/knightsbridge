/**
 * Database Multiplayer State Manager
 * WebSocket-only real-time state management for chess games
 */

import { io, Socket } from 'socket.io-client';
import { GameState } from '../types/chess';

// Types
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

interface RoomStatus {
  roomId: string;
  players: PlayerInfo[];
  escrows: Record<string, number>;
  gameStarted: boolean;
  gameState?: any;
  escrowCount?: number;
  playerCount?: number;
  stakeAmount?: number; // Bet amount set by room creator
  timeLimit?: number; // Time limit in seconds set by room creator
}



interface DatabaseMultiplayerStateHook {
  // Room management
  createRoom: (playerWallet: string, betAmount?: number) => Promise<{ role: 'white' | null; roomId: string | null }>;
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
  debugRoom: (roomId: string) => Promise<RoomStatus | undefined>;
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
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentRoomId: string | null = null;
  private currentPlayerWallet: string | null = null;

  constructor() {
    // Use production backend URL
    this.serverUrl = 'https://knightsbridge-app-35xls.ondigitalocean.app';
  }

  /**
   * Connect to the WebSocket server with robust retry logic
   */
  async connect(): Promise<void> {
    console.log('🔧 CONNECTION DEBUG: connect() called, current socket state:', {
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      isConnecting: this.isConnecting,
      connectionAttempts: this.connectionAttempts
    });
    
    if (this.socket?.connected) {
      console.log('🔧 CONNECTION DEBUG: Socket already connected, returning early');
      return;
    }

    if (this.isConnecting) {
      console.log('🔧 CONNECTION DEBUG: Already connecting, waiting...');
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      throw new Error('Failed to connect to server after maximum attempts');
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log('🔧 CONNECTION DEBUG: Starting new connection attempt', this.connectionAttempts);
      
      // Clean up any existing socket
      if (this.socket) {
        console.log('🔧 CONNECTION DEBUG: Cleaning up existing socket');
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket'], // WebSocket only - no polling fallback
        timeout: 20000, // Increased timeout as recommended
        reconnection: true,
        reconnectionAttempts: 5, // Increased attempts as recommended
        reconnectionDelay: 1000, // Faster initial delay
        reconnectionDelayMax: 10000, // Reasonable max delay
        forceNew: true, // Force new connection as recommended
        autoConnect: true,
        upgrade: false, // Disable upgrade since we're WebSocket only
        rememberUpgrade: false, // Not needed for WebSocket only
        withCredentials: true, // Enable credentials for auth
        // Removed pingTimeout and pingInterval due to linter errors
      });

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.startHeartbeat();
        
        // Notify UI about successful connection
        this.notifyCallbacks('connected', {
          socketId: this.socket?.id,
          timestamp: Date.now()
        });
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        this.stopHeartbeat();
        
        console.log('🔌 WebSocket disconnected:', reason);
        
        // Notify UI about disconnection
        this.notifyCallbacks('disconnected', {
          reason,
          timestamp: Date.now()
        });
        
        // Attempt reconnection for most disconnect reasons (be more aggressive)
        const reconnectReasons = [
          'io server disconnect',
          'transport close', 
          'transport error',
          'ping timeout',
          'io client disconnect'
        ];
        
        if (reconnectReasons.includes(reason) || reason.includes('error') || reason.includes('timeout')) {
          this.connectionAttempts++;
          console.log(`🔄 Attempting reconnection (attempt ${this.connectionAttempts})`);
          
          // Use exponential backoff: 1s, 2s, 4s, 8s, max 15s
          const backoffDelay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 15000);
          
          setTimeout(async () => {
            try {
              await this.connect();
              // After successful reconnection, restore state if we have room context
              this.restoreStateAfterReconnection();
            } catch (error) {
              console.error('❌ Reconnection failed:', error);
            }
          }, backoffDelay);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.startHeartbeat();
        
        // Notify UI about successful reconnection
        this.notifyCallbacks('reconnected', {
          attemptNumber,
          socketId: this.socket?.id,
          timestamp: Date.now()
        });
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        // Notify UI about reconnection attempt
        this.notifyCallbacks('reconnectAttempt', {
          attemptNumber,
          timestamp: Date.now()
        });
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
        
        // Notify UI about reconnection error
        this.notifyCallbacks('reconnectError', {
          error: error.message,
          timestamp: Date.now()
        });
        
        // Don't throw here - let Socket.IO handle retries
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        console.error('❌ Connection error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        this.isConnecting = false;
        
        // Add UI feedback - you can emit this to your React components
        this.notifyCallbacks('connectionError', {
          error: error.message,
          timestamp: Date.now()
        });
        
        // Don't throw here - let Socket.IO handle retries
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        this.isConnecting = false;
        
        // Notify UI about reconnection failure
        this.notifyCallbacks('reconnectFailed', {
          timestamp: Date.now()
        });
      });

      // Game events
      this.socket.on('roomUpdated', (data) => {
        this.notifyCallbacks('roomUpdated', data);
      });

      this.socket.on('escrowUpdated', (data) => {
        this.notifyCallbacks('escrowUpdated', data);
      });

      this.socket.on('gameStarted', (data) => {
        this.notifyCallbacks('gameStarted', data);
      });

      this.socket.on('gameStateUpdated', (data) => {
        this.notifyCallbacks('gameStateUpdated', data);
      });

      this.socket.on('chatMessage', (data) => {
        console.log('🔧 SOCKET DEBUG: chatMessage event received on socket, data:', data);
        console.log('🔧 SOCKET DEBUG: this.callbacks map has these keys:', Array.from(this.callbacks.keys()));
        console.log('🔧 SOCKET DEBUG: chatMessage callbacks count:', this.callbacks.get('chatMessage')?.size || 0);
        this.notifyCallbacks('chatMessage', data);
        console.log('🔧 SOCKET DEBUG: notifyCallbacks called for chatMessage');
      });

      console.log('🔧 CONNECTION DEBUG: All event listeners set up successfully');
      console.log('🔧 CONNECTION DEBUG: Socket instance:', {
        id: this.socket.id,
        connected: this.socket.connected,
        eventNames: this.socket.eventNames()
      });

    } catch (error) {
      console.error('❌ Connection error:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Restore state after reconnection
   */
  private async restoreStateAfterReconnection(): Promise<void> {
    console.log('🔄 Restoring state after reconnection...');
    
    if (this.currentRoomId && this.currentPlayerWallet) {
      try {
        // Rejoin the room
        console.log(`🏠 Rejoining room: ${this.currentRoomId}`);
        if (this.socket) {
          this.socket.emit('joinRoom', { 
            roomId: this.currentRoomId, 
            playerWallet: this.currentPlayerWallet 
          });
        }
        
        // Notify callbacks about state restoration
        this.notifyCallbacks('stateRestored', {
          roomId: this.currentRoomId,
          playerWallet: this.currentPlayerWallet,
          timestamp: Date.now()
        });
        
        console.log('✅ State restored successfully after reconnection');
      } catch (error) {
        console.error('❌ Failed to restore state after reconnection:', error);
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.connectionAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureConnected();
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  async createRoom(playerWallet: string, betAmount?: number, timeLimit?: number): Promise<{ role: 'white' | null; roomId: string | null }> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Create room request timed out'));
        }, 10000); // 10 second timeout

        this.socket.emit('createRoom', { playerWallet, betAmount, timeLimit }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            // Track room and player for state restoration
            this.currentRoomId = response.roomId;
            this.currentPlayerWallet = playerWallet;
            console.log('✅ Room created and context tracked for reliability:', response.roomId);
            resolve({ role: 'white', roomId: response.roomId });
          } else {
            console.error('❌ Failed to create room:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error creating room:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string, playerWallet: string): Promise<'white' | 'black' | null> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Join room request timed out'));
        }, 10000); // 10 second timeout

        this.socket.emit('joinRoom', { roomId, playerWallet }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            // Track room and player for state restoration
            this.currentRoomId = roomId;
            this.currentPlayerWallet = playerWallet;
            console.log('✅ Room joined and context tracked for reliability:', roomId);
            resolve(response.role);
          } else {
            console.error('❌ Failed to join room:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  }

  async getRoomStatus(roomId: string): Promise<RoomStatus | null> {
    try {
      await this.ensureConnected();
      
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
    } catch (error) {
      console.error('❌ Error getting room status:', error);
      return null;
    }
  }

  async addEscrow(roomId: string, playerWallet: string, amount: number): Promise<void> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('addEscrow', { roomId, playerWallet, amount }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            console.error('❌ Failed to add escrow:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      throw error;
    }
  }

  async clearEscrows(roomId: string): Promise<void> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('clearEscrows', { roomId }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            console.error('❌ Failed to clear escrows:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error clearing escrows:', error);
      throw error;
    }
  }

  async saveGameState(roomId: string, gameState: GameState): Promise<void> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('saveGameState', { roomId, gameState }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            console.error('❌ Failed to save game state:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error saving game state:', error);
      throw error;
    }
  }

  async getGameState(roomId: string): Promise<(GameState & { lastUpdated: number }) | null> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        // Add timeout to prevent hanging requests
        const timeout = setTimeout(() => {
          console.warn('⚠️ Game state request timed out for room:', roomId);
          resolve(null);
        }, 5000); // 5 second timeout

        this.socket.emit('getGameState', { roomId }, (response: any) => {
          clearTimeout(timeout);
          if (response && response.success) {
            console.log('✅ Successfully retrieved game state for room:', roomId);
            resolve(response.gameState);
          } else {
            console.warn('⚠️ No game state found for room:', roomId, response?.error || 'Unknown error');
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error getting game state:', error);
      return null;
    }
  }

  async sendChatMessage(roomId: string, message: string, playerWallet: string, playerRole: string): Promise<any> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('sendChatMessage', { roomId, message, playerWallet, playerRole }, (response: any) => {
          if (response.success) {
            resolve(response);
          } else {
            console.error('❌ Failed to send chat message:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw error;
    }
  }

  async getChatMessages(roomId: string): Promise<any> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('getChatMessages', { roomId }, (response: any) => {
          if (response.success) {
            resolve(response.messages);  // 🚛 TOYOTA FIX: Backend returns 'messages', not 'data'
          } else {
            console.error('❌ Failed to get chat messages:', response.error);
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      return [];
    }
  }

  setupRealtimeSync(roomId: string, callback: (data: any) => void): () => void {
    console.log('🔧 SETUP DEBUG: setupRealtimeSync called for room:', roomId);
    const eventTypes = ['roomUpdated', 'escrowUpdated', 'gameStarted', 'gameStateUpdated', 'chatMessage', 'connected'];
    
    console.log('🔧 SETUP DEBUG: Registering callback for event types:', eventTypes);
    console.log('🔧 SETUP DEBUG: Current callbacks map before registration:', 
      Object.fromEntries(Array.from(this.callbacks.entries()).map(([k, v]) => [k, v.size]))
    );
    
    eventTypes.forEach(eventType => {
      if (!this.callbacks.has(eventType)) {
        console.log('🔧 SETUP DEBUG: Creating new callback set for:', eventType);
        this.callbacks.set(eventType, new Set());
      }
      this.callbacks.get(eventType)!.add(callback);
      console.log('🔧 SETUP DEBUG: Added callback for', eventType, '- total callbacks:', this.callbacks.get(eventType)!.size);
    });

    console.log('🔧 SETUP DEBUG: Final callbacks map after registration:', 
      Object.fromEntries(Array.from(this.callbacks.entries()).map(([k, v]) => [k, v.size]))
    );

    // Return cleanup function
    return () => {
      console.log('🔧 CLEANUP DEBUG: Cleaning up callbacks for room:', roomId);
      eventTypes.forEach(eventType => {
        const callbacks = this.callbacks.get(eventType);
        if (callbacks) {
          callbacks.delete(callback);
          console.log('🔧 CLEANUP DEBUG: Removed callback for', eventType, '- remaining:', callbacks.size);
        }
      });
    };
  }

  private notifyCallbacks(eventType: string, data: any): void {
    console.log(`🔧 NOTIFY DEBUG: notifyCallbacks called for eventType: ${eventType}, data:`, data);
    const callbacks = this.callbacks.get(eventType);
    console.log(`🔧 NOTIFY DEBUG: Found ${callbacks?.size || 0} callbacks for eventType: ${eventType}`);
    if (callbacks) {
      let callbackIndex = 0;
      callbacks.forEach(callback => {
        try {
          console.log(`🔧 NOTIFY DEBUG: Calling callback ${callbackIndex} for eventType: ${eventType}`);
          callback({ eventType, data });
          console.log(`🔧 NOTIFY DEBUG: Callback ${callbackIndex} completed successfully for eventType: ${eventType}`);
          callbackIndex++;
        } catch (error) {
          console.error(`❌ Error in callback ${callbackIndex} for eventType ${eventType}:`, error);
        }
      });
    } else {
      console.log(`🔧 NOTIFY DEBUG: No callbacks registered for eventType: ${eventType}`);
    }
  }

  async debugRoom(roomId: string): Promise<RoomStatus | undefined> {
    try {
      const status = await this.getRoomStatus(roomId);
      return status as any;
    } catch (error) {
      console.error('❌ Error debugging room:', error);
      return undefined;
    }
  }

  async clearAllRooms(): Promise<void> {
    try {
      await this.ensureConnected();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Not connected to server'));
          return;
        }

        this.socket.emit('clearAllRooms', {}, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            console.error('❌ Failed to clear rooms:', response.error);
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error clearing rooms:', error);
      throw error;
    }
  }

  getConnectionMode(): string {
    return 'WebSocket-only';
  }
}

// Create singleton instance
const databaseMultiplayerState = new DatabaseMultiplayerStateManager();

// Export the hook
export const useDatabaseMultiplayerState = (): DatabaseMultiplayerStateHook => {
  return {
    createRoom: databaseMultiplayerState.createRoom.bind(databaseMultiplayerState),
    joinRoom: databaseMultiplayerState.joinRoom.bind(databaseMultiplayerState),
    getRoomStatus: databaseMultiplayerState.getRoomStatus.bind(databaseMultiplayerState),
    addEscrow: databaseMultiplayerState.addEscrow.bind(databaseMultiplayerState),
    clearEscrows: databaseMultiplayerState.clearEscrows.bind(databaseMultiplayerState),
    saveGameState: databaseMultiplayerState.saveGameState.bind(databaseMultiplayerState),
    getGameState: databaseMultiplayerState.getGameState.bind(databaseMultiplayerState),
    sendChatMessage: databaseMultiplayerState.sendChatMessage.bind(databaseMultiplayerState),
    getChatMessages: databaseMultiplayerState.getChatMessages.bind(databaseMultiplayerState),
    setupRealtimeSync: databaseMultiplayerState.setupRealtimeSync.bind(databaseMultiplayerState),
    debugRoom: databaseMultiplayerState.debugRoom.bind(databaseMultiplayerState),
    clearAllRooms: databaseMultiplayerState.clearAllRooms.bind(databaseMultiplayerState),
    connect: databaseMultiplayerState.connect.bind(databaseMultiplayerState),
    disconnect: databaseMultiplayerState.disconnect.bind(databaseMultiplayerState),
    isConnected: databaseMultiplayerState.isConnected.bind(databaseMultiplayerState)
  };
};

// Export the instance for direct use
export { databaseMultiplayerState }; 