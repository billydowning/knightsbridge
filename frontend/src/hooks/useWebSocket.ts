import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import type { 
  ChatMessage, 
  GameMove, 
  GameState, 
  PlayerInfo,
  WebSocketEvents 
} from '../services/websocketService';

interface UseWebSocketOptions {
  gameId?: string;
  playerId?: string;
  playerName?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMoveReceived?: (move: GameMove) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onGameStateUpdate?: (state: GameState) => void;
  onPlayerJoined?: (player: PlayerInfo) => void;
  onPlayerDisconnected?: (player: PlayerInfo) => void;
  onGameStarted?: (data: { whitePlayer: string; blackPlayer: string }) => void;
  onGameResigned?: (data: { playerId: string; color: 'white' | 'black'; winner: 'white' | 'black' }) => void;
  onDrawOffered?: (player: PlayerInfo) => void;
  onDrawResponse?: (accepted: boolean) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>({ moves: [], currentTurn: 'white' });
  const [assignedColor, setAssignedColor] = useState<'white' | 'black' | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Connection handlers
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);
    optionsRef.current.onConnect?.();
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    optionsRef.current.onDisconnect?.();
  }, []);

  // Game event handlers
  const handleAssignedColor = useCallback((data: { color: 'white' | 'black'; isTurn: boolean }) => {
    setAssignedColor(data.color);
    setIsMyTurn(data.isTurn);
  }, []);

  const handlePlayerJoined = useCallback((data: PlayerInfo) => {
    optionsRef.current.onPlayerJoined?.(data);
  }, []);

  const handleGameStarted = useCallback((data: { whitePlayer: string; blackPlayer: string }) => {
    optionsRef.current.onGameStarted?.(data);
  }, []);

  const handlePlayerDisconnected = useCallback((data: PlayerInfo) => {
    optionsRef.current.onPlayerDisconnected?.(data);
  }, []);

  // Move handlers
  const handleMoveMade = useCallback((data: GameMove) => {
    setGameState(prev => ({
      ...prev,
      moves: [...prev.moves, data],
      currentTurn: data.nextTurn
    }));
    
    // Update turn status if this move was made by the other player
    if (assignedColor && data.color !== assignedColor) {
      setIsMyTurn(true);
    } else if (assignedColor && data.color === assignedColor) {
      setIsMyTurn(false);
    }
    
    optionsRef.current.onMoveReceived?.(data);
  }, [assignedColor]);

  const handleMoveConfirmed = useCallback((data: { move: GameMove; nextTurn: 'white' | 'black' }) => {
    setGameState(prev => ({
      ...prev,
      currentTurn: data.nextTurn
    }));
    
    setIsMyTurn(data.nextTurn === assignedColor);
  }, [assignedColor]);

  const handleMoveError = useCallback((data: { error: string }) => {
    setError(data.error);
  }, []);

  // Chat handlers
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    optionsRef.current.onChatMessage?.(message);
  }, []);

  const handleChatHistory = useCallback((messages: ChatMessage[]) => {
    setMessages(messages);
  }, []);

  const handleChatError = useCallback((data: { error: string }) => {
    setError(data.error);
  }, []);

  // Game state handlers
  const handleGameState = useCallback((state: GameState) => {
    setGameState(state);
    optionsRef.current.onGameStateUpdate?.(state);
  }, []);

  const handleGameResigned = useCallback((data: { playerId: string; color: 'white' | 'black'; winner: 'white' | 'black' }) => {
    optionsRef.current.onGameResigned?.(data);
  }, []);

  const handleDrawOffered = useCallback((data: PlayerInfo) => {
    optionsRef.current.onDrawOffered?.(data);
  }, []);

  const handleDrawResponse = useCallback((data: { accepted: boolean }) => {
    optionsRef.current.onDrawResponse?.(data.accepted);
  }, []);

  // Setup event listeners
  useEffect(() => {
    websocketService.on('onConnect', handleConnect);
    websocketService.on('onDisconnect', handleDisconnect);
    websocketService.on('onAssignedColor', handleAssignedColor);
    websocketService.on('onPlayerJoined', handlePlayerJoined);
    websocketService.on('onGameStarted', handleGameStarted);
    websocketService.on('onPlayerDisconnected', handlePlayerDisconnected);
    websocketService.on('onMoveMade', handleMoveMade);
    websocketService.on('onMoveConfirmed', handleMoveConfirmed);
    websocketService.on('onMoveError', handleMoveError);
    websocketService.on('onNewMessage', handleNewMessage);
    websocketService.on('onChatHistory', handleChatHistory);
    websocketService.on('onChatError', handleChatError);
    websocketService.on('onGameState', handleGameState);
    websocketService.on('onGameResigned', handleGameResigned);
    websocketService.on('onDrawOffered', handleDrawOffered);
    websocketService.on('onDrawResponse', handleDrawResponse);

    // Set initial connection status
    setIsConnected(websocketService.isConnected());

    return () => {
      websocketService.off('onConnect');
      websocketService.off('onDisconnect');
      websocketService.off('onAssignedColor');
      websocketService.off('onPlayerJoined');
      websocketService.off('onGameStarted');
      websocketService.off('onPlayerDisconnected');
      websocketService.off('onMoveMade');
      websocketService.off('onMoveConfirmed');
      websocketService.off('onMoveError');
      websocketService.off('onNewMessage');
      websocketService.off('onChatHistory');
      websocketService.off('onChatError');
      websocketService.off('onGameState');
      websocketService.off('onGameResigned');
      websocketService.off('onDrawOffered');
      websocketService.off('onDrawResponse');
    };
  }, [handleConnect, handleDisconnect, handleAssignedColor, handlePlayerJoined, handleGameStarted, handlePlayerDisconnected, handleMoveMade, handleMoveConfirmed, handleMoveError, handleNewMessage, handleChatHistory, handleChatError, handleGameState, handleGameResigned, handleDrawOffered, handleDrawResponse]);

  // Join game when gameId is provided
  useEffect(() => {
    if (options.gameId && isConnected) {
      websocketService.joinGame(options.gameId, {
        playerId: options.playerId || '',
        playerName: options.playerName
      });
    }
  }, [options.gameId, options.playerId, options.playerName, isConnected]);

  // Public methods
  const joinGame = useCallback((gameId: string, playerInfo?: { playerId: string; playerName?: string }) => {
    websocketService.joinGame(gameId, playerInfo);
  }, []);

  const makeMove = useCallback((move: { from: string; to: string; piece: string }) => {
    if (!options.gameId || !options.playerId || !assignedColor) {
      setError('Cannot make move: missing game info or color assignment');
      return;
    }
    
    websocketService.makeMove(options.gameId, move, options.playerId, assignedColor);
  }, [options.gameId, options.playerId, assignedColor]);

  const sendMessage = useCallback((message: string) => {
    if (!options.gameId || !options.playerId || !options.playerName) {
      setError('Cannot send message: missing game info or player name');
      return;
    }
    
    websocketService.sendMessage(options.gameId, message, options.playerId, options.playerName);
  }, [options.gameId, options.playerId, options.playerName]);

  const getGameState = useCallback(() => {
    if (!options.gameId) return;
    websocketService.getGameState(options.gameId);
  }, [options.gameId]);

  const getChatHistory = useCallback(() => {
    if (!options.gameId) return;
    websocketService.getChatHistory(options.gameId);
  }, [options.gameId]);

  const playerReady = useCallback(() => {
    if (!options.gameId || !options.playerId || !assignedColor) return;
    websocketService.playerReady(options.gameId, options.playerId, assignedColor);
  }, [options.gameId, options.playerId, assignedColor]);

  const resignGame = useCallback(() => {
    if (!options.gameId || !options.playerId || !assignedColor) return;
    websocketService.resignGame(options.gameId, options.playerId, assignedColor);
  }, [options.gameId, options.playerId, assignedColor]);

  const offerDraw = useCallback(() => {
    if (!options.gameId || !options.playerId || !assignedColor) return;
    websocketService.offerDraw(options.gameId, options.playerId, assignedColor);
  }, [options.gameId, options.playerId, assignedColor]);

  const respondToDraw = useCallback((accepted: boolean) => {
    if (!options.gameId) return;
    websocketService.respondToDraw(options.gameId, accepted);
  }, [options.gameId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // State
    isConnected,
    messages,
    gameState,
    assignedColor,
    isMyTurn,
    error,
    
    // Methods
    joinGame,
    makeMove,
    sendMessage,
    getGameState,
    getChatHistory,
    playerReady,
    resignGame,
    offerDraw,
    respondToDraw,
    clearError,
    clearMessages,
    
    // Direct service access
    websocketService
  };
}; 