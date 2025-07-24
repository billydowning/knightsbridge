import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'draw_offer' | 'resignation';
}

export interface GameMove {
  from: string;
  to: string;
  piece: string;
  playerId: string;
  color: 'white' | 'black';
  timestamp: number;
  nextTurn: 'white' | 'black';
}

export interface PlayerInfo {
  playerId: string;
  color: 'white' | 'black';
}

export interface GameState {
  moves: GameMove[];
  currentTurn: 'white' | 'black';
}

export interface WebSocketEvents {
  // Connection events
  onConnect: () => void;
  onDisconnect: () => void;
  
  // Game events
  onAssignedColor: (data: { color: 'white' | 'black'; isTurn: boolean }) => void;
  onPlayerJoined: (data: PlayerInfo) => void;
  onGameStarted: (data: { whitePlayer: string; blackPlayer: string }) => void;
  onPlayerReady: (data: PlayerInfo) => void;
  onPlayerDisconnected: (data: PlayerInfo) => void;
  
  // Move events
  onMoveMade: (data: GameMove) => void;
  onMoveConfirmed: (data: { move: GameMove; nextTurn: 'white' | 'black' }) => void;
  onMoveError: (data: { error: string }) => void;
  
  // Chat events
  onNewMessage: (message: ChatMessage) => void;
  onChatHistory: (messages: ChatMessage[]) => void;
  onChatError: (data: { error: string }) => void;
  
  // Game state events
  onGameState: (state: GameState) => void;
  onGameResigned: (data: { playerId: string; color: 'white' | 'black'; winner: 'white' | 'black' }) => void;
  onDrawOffered: (data: PlayerInfo) => void;
  onDrawResponse: (data: { accepted: boolean }) => void;
  
  // Connection status
  onPong: () => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Partial<WebSocketEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    // Connect to root domain but specify the path in Socket.IO config
    const serverUrl = 'wss://knightsbridge-app-35xls.ondigitalocean.app';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'], // Allow fallback to polling - no polling
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      upgrade: false, // Disable upgrade to prevent connection issues
      rememberUpgrade: false,
      // Remove custom path - use default Socket.IO path
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.eventHandlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.eventHandlers.onDisconnect?.();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Game events
    this.socket.on('assignedColor', (data) => {
      this.eventHandlers.onAssignedColor?.(data);
    });

    this.socket.on('playerJoined', (data) => {
      this.eventHandlers.onPlayerJoined?.(data);
    });

    this.socket.on('gameStarted', (data) => {
      this.eventHandlers.onGameStarted?.(data);
    });

    this.socket.on('playerReady', (data) => {
      this.eventHandlers.onPlayerReady?.(data);
    });

    this.socket.on('playerDisconnected', (data) => {
      this.eventHandlers.onPlayerDisconnected?.(data);
    });

    // Move events
    this.socket.on('moveMade', (data) => {
      this.eventHandlers.onMoveMade?.(data);
    });

    this.socket.on('moveConfirmed', (data) => {
      this.eventHandlers.onMoveConfirmed?.(data);
    });

    this.socket.on('moveError', (data) => {
      this.eventHandlers.onMoveError?.(data);
    });

    // Chat events
    this.socket.on('newMessage', (message) => {
      this.eventHandlers.onNewMessage?.(message);
    });

    this.socket.on('chatHistory', (messages) => {
      this.eventHandlers.onChatHistory?.(messages);
    });

    this.socket.on('chatError', (data) => {
      this.eventHandlers.onChatError?.(data);
    });

    // Game state events
    this.socket.on('gameState', (state) => {
      this.eventHandlers.onGameState?.(state);
    });

    this.socket.on('gameResigned', (data) => {
      this.eventHandlers.onGameResigned?.(data);
    });

    this.socket.on('drawOffered', (data) => {
      this.eventHandlers.onDrawOffered?.(data);
    });

    this.socket.on('drawResponse', (data) => {
      this.eventHandlers.onDrawResponse?.(data);
    });

    // Connection status
    this.socket.on('pong', () => {
      this.eventHandlers.onPong?.();
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.setupSocket();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Public methods
  public on<T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]) {
    this.eventHandlers[event] = handler;
  }

  public off<T extends keyof WebSocketEvents>(event: T) {
    delete this.eventHandlers[event];
  }

  public joinGame(gameId: string, playerInfo?: { playerId: string; playerName?: string }) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('joinGame', gameId, playerInfo);
  }

  public makeMove(gameId: string, move: { from: string; to: string; piece: string }, playerId: string, color: 'white' | 'black') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('makeMove', { gameId, move, playerId, color });
  }

  public sendMessage(gameId: string, message: string, playerId: string, playerName: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('sendMessage', { gameId, message, playerId, playerName });
  }

  public getGameState(gameId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('getGameState', gameId);
  }

  public getChatHistory(gameId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('getChatHistory', gameId);
  }

  public playerReady(gameId: string, playerId: string, color: 'white' | 'black') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('playerReady', { gameId, playerId, color });
  }

  public resignGame(gameId: string, playerId: string, color: 'white' | 'black') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('resignGame', { gameId, playerId, color });
  }

  public offerDraw(gameId: string, playerId: string, color: 'white' | 'black') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('offerDraw', { gameId, playerId, color });
  }

  public respondToDraw(gameId: string, accepted: boolean) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('respondToDraw', { gameId, accepted });
  }

  public ping() {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('ping');
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService; 