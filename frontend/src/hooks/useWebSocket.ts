import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';



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

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId) return;

    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'https://knightsbridgeapp-production.up.railway.app', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
      
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
    });

    // Game events
    newSocket.on('assignedColor', ({ color, isTurn }) => {
      console.log('Assigned color:', color, 'isTurn:', isTurn);
      setAssignedColor(color);
      setIsMyTurn(isTurn);
    });

    newSocket.on('playerJoined', (player) => {
      console.log('Player joined:', player);
      onPlayerJoined?.(player);
    });

    newSocket.on('gameStarted', (gameData) => {
      console.log('Game started:', gameData);
      onGameStarted?.(gameData);
    });

    newSocket.on('moveMade', (moveData) => {
      console.log('Move received:', moveData);
      onMoveReceived?.(moveData);
      setIsMyTurn(moveData.nextTurn === assignedColor);
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
      onChatMessageReceived?.(message);
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
      onGameStateUpdate?.(gameState);
    });

    newSocket.on('playerDisconnected', (player) => {
      console.log('Player disconnected:', player);
      onPlayerDisconnected?.(player);
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
    };
  }, [gameId, playerId, playerName]);

  // Send move
  const sendMove = useCallback((move: any) => {
    if (socket && isConnected) {
      socket.emit('makeMove', {
        gameId,
        move,
        playerId,
        color: assignedColor
      });
    }
  }, [socket, isConnected, gameId, playerId, assignedColor]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', {
        gameId,
        message,
        playerId,
        playerName
      });
    }
  }, [socket, isConnected, gameId, playerId, playerName]);

  // Get game state
  const getGameState = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('getGameState', gameId);
    }
  }, [socket, isConnected, gameId]);

  // Get chat history
  const getChatHistory = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('getChatHistory', gameId);
    }
  }, [socket, isConnected, gameId]);

  // Player ready
  const setPlayerReady = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('playerReady', {
        gameId,
        playerId,
        color: assignedColor
      });
    }
  }, [socket, isConnected, gameId, playerId, assignedColor]);

  // Resign game
  const resignGame = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('resignGame', {
        gameId,
        playerId,
        color: assignedColor
      });
    }
  }, [socket, isConnected, gameId, playerId, assignedColor]);

  // Offer draw
  const offerDraw = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('offerDraw', {
        gameId,
        playerId,
        color: assignedColor
      });
    }
  }, [socket, isConnected, gameId, playerId, assignedColor]);

  // Respond to draw
  const respondToDraw = useCallback((accepted: boolean) => {
    if (socket && isConnected) {
      socket.emit('respondToDraw', {
        gameId,
        accepted
      });
    }
  }, [socket, isConnected, gameId]);

  return {
    socket,
    isConnected,
    assignedColor,
    isMyTurn,
    error,
    sendMove,
    sendChatMessage,
    getGameState,
    getChatHistory,
    setPlayerReady,
    resignGame,
    offerDraw,
    respondToDraw
  };
}; 