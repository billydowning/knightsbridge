/**
 * Database Multiplayer State Manager
 * WebSocket-only real-time state management for chess games
 */

import { io, Socket } from 'socket.io-client';

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
}

interface GameState {
  position: Record<string, string>;
  currentPlayer: 'white' | 'black';
  moveHistory: any[];
  gameActive: boolean;
  winner?: 'white' | 'black' | null;
  draw: boolean;
}

interface DatabaseMultiplayerStateHook {
  // Room management
  createRoom: (playerWallet: string) => Promise<{ role: 'white' | null; roomId: string | null }>;
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

  constructor() {
    // Use production backend URL
    this.serverUrl = 'https://knightsbridge-app-35xls.ondigitalocean.app';
    
    console.log('🔌 Initializing WebSocket-only multiplayer state with server:', this.serverUrl);
    
    // Debug environment variables
    console.log('🔍 Environment check - VITE_WS_URL:', import.meta.env.VITE_WS_URL);
    console.log('🔍 Environment check - VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('🔍 Environment check - VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    console.log('🔍 All env vars:', import.meta.env);
    
    // Using production backend URL
    console.log('🔍 Using production backend URL');
  }

  /**
   * Connect to the WebSocket server with robust retry logic
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Already connected to server');
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ Connection already in progress, waiting...');
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('❌ Max WebSocket connection attempts reached');
      throw new Error('Failed to connect to server after maximum attempts');
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log('🔌 Connecting to server:', this.serverUrl, `(attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      
      // Clean up any existing socket
      if (this.socket) {
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
        console.log('✅ Connected to server with ID:', this.socket?.id);
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
        console.log('❌ Disconnected from server:', reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Notify UI about disconnection
        this.notifyCallbacks('disconnected', {
          reason,
          timestamp: Date.now()
        });
        
        // Only attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('🔄 Attempting to reconnect...');
          // Use exponential backoff: 2s, 4s, 8s
          const backoffDelay = Math.min(2000 * Math.pow(2, this.connectionAttempts), 8000);
          setTimeout(() => this.connect(), backoffDelay);
        } else {
          console.log('🛑 Not attempting reconnection for reason:', reason);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
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
        console.log('🔄 Reconnection attempt:', attemptNumber);
        
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
        console.log('📢 Room updated:', data);
        this.notifyCallbacks('roomUpdated', data);
      });

      this.socket.on('escrowUpdated', (data) => {
        console.log('📢 Escrow updated:', data);
        this.notifyCallbacks('escrowUpdated', data);
      });

      this.socket.on('gameStarted', (data) => {
        console.log('📢 Game started:', data);
        this.notifyCallbacks('gameStarted', data);
      });

      this.socket.on('gameStateUpdated', (data) => {
        console.log('📢 Game state updated:', data);
        this.notifyCallbacks('gameStateUpdated', data);
      });

      this.socket.on('chatMessage', (data) => {
        console.log('📢 Chat message:', data);
        this.notifyCallbacks('chatMessage', data);
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

  async createRoom(playerWallet: string): Promise<{ role: 'white' | null; roomId: string | null }> {
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

        this.socket.emit('createRoom', { playerWallet }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            console.log('✅ Room created:', response);
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
            console.log('✅ Joined room:', response);
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
            console.log('✅ Room status:', response.data);
            resolve(response.data);
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
            console.log('✅ Escrow added:', response);
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
            console.log('✅ Escrows cleared:', response);
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
            console.log('✅ Game state saved:', response);
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

        this.socket.emit('getGameState', { roomId }, (response: any) => {
          if (response.success) {
            console.log('✅ Game state retrieved:', response.data);
            resolve(response.data);
          } else {
            console.error('❌ Failed to get game state:', response.error);
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
            console.log('✅ Chat message sent:', response);
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
            console.log('✅ Chat messages retrieved:', response.data);
            resolve(response.data);
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
    const eventTypes = ['roomUpdated', 'escrowUpdated', 'gameStarted', 'gameStateUpdated', 'chatMessage'];
    
    eventTypes.forEach(eventType => {
      if (!this.callbacks.has(eventType)) {
        this.callbacks.set(eventType, new Set());
      }
      this.callbacks.get(eventType)!.add(callback);
    });

    // Return cleanup function
    return () => {
      eventTypes.forEach(eventType => {
        const callbacks = this.callbacks.get(eventType);
        if (callbacks) {
          callbacks.delete(callback);
        }
      });
    };
  }

  private notifyCallbacks(eventType: string, data: any): void {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in callback:', error);
        }
      });
    }
  }

  async debugRoom(roomId: string): Promise<RoomStatus | undefined> {
    try {
      const status = await this.getRoomStatus(roomId);
      console.log('🔍 Debug room status:', status);
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
            console.log('✅ All rooms cleared:', response);
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