import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useDatabaseMultiplayerState } from './services/databaseMultiplayerState';
import { useSolanaWallet } from './hooks/useSolanaWallet';
import { useScreenSize, useIsMobile, useIsTabletOrSmaller, useChessBoardConfig, useContainerWidth, useLayoutConfig, useTextSizes, useIsLaptopOrLarger, useIsMacBookAir, useIsDesktopLayout } from './utils/responsive';
import { ChessEngine } from './engine/chessEngine';
import { MenuView } from './components/MenuView';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Import our custom modules
import { SOLANA_RPC_ENDPOINT } from './config';
// import { useWebSocket } from './hooks/useWebSocket';
import { databaseMultiplayerState } from './services/databaseMultiplayerState';
import type { ChatMessage } from './components/ChatBox';
import { ENV_CONFIG } from './config/appConfig';
import { useChessOptimizations, useDebounce, useThrottle } from './hooks/useChessOptimizations';
import { useRenderPerformance } from './utils/performance';
// import { useMemoryCleanup } from './utils/memoryManager';
import { performanceMonitor } from './utils/performance';
// import { memoryManager } from './utils/memoryManager';
// ErrorBoundary is defined locally in this file

// Theme context
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  theme: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    shadow: string;
    success: string;
    warning: string;
    info: string;
    error: string;
    successLight: string;
    warningLight: string;
    infoLight: string;
    errorLight: string;
    primaryLight: string;
    successDark: string;
    warningDark: string;
    infoDark: string;
    errorDark: string;
  };
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Types
type AppGameMode = 'menu' | 'lobby' | 'game';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page and try again.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Theme provider component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
    surface: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#2c3e50',
    textSecondary: isDarkMode ? '#b0b0b0' : '#7f8c8d',
    primary: isDarkMode ? '#3498db' : '#3498db',
    secondary: isDarkMode ? '#27ae60' : '#27ae60',
    accent: isDarkMode ? '#e74c3c' : '#e74c3c',
    border: isDarkMode ? '#404040' : '#bdc3c7',
    shadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
    // Additional colors for status indicators
    success: isDarkMode ? '#27ae60' : '#27ae60',
    warning: isDarkMode ? '#f39c12' : '#f39c12',
    info: isDarkMode ? '#3498db' : '#3498db',
    error: isDarkMode ? '#e74c3c' : '#e74c3c',
    // Light variants for backgrounds
    successLight: isDarkMode ? '#1e3a1e' : '#d4edda',
    warningLight: isDarkMode ? '#3d2e1e' : '#fff3cd',
    infoLight: isDarkMode ? '#1e2e3a' : '#e7f3ff',
    errorLight: isDarkMode ? '#3a1e1e' : '#f8d7da',
    primaryLight: isDarkMode ? '#1e2e3a' : '#e3f2fd',
    // Dark variants for text
    successDark: isDarkMode ? '#4ade80' : '#155724',
    warningDark: isDarkMode ? '#fbbf24' : '#856404',
    infoDark: isDarkMode ? '#60a5fa' : '#0c5460',
    errorDark: isDarkMode ? '#f87171' : '#721c24',
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Dark mode toggle button component
const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const isMobile = useIsMobile();
  const isDesktopLayout = useIsDesktopLayout();
  const textSizes = useTextSizes();

  return (
    <button
      onClick={toggleDarkMode}
      style={{
        padding: isDesktopLayout ? '12px 16px' : '6px 8px',
        backgroundColor: theme.surface,
        color: theme.text,
        border: `2px solid ${theme.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: isDesktopLayout ? '16px' : textSizes.small,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: isDesktopLayout ? '8px' : '4px',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
    >
      {isDarkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
};

function ChessApp() {
  const { theme } = useTheme();
  const { publicKey, connected, balance, checkBalance, isLoading } = useSolanaWallet();
  const isMobile = useIsMobile();
  const textSizes = useTextSizes();
  const isLaptopOrLarger = useIsLaptopOrLarger();
  const isMacBookAir = useIsMacBookAir();
  const isDesktopLayout = useIsDesktopLayout();
  
  // Performance monitoring
  useRenderPerformance('ChessApp');

  // App state
  const [gameMode, setGameMode] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [playerRole, setPlayerRole] = useState<'white' | 'black' | null>(null);
  const [escrowCreated, setEscrowCreated] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('Welcome to Knightsbridge Chess!');
  const [winningsClaimed, setWinningsClaimed] = useState<boolean>(false);
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [roomStatus, setRoomStatus] = useState<any>(null);
  
  // Multiplayer state tracking
  const [opponentEscrowCreated, setOpponentEscrowCreated] = useState<boolean>(false);
  const [bothEscrowsReady, setBothEscrowsReady] = useState<boolean>(false);

  // Game state
  const [gameState, setGameState] = useState<any>({
    position: {
      a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
      a2: '♙', b2: '♙', c2: '♙', d2: '♙', e2: '♙', f2: '♙', g2: '♙', h2: '♙',
      a3: '', b3: '', c3: '', d3: '', e3: '', f3: '', g3: '', h3: '',
      a4: '', b4: '', c4: '', d4: '', e4: '', f4: '', g4: '', h4: '',
      a5: '', b5: '', c5: '', d5: '', e5: '', f5: '', g5: '', h5: '',
      a6: '', b6: '', c6: '', d6: '', e6: '', f6: '', g6: '', h6: '',
      a7: '♟', b7: '♟', c7: '♟', d7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
      a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', g8: '♞', h8: '♜'
    },
    currentPlayer: 'white',
    selectedSquare: null,
    gameActive: true,
    winner: null,
    draw: false,
    moveHistory: [],
    lastUpdated: Date.now(),
    castlingRights: 'KQkq',
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    inCheck: false,
    inCheckmate: false,
    lastMove: null
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Performance optimizations
  const {
    legalMoves,
    isInCheck,
    isCheckmate,
    isStalemate,
    // validateMove, // Commented out to avoid conflict
    getLegalMovesForSquare,
    hasMoveChanged,
    gameStatus: chessGameStatus
  } = useChessOptimizations(gameState);

  // Debounced and throttled values
  const debouncedGameState = useDebounce(gameState, 300);
  const throttledRoomStatus = useThrottle(roomStatus, 100);

  // Memory cleanup
  // useMemoryCleanup(() => {
  //   // Cleanup game state references
  //   setGameState(null as any);
  //   setChatMessages([]);
  //   setRoomStatus(null);
  // }, []);

  // Memoized helper functions
  const handleOpponentMove = useCallback((moveData: any) => {
    console.log('Handling opponent move:', moveData);
    // Apply the opponent's move to the local game state
    const { from, to, piece } = moveData.move;
    
    setGameState((prev: any) => {
      const newPosition = { ...prev.position };
      newPosition[to as keyof typeof newPosition] = newPosition[from as keyof typeof newPosition];
      newPosition[from as keyof typeof newPosition] = '';
      
      return {
        ...prev,
        position: newPosition,
        currentPlayer: prev.currentPlayer === 'white' ? 'black' : 'white',
        lastMove: { from, to, piece },
        lastUpdated: Date.now()
      };
    });
  }, []);

  const applyMovesToGameState = useCallback((moves: any[]) => {
    console.log('Applying moves to game state:', moves);
    // Reset to initial position
    const initialPosition = {
      a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
      a2: '♙', b2: '♙', c2: '♙', d2: '♙', e2: '♙', f2: '♙', g2: '♙', h2: '♙',
      a3: '', b3: '', c3: '', d3: '', e3: '', f3: '', g3: '', h3: '',
      a4: '', b4: '', c4: '', d4: '', e4: '', f4: '', g4: '', h4: '',
      a5: '', b5: '', c5: '', d5: '', e5: '', f5: '', g5: '', h5: '',
      a6: '', b6: '', c6: '', d6: '', e6: '', f6: '', g6: '', h6: '',
      a7: '♟', b7: '♟', c7: '♟', d7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
      a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', g8: '♞', h8: '♜'
    };
    
    let currentPosition = { ...initialPosition };
    let currentPlayer = 'white';
    
    moves.forEach((move: any) => {
      currentPosition[move.to as keyof typeof currentPosition] = currentPosition[move.from as keyof typeof currentPosition];
      currentPosition[move.from as keyof typeof currentPosition] = '';
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    });
    
    setGameState((prev: any) => ({
      ...prev,
      position: currentPosition,
      currentPlayer,
      moveHistory: moves,
      lastUpdated: Date.now()
    }));
  }, []);

  // WebSocket hook for real-time game communication (DISABLED - using databaseMultiplayerState instead)
  // const {
  //   sendMove,
  //   sendChatMessage: wsSendChatMessage
  // } = useWebSocket({
  //   gameId: roomId,
  //   playerId: publicKey?.toString(),
  //   playerName: publicKey?.toString().slice(0, 6) + '...' + publicKey?.toString().slice(-4),
  //   onMoveReceived: handleOpponentMove,
  //   onChatMessageReceived: (message) => {
  //     console.log('Chat message received via WebSocket:', message);
  //     setChatMessages(prev => [...prev, {
  //       id: message.id,
  //       player: message.playerName,
  //       message: message.message,
  //       timestamp: new Date(message.timestamp)
  //     }]);
  //   },
  //   onGameStateUpdate: applyMovesToGameState,
  //   onPlayerJoined: (player) => {
  //     console.log('Player joined via WebSocket:', player);
  //     setGameStatus(`Opponent joined! Game starting...`);
  //   },
  //   onGameStarted: (gameData) => {
  //     console.log('Game started via WebSocket:', gameData);
  //     setGameMode('game');
  //     setGameStatus('Game started!');
  //   },
  //   onPlayerDisconnected: (player) => {
  //     console.log('Player disconnected via WebSocket:', player);
  //     setGameStatus('Opponent disconnected. Game paused.');
  //   }
  // });
  
  // Placeholder functions for sendMove and wsSendChatMessage
  const sendMove = () => {
    console.log('sendMove called - using databaseMultiplayerState instead');
  };
  
  const wsSendChatMessage = () => {
    console.log('wsSendChatMessage called - using databaseMultiplayerState instead');
  };

  // Update game status when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      setGameStatus(`Wallet connected: ${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`);
      // Only call checkBalance if it's available and not already in progress
      if (checkBalance && typeof checkBalance === 'function') {
        checkBalance();
      }
    } else if (!connected) {
      setGameStatus('Please connect your wallet to start');
    }
  }, [connected, publicKey]); // Removed checkBalance from dependencies to prevent infinite loops

  // Update game status when balance changes
  useEffect(() => {
    if (connected && balance > 0) {
      setGameStatus(`Balance: ${balance.toFixed(3)} SOL`);
    }
  }, [balance, connected]);

  // Check if both escrows are ready and start game
  useEffect(() => {
    if (bothEscrowsReady && gameMode === 'lobby') {
      console.log('💰 Both escrows ready!');
      console.log('🎮 Both escrows ready, starting game automatically...');
      
      // Check room status to confirm game should start
      fetchRoomStatus().then(() => {
        console.log('🔍 Debug - Room status:', roomStatus);
        console.log('🔍 Debug - Both escrows ready:', bothEscrowsReady);
        console.log('🔍 Debug - Game mode:', gameMode);
        console.log('🔍 Debug - Player role:', playerRole);
        
        // Set a small delay to ensure all state updates are processed
        setTimeout(() => {
          setGameMode('game');
          setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
        }, 1000); // Reduced delay
      });
    }
  }, [bothEscrowsReady, gameMode, playerRole, roomId]);

  // Watch for room status changes and set bothEscrowsReady when both escrows are present
  useEffect(() => {
    if (roomStatus && gameMode === 'lobby') {
      console.log('🔍 DEBUG - Room status received:', roomStatus);
      console.log('🔍 DEBUG - Escrow count:', roomStatus.escrowCount);
      console.log('🔍 DEBUG - Player count:', roomStatus.playerCount);
      console.log('🔍 DEBUG - Players:', roomStatus.players);
      console.log('🔍 DEBUG - Escrows:', roomStatus.escrows);
      
      if (roomStatus.escrowCount >= 2) {
        console.log('💰 Room status shows both escrows ready, setting bothEscrowsReady to true');
        setBothEscrowsReady(true);
      }
    }
  }, [roomStatus, gameMode]);

  // Set up multiplayer sync when room ID or game mode changes
  useEffect(() => {
    if (roomId && gameMode === 'lobby') {
      console.log('🔄 Setting up multiplayer sync for room:', roomId, 'mode:', gameMode);
      
      // Only join room when in lobby mode, not when transitioning to game mode
      if (databaseMultiplayerState.isConnected()) {
        const socket = (databaseMultiplayerState as any).socket;
        if (socket && publicKey) {
          const playerWallet = publicKey.toString();
          socket.emit('joinRoom', { roomId, playerWallet });
        }
      }
    }
  }, [roomId, gameMode]);

  // Add a flag to prevent infinite loops and track last saved state
  const [isReceivingServerUpdate, setIsReceivingServerUpdate] = useState<boolean>(false);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Function to send console logs to backend for debugging
  const sendLogToBackend = (level: string, message: string, data?: any) => {
    if (databaseMultiplayerState.isConnected()) {
      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        socket.emit('clientLog', {
          level,
          message,
          data,
          timestamp: Date.now(),
          roomId,
          playerRole
        });
      }
    }
  };

  // Save game state to database when it changes (but not on every change)
  useEffect(() => {
    if (roomId && gameMode === 'game' && gameState.gameActive && !isReceivingServerUpdate) {
      // Create a hash of the current game state to detect meaningful changes
      const stateHash = JSON.stringify({
        position: gameState.position,
        currentPlayer: gameState.currentPlayer,
        moveHistory: gameState.moveHistory,
        winner: gameState.winner,
        draw: gameState.draw,
        inCheck: gameState.inCheck,
        inCheckmate: gameState.inCheckmate
      });
      
      // Only save if the state has actually changed and we're not currently receiving an update
      if (stateHash !== lastSavedState && !isReceivingServerUpdate) {
        // Additional check: don't save if this looks like the initial state being broadcast back
        const isInitialState = gameState.moveHistory.length === 0 && 
                              gameState.currentPlayer === 'white' && 
                              !gameState.winner && 
                              !gameState.draw &&
                              !gameState.inCheck &&
                              !gameState.inCheckmate;
        
        if (isInitialState && (playerRole === 'white' || playerRole === 'black')) {
          console.log('🔄 Skipping save - this appears to be initial state broadcast back to player');
          sendLogToBackend('info', 'Skipping save - initial state broadcast back to player', { playerRole });
          return;
        }
        
        // Additional check: don't save if we just made a move (it's already being saved)
        const hasRecentMove = gameState.lastMove && 
                             (Date.now() - gameState.lastUpdated) < 1000;
        
        if (hasRecentMove) {
          console.log('🔄 Skipping save - recent move already being saved');
          sendLogToBackend('info', 'Skipping save - recent move already being saved', { lastMove: gameState.lastMove });
          return;
        }
        
        // Additional check: don't save if we're in the middle of processing a server update
        if (isReceivingServerUpdate) {
          console.log('🔄 Skipping save - currently processing server update');
          sendLogToBackend('info', 'Skipping save - currently processing server update');
          return;
        }
        
        // Clear any existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        
        // Debounce the save operation with longer delay
        const timeout = setTimeout(() => {
          console.log('💾 Saving game state to database for sync');
          sendLogToBackend('info', 'Saving game state to database for sync', { 
            currentPlayer: gameState.currentPlayer,
            moveHistoryLength: gameState.moveHistory?.length || 0,
            lastMove: gameState.lastMove
          });
          setLastSavedState(stateHash);
          databaseMultiplayerState.saveGameState(roomId, gameState).catch(error => {
            console.error('Error saving game state:', error);
            sendLogToBackend('error', 'Error saving game state', { error: error.message });
          });
        }, 800); // Increased debounce to 800ms
        
        setSaveTimeout(timeout);
      } else if (isReceivingServerUpdate) {
        console.log('🔄 Skipping save - currently receiving server update');
      } else if (stateHash === lastSavedState) {
        console.log('🔄 Skipping save - state unchanged');
      }
    }
  }, [gameState.position, gameState.currentPlayer, gameState.moveHistory, gameState.winner, gameState.draw, gameState.inCheck, gameState.inCheckmate, gameState.lastMove, gameState.lastUpdated, roomId, gameMode, isReceivingServerUpdate, lastSavedState, saveTimeout, playerRole]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Reset game state when game starts
  useEffect(() => {
    if (gameMode === 'game') {
      console.log('🎮 Game mode changed to game, resetting game state...');
      console.log('🎮 Player role:', playerRole);
      console.log('🎮 Room ID:', roomId);
      
      // Set up the board with standard chess piece positions
      // Both players see the same board layout, but the orientation flips the view
      const position = {
        a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
        a2: '♙', b2: '♙', c2: '♙', d2: '♙', e2: '♙', f2: '♙', g2: '♙', h2: '♙',
        a3: '', b3: '', c3: '', d3: '', e3: '', f3: '', g3: '', h3: '',
        a4: '', b4: '', c4: '', d4: '', e4: '', f4: '', g4: '', h4: '',
        a5: '', b5: '', c5: '', d5: '', e5: '', f5: '', g5: '', h5: '',
        a6: '', b6: '', c6: '', d6: '', e6: '', f6: '', g6: '', h6: '',
        a7: '♟', b7: '♟', c7: '♟', d7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
        a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', g8: '♞', h8: '♜'
      };
      
      const newGameState = {
        position,
        currentPlayer: 'white' as 'white' | 'black',
        selectedSquare: null,
        gameActive: true,
        winner: null,
        draw: false,
        moveHistory: [],
        lastUpdated: Date.now(),
        castlingRights: 'KQkq',
        enPassantTarget: null,
        halfmoveClock: 0,
        fullmoveNumber: 1,
        inCheck: false,
        inCheckmate: false,
        lastMove: null
      };
      
      setGameState(newGameState);
      console.log('🎮 Game started with player role:', playerRole, 'initial currentPlayer:', newGameState.currentPlayer);
      console.log('🎮 Initial game state set:', newGameState);
      
      // Save initial game state to database (only the first player to do so)
      if (roomId) {
        // Only the white player should save the initial state
        if (playerRole === 'white') {
          console.log('💾 White player saving initial game state to database');
          // Set the flag to prevent immediate re-save when server broadcasts
          setIsReceivingServerUpdate(true);
          // Set the last saved state immediately to prevent duplicate saves
          const initialStateHash = JSON.stringify({
            position: newGameState.position,
            currentPlayer: newGameState.currentPlayer,
            moveHistory: newGameState.moveHistory,
            winner: newGameState.winner,
            draw: newGameState.draw,
            inCheck: newGameState.inCheck,
            inCheckmate: newGameState.inCheckmate
          });
          setLastSavedState(initialStateHash);
          
          databaseMultiplayerState.saveGameState(roomId, newGameState).catch(error => {
            console.error('❌ Error saving initial game state:', error);
          }).finally(() => {
            // Keep the flag set for longer to prevent the broadcast from triggering a save
            setTimeout(() => {
              setIsReceivingServerUpdate(false);
            }, 3000); // Increased to 3 seconds to ensure broadcast is handled
          });
        } else {
          console.log('🔄 Black player waiting for white player to save initial state');
        }
      }
    }
  }, [gameMode, playerRole, roomId]);

  const handleCreateEscrow = async () => {
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }
    
    if (!roomId) {
      setGameStatus('No room ID available');
      return;
    }
    
    try {
      const playerWallet = publicKey.toString();
      
      // Log room status before creating escrow
      console.log('🔍 Room status BEFORE creating escrow:');
      const beforeStatus = await databaseMultiplayerState.getRoomStatus(roomId);
      console.log('📊 Before escrow - Room status:', beforeStatus);
      
      await databaseMultiplayerState.addEscrow(roomId, playerWallet, betAmount);
      
      // Update local state to show escrow was created
      setEscrowCreated(true);
      
      setGameStatus(`Escrow created! Bet: ${betAmount} SOL. Waiting for opponent...`);
      console.log('✅ Escrow created successfully');
      
      // Log room status after creating escrow
      console.log('🔍 Room status AFTER creating escrow:');
      const afterStatus = await databaseMultiplayerState.getRoomStatus(roomId);
      console.log('📊 After escrow - Room status:', afterStatus);
      
      // Check if both players have created escrows
      if (afterStatus && afterStatus.escrowCount >= 2) {
        setBothEscrowsReady(true);
        console.log('💰 Both escrows ready!');
      }
      
    } catch (error) {
      console.error('Error creating escrow:', error);
      setGameStatus(`Error creating escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSquareClick = (square: string) => {
    console.log('🎯 Square clicked:', square);
    console.log('🎯 Game mode:', gameMode);
    console.log('🎯 Room ID:', roomId);
    console.log('🎯 Current player:', gameState.currentPlayer);
    console.log('🎯 Player role:', playerRole);
    console.log('🎯 Selected square:', gameState.selectedSquare);
    
    if (!roomId || gameMode !== 'game') {
      console.log('❌ Cannot make move - no room ID or not in game mode');
      return;
    }
    
    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerRole) {
      console.log('❌ Not your turn - current player:', gameState.currentPlayer, 'your role:', playerRole);
      return;
    }
    
    // If no square is selected, select this square if it has a piece
    if (!gameState.selectedSquare) {
      const piece = gameState.position[square];
      console.log('🎯 Piece on square:', piece);
      if (piece) {
        const pieceColor = ChessEngine.getPieceColor(piece);
        console.log('🎯 Piece color:', pieceColor, 'current player:', gameState.currentPlayer);
        if (pieceColor === gameState.currentPlayer) {
          console.log('✅ Selecting square:', square);
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          return;
        } else {
          console.log('❌ Cannot select opponent piece');
        }
      } else {
        console.log('❌ No piece on square');
      }
      return;
    }
    
    // If a square is selected, try to move
    const fromSquare = gameState.selectedSquare;
    const toSquare = square;
    console.log('🎯 Attempting move from', fromSquare, 'to', toSquare);
    
    // Validate move using existing function
    if (validateLocalMove(gameState.position, fromSquare, toSquare, gameState.currentPlayer)) {
      console.log('✅ Move is valid, executing...');
      
      // Create new position by making the move
      const newPosition = { ...gameState.position };
      newPosition[toSquare] = newPosition[fromSquare];
      newPosition[fromSquare] = '';
      
      const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      const nextPlayerInCheck = isKingInCheck(newPosition, nextPlayer);
      const nextPlayerInCheckmate = detectCheckmate(newPosition, nextPlayer);
      
      console.log('🔍 Move Analysis:');
      console.log('  - Current player:', gameState.currentPlayer);
      console.log('  - Next player:', nextPlayer);
      console.log('  - Next player in check:', nextPlayerInCheck);
      console.log('  - Next player in checkmate:', nextPlayerInCheckmate);
      
      // Determine winner if checkmate occurs
      const winner = nextPlayerInCheckmate ? gameState.currentPlayer : null;
      console.log('  - Winner:', winner);
      
      // Create updated game state
      const updatedGameState = {
        ...gameState,
        position: newPosition,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        lastMove: { from: fromSquare, to: toSquare },
        inCheck: nextPlayerInCheck,
        inCheckmate: nextPlayerInCheckmate,
        winner: winner,
        gameActive: winner ? false : gameState.gameActive,
        lastUpdated: Date.now()
      };
      
      console.log('📊 Updated Game State:');
      console.log('  - inCheck:', updatedGameState.inCheck);
      console.log('  - inCheckmate:', updatedGameState.inCheckmate);
      console.log('  - winner:', updatedGameState.winner);
      console.log('  - gameActive:', updatedGameState.gameActive);
      console.log('  - currentPlayer:', updatedGameState.currentPlayer);
      console.log('  - lastUpdated:', updatedGameState.lastUpdated);
      
      // Set flag to prevent receiving server updates during this operation
      setIsReceivingServerUpdate(true);
      
      // Save to database FIRST (single source of truth)
      databaseMultiplayerState.saveGameState(roomId, updatedGameState)
        .then(() => {
          console.log('✅ Game state saved to database');
          console.log('🔄 Turn changed from', gameState.currentPlayer, 'to', nextPlayer);
          
          // Update local state AFTER successful database save
          setGameState(updatedGameState);
          
          // Reset the receiving flag after a longer delay to ensure server broadcast is processed
          setTimeout(() => {
            setIsReceivingServerUpdate(false);
            console.log('✅ Move completed and synchronized');
          }, 500); // Increased delay to 500ms
        })
        .catch(error => {
          console.error('❌ Failed to save game state:', error);
          setGameStatus('Error saving move. Please try again.');
          // Reset the receiving flag on error
          setIsReceivingServerUpdate(false);
        });
    } else {
      console.log('❌ Move is invalid');
      // Invalid move - just update selection
      const piece = gameState.position[square];
      if (piece) {
        const pieceColor = ChessEngine.getPieceColor(piece);
        if (pieceColor === gameState.currentPlayer) {
          console.log('✅ Selecting new square:', square);
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
        } else {
          console.log('❌ Cannot select opponent piece, clearing selection');
          setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        }
      } else {
        console.log('❌ No piece on square, clearing selection');
        setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
      }
    }
  };

  const handleClaimWinnings = async () => {
    console.log('Claiming winnings...');
    
    try {
      // For now, simulate claiming winnings without blockchain
      // In production, this would call the actual Solana program
      setWinningsClaimed(true);
      setGameStatus('Winnings claimed successfully!');
      console.log('✅ Winnings claimed successfully');
      
    } catch (err) {
      console.error('❌ Claiming winnings failed:', err);
      setGameStatus('Failed to claim winnings. Please try again.');
    }
  };

  const handleJoinRoom = async () => {
    if (!publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    const playerWallet = publicKey.toString();
    console.log('🎯 handleJoinRoom called with roomId:', roomId, 'playerWallet:', playerWallet);

    try {
      setGameStatus('Connecting to game...');
      setAppLoading(true);

      // If roomId is empty, we're creating a new room
      if (!roomId.trim()) {
        console.log('🏗️ Creating new room...');
        
        // Create the room (backend will generate room ID)
        const result = await databaseMultiplayerState.createRoom(playerWallet);
        if (result.role && result.roomId) {
          setPlayerRole(result.role);
          setRoomId(result.roomId);
          setGameMode('lobby');
          setGameStatus(`Room created! Share Room ID: ${result.roomId} with your opponent`);
          
          // Get room status using the new room ID
          const roomStatus = await databaseMultiplayerState.getRoomStatus(result.roomId);
          console.log('📊 Room status:', roomStatus);
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
            console.log('✅ Found existing escrow for current player');
          } else {
            console.log('❌ No existing escrow found for current player');
            console.log('🔍 Room status escrows:', roomStatus?.escrows);
            console.log('🔍 Player wallet:', playerWallet);
            console.log('🔍 Escrow check:', roomStatus?.escrows?.[playerWallet]);
          }
        } else {
          setGameStatus('Failed to create room');
        }
      } else {
        // Joining an existing room
        console.log('🔌 Joining existing room:', roomId);
        const role = await databaseMultiplayerState.joinRoom(roomId, playerWallet);
        if (role) {
          setPlayerRole(role);
          setGameMode('lobby');
          setGameStatus(`Joined room as ${role}`);
          
          // Get room status using the current room ID
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          console.log('📊 Room status:', roomStatus);
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
            console.log('✅ Found existing escrow for current player');
          } else {
            console.log('❌ No existing escrow found for current player');
            console.log('🔍 Room status escrows:', roomStatus?.escrows);
            console.log('🔍 Player wallet:', playerWallet);
            console.log('🔍 Escrow check:', roomStatus?.escrows?.[playerWallet]);
          }
        } else {
          setGameStatus('Failed to join room');
        }
      }

    } catch (error) {
      console.error('❌ Error joining room:', error);
      setGameStatus(`Error: ${error.message}`);
    } finally {
      setAppLoading(false);
    }
  };

  const handleStartGame = () => {
    console.log('Starting game...');
    setGameMode('game');
    setGameStatus('Game started!');
  };

  const handleResignGame = async () => {
    console.log('Resigning game...');
    setGameStatus('Game resigned');
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
    setRoomId('');
    setPlayerRole(null);
    setEscrowCreated(false);
    setWinningsClaimed(false);
    setOpponentEscrowCreated(false);
    setBothEscrowsReady(false);
    setGameStatus('Welcome to Knightsbridge Chess!');
  };

  // Test backend connection
  const handleTestConnection = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      const isWorking = await databaseMultiplayerState.testConnection();
      if (isWorking) {
        setGameStatus('✅ Backend connection successful!');
      } else {
        setGameStatus('❌ Backend connection failed!');
      }
    } catch (error) {
      console.error('❌ Connection test error:', error);
      setGameStatus(`❌ Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to detect checkmate
  const detectCheckmate = (position: any, currentPlayer: string): boolean => {
    console.log('🔍 Checking for checkmate...');
    console.log('Position:', position);
    console.log('Current player:', currentPlayer);
    
    // First, check if the king is in check
    const isInCheck = isKingInCheck(position, currentPlayer);
    if (!isInCheck) {
      console.log('✅ King is not in check, no checkmate');
      return false;
    }
    
    // Find the king of the current player
    const kingSymbol = currentPlayer === 'white' ? '♔' : '♚';
    let kingSquare = null;
    
    // Find the king's position
    for (const square in position) {
      if (position[square] === kingSymbol) {
        kingSquare = square;
        break;
      }
    }
    
    if (!kingSquare) {
      console.log('🏆 CHECKMATE DETECTED! King was captured!');
      return true;
    }
    
    console.log('King square:', kingSquare);
    console.log('⚠️ King is in check, checking if it can escape...');
    
    // Check if king can escape
    const canEscape = checkIfKingCanEscape(position, kingSquare, currentPlayer);
    if (!canEscape) {
      console.log('🏆 CHECKMATE DETECTED! King is trapped!');
      return true;
    }
    
    console.log('✅ King can escape, no checkmate');
    return false;
  };
  

  
  // Helper function to check if king can escape
  const checkIfKingCanEscape = (position: any, kingSquare: string, currentPlayer: string): boolean => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    const kingFile = kingSquare[0];
    const kingRank = parseInt(kingSquare[1]);
    
    // Check all 8 possible king moves (including diagonals)
    const possibleMoves = [
      { file: kingFile.charCodeAt(0) - 1, rank: kingRank - 1 }, // a1
      { file: kingFile.charCodeAt(0), rank: kingRank - 1 },     // b1
      { file: kingFile.charCodeAt(0) + 1, rank: kingRank - 1 }, // c1
      { file: kingFile.charCodeAt(0) - 1, rank: kingRank },     // a2
      { file: kingFile.charCodeAt(0) + 1, rank: kingRank },     // c2
      { file: kingFile.charCodeAt(0) - 1, rank: kingRank + 1 }, // a3
      { file: kingFile.charCodeAt(0), rank: kingRank + 1 },     // b3
      { file: kingFile.charCodeAt(0) + 1, rank: kingRank + 1 }  // c3
    ];
    
    for (const move of possibleMoves) {
      // Check if move is within board bounds
      if (move.file >= 'a'.charCodeAt(0) && move.file <= 'h'.charCodeAt(0) && 
          move.rank >= 1 && move.rank <= 8) {
        
        const targetSquare = String.fromCharCode(move.file) + move.rank;
        const targetPiece = position[targetSquare];
        
        // Check if square is empty or contains opponent piece
        const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
        const isOwnPiece = targetPiece && whitePieces.includes(targetPiece) === (currentPlayer === 'white');
        
        if (!isOwnPiece) {
          // Simulate the king move and check if it would still be in check
          const simulatedPosition = { ...position };
          simulatedPosition[targetSquare] = simulatedPosition[kingSquare];
          simulatedPosition[kingSquare] = '';
          
          const wouldStillBeInCheck = isKingInCheck(simulatedPosition, currentPlayer);
          if (!wouldStillBeInCheck) {
            console.log(`✅ King can escape to ${targetSquare}`);
            return true;
          } else {
            console.log(`❌ King cannot escape to ${targetSquare} - still in check`);
          }
        }
      }
    }
    
    console.log('❌ King cannot escape');
    return false;
  };
  
  // Helper function to validate chess moves
  const validateLocalMove = (position: any, fromSquare: string, toSquare: string, currentPlayer: string): boolean => {
    const piece = position[fromSquare];
    if (!piece) return false;
    
    // Check if piece belongs to current player
    const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const pieceColor = whitePieces.includes(piece) ? 'white' : 'black';
    if (pieceColor !== currentPlayer) return false;
    
    // Check if destination square is occupied by own piece
    const targetPiece = position[toSquare];
    if (targetPiece) {
      const targetColor = whitePieces.includes(targetPiece) ? 'white' : 'black';
      if (targetColor === currentPlayer) return false;
    }
    
    // Basic move validation (simplified)
    const fromFile = fromSquare[0];
    const fromRank = parseInt(fromSquare[1]);
    const toFile = toSquare[0];
    const toRank = parseInt(toSquare[1]);
    
    const fileDiff = Math.abs(fromFile.charCodeAt(0) - toFile.charCodeAt(0));
    const rankDiff = Math.abs(fromRank - toRank);
    
    // Pawn moves
    if (piece === '♙' || piece === '♟') {
      const direction = piece === '♙' ? 1 : -1;
      const startRank = piece === '♙' ? 2 : 7;
      
      // Forward move
      if (fileDiff === 0 && toRank === fromRank + direction) {
        return !targetPiece;
      }
      // Initial two-square move
      if (fileDiff === 0 && fromRank === startRank && toRank === fromRank + 2 * direction) {
        const middleRank = fromRank + direction;
        const middleSquare = fromFile + middleRank;
        return !targetPiece && !position[middleSquare];
      }
      // Capture move
      if (fileDiff === 1 && rankDiff === 1) {
        return targetPiece && targetPiece !== (currentPlayer === 'white' ? '♙' : '♟');
      }
      return false;
    }
    
    // King moves
    if (piece === '♔' || piece === '♚') {
      return fileDiff <= 1 && rankDiff <= 1;
    }
    
    // Queen moves
    if (piece === '♕' || piece === '♛') {
      return (fileDiff === 0 || rankDiff === 0 || fileDiff === rankDiff) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Rook moves
    if (piece === '♖' || piece === '♜') {
      return (fileDiff === 0 || rankDiff === 0) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Bishop moves
    if (piece === '♗' || piece === '♝') {
      return fileDiff === rankDiff && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Knight moves
    if (piece === '♘' || piece === '♞') {
      return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
    }
    
    return false;
  };
  
  // Helper function to check if path is blocked
  const isPathBlocked = (position: any, fromSquare: string, toSquare: string): boolean => {
    const fromFile = fromSquare[0];
    const fromRank = parseInt(fromSquare[1]);
    const toFile = toSquare[0];
    const toRank = parseInt(toSquare[1]);
    
    const fileStep = fromFile === toFile ? 0 : (toFile.charCodeAt(0) > fromFile.charCodeAt(0) ? 1 : -1);
    const rankStep = fromRank === toRank ? 0 : (toRank > fromRank ? 1 : -1);
    
    let currentFile = fromFile.charCodeAt(0) + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile.charCodeAt(0) || currentRank !== toRank) {
      const square = String.fromCharCode(currentFile) + currentRank;
      if (position[square]) return true;
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return false;
  };
  
  // Helper function to check if king is in check
  const isKingInCheck = (position: any, currentPlayer: string): boolean => {
    const kingSymbol = currentPlayer === 'white' ? '♔' : '♚';
    let kingSquare = null;
    
    // Find the king
    for (const square in position) {
      if (position[square] === kingSymbol) {
        kingSquare = square;
        break;
      }
    }
    
    if (!kingSquare) return false;
    
    // Check if any opponent piece can attack the king
    const opponentPieces = currentPlayer === 'white' ? ['♚', '♛', '♜', '♝', '♞', '♟'] : ['♔', '♕', '♖', '♗', '♘', '♙'];
    
    for (const square in position) {
      const piece = position[square];
      if (opponentPieces.includes(piece)) {
        // Simple check: can this piece attack the king?
        if (canPieceAttackSquare(position, square, kingSquare, piece, currentPlayer === 'white' ? 'black' : 'white')) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Helper function to check if a piece can attack a square (without circular dependency)
  const canPieceAttackSquare = (position: any, fromSquare: string, toSquare: string, piece: string, pieceColor: string): boolean => {
    const fromFile = fromSquare[0];
    const fromRank = parseInt(fromSquare[1]);
    const toFile = toSquare[0];
    const toRank = parseInt(toSquare[1]);
    
    const fileDiff = Math.abs(fromFile.charCodeAt(0) - toFile.charCodeAt(0));
    const rankDiff = Math.abs(fromRank - toRank);
    
    // Pawn attacks
    if (piece === '♙' || piece === '♟') {
      const direction = piece === '♙' ? 1 : -1;
      return fileDiff === 1 && toRank === fromRank + direction;
    }
    
    // King attacks
    if (piece === '♔' || piece === '♚') {
      return fileDiff <= 1 && rankDiff <= 1;
    }
    
    // Queen attacks
    if (piece === '♕' || piece === '♛') {
      return (fileDiff === 0 || rankDiff === 0 || fileDiff === rankDiff) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Rook attacks
    if (piece === '♖' || piece === '♜') {
      return (fileDiff === 0 || rankDiff === 0) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Bishop attacks
    if (piece === '♗' || piece === '♝') {
      return fileDiff === rankDiff && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Knight attacks
    if (piece === '♘' || piece === '♞') {
      return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
    }
    
    return false;
  };
  


  // Helper function to simulate opponent moves
  const simulateOpponentMove = (position: any, currentPlayer: string) => {
    // Define pieces for the current player
    const pawnSymbol = currentPlayer === 'white' ? '♙' : '♟';
    const knightSymbol = currentPlayer === 'white' ? '♘' : '♞';
    const bishopSymbol = currentPlayer === 'white' ? '♗' : '♝';
    const rookSymbol = currentPlayer === 'white' ? '♖' : '♜';
    const queenSymbol = currentPlayer === 'white' ? '♕' : '♛';
    const kingSymbol = currentPlayer === 'white' ? '♔' : '♚';
    
    // Try to find any valid move for the opponent
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    // First, try to move any pawn forward
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = position[square];
        
        if (piece === pawnSymbol) {
          // Calculate forward direction
          const direction = currentPlayer === 'white' ? 1 : -1;
          const currentRank = parseInt(rank);
          const nextRank = currentRank + direction;
          
          if (nextRank >= 1 && nextRank <= 8) {
            const nextSquare = file + nextRank.toString();
            if (position[nextSquare] === '') {
              return { from: square, to: nextSquare };
            }
          }
        }
      }
    }
    
    // If no pawn moves, try knight moves
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = position[square];
        
        if (piece === knightSymbol) {
          // Try knight moves (L-shaped)
          const knightMoves = [
            { fileOffset: 2, rankOffset: 1 },
            { fileOffset: 2, rankOffset: -1 },
            { fileOffset: -2, rankOffset: 1 },
            { fileOffset: -2, rankOffset: -1 },
            { fileOffset: 1, rankOffset: 2 },
            { fileOffset: 1, rankOffset: -2 },
            { fileOffset: -1, rankOffset: 2 },
            { fileOffset: -1, rankOffset: -2 }
          ];
          
          const fileIndex = files.indexOf(file);
          const rankIndex = ranks.indexOf(rank);
          
          for (const move of knightMoves) {
            const newFileIndex = fileIndex + move.fileOffset;
            const newRankIndex = rankIndex + move.rankOffset;
            
            if (newFileIndex >= 0 && newFileIndex < 8 && newRankIndex >= 0 && newRankIndex < 8) {
              const newSquare = files[newFileIndex] + ranks[newRankIndex];
              if (position[newSquare] === '') {
                return { from: square, to: newSquare };
              }
            }
          }
        }
      }
    }
    
    // If no knight moves, try bishop moves
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = position[square];
        
        if (piece === bishopSymbol) {
          // Try diagonal moves
          const directions = [
            { fileOffset: 1, rankOffset: 1 },
            { fileOffset: 1, rankOffset: -1 },
            { fileOffset: -1, rankOffset: 1 },
            { fileOffset: -1, rankOffset: -1 }
          ];
          
          const fileIndex = files.indexOf(file);
          const rankIndex = ranks.indexOf(rank);
          
          for (const direction of directions) {
            for (let distance = 1; distance <= 7; distance++) {
              const newFileIndex = fileIndex + (direction.fileOffset * distance);
              const newRankIndex = rankIndex + (direction.rankOffset * distance);
              
              if (newFileIndex >= 0 && newFileIndex < 8 && newRankIndex >= 0 && newRankIndex < 8) {
                const newSquare = files[newFileIndex] + ranks[newRankIndex];
                if (position[newSquare] === '') {
                  return { from: square, to: newSquare };
                } else {
                  break; // Stop if we hit a piece
                }
              } else {
                break; // Stop if we go off the board
              }
            }
          }
        }
      }
    }
    
    // If no bishop moves, try rook moves
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = position[square];
        
        if (piece === rookSymbol) {
          // Try horizontal and vertical moves
          const directions = [
            { fileOffset: 1, rankOffset: 0 },
            { fileOffset: -1, rankOffset: 0 },
            { fileOffset: 0, rankOffset: 1 },
            { fileOffset: 0, rankOffset: -1 }
          ];
          
          const fileIndex = files.indexOf(file);
          const rankIndex = ranks.indexOf(rank);
          
          for (const direction of directions) {
            for (let distance = 1; distance <= 7; distance++) {
              const newFileIndex = fileIndex + (direction.fileOffset * distance);
              const newRankIndex = rankIndex + (direction.rankOffset * distance);
              
              if (newFileIndex >= 0 && newFileIndex < 8 && newRankIndex >= 0 && newRankIndex < 8) {
                const newSquare = files[newFileIndex] + ranks[newRankIndex];
                if (position[newSquare] === '') {
                  return { from: square, to: newSquare };
                } else {
                  break; // Stop if we hit a piece
                }
              } else {
                break; // Stop if we go off the board
              }
            }
          }
        }
      }
    }
    
    // If no other moves, try king moves
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = position[square];
        
        if (piece === kingSymbol) {
          // Try king moves (one square in any direction)
          const directions = [
            { fileOffset: 1, rankOffset: 0 },
            { fileOffset: -1, rankOffset: 0 },
            { fileOffset: 0, rankOffset: 1 },
            { fileOffset: 0, rankOffset: -1 },
            { fileOffset: 1, rankOffset: 1 },
            { fileOffset: 1, rankOffset: -1 },
            { fileOffset: -1, rankOffset: 1 },
            { fileOffset: -1, rankOffset: -1 }
          ];
          
          const fileIndex = files.indexOf(file);
          const rankIndex = ranks.indexOf(rank);
          
          for (const direction of directions) {
            const newFileIndex = fileIndex + direction.fileOffset;
            const newRankIndex = rankIndex + direction.rankOffset;
            
            if (newFileIndex >= 0 && newFileIndex < 8 && newRankIndex >= 0 && newRankIndex < 8) {
              const newSquare = files[newFileIndex] + ranks[newRankIndex];
              if (position[newSquare] === '') {
                return { from: square, to: newSquare };
              }
            }
          }
        }
      }
    }
    
    return null; // No valid move found
  };

  const handleStartNewGameWithEscrow = () => {
    console.log('🎮 Starting new game...');
    
    // Reset all game state
    setGameState({
      position: {
        a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
        a2: '♙', b2: '♙', c2: '♙', d2: '♙', e2: '♙', f2: '♙', g2: '♙', h2: '♙',
        a3: '', b3: '', c3: '', d3: '', e3: '', f3: '', g3: '', h3: '',
        a4: '', b4: '', c4: '', d4: '', e4: '', f4: '', g4: '', h4: '',
        a5: '', b5: '', c5: '', d5: '', e5: '', f5: '', g5: '', h5: '',
        a6: '', b6: '', c6: '', d6: '', e6: '', f6: '', g6: '', h6: '',
        a7: '♟', b7: '♟', c7: '♟', d7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
        a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', g8: '♞', h8: '♜'
      },
      currentPlayer: 'white',
      selectedSquare: null,
      moveHistory: [],
      lastMove: null,
      gameActive: true,
      winner: null,
      draw: false,
      inCheck: false,
      inCheckmate: false,
      lastUpdated: Date.now()
    });
    
    // Reset game state flags
    setWinningsClaimed(false);
    setEscrowCreated(false);
    setOpponentEscrowCreated(false);
    setBothEscrowsReady(false);
    setChatMessages([]);
    
    // Generate new room ID for the new game
    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setRoomId(newRoomId);
    
    // Clear any existing game state from database
    if (roomId) {
      // Database cleanup is handled by the backend
      console.log('🗑️ Clearing game state for room:', roomId);
    }
    
    // Set game mode back to lobby to start fresh
    setGameMode('lobby');
    setGameStatus('New game room created! Join with the new room ID.');
    
    console.log('🎮 New game started with room:', newRoomId);
  };

  const handleDeclareWinner = (winner: 'white' | 'black') => {
    console.log('🧪 Testing: Declaring winner:', winner);
    const updatedGameState = {
      ...gameState,
      winner,
      gameActive: false,
      lastUpdated: Date.now()
    };
    setGameState(updatedGameState);
    setGameStatus(`${winner} wins! (Testing mode)`);
    
    // Save game state to database for multiplayer sync
    if (roomId) {
      console.log('💾 Saving winner declaration to database');
      databaseMultiplayerState.saveGameState(roomId, updatedGameState);
    }
  };
  
  const handleTestCheckmate = () => {
    console.log('🧪 Testing checkmate detection...');
    
    // Create a simple checkmate position
    const checkmatePosition = {
      a1: '♔', b1: '', c1: '', d1: '', e1: '', f1: '', g1: '', h1: '',
      a2: '', b2: '', c2: '', d2: '', e2: '', f2: '', g2: '', h2: '',
      a3: '', b3: '', c3: '', d3: '', e3: '', f3: '', g3: '', h3: '',
      a4: '', b4: '', c4: '', d4: '', e4: '', f4: '', g4: '', h4: '',
      a5: '', b5: '', c5: '', d5: '', e5: '', f5: '', g5: '', h5: '',
      a6: '', b6: '', c6: '', d6: '', e6: '', f6: '', g6: '', h6: '',
      a7: '', b7: '', c7: '', d7: '', e7: '', f7: '', g7: '', h7: '',
      a8: '♚', b8: '', c8: '', d8: '', e8: '', f8: '', g8: '', h8: ''
    };
    
    // Add pieces to create checkmate
    checkmatePosition.b2 = '♕'; // White queen attacking black king
    checkmatePosition.c3 = '♖'; // White rook supporting
    
    console.log('🧪 Checkmate position created:', checkmatePosition);
    
    // Test check detection first
    const whiteInCheck = isKingInCheck(checkmatePosition, 'white');
    const blackInCheck = isKingInCheck(checkmatePosition, 'black');
    
    console.log('🧪 Check detection test:', {
      whiteInCheck,
      blackInCheck
    });
    
    // Test checkmate detection
    const whiteCheckmate = detectCheckmate(checkmatePosition, 'white');
    const blackCheckmate = detectCheckmate(checkmatePosition, 'black');
    
    console.log('🧪 Checkmate test results:', {
      whiteCheckmate,
      blackCheckmate
    });
    
    if (blackCheckmate) {
      setGameState((prev: any) => ({
        ...prev,
        position: checkmatePosition,
        winner: 'white',
        gameActive: false
      }));
      setGameStatus('🏆 Test checkmate: White wins!');
    } else {
      setGameStatus('❌ Test checkmate: No checkmate detected');
    }
  };
  
  const handleTestCurrentBoard = () => {
    console.log('🧪 Testing current board state...');
    console.log('Current position:', gameState.position);
    console.log('Current player:', gameState.currentPlayer);
    
    // Test basic move validation
    console.log('🧪 Testing basic move validation...');
    const testMoves = [
      { from: 'e2', to: 'e4', piece: '♙', player: 'white' },
      { from: 'e7', to: 'e5', piece: '♟', player: 'black' },
      { from: 'g1', to: 'f3', piece: '♘', player: 'white' }
    ];
    
    testMoves.forEach(move => {
      const isValid = validateLocalMove(gameState.position, move.from, move.to, move.player);
      console.log(`Move ${move.from} to ${move.to} (${move.piece}): ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });
    
    // Test check detection for both players
    const whiteInCheck = isKingInCheck(gameState.position, 'white');
    const blackInCheck = isKingInCheck(gameState.position, 'black');
    
    // Test checkmate detection for both players
    const whiteCheckmate = detectCheckmate(gameState.position, 'white');
    const blackCheckmate = detectCheckmate(gameState.position, 'black');
    
    console.log('🧪 Current board analysis:', {
      whiteInCheck,
      blackInCheck,
      whiteCheckmate,
      blackCheckmate,
      currentPlayer: gameState.currentPlayer
    });
    
    if (whiteCheckmate) {
      setGameState((prev: any) => ({
        ...prev,
        winner: 'black',
        gameActive: false
      }));
      setGameStatus('🏆 Black wins! (White king checkmated)');
    } else if (blackCheckmate) {
      setGameState((prev: any) => ({
        ...prev,
        winner: 'white',
        gameActive: false
      }));
      setGameStatus('🏆 White wins! (Black king checkmated)');
    } else if (whiteInCheck) {
      setGameStatus('⚠️ White king is in check!');
    } else if (blackInCheck) {
      setGameStatus('⚠️ Black king is in check!');
    } else {
      setGameStatus('✅ No check or checkmate detected on current board');
    }
  };

  // Chat functions
  const handleSendChatMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: playerRole,
      playerName: playerRole,
      message,
      timestamp: Date.now()
    };
    
    console.log('💬 Sending chat message:', newMessage);
    
    // Add message to local state immediately for UI responsiveness
    setChatMessages(prev => [...prev, newMessage]);
    
    // Send via database system
    if (roomId && publicKey) {
      databaseMultiplayerState.sendChatMessage(roomId, message, publicKey.toString(), playerRole)
        .then((response) => {
          if (response.success) {
            console.log('✅ Chat message sent successfully');
          } else {
            console.error('❌ Failed to send chat message:', response.error);
            // Remove the message from local state if it failed
            setChatMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
          }
        })
        .catch(error => {
          console.error('❌ Error sending chat message:', error);
          // Remove the message from local state if it failed
          setChatMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
        });
    }
  };

  // Load chat messages from database
  useEffect(() => {
    if (roomId) {
      console.log('📥 Loading chat messages from database for room:', roomId);
      databaseMultiplayerState.getChatMessages(roomId)
        .then((messages) => {
          if (messages && Array.isArray(messages)) {
            // Convert timestamp strings back to numbers
            const messagesWithTimestamps = messages.map((msg: any) => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp
            }));
            setChatMessages(messagesWithTimestamps);
            console.log('✅ Loaded', messagesWithTimestamps.length, 'chat messages');
          }
        })
        .catch(error => {
          console.error('Error loading chat messages:', error);
        });
    }
  }, [roomId]);

  // Fetch room status
  const fetchRoomStatus = useCallback(async () => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      try {
        console.log('🔍 fetchRoomStatus called for room:', roomId);
        const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        console.log('🔍 DEBUG - fetchRoomStatus returned:', roomStatus);
        console.log('🔍 DEBUG - roomStatus.playerCount:', roomStatus?.playerCount);
        console.log('🔍 DEBUG - roomStatus.escrowCount:', roomStatus?.escrowCount);
        console.log('🔍 DEBUG - roomStatus.players:', roomStatus?.players);
        console.log('🔍 DEBUG - roomStatus.escrows:', roomStatus?.escrows);
        
        if (roomStatus) {
          setRoomStatus(roomStatus);
          console.log('✅ Room status updated:', roomStatus);
        }
      } catch (error) {
        console.error('Error fetching room status:', error);
      }
    }
  }, [roomId]);

  // Fetch room status when entering lobby
  useEffect(() => {
    if (gameMode === 'lobby' && roomId) {
      fetchRoomStatus();
    }
  }, [gameMode, roomId, fetchRoomStatus]);

  // Listen for real-time chat messages
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleChatMessage = (message: any) => {
        console.log('💬 Received real-time chat message:', message);
        setChatMessages(prev => [...prev, {
          ...message,
          timestamp: typeof message.timestamp === 'string' ? new Date(message.timestamp).getTime() : message.timestamp
        }]);
      };

      // Listen for chat message events
      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        console.log('🔗 Setting up chat message listener for room:', roomId);
        socket.on('chatMessageReceived', handleChatMessage);
        
        return () => {
          console.log('🔗 Removing chat message listener for room:', roomId);
          socket.off('chatMessageReceived', handleChatMessage);
        };
      }
    }
  }, [roomId]);

  // Listen for escrow updates and refresh room status
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleEscrowUpdate = () => {
        console.log('💰 Escrow updated, refreshing room status');
        fetchRoomStatus();
      };

      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        socket.on('escrowUpdated', handleEscrowUpdate);
        
        return () => {
          socket.off('escrowUpdated', handleEscrowUpdate);
        };
      }
    }
  }, [roomId, fetchRoomStatus]);

  // Listen for game state updates
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleGameStateUpdated = (data: any) => {
        console.log('📢 Game state updated event received:', data);
        
        // Skip if this is our own broadcast
        const currentSocketId = (databaseMultiplayerState as any).socket?.id;
        console.log('🔍 Socket ID comparison - Current:', currentSocketId, 'Sender:', data.senderId);
        
        if (data.senderId && currentSocketId === data.senderId) {
          console.log('🔄 Skipping own broadcast');
          return;
        }
        
        if (data.gameState && gameMode === 'game') {
          console.log('🎮 Updating game state from server:', data.gameState);
          console.log('🔍 Current local state:', gameState);
          console.log('🔍 Received state currentPlayer:', data.gameState.currentPlayer);
          console.log('🔍 Local state currentPlayer:', gameState.currentPlayer);
          
          // Check if this is a meaningful state update (not just a duplicate)
          const localStateHash = JSON.stringify({
            position: gameState.position,
            currentPlayer: gameState.currentPlayer,
            moveHistory: gameState.moveHistory,
            winner: gameState.winner,
            draw: gameState.draw,
            inCheck: gameState.inCheck,
            inCheckmate: gameState.inCheckmate
          });
          
          const receivedStateHash = JSON.stringify({
            position: data.gameState.position,
            currentPlayer: data.gameState.currentPlayer,
            moveHistory: data.gameState.moveHistory,
            winner: data.gameState.winner,
            draw: data.gameState.draw,
            inCheck: data.gameState.inCheck,
            inCheckmate: data.gameState.inCheckmate
          });
          
          // Check if the received state is newer than our local state
          const localTimestamp = gameState.lastUpdated || 0;
          const receivedTimestamp = data.gameState.lastUpdated || 0;
          
          console.log('🔍 Timestamp comparison - Local:', localTimestamp, 'Received:', receivedTimestamp);
          
          // Only update if the state has actually changed AND the received state is newer
          if (localStateHash !== receivedStateHash && receivedTimestamp >= localTimestamp) {
            console.log('🔄 State has changed and is newer, updating from server');
            console.log('🔍 Updating from currentPlayer:', gameState.currentPlayer, 'to:', data.gameState.currentPlayer);
            
            sendLogToBackend('info', 'State has changed and is newer, updating from server', {
              fromPlayer: gameState.currentPlayer,
              toPlayer: data.gameState.currentPlayer,
              localTimestamp,
              receivedTimestamp
            });
            
            // Set flag to prevent saving back to server
            setIsReceivingServerUpdate(true);
            
            // Update game state
            setGameState(data.gameState);
            
            // Reset flag after a longer delay to ensure state has settled
            // Use longer delay for black player to avoid race conditions
            const delay = playerRole === 'black' ? 1200 : 800;
            setTimeout(() => {
              setIsReceivingServerUpdate(false);
              // Update the last saved state to match the new state to prevent re-save
              const newStateHash = JSON.stringify({
                position: data.gameState.position,
                currentPlayer: data.gameState.currentPlayer,
                moveHistory: data.gameState.moveHistory,
                winner: data.gameState.winner,
                draw: data.gameState.draw,
                inCheck: data.gameState.inCheck,
                inCheckmate: data.gameState.inCheckmate
              });
              setLastSavedState(newStateHash);
              console.log('🔄 Server update processing completed');
              sendLogToBackend('info', 'Server update processing completed', { delay });
            }, delay);
          } else if (localStateHash !== receivedStateHash && receivedTimestamp < localTimestamp) {
            console.log('🔄 Received state is older than local state, ignoring update');
          } else {
            console.log('🔄 Received state is identical to local state, skipping update');
          }
        }
      };

      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        socket.on('gameStateUpdated', handleGameStateUpdated);
        
        return () => {
          socket.off('gameStateUpdated', handleGameStateUpdated);
        };
      }
    }
  }, [roomId, gameMode]);

  // Listen for game started event
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleGameStarted = (data: any) => {
        console.log('🎮 Game started event received:', data);
        setGameMode('game');
        // Reset game state for new game
        setGameState({
          position: {
            'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
            'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook',
            'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
            'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
            'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
            'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn',
            'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
            'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook'
          },
          currentPlayer: 'white',
          selectedSquare: null,
          gameActive: true,
          winner: null,
          draw: false,
          moveHistory: [],
          lastUpdated: Date.now(),
          castlingRights: 'KQkq',
          enPassantTarget: null,
          halfmoveClock: 0,
          fullmoveNumber: 1,
          inCheck: false,
          inCheckmate: false
        });
      };

      const handleRoomUpdated = (data: any) => {
        console.log('📢 Room updated event received:', data);
        // Check if game state is active as a fallback for gameStarted event
        if (data.gameState === 'active' && gameMode === 'lobby') {
          console.log('🎮 Game state is active, switching to game mode');
          setGameMode('game');
          // Reset game state for new game
          setGameState({
            position: {
              'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
              'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook',
              'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
              'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
              'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
              'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn',
              'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
              'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook'
            },
            currentPlayer: 'white',
            selectedSquare: null,
            gameActive: true,
            winner: null,
            draw: false,
            moveHistory: [],
            lastUpdated: Date.now(),
            castlingRights: 'KQkq',
            enPassantTarget: null,
            halfmoveClock: 0,
            fullmoveNumber: 1,
            inCheck: false,
            inCheckmate: false
          });
        }
      };

      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        socket.on('gameStarted', handleGameStarted);
        socket.on('roomUpdated', handleRoomUpdated);
        
        return () => {
          socket.off('gameStarted', handleGameStarted);
          socket.off('roomUpdated', handleRoomUpdated);
        };
      }
    }
  }, [roomId, gameMode]);

  // Check game state when reconnecting to handle missed events
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const checkGameState = async () => {
        try {
          const gameState = await databaseMultiplayerState.getGameState(roomId);
          if (gameState && gameState.gameActive) {
            console.log('🎮 Game is already active, switching to game mode');
            setGameMode('game');
          }
        } catch (error) {
          console.error('Error checking game state:', error);
        }
      };

      // Check game state when connection is established
      const socket = (databaseMultiplayerState as any).socket;
      if (socket) {
        socket.on('connect', checkGameState);
        
        return () => {
          socket.off('connect', checkGameState);
        };
      }
    }
  }, [roomId]);

  // Poll for game state changes when in lobby (fallback for missed WebSocket events)
  useEffect(() => {
    if (gameMode === 'lobby' && roomId) {
      // Disable polling to prevent connection issues - rely only on WebSocket events
      console.log('⏳ Polling disabled to prevent connection issues');
      
      // Only use WebSocket events for game state updates
      return () => {
        // Cleanup if needed
      };
    }
  }, [gameMode, roomId]);

  // Render based on game mode
  const renderContent = () => {
    switch (gameMode) {
      case 'menu':
        return (
          <MenuView
            onJoinRoom={handleJoinRoom}
            roomId={roomId}
            setRoomId={setRoomId}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            balance={balance}
            connected={connected}
            isLoading={appLoading}
          />
        );
      
      case 'lobby':
        return (
          <LobbyView
            roomId={roomId}
            playerRole={playerRole}
            playerWallet={publicKey?.toString() || ''}
            betAmount={betAmount}
            roomStatus={roomStatus}
            escrowCreated={escrowCreated}
            connected={connected}
            isLoading={appLoading}
            onCreateEscrow={handleCreateEscrow}
            onStartGame={handleStartGame}
            onBackToMenu={handleBackToMenu}
            opponentEscrowCreated={opponentEscrowCreated}
            bothEscrowsReady={bothEscrowsReady}
          />
        );
      
      case 'game':
        return (
          <GameView
            roomId={roomId}
            playerRole={playerRole}
            gameState={gameState}
            onSquareClick={handleSquareClick}
            onSendChatMessage={handleSendChatMessage}
            chatMessages={chatMessages}
            onResignGame={handleResignGame}
            onClaimWinnings={handleClaimWinnings}
            onStartNewGame={handleStartNewGameWithEscrow}
            onBackToMenu={handleBackToMenu}
            winningsClaimed={winningsClaimed}
            isLoading={appLoading}
            betAmount={betAmount}
          />
        );
      
      default:
        return <div>Unknown game mode</div>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="App" style={{ 
        backgroundColor: theme.background, 
        color: theme.text,
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: theme.surface,
          color: theme.text,
          padding: isDesktopLayout ? '1.5rem' : '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.border}`,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: isMobile ? '0.5rem' : '0'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: isDesktopLayout ? '2rem' : textSizes.h2,
            flexShrink: 0
          }}>
            ♟️ Knightsbridge Chess
          </h1>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isDesktopLayout ? '1.5rem' : '0.5rem',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-end',
            width: isMobile ? '100%' : 'auto'
          }}>
            <DarkModeToggle />
            <WalletMultiButton />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ 
          padding: isDesktopLayout ? '3rem' : '1rem',
          maxWidth: '100vw',
          overflow: 'hidden'
        }}>
          {renderContent()}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// App wrapper with Solana providers
function App() {
  const wallets = [
    new PhantomWalletAdapter(),
    new BackpackWalletAdapter()
  ];

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <ThemeProvider>
              <ChessApp />
            </ThemeProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App;