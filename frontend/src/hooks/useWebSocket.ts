import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebSocketPerformance } from '../utils/performance';
// import { useMemoryCleanup } from '../utils/memoryManager';

interface UseWebSocketProps {
  gameId: string;
  playerId?: string;
  playerName?: string;
  onMoveReceived?: (move: any) => void;
  onChatMessageReceived?: (message: any) => void;
  onGameStateUpdate?: (gameState: any) => void;
  onPlayerJoined?: (player: any) => void;
  onGameStarted?: (gameData: any) => void;
  onPlayerDisconnected?: (player: any) => void;
}

export const useWebSocket = ({
  gameId,
  playerId,
  playerName,
  onMoveReceived,
  onChatMessageReceived,
  onGameStateUpdate,
  onPlayerJoined,
  onGameStarted,
  onPlayerDisconnected
}: UseWebSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [assignedColor, setAssignedColor] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const connectionStartTime = useRef<number>(0);
  const reconnectAttempts = useRef<number>(0);
  
  // Store callback functions in refs to avoid dependency issues
  const onMoveReceivedRef = useRef(onMoveReceived);
  const onChatMessageReceivedRef = useRef(onChatMessageReceived);
  const onGameStateUpdateRef = useRef(onGameStateUpdate);
  const onPlayerJoinedRef = useRef(onPlayerJoined);
  const onGameStartedRef = useRef(onGameStarted);
  const onPlayerDisconnectedRef = useRef(onPlayerDisconnected);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMoveReceivedRef.current = onMoveReceived;
    onChatMessageReceivedRef.current = onChatMessageReceived;
    onGameStateUpdateRef.current = onGameStateUpdate;
    onPlayerJoinedRef.current = onPlayerJoined;
    onGameStartedRef.current = onGameStarted;
    onPlayerDisconnectedRef.current = onPlayerDisconnected;
  }, [onMoveReceived, onChatMessageReceived, onGameStateUpdate, onPlayerJoined, onGameStarted, onPlayerDisconnected]);

  // Performance monitoring
  const { measureConnection, measureMessageLatency, measureReconnection } = useWebSocketPerformance();

  // Memory cleanup
  // useMemoryCleanup(() => {
  //   if (socketRef.current) {
  //     socketRef.current.close();
  //     socketRef.current = null;
  //   }
  // }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId) return;

    connectionStartTime.current = Date.now();
    // Temporarily hardcode the correct URL to bypass environment variable issues
          const newSocket = io('wss://knightsbridge-app-35xls.ondigitalocean.app', {
      transports: ['websocket'], // WebSocket only - no polling fallback
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      upgrade: false, // Disable upgrade to prevent connection issues
      rememberUpgrade: false,
      // Remove custom path - use default Socket.IO path
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
      
      // Measure connection time
      const connectionTime = Date.now() - connectionStartTime.current;
      measureConnection(connectionTime);
      
      // Join the game room
      newSocket.emit('joinGame', gameId, {
        playerId,
        playerName
      });
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setError('Failed to connect to game server');
      
      // Track reconnection attempts
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current > 5) {
        measureReconnection(reconnectAttempts.current, Date.now() - connectionStartTime.current);
      }
    });

    // Game events
    newSocket.on('assignedColor', ({ color, isTurn }) => {
      console.log('Assigned color:', color, 'isTurn:', isTurn);
      setAssignedColor(color);
      setIsMyTurn(isTurn);
    });

    newSocket.on('playerJoined', (player) => {
      console.log('Player joined:', player);
      onPlayerJoinedRef.current?.(player);
    });

    newSocket.on('gameStarted', (gameData) => {
      console.log('Game started:', gameData);
      onGameStartedRef.current?.(gameData);
    });

    newSocket.on('moveMade', (moveData) => {
      console.log('Move received:', moveData);
      const messageTime = Date.now();
      onMoveReceivedRef.current?.(moveData);
      setIsMyTurn(moveData.nextTurn === assignedColor);
      
      // Measure message latency
      if (moveData.timestamp) {
        const latency = messageTime - moveData.timestamp;
        measureMessageLatency(latency);
      }
    });

    newSocket.on('moveConfirmed', (moveData) => {
      console.log('Move confirmed:', moveData);
      setIsMyTurn(moveData.nextTurn === assignedColor);
    });

    newSocket.on('moveError', (error) => {
      console.error('Move error:', error);
      setError(error.error);
    });

    // Chat events
    newSocket.on('newMessage', (message) => {
      console.log('Chat message received:', message);
      onChatMessageReceivedRef.current?.(message);
    });

    newSocket.on('chatHistory', (messages) => {
      console.log('Chat history received:', messages);
      // Handle chat history
    });

    newSocket.on('chatError', (error) => {
      console.error('Chat error:', error);
      setError(error.error);
    });

    // Game state events
    newSocket.on('gameState', (gameState) => {
      console.log('Game state received:', gameState);
      onGameStateUpdateRef.current?.(gameState);
    });

    newSocket.on('playerDisconnected', (player) => {
      console.log('Player disconnected:', player);
      onPlayerDisconnectedRef.current?.(player);
    });

    newSocket.on('gameResigned', (data) => {
      console.log('Game resigned:', data);
      // Handle game resignation
    });

    newSocket.on('drawOffered', (data) => {
      console.log('Draw offered:', data);
      // Handle draw offer
    });

    newSocket.on('drawResponse', (data) => {
      console.log('Draw response:', data);
      // Handle draw response
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [gameId, playerId, playerName, measureConnection, measureMessageLatency, measureReconnection]); // Removed callback functions from dependencies to prevent infinite loops

  // Optimized send functions
  const sendMove = useCallback((from: string, to: string, piece: string) => {
    if (socket && isConnected) {
      const moveData = {
        from,
        to,
        piece,
        timestamp: Date.now()
      };
      socket.emit('makeMove', moveData);
    }
  }, [socket, isConnected]);

  const sendChatMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      const chatData = {
        message,
        timestamp: Date.now(),
        playerId,
        playerName
      };
      socket.emit('sendMessage', chatData);
    }
  }, [socket, isConnected, playerId, playerName]);

  const getChatHistory = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('getChatHistory');
    }
  }, [socket, isConnected]);

  const setPlayerReady = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('playerReady');
    }
  }, [socket, isConnected]);

  const resignGame = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('resignGame');
    }
  }, [socket, isConnected]);

  const offerDraw = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('offerDraw');
    }
  }, [socket, isConnected]);

  const respondToDraw = useCallback((accepted: boolean) => {
    if (socket && isConnected) {
      socket.emit('drawResponse', { accepted });
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    assignedColor,
    isMyTurn,
    error,
    sendMove,
    sendChatMessage,
    getChatHistory,
    setPlayerReady,
    resignGame,
    offerDraw,
    respondToDraw
  };
}; 