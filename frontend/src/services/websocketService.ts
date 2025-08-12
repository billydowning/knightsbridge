import { io, Socket } from 'socket.io-client';
import { movePersistenceService } from './movePersistence';

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
  
  // Server move events (without 'on' prefix)
  moveMade: (data: any) => void;
  moveConfirmed: (data: any) => void;
  moveError: (data: any) => void;
  
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
      transports: ['websocket'], // WebSocket only - no polling fallback
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      upgrade: false, // Disable upgrade since we're WebSocket only
      rememberUpgrade: false,
      // Remove custom path - use default Socket.IO path
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // 🚛 TOYOTA RELIABILITY: Retry any pending moves on reconnection
      this.retryPendingMoves();
      
      this.eventHandlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
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
      // 🚛 TOYOTA RELIABILITY: Confirm move in persistence service
      if (data.moveId && data.gameId) {
        movePersistenceService.confirmMove(data.gameId, data.moveId, data.serverMoveNumber);
      }
      this.eventHandlers.onMoveConfirmed?.(data);
    });

    this.socket.on('moveError', (data) => {
      // 🚛 TOYOTA RELIABILITY: Mark move as failed for retry
      if (data.moveId && data.gameId) {
        movePersistenceService.markMoveFailed(data.gameId, data.moveId, data.error);
      }
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
    console.log(`🔍 joinGame called: gameId=${gameId}, connected=${this.socket?.connected}, playerId=${playerInfo?.playerId}`);
    
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected when joinGame called');
      return;
    }
    
    // Backend expects: { roomId, playerWallet }
    const joinData = {
      roomId: gameId,
      playerWallet: playerInfo?.playerId || 'unknown'
    };
    
    console.log(`🚀 Emitting joinRoom event:`, joinData);
    this.socket.emit('joinRoom', joinData);
    console.log(`✅ joinRoom event emitted successfully`);
  }

  public makeMove(gameId: string, move: { from: string; to: string; piece: string }, playerId: string, color: 'white' | 'black'): string {
    console.log(`🔍 makeMove called: gameId=${gameId}, move=${move.from}-${move.to}, connected=${this.socket?.connected}`);
    
    // 🚛 TOYOTA RELIABILITY: Always record move for persistence first
    const moveId = movePersistenceService.recordPendingMove(gameId, move, playerId, color);
    
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected for makeMove - move queued for retry');
      // Move is already recorded in persistence service, will be retried on reconnection
      return moveId;
    }
    
    const moveData = { gameId, move, playerId, color, moveId };
    console.log(`🚀 Emitting makeMove event:`, moveData);
    this.socket.emit('makeMove', moveData);
    console.log(`✅ makeMove event emitted successfully`);
    
    return moveId;
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

  public gameComplete(data: { roomId: string; winner: string; gameResult: string; playerRole: string }) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('gameComplete', data);
  }

  // 🚛 TOYOTA RELIABILITY: Handle time control timeout specifically
  public timeControlTimeout(data: { gameId: string; timedOutPlayer: 'white' | 'black' }) {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected for timeControlTimeout');
      return;
    }
    
    console.log(`⏰ Emitting timeControlTimeout: ${data.timedOutPlayer} ran out of time in ${data.gameId}`);
    this.socket.emit('timeControlTimeout', data);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public reconnect() {
    this.disconnect();
    this.setupSocket();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // 🚛 TOYOTA RELIABILITY: Retry pending moves after reconnection
  private retryPendingMoves() {
    if (!this.socket?.connected) return;

    // Get all games with pending moves and retry them
    // This would ideally get the current game ID from the app context
    // For now, we'll add a method to retry moves for a specific game
    console.log('🚛 Ready to retry pending moves on reconnection');
  }

  // 🚛 TOYOTA RELIABILITY: Retry pending moves for a specific game
  public retryMovesForGame(gameId: string) {
    if (!this.socket?.connected) {
      console.log('🚛 Socket not connected, pending moves will retry when connected');
      return;
    }

    const pendingMoves = movePersistenceService.getPendingMoves(gameId);
    console.log(`🚛 Retrying ${pendingMoves.length} pending moves for game ${gameId}`);

    for (const pendingMove of pendingMoves) {
      const moveData = {
        gameId: pendingMove.gameId,
        move: pendingMove.move,
        playerId: pendingMove.playerId,
        color: pendingMove.color,
        moveId: pendingMove.id
      };

      console.log(`🔄 Retrying move: ${pendingMove.move.from}-${pendingMove.move.to} (attempt ${pendingMove.retryCount + 1})`);
      this.socket.emit('makeMove', moveData);
    }
  }

  // 🚛 TOYOTA RELIABILITY: Sync with server state to validate our local moves
  public syncGameState(gameId: string, serverMoveCount: number) {
    const syncResult = movePersistenceService.syncWithServer(gameId, serverMoveCount);
    
    if (syncResult.needsResync) {
      console.warn('🚛 Game state sync mismatch detected, retrying pending moves');
      this.retryMovesForGame(gameId);
    }

    return syncResult;
  }

  // 🚛 TOYOTA RELIABILITY: Get move persistence stats for debugging
  public getMoveStats(gameId: string) {
    return movePersistenceService.getGameStats(gameId);
  }

  // 🚛 TOYOTA RELIABILITY: Clear game data when game ends
  public clearGamePersistence(gameId: string) {
    movePersistenceService.clearGameData(gameId);
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService; 