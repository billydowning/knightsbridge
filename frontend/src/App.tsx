import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useDatabaseMultiplayerState } from './services/databaseMultiplayerState';
import { useSolanaWallet } from './hooks/useSolanaWallet';
import websocketService from './services/websocketService';
import { useScreenSize, useIsMobile, useIsTabletOrSmaller, useChessBoardConfig, useContainerWidth, useLayoutConfig, useTextSizes, useIsLaptopOrLarger, useIsMacBookAir, useIsDesktopLayout } from './utils/responsive';
import { ChessEngine } from './engine/chessEngine';
import { MenuView } from './components/MenuView';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';
import { Header } from './components/Header';
import { NotificationSystem, useNotifications } from './components/NotificationSystem';
import { TermsPage } from './components/TermsPage';
import { FeatureWrapper, ConnectionStatus, ConnectionBanner } from './components';

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
import { FEATURES } from './config/features';
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

// Enhanced error boundary component with better recovery options
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { 
    hasError: boolean; 
    error?: Error; 
    errorInfo?: React.ErrorInfo;
    attempts: number;
  }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { 
      hasError: false, 
      attempts: 0 
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 App Error Caught by Error Boundary:', error);
    console.error('📍 Error Info:', errorInfo);
    
    // Log to backend for monitoring (if possible)
    try {
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: error.message,
          fatal: false
        });
      }
    } catch (e) {
      // Ignore gtag errors
    }
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    console.log('🔄 Attempting to recover from error...');
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined,
      attempts: prevState.attempts + 1 
    }));
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.message?.includes('connection');
      
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          maxWidth: '500px',
          margin: '50px auto',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #333'
        }}>
          <h1 style={{ color: '#ff6b6b', marginBottom: '20px' }}>
            ⚠️ Something went wrong
          </h1>
          
          {isNetworkError ? (
            <div>
              <p style={{ marginBottom: '20px' }}>
                🌐 Network connection issue detected. Please check your internet connection.
              </p>
              <button 
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  marginRight: '10px',
                  backgroundColor: '#4ecdc4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🔄 Retry Connection
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '20px' }}>
                🎮 The chess app encountered an unexpected error. This is usually temporary.
              </p>
              {this.state.attempts < 2 && (
                <button 
                  onClick={this.handleRetry}
                  style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    backgroundColor: '#4ecdc4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Try Again
                </button>
              )}
            </div>
          )}
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff6b6b',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#999' }}>
                Debug Information
              </summary>
              <pre style={{ 
                backgroundColor: '#2a2a2a', 
                padding: '10px', 
                overflow: 'auto',
                fontSize: '12px',
                color: '#ccc'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}
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

// DarkModeToggle moved to Header component

function ChessApp() {
  const { theme } = useTheme();
  const { 
    publicKey, 
    connected, 
    balance, 
    checkBalance, 
    isLoading,
    createEscrow,
    joinAndDepositStake,
    claimWinnings,
    depositStake
  } = useSolanaWallet();
  const isMobile = useIsMobile();
  const textSizes = useTextSizes();
  const isLaptopOrLarger = useIsLaptopOrLarger();
  const isMacBookAir = useIsMacBookAir();
  const isDesktopLayout = useIsDesktopLayout();
  
  // Notification system
  const { notifications, showSuccess, showError, removeNotification } = useNotifications();
  
  // Performance monitoring
  useRenderPerformance('ChessApp');

  // Helper function to get piece color from both text and Unicode formats
  const getPieceColorFromAnyFormat = (piece: string): 'white' | 'black' | null => {
    // First try Unicode format
    const unicodeColor = ChessEngine.getPieceColor(piece);
    if (unicodeColor) return unicodeColor;
    
    // Then try text format
    if (piece.includes('white-')) return 'white';
    if (piece.includes('black-')) return 'black';
    
    return null;
  };

  // Helper function to get room player wallet by role
  const getRoomPlayerWallet = (roomStatus: any, role: 'white' | 'black'): string | null => {
    if (!roomStatus?.players) return null;
    const player = roomStatus.players.find((p: any) => p.role === role);
    return player?.wallet || null;
  };

  // Helper function to validate if connected wallet matches room role
  const validateWalletForRole = (roomStatus: any, playerRole: 'white' | 'black' | null, connectedWallet: string | null): boolean => {
    if (!roomStatus || !playerRole || !connectedWallet) return false;
    const roomWallet = getRoomPlayerWallet(roomStatus, playerRole);
    return roomWallet === connectedWallet;
  };

  // Helper function to get wallet mismatch message
  const getWalletMismatchMessage = (roomStatus: any, playerRole: 'white' | 'black' | null, connectedWallet: string | null): string | null => {
    if (!roomStatus || !playerRole || !connectedWallet) return null;
    const roomWallet = getRoomPlayerWallet(roomStatus, playerRole);
    if (!roomWallet) return null;
    
    if (roomWallet !== connectedWallet) {
      const roleText = playerRole === 'white' ? 'White' : 'Black';
      return `❌ Wallet mismatch! You're connected as ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}, but this room's ${roleText} player is ${roomWallet.slice(0, 6)}...${roomWallet.slice(-4)}. Please connect the correct wallet.`;
    }
    
    return null;
  };

  // Helper function to get piece type from both text and Unicode formats
  const getPieceTypeFromAnyFormat = (piece: string): string | null => {
    // Unicode format
    if (piece === '♔' || piece === '♚') return 'king';
    if (piece === '♕' || piece === '♛') return 'queen';
    if (piece === '♖' || piece === '♜') return 'rook';
    if (piece === '♗' || piece === '♝') return 'bishop';
    if (piece === '♘' || piece === '♞') return 'knight';
    if (piece === '♙' || piece === '♟') return 'pawn';
    
    // Text format
    if (piece.includes('-king')) return 'king';
    if (piece.includes('-queen')) return 'queen';
    if (piece.includes('-rook')) return 'rook';
    if (piece.includes('-bishop')) return 'bishop';
    if (piece.includes('-knight')) return 'knight';
    if (piece.includes('-pawn')) return 'pawn';
    
    return null;
  };

  // DISABLED: URL persistence helpers - keeping manual reconnection only for now
  // const getURLParams = () => {
  //   const params = new URLSearchParams(window.location.search);
  //   return {
  //     room: params.get('room') || '',
  //     role: params.get('role') as 'white' | 'black' | null
  //   };
  // };

  // const updateURL = (roomId: string, role: 'white' | 'black' | null = null) => {
  //   if (!roomId) {
  //     // Clear URL params when no active room
  //     window.history.replaceState({}, '', window.location.pathname);
  //     return;
  //   }
  //   
  //   const params = new URLSearchParams();
  //   params.set('room', roomId);
  //   if (role) {
  //     params.set('role', role);
  //   }
  //   
  //   // Use replaceState to avoid browser history pollution
  //   window.history.replaceState({}, '', `?${params.toString()}`);
  // };

  // App state - manual reconnection only, no URL persistence
  const [gameMode, setGameModeInternal] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [timeLimit, setTimeLimit] = useState<number>(10 * 60); // Default to 10 minutes (Rapid)
  const [playerRole, setPlayerRole] = useState<'white' | 'black' | null>(null);
  const [escrowCreated, setEscrowCreated] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('Welcome to Knightsbridge Chess!');
  const [winningsClaimed, setWinningsClaimed] = useState<boolean>(false);
  const [claimingInProgress, setClaimingInProgress] = useState<boolean>(false);
  const [timeoutClaimingDone, setTimeoutClaimingDone] = useState<boolean>(false);
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [roomStatus, setRoomStatus] = useState<any>(null);
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardError, setLeaderboardError] = useState<string>('');
  
  // TOYOTA RELIABILITY: Mobile debug panel (temporary for troubleshooting)
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  
  // TOYOTA RECONNECTION: Simple connection status (only when feature enabled)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const addDebugMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    setDebugLog(prev => [...prev.slice(-9), logEntry]); // Keep last 10 messages
    console.log(logEntry); // Also log to console for desktop users
  }, []);
  
  // TOYOTA RELIABILITY: Wrapper to log all game mode changes for debugging
  const setGameMode = useCallback((newMode: 'menu' | 'lobby' | 'game') => {
    if (newMode === 'game' && gameMode !== 'game') {
      addDebugMessage(`🎮 GAME MODE CHANGE: ${gameMode} → ${newMode}`);
      console.trace('Game mode change stack trace:');
    }
    setGameModeInternal(newMode);
  }, [gameMode, addDebugMessage]);
  
  // Multiplayer state tracking
  const [opponentEscrowCreated, setOpponentEscrowCreated] = useState<boolean>(false);
  const [bothEscrowsReady, setBothEscrowsReady] = useState<boolean>(false);
  const [hasDeposited, setHasDeposited] = useState<boolean>(false);



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

  // HYBRID TIMER SYNC: Track current timer values for move synchronization
  const [currentTimerValues, setCurrentTimerValues] = useState<{
    whiteTime: number;
    blackTime: number;
  }>({ whiteTime: timeLimit, blackTime: timeLimit });

  // HYBRID TIMER SYNC: Update timer values from GameView
  const handleTimerUpdate = useCallback((whiteTime: number, blackTime: number) => {
    setCurrentTimerValues({ whiteTime, blackTime });
  }, []);

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
    // Apply the move to the game state
    const updatedGameState = { ...gameState };
    // ... move logic here
  }, [gameState]);

  const applyMovesToGameState = useCallback((moves: any[]) => {
    // Apply moves logic here
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
  
  //     setChatMessages(prev => [...prev, {
  //       id: message.id,
  //       player: message.playerName,
  //       message: message.message,
  //       timestamp: new Date(message.timestamp)
  //     }]);
  //   },
  //   onGameStateUpdate: applyMovesToGameState,
  //   onPlayerJoined: (player) => {
  
  //     setGameStatus(`Opponent joined! Game starting...`);
  //   },
  //   onGameStarted: (gameData) => {
  
  //     setGameMode('game');
  //     setGameStatus('Game started!');
  //   },
  //   onPlayerDisconnected: (player) => {
  
  //     setGameStatus('Opponent disconnected. Game paused.');
  //   }
  // });
  
  // Placeholder functions for sendMove and wsSendChatMessage
  const sendMove = () => {
    // Using databaseMultiplayerState instead
  };
  
  const wsSendChatMessage = () => {
    // Using databaseMultiplayerState instead
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

  // Fetch leaderboard when app loads or returns to menu
  useEffect(() => {
    if (gameMode === 'menu') {
      fetchLeaderboard();
      
      // Set up periodic refresh every 30 seconds while on menu
      const interval = setInterval(() => {
        fetchLeaderboard();
      }, 30000);
      
      // Cleanup interval when leaving menu
      return () => clearInterval(interval);
    }
  }, [gameMode]);

  // DISABLED: URL reconnection logic - focusing on manual reconnection first
  // useEffect(() => {
  //   // URL reconnection logic temporarily disabled
  // }, []);
  
  

  // Check if both escrows are ready and start game
  useEffect(() => {
    if (bothEscrowsReady && gameMode === 'lobby') {
      addDebugMessage('🎮 bothEscrowsReady trigger fired - checking if should start game');
      // TOYOTA RELIABILITY: Double-check room status before starting game
      fetchRoomStatus().then(() => {
        // Verify both players actually have escrows before starting
        if (roomStatus && roomStatus.escrowCount >= 2) {
          addDebugMessage(`🎮 Room status check: escrowCount=${roomStatus.escrowCount}, players=${roomStatus.players?.length}`);
          // Set a small delay to ensure all state updates are processed
          setTimeout(() => {
            addDebugMessage('✅ Starting game via bothEscrowsReady trigger - both escrows confirmed');
            setGameMode('game');
            setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
          }, 1000); // Reduced delay
        } else {
          addDebugMessage(`⚠️ bothEscrowsReady is true but escrow count insufficient. roomStatus escrowCount=${roomStatus?.escrowCount || 'undefined'}`);
          setBothEscrowsReady(false); // Reset the flag
        }
      });
    }
  }, [bothEscrowsReady, gameMode, playerRole, roomId, roomStatus, addDebugMessage]);

  // Watch for room status changes and force UI updates in lobby
  useEffect(() => {
    if (roomStatus && gameMode === 'lobby') {
      addDebugMessage(`🔄 Room status changed in lobby: players=${roomStatus.players?.length || 0}, escrows=${roomStatus.escrowCount || 0}`);
      
      // TOYOTA RELIABILITY: Force component re-render when room status changes
      // This ensures lobby UI shows correct "Game Ready" vs "Waiting" sections
      
      // If we have 2 players but UI hasn't updated, force a small state update
      if (roomStatus.players && roomStatus.players.length === 2) {
        addDebugMessage(`✅ Both players present - lobby should show Game Ready section`);
        
        // Small hack to force lobby re-render: trigger gameStatus update
        setGameStatus(prev => prev === `Room has ${roomStatus.players.length} players` 
          ? `Room has ${roomStatus.players.length} players ready` 
          : `Room has ${roomStatus.players.length} players`);
      }
      
      // DISABLED: Auto-set bothEscrowsReady based on escrow count
      // This was causing premature game start before deposits
      /*
      if (roomStatus.escrowCount >= 2) {
        setBothEscrowsReady(true);
      }
      */

    }
  }, [roomStatus, gameMode, addDebugMessage]);

  // Set up multiplayer sync when room ID or game mode changes
  useEffect(() => {
    if (roomId && gameMode === 'lobby') {
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

  // Load existing game state when joining a room
  useEffect(() => {
    const loadGameState = async () => {
      if (roomId && gameMode === 'game') {
        try {
          console.log('🔄 Loading game state for room:', roomId);
          const savedGameState = await databaseMultiplayerState.getGameState(roomId);
          
          if (savedGameState) {
            console.log('✅ Found existing game state:', savedGameState);
            setGameState(savedGameState);
            setGameStatus('Game state loaded successfully');
          } else {
            console.log('⚠️ No saved game state found, using fresh state');
            // Keep current game state if no saved state exists
          }
        } catch (error) {
          console.error('❌ Failed to load game state:', error);
          setGameStatus('Failed to load game state. Using fresh state.');
        }
      }
    };

    loadGameState();
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
    if (roomId && gameMode === 'game' && gameState && gameState.gameActive && !isReceivingServerUpdate) {
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
          return;
        }
        
        // Additional check: don't save if we just made a move (it's already being saved)
        const hasRecentMove = gameState.lastMove && 
                             (Date.now() - gameState.lastUpdated) < 1000;
        
        if (hasRecentMove) {
          return;
        }
        
        // Additional check: don't save if we're in the middle of processing a server update
        if (isReceivingServerUpdate) {
          return;
        }
        
        // Clear any existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        
        // Debounce the save operation with longer delay
        const timeout = setTimeout(() => {
          setLastSavedState(stateHash);
          databaseMultiplayerState.saveGameState(roomId, gameState).catch(error => {
            console.error('Error saving game state:', error);
          });
        }, 800); // Increased debounce to 800ms
        
        setSaveTimeout(timeout);
      }
    }
  }, [gameState, roomId, gameMode, isReceivingServerUpdate, lastSavedState, saveTimeout, playerRole]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Auto-claim winnings when game ends (checkmate, stalemate, draw, etc.)
  useEffect(() => {
    // Additional safety check: only auto-claim once per game/room
    if (gameMode === 'game' && gameState && (gameState.winner || gameState.draw) && !winningsClaimed && !appLoading && !claimingInProgress && !timeoutClaimingDone && roomId) {
      const winner = gameState.winner || (gameState.draw ? 'draw' : null);
      if (winner) {
        // Determine game result type
        let gameResult = 'unknown';
        if (gameState.inCheckmate) {
          gameResult = 'checkmate';
        } else if (gameState.draw) {
          gameResult = 'stalemate';
        } else if (winner === 'draw') {
          gameResult = 'agreement';  // Could be 50-move rule, etc.
        }
        
        // Notify backend about game completion (only do this once per game)
        if (websocketService && websocketService.isConnected()) {
      
          websocketService.gameComplete({
            roomId,
            winner,
            gameResult,
            playerRole
          });
        }
        
        // Only auto-claim if this player should claim
        const shouldClaim = winner === 'draw' || winner === playerRole;
        
        if (shouldClaim) {
          // Set flags immediately to prevent multiple attempts
          setClaimingInProgress(true);
          setTimeoutClaimingDone(true);
          // Small delay to ensure game state is fully updated
          setTimeout(() => {
            // Double-check flags before calling (safety net)
            if (!winningsClaimed) {
              handleClaimWinnings();
            } else {
              setClaimingInProgress(false);
            }
          }, 1500);
        } else {
          setTimeoutClaimingDone(true); // Mark as done even if not claiming
        }
      }
    }
  }, [gameState, gameMode, winningsClaimed, appLoading, claimingInProgress, timeoutClaimingDone, playerRole, roomId]);

  // Reset game state when game starts
  useEffect(() => {
    if (gameMode === 'game') {
      
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
      
      // Reset claiming flags for new game
      setWinningsClaimed(false);
      setClaimingInProgress(false);
      setTimeoutClaimingDone(false);
      
      // Save initial game state to database (only the first player to do so)
      if (roomId) {
        // Only the white player should save the initial state
        if (playerRole === 'white') {
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
        }
      }
    }
  }, [gameMode, playerRole, roomId]);

  const handleCreateEscrow = async () => {
    if (!publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    // Validate wallet matches room role
    const connectedWallet = publicKey.toString();
    if (!validateWalletForRole(roomStatus, playerRole, connectedWallet)) {
      const mismatchMessage = getWalletMismatchMessage(roomStatus, playerRole, connectedWallet);
      if (mismatchMessage) {
        setGameStatus(mismatchMessage);
        return;
      }
    }

    if (!roomId) {
      setGameStatus('No room ID available');
      return;
    }
    
    try {
      setGameStatus('Creating escrow on Solana...');
      setAppLoading(true);
      
      // Use the Solana wallet functions from the hook
      
      const playerWallet = publicKey.toString();
      
      // Check if this is the first player (creating the game) or second player (joining)
      const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
      
      // Check if this player has already created an escrow
      const hasPlayerEscrow = roomStatus?.escrows && roomStatus.escrows[playerWallet];
      const isFirstPlayer = !roomStatus || roomStatus.playerCount === 0 || !hasPlayerEscrow;
      
      
      
      let success = false;
      
      // CRITICAL FIX: Black player must use the same bet amount as white player
      let correctBetAmount = betAmount;
      if (playerRole === 'black' && roomStatus?.escrows && Object.keys(roomStatus.escrows).length > 0) {
        // Black player: Use the bet amount from the existing escrow (white player's amount)
        const escrowAmounts = Object.values(roomStatus.escrows);
        const rawAmount = escrowAmounts[0];
        correctBetAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);

      }
      
      if (playerRole === 'white') {
        // White player - initialize the game escrow
        success = await createEscrow(roomId, correctBetAmount, playerRole);
      } else if (playerRole === 'black') {
        // Black player - join the existing escrow
        success = await createEscrow(roomId, correctBetAmount, playerRole);
      } else {
        setGameStatus('Error: Player role not determined');
        setAppLoading(false);
        return;
      }
      
      if (success) {
        // Update database after successful blockchain transaction
        await databaseMultiplayerState.addEscrow(roomId, playerWallet, correctBetAmount);
        
        // Update local state to show escrow was created
        setEscrowCreated(true);
        
        setGameStatus(`Escrow created on Solana! Bet: ${correctBetAmount} SOL. Waiting for opponent...`);
        
        // Check if both players have created escrows
        const afterStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        // DISABLED: Set bothEscrowsReady based on escrow count (should be based on deposits)
        /*
        if (afterStatus && afterStatus.escrowCount >= 2) {
          setBothEscrowsReady(true);
        }
        */
    
        
        // Update room status for UI (critical for showing correct buttons)
        await fetchRoomStatus();
      } else {
        setGameStatus('Failed to create escrow on Solana. Please try again.');
      }
      
    } catch (error) {
      console.error('Error creating escrow:', error);
      setGameStatus(`Error creating escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAppLoading(false);
    }
  };

  const handleDepositStake = async () => {
    if (!publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    // Validate wallet matches room role
    const connectedWallet = publicKey.toString();
    if (!validateWalletForRole(roomStatus, playerRole, connectedWallet)) {
      const mismatchMessage = getWalletMismatchMessage(roomStatus, playerRole, connectedWallet);
      if (mismatchMessage) {
        setGameStatus(mismatchMessage);
        return;
      }
    }

    if (!roomId) {
      setGameStatus('No room ID available');
      return;
    }
    
    // Prevent multiple rapid calls
    if (appLoading) {
      return;
    }
    
    try {
      setGameStatus('Depositing stake to escrow...');
      setAppLoading(true);
      
      // Call the depositStake function from the hook
      const transactionId = await depositStake(roomId, betAmount);
      
      if (transactionId) {
        setGameStatus(`✅ Deposit successful! ${betAmount} SOL deposited. Waiting for opponent...`);
        setHasDeposited(true); // Mark this player as having completed their deposit
        
        // Refresh room status to check if both players have deposited
        const afterStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        // DISABLED: Set bothEscrowsReady based on escrow count (should be based on actual deposits)
        /*
        if (afterStatus && afterStatus.escrowCount >= 2) {
          setBothEscrowsReady(true);
        }
        */

        // Notify backend that deposit is complete via WebSocket
        try {
          if (websocketService && websocketService.isConnected()) {
            const socket = (websocketService as any).socket;
            if (socket) {
              
              socket.emit('depositComplete', {
                roomId: roomId,
                playerWallet: publicKey.toString(),
                txId: transactionId // Use actual transaction ID and correct field name
              });
            }
          }
        } catch (wsError) {
  
        }

        // Set up WebSocket listener for game start
  
        setGameStatus('💎 Deposit confirmed! Waiting for opponent to confirm their deposit...');
        
        const handleGameStarted = (data: any) => {
          addDebugMessage(`🎮 Deposit flow received gameStarted event for room: ${data.roomId}`);
          
          if (data.roomId === roomId) {
            // TOYOTA RELIABILITY: Critical fix - validate both players have deposited before starting
            // This was the bug causing white player to skip deposit screen!
            if (roomStatus && roomStatus.players && roomStatus.players.length === 2) {
              const bothPlayersHaveEscrows = roomStatus.escrowCount >= 2;
              
              if (bothPlayersHaveEscrows) {
                addDebugMessage('✅ Deposit flow: Both players confirmed, starting game');
                setGameStatus('🎮 Both players confirmed! Game starting now...');
                addDebugMessage('🎮 Deposit flow: Setting bothEscrowsReady = true');
                setBothEscrowsReady(true);
                setGameMode('game'); 
              } else {
                addDebugMessage(`⚠️ Deposit flow: gameStarted received but escrows not ready (count=${roomStatus.escrowCount}). Ignoring.`); 
                return; // Don't start game yet
              }
            } else {
              addDebugMessage(`⚠️ Deposit flow: gameStarted received but room not ready (players=${roomStatus?.players?.length || 0}). Ignoring.`);
              return; // Don't start game yet  
            }
            
            const socket = (websocketService as any).socket;
            if (socket) {
              socket.off('gameStarted', handleGameStarted); // Remove listener
            }
          } else {
            addDebugMessage(`🎮 Deposit flow: gameStarted for different room (${data.roomId} vs ${roomId}), ignoring`);
          }
        };
        
        if (websocketService && websocketService.isConnected()) {
          const socket = (websocketService as any).socket;
          if (socket) {
            socket.on('gameStarted', handleGameStarted);
            
            // Extended timeout for WebSocket events - only cleanup, no auto-start
            setTimeout(() => {
              socket.off('gameStarted', handleGameStarted);
      
              
              // DISABLED: Timeout auto-start fallback to prevent asymmetric experience
              // The game should ONLY start via proper WebSocket gameStarted events
        
            }, 15000); // Increased to 15 seconds to give WebSocket events more time
          }
        }
        
    
      } else {
        setGameStatus('Failed to deposit stake. Please try again.');
      }
      
    } catch (error) {
      console.error('Error depositing stake:', error);
      setGameStatus(`Error depositing stake: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAppLoading(false);
    }
  };

  const handleSquareClick = (square: string) => {
    // TOYOTA DEBUG: Add extensive logging for move blocking diagnosis
    addDebugMessage(`🎯 handleSquareClick: square=${square}, roomId=${!!roomId}, gameMode=${gameMode}, gameState=${!!gameState}`);
    addDebugMessage(`🎯 Turn check: currentPlayer=${gameState?.currentPlayer}, playerRole=${playerRole}, match=${gameState?.currentPlayer === playerRole}`);
    addDebugMessage(`🎯 GameState details: gameActive=${gameState?.gameActive}, legalMoves=${legalMoves?.length || 0}`);
    addDebugMessage(`🎯 Position object: ${Object.keys(gameState?.position || {}).length} squares populated`);
    addDebugMessage(`🎯 Position sample: ${JSON.stringify(Object.entries(gameState?.position || {}).slice(0, 4))}`);
    
    // 🚛 TOYOTA DEBUG: Castling rights debugging
    addDebugMessage(`🏰 CASTLING DEBUG: castlingRights="${gameState?.castlingRights}"`);
    addDebugMessage(`🏰 CASTLING DEBUG: king(e1)="${gameState?.position?.e1}", rook(h1)="${gameState?.position?.h1}", rook(a1)="${gameState?.position?.a1}"`);
    addDebugMessage(`🏰 CASTLING DEBUG: squares f1="${gameState?.position?.f1}", g1="${gameState?.position?.g1}"`);
    if (square === 'e1' && gameState?.position?.e1?.includes('king')) {
      addDebugMessage(`🏰 WHITE KING CLICKED: Legal moves for king should include castling if castlingRights contains K or Q`);
    }
    
    if (!roomId || gameMode !== 'game' || !gameState) {
      addDebugMessage(`❌ Early exit: roomId=${!!roomId}, gameMode=${gameMode}, gameState=${!!gameState}`);
      return;
    }
    
    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerRole) {
      const blockMessage = `It's ${gameState.currentPlayer}'s turn. You are ${playerRole}.`;
      addDebugMessage(`❌ Turn blocked: ${blockMessage}`);
      setGameStatus(blockMessage);
      return;
    }
    
    // If no square is selected, select this square if it has a piece
    if (!gameState.selectedSquare) {
      const piece = gameState.position[square];
      
      if (piece) {
        const pieceColor = getPieceColorFromAnyFormat(piece);
        
        if (pieceColor === gameState.currentPlayer) {
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          setGameStatus(`Selected ${piece} at ${square}`);
          return;
        } else {
          setGameStatus(`Cannot select ${pieceColor} piece - it's ${gameState.currentPlayer}'s turn`);
        }
      } else {
        setGameStatus('No piece on this square');
      }
      return;
    }
    
    // If a square is selected, try to move
    const fromSquare = gameState.selectedSquare;
    const toSquare = square;
    
    // TOYOTA FIX: Use pre-calculated legal moves from optimization hook
    const isValidMove = legalMoves.some(move => move.from === fromSquare && move.to === toSquare);
    
    // 🚛 TOYOTA DEBUG: Log move validation details
    console.log('🎯 MOVE VALIDATION:', {
      fromSquare,
      toSquare,
      isValidMove,
      totalLegalMoves: legalMoves.length,
      availableFromMoves: legalMoves.filter(m => m.from === fromSquare),
      firstFewMoves: legalMoves.slice(0, 5)
    });
    
    if (isValidMove) {
      
      // Create new position by making the move
      const newPosition = { ...gameState.position };
      const movingPiece = gameState.position[fromSquare];
      
      // 🚛 TOYOTA FIX: Handle pawn promotion (FIDE Article 3.7.e)
      const pieceType = getPieceTypeFromAnyFormat(movingPiece);
      const pieceColor = getPieceColorFromAnyFormat(movingPiece);
      const toRank = parseInt(toSquare[1]);
      
      if (pieceType === 'pawn' && ((pieceColor === 'white' && toRank === 8) || (pieceColor === 'black' && toRank === 1))) {
        // Auto-promote to queen (in a full game, this should offer choice)
        newPosition[toSquare] = pieceColor === 'white' ? 'white-queen' : 'black-queen';
      } else {
        newPosition[toSquare] = movingPiece;
      }
      newPosition[fromSquare] = '';
      
      // Track en passant for next move (default: no en passant target)
      let newEnPassantTarget = null;
      
      // Handle special moves  
      const fromRank = parseInt(fromSquare[1]);
      const fileDiff = Math.abs(fromSquare[0].charCodeAt(0) - toSquare[0].charCodeAt(0));
      
      // En passant handling for pawns
      if (pieceType === 'pawn') {
        
        // Check for en passant capture
        if (fileDiff === 1 && !gameState.position[toSquare] && gameState.enPassantTarget === toSquare) {
          // This is an en passant capture - remove the captured pawn
          const capturedPawnRank = pieceColor === 'white' ? toRank - 1 : toRank + 1;
          const capturedPawnSquare = toSquare[0] + capturedPawnRank;
          newPosition[capturedPawnSquare] = '';
        }
        
        // Check for two-square pawn move (sets en passant target)
        if (Math.abs(toRank - fromRank) === 2) {
          const targetRank = (fromRank + toRank) / 2;
          newEnPassantTarget = toSquare[0] + targetRank;
        }
      }
      
      // Handle castling - move the rook as well
      if (pieceType === 'king') {
        const fileDiff = Math.abs(fromSquare[0].charCodeAt(0) - toSquare[0].charCodeAt(0));
        if (fileDiff === 2) { // This is a castling move
          const isKingside = toSquare[0] > fromSquare[0];
          const rookFromSquare = (isKingside ? 'h' : 'a') + fromSquare[1];
          const rookToSquare = String.fromCharCode(toSquare[0].charCodeAt(0) + (isKingside ? -1 : 1)) + fromSquare[1];
          
          // Move the rook
          newPosition[rookToSquare] = newPosition[rookFromSquare];
          newPosition[rookFromSquare] = '';
        }
      }
      
      const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      const nextPlayerInCheck = isKingInCheck(newPosition, nextPlayer);
      
      // 🚛 TOYOTA FIX: Use proven FIDE-compliant chess engine instead of buggy custom logic
      const nextPlayerInCheckmate = ChessEngine.isCheckmate(newPosition, nextPlayer, gameState);
      
      // Determine winner if checkmate occurs
      const winner = nextPlayerInCheckmate ? gameState.currentPlayer : null;
      
      // 50-move rule logic
      const capturedPiece = gameState.position[toSquare];
      const isPawnMove = movingPiece && (movingPiece.includes('pawn') || movingPiece === '♙' || movingPiece === '♟');
      const isCapture = capturedPiece && capturedPiece !== '';
      
      // Reset halfmove clock if pawn move or capture, otherwise increment
      const newHalfmoveClock = (isPawnMove || isCapture) ? 0 : (gameState.halfmoveClock || 0) + 1;
      
      // Check for 50-move rule draw (100 half-moves = 50 full moves)
      const canClaimFiftyMoveRule = newHalfmoveClock >= 100;
      
      // Create updated game state
      const updatedGameState = {
        ...gameState,
        position: newPosition,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        enPassantTarget: newEnPassantTarget, // Add en passant target tracking
        moveHistory: [...gameState.moveHistory, { 
          from: fromSquare, 
          to: toSquare, 
          piece: gameState.position[fromSquare],
          capturedPiece: gameState.position[toSquare] || null,
          isCastling: getPieceTypeFromAnyFormat(gameState.position[fromSquare]) === 'king' && 
                     Math.abs(fromSquare[0].charCodeAt(0) - toSquare[0].charCodeAt(0)) === 2,
          isEnPassant: pieceType === 'pawn' && fileDiff === 1 && !gameState.position[toSquare] && gameState.enPassantTarget === toSquare,
          timestamp: Date.now()
        }],
        lastMove: { from: fromSquare, to: toSquare },
        inCheck: nextPlayerInCheck,
        inCheckmate: nextPlayerInCheckmate,
        winner: winner,
        gameActive: winner ? false : gameState.gameActive,
        halfmoveClock: newHalfmoveClock,
        canClaimFiftyMoveRule: canClaimFiftyMoveRule,
        // Increment fullmoveNumber after black's move (chess standard)
        fullmoveNumber: (gameState.fullmoveNumber || 1) + (gameState.currentPlayer === 'black' ? 1 : 0),
        lastUpdated: Date.now(),
        
        // HYBRID TIMER SYNC: Include current timer values for synchronization
        whiteTimeRemaining: currentTimerValues.whiteTime,
        blackTimeRemaining: currentTimerValues.blackTime,
        timerLastSync: Date.now()
      };
      
      // Set flag to prevent receiving server updates during this operation
      setIsReceivingServerUpdate(true);
      
      // Save to database FIRST (single source of truth)
      databaseMultiplayerState.saveGameState(roomId, updatedGameState)
        .then(() => {
          // Update local state AFTER successful database save
          setGameState(updatedGameState);
          
          // Reset the receiving flag after a longer delay to ensure server broadcast is processed
          setTimeout(() => {
            setIsReceivingServerUpdate(false);
          }, 500); // Increased delay to 500ms
        })
        .catch(error => {
          console.error('❌ Failed to save game state:', error);
          setGameStatus('Error saving move. Please try again.');
          // Reset the receiving flag on error
          setIsReceivingServerUpdate(false);
        });
    } else {
      // 🚛 TOYOTA DEBUG: Log why move failed
      console.log('❌ MOVE FAILED VALIDATION:', {
        fromSquare,
        toSquare,
        availableFromMoves: legalMoves.filter(m => m.from === fromSquare),
        allLegalMoves: legalMoves
      });
      addDebugMessage(`❌ Invalid move: ${fromSquare}→${toSquare}`);
      
      // Invalid move - provide specific feedback for check situations
      const isInCheck = ChessEngine.isInCheck(gameState.position, gameState.currentPlayer);
      
      const piece = gameState.position[square];
      if (piece) {
        const pieceColor = getPieceColorFromAnyFormat(piece);
        if (pieceColor === gameState.currentPlayer) {
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          setGameStatus(`Selected ${piece} at ${square}`);
        } else {
          setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
          if (isInCheck) {
            setGameStatus('⚠️ You are in CHECK! You must move to get out of check.');
          } else {
            setGameStatus('Invalid move - cleared selection');
          }
        }
      } else {
        setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        if (isInCheck) {
          setGameStatus('⚠️ You are in CHECK! You must move to get out of check.');
        } else {
          setGameStatus('Invalid move to empty square - cleared selection');
        }
      }
    }
  };

  const handleClaimWinnings = async () => {
    if (!publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    if (!gameState) {
      setGameStatus('No active game to claim winnings from');
      return;
    }

    // Validate wallet matches room role
    const connectedWallet = publicKey.toString();
    if (!validateWalletForRole(roomStatus, playerRole, connectedWallet)) {
      const mismatchMessage = getWalletMismatchMessage(roomStatus, playerRole, connectedWallet);
      if (mismatchMessage) {
        setGameStatus(mismatchMessage);
        return;
      }
    }

    if (!roomId || !gameState.winner) {
      setGameStatus('Cannot claim winnings: missing wallet, room, or winner');
      return;
    }
    
    // Prevent duplicate claims
    if (winningsClaimed) {
      setGameStatus('Winnings have already been claimed');
      return;
    }
    
    // Prevent concurrent claims
    if (appLoading) {
      setGameStatus('Claim already in progress...');
      return;
    }
    
    try {
  
      setGameStatus('Claiming winnings on Solana...');
      setAppLoading(true);
      
      // Use the Solana wallet functions from the hook
      
      // Determine if it's a draw
      const isDraw = gameState.winner === 'draw';
  
      
      // Claim winnings on Solana

      const result = await claimWinnings(roomId, playerRole, gameState.winner, isDraw);
      

      
      // Check if the result indicates success (contains success emojis or positive messages)
      const isSuccess = result && (
        result.includes('🎉 SUCCESS') || 
        result.includes('🤝 Draw') || 
        result.includes('✅') ||
        result.includes('SUCCESS') ||
        result.includes('won') ||
        result.includes('refunded') ||
        result.includes('transferred') ||
        result === 'success'
      );
      

      
      if (isSuccess) {
        setWinningsClaimed(true);
        setGameStatus(result);
        
        // Refresh wallet balance to show updated amount
        if (checkBalance && typeof checkBalance === 'function') {
  
          // Immediate refresh
          checkBalance();
          // Additional refresh after delay to ensure blockchain transaction is fully processed
          setTimeout(() => {
  
            checkBalance();
          }, 2000);
          // Final refresh after longer delay for any blockchain delays
          setTimeout(() => {

            checkBalance();
          }, 5000);
        } else {
          console.error('❌ checkBalance function not available');
        }
        
        // Show success notification to the winner
        if (result.includes('🎉 SUCCESS')) {
          showSuccess(
            'Winnings Claimed!', 
            'Your winnings have been automatically transferred to your wallet! 🎉'
          );
        } else if (result.includes('🤝 Draw')) {
          showSuccess(
            'Stake Refunded!', 
            'Your stake has been automatically refunded due to the draw! 🤝'
          );
        }
        
        // Manually notify backend about game completion to ensure user stats are updated
        if (roomId && playerRole) {
          try {
            const gameResult = gameState.inCheckmate ? 'checkmate' : (gameState.draw ? 'draw' : 'resignation');
    
            
            // Always use HTTP fallback for reliability (WebSocket may appear connected but not work)
    
            const httpPromise = fetch(`${ENV_CONFIG.API_BASE_URL}/api/games/${roomId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                winner: gameState.winner || 'draw',
                gameResult,
                playerRole
              })
            }).then(response => {
              if (response.ok) {
      
                return response.json();
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            }).catch(error => {
              console.error('❌ Failed to update stats via HTTP:', error);
              throw error;
            });
            
            // Also try WebSocket as backup
            if (websocketService && websocketService.isConnected()) {
      
              websocketService.gameComplete({
                roomId,
                winner: gameState.winner || 'draw',
                gameResult,
                playerRole
              });
            }
            
            // Wait for HTTP response before proceeding
            await httpPromise;
          } catch (error) {
            console.error('❌ Error notifying backend of game completion:', error);
          }
        }
        
        // Refresh leaderboard after successful winnings claim (with delay to ensure backend stats are updated)
        setTimeout(() => {
          fetchLeaderboard();
        }, 3000);
      } else {
        setGameStatus(`Failed to claim winnings: ${result}`);
      }
      
    } catch (err) {
      console.error('❌ Claiming winnings failed:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error message:', err?.message);
      console.error('❌ Full error object:', err);
      
      // Check if the error indicates the transaction was already processed or game completed
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('already been processed') || 
          errorMessage.includes('already processed') ||
          errorMessage.includes('GameNotInProgress') ||
          errorMessage.includes('Game is not in progress')) {
        setWinningsClaimed(true);
        setGameStatus('✅ Winnings already claimed successfully!');
        
        // Refresh wallet balance since winnings were already successfully processed
        if (checkBalance && typeof checkBalance === 'function') {
  
          // Immediate refresh
          checkBalance();
          // Additional refresh after delay
          setTimeout(() => {
  
            checkBalance();
          }, 2000);
        } else {
          console.error('❌ checkBalance function not available for already claimed winnings');
        }
        
        // Refresh leaderboard after confirming winnings already claimed (with delay to ensure backend stats are updated)
        setTimeout(() => {
          fetchLeaderboard();
        }, 2000);
      } else {
        setGameStatus('Failed to claim winnings. Please try again.');
      }
    } finally {
  
      setAppLoading(false);
      setClaimingInProgress(false);
      // Don't reset timeoutClaimingDone here - let it stay true to prevent re-attempts
    }
  };

  const handleJoinRoom = async () => {
    addDebugMessage(`🚪 handleJoinRoom called for room: ${roomId}`);
    if (!publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    const playerWallet = publicKey.toString();

    try {
      setGameStatus('Connecting to game...');
      setAppLoading(true);

      // If roomId is empty, we're creating a new room
      if (!roomId.trim()) {
        addDebugMessage(`🏗️ Creating new room. Bet: ${betAmount}, Time: ${timeLimit}`);
        // Create the room (backend will generate room ID)
        const result = await databaseMultiplayerState.createRoom(playerWallet, betAmount, timeLimit);
        addDebugMessage(`🏗️ Room creation result: role=${result.role}, roomId=${result.roomId}`);
        if (result.role && result.roomId) {
          setPlayerRole(result.role);
          setRoomId(result.roomId);
          setGameStatus(`Room created! Share Room ID: ${result.roomId} with your opponent`);
          
          // Get room status using the new room ID
          addDebugMessage(`🏗️ Fetching room status for new room: ${result.roomId}`);
          const roomStatus = await databaseMultiplayerState.getRoomStatus(result.roomId);
          addDebugMessage(`🏗️ Room status: players=${roomStatus?.players?.length || 0}, escrows=${roomStatus?.escrowCount || 0}`);
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
          }
          
          // TOYOTA RELIABILITY: Room creators need smart reconnection too!
          // Apply the same smart reconnection logic as joiners
          try {
            addDebugMessage(`🔄 Room creator smart reconnection: Checking for active game in room ${result.roomId}`);
            const gameState = await databaseMultiplayerState.getGameState(result.roomId);
            addDebugMessage(`🔄 Room creator game state check: gameActive=${gameState?.gameActive}, moves=${gameState?.moveHistory?.length || 0}`);
            
            // If there's an active game and this player belongs to it, restore directly to game
            if (gameState && gameState.gameActive && roomStatus) {
              const isValidPlayer = validateWalletForRole(roomStatus, result.role, playerWallet);
              addDebugMessage(`🔄 Room creator player validation: isValid=${isValidPlayer}, role=${result.role}`);
              
              if (isValidPlayer) {
                const bothPlayersPresent = roomStatus.players && roomStatus.players.length === 2;
                const gameNotFinished = !gameState.winner && !gameState.draw;
                const gameHasMoves = gameState.moveHistory && gameState.moveHistory.length > 0;
                
                addDebugMessage(`🔄 Room creator reconnection conditions: players=${bothPlayersPresent}, notFinished=${gameNotFinished}, hasMoves=${gameHasMoves}`);
                
                // Only skip lobby if game has actual moves (truly in progress)
                if (bothPlayersPresent && gameNotFinished && gameHasMoves) {
                  addDebugMessage(`✅ Room creator smart reconnection: Restoring to active game, skipping lobby`);
                  // Skip lobby - restore directly to active game!
                  setGameState(gameState);
                  setGameMode('game');
                  setGameStatus(`🔄 Rejoined active game! You are ${result.role}.`);
                  return; // Skip the lobby entirely
                } else {
                  addDebugMessage(`⚠️ Room creator smart reconnection: Conditions not met, proceeding to lobby`);
                }
              }
            } else {
              addDebugMessage(`⚠️ Room creator smart reconnection: No active game found, proceeding to lobby`);
            }
          } catch (error) {
            console.error('Error during room creator smart reconnection check:', error);
            // Graceful fallback - continue to lobby if smart reconnection fails
          }
          
          // Normal flow: Set game mode to lobby AFTER all syncing is complete (room creator)
          addDebugMessage(`✅ Room creator setting game mode to lobby. Role: ${result.role}, RoomStatus: players=${roomStatus?.players?.length || 0}, escrows=${roomStatus?.escrowCount || 0}`);
          setGameMode('lobby');
        } else {
          setGameStatus('Failed to create room');
        }
      } else {
        // Joining an existing room
        addDebugMessage(`🚪 Joining existing room: ${roomId}`);
        const role = await databaseMultiplayerState.joinRoom(roomId, playerWallet);
        addDebugMessage(`🚪 Join room result: role=${role}`);
        if (role) {
          setPlayerRole(role);
          setGameStatus(`Joined room as ${role}`);
          
          // Get room status using the current room ID
          addDebugMessage(`🚪 Fetching room status for existing room: ${roomId}`);
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          addDebugMessage(`🚪 Room status: players=${roomStatus?.players?.length || 0}, escrows=${roomStatus?.escrowCount || 0}`);
          
          // Sync bet amount from room (when joining existing room)
          if (roomStatus && roomStatus.stakeAmount && roomStatus.stakeAmount > 0) {
            setBetAmount(roomStatus.stakeAmount);
          }
          
          // Sync time limit from room (when joining existing room)
          if (roomStatus && roomStatus.timeLimit && roomStatus.timeLimit > 0) {
            setTimeLimit(roomStatus.timeLimit);
          }
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
          }
          
          // SMART MANUAL RECONNECTION: Check if we should go straight to active game
          try {
            addDebugMessage(`🔄 Smart reconnection: Checking for active game in room ${roomId}`);
            const gameState = await databaseMultiplayerState.getGameState(roomId);
            addDebugMessage(`🔄 Game state check: gameActive=${gameState?.gameActive}, moves=${gameState?.moveHistory?.length || 0}`);
            
            // If there's an active game and this player belongs to it, restore directly to game
            if (gameState && gameState.gameActive && roomStatus) {
              const isValidPlayer = validateWalletForRole(roomStatus, role, playerWallet);
              addDebugMessage(`🔄 Player validation: isValid=${isValidPlayer}, role=${role}`);
              
              if (isValidPlayer) {
                const bothPlayersPresent = roomStatus.players && roomStatus.players.length === 2;
                const gameNotFinished = !gameState.winner && !gameState.draw;
                const gameHasMoves = gameState.moveHistory && gameState.moveHistory.length > 0;
                
                addDebugMessage(`🔄 Reconnection conditions: players=${bothPlayersPresent}, notFinished=${gameNotFinished}, hasMoves=${gameHasMoves}`);
                
                // Only skip lobby if game has actual moves (truly in progress)
                if (bothPlayersPresent && gameNotFinished && gameHasMoves) {
                  addDebugMessage(`✅ Smart reconnection: Restoring to active game, skipping lobby`);
                  // Skip lobby - restore directly to active game!
                  setGameState(gameState);
                  setGameMode('game');
                  setGameStatus(`🔄 Rejoined active game! You are ${role}.`);
                  return; // Skip the lobby entirely
                } else {
                  addDebugMessage(`⚠️ Smart reconnection: Conditions not met, proceeding to lobby`);
                }
              }
            } else {
              addDebugMessage(`⚠️ Smart reconnection: No active game found, proceeding to lobby`);
            }
          } catch (error) {
            console.error('Error during smart manual reconnection check:', error);
            // Graceful fallback - continue to lobby if smart reconnection fails
          }
          
          // Normal flow: Set game mode to lobby AFTER all syncing is complete
          addDebugMessage(`✅ Setting game mode to lobby. Role: ${role}, RoomStatus: players=${roomStatus?.players?.length || 0}, escrows=${roomStatus?.escrowCount || 0}`);
          setGameMode('lobby');
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

  const handleStartGame = async () => {
    console.log('🎮 handleStartGame called for room:', roomId);
    
    // TOYOTA RELIABILITY: Additional safety check before starting game
    if (!roomStatus || !roomStatus.players || roomStatus.players.length < 2) {
      console.log('⚠️ handleStartGame: Room not ready, cannot start game');
      setGameStatus('Room not ready. Please wait for opponent.');
      return;
    }
    
    if (roomStatus.escrowCount < 2) {
      console.log('⚠️ handleStartGame: Not all players have deposited, cannot start game');
      setGameStatus('Waiting for all players to deposit their stakes.');
      return;
    }
    
    console.log('✅ handleStartGame: All conditions met, starting game');
    
    // Initialize fresh game state for both players
    const initialGameState = {
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

    // Set the local game state
    setGameState(initialGameState);
    
    // Save initial game state to database for multiplayer sync
    if (roomId) {
      try {
        await databaseMultiplayerState.saveGameState(roomId, initialGameState);
        console.log('✅ Initial game state saved to database');
      } catch (error) {
        console.error('❌ Failed to save initial game state:', error);
        setGameStatus('Failed to initialize game state. Please try again.');
        return;
      }
    }

    setGameMode('game');
    setGameStatus('Game started! Good luck!');
  };

  const handleResignGame = async () => {
    addDebugMessage(`🏳️ Resignation initiated by ${playerRole} in room ${roomId}`);

    
    if (!playerRole || !roomId) {
      addDebugMessage(`❌ Cannot resign: missing playerRole=${playerRole}, roomId=${roomId}`);
      console.error('Cannot resign: missing player role or room ID');
      return;
    }
    
    try {
      // Update local game state
      const winner = playerRole === 'white' ? 'black' : 'white';
      addDebugMessage(`🏳️ Setting winner to ${winner}, gameActive to false`);
      
      setGameState((prev: any) => ({
        ...prev,
        winner,
        gameActive: false,
        lastUpdated: Date.now()
      }));
      
      // Save resignation to database
      const updatedState = {
        ...gameState,
        winner,
        gameActive: false,
        lastUpdated: Date.now()
      };
      
      addDebugMessage(`💾 Saving resignation state to database...`);
      await databaseMultiplayerState.saveGameState(roomId, updatedState);
      addDebugMessage(`✅ Resignation state saved to database`);
      
      // TOYOTA RELIABILITY: Use databaseMultiplayerState for consistent WebSocket handling
      addDebugMessage(`📡 Broadcasting resignation via WebSocket...`);
      // The saveGameState should automatically trigger gameStateUpdated events to other players
      
      // Send chat message about resignation  
      const resignationMessage = `${playerRole} resigned the game. ${winner} wins!`;
      addDebugMessage(`💬 Sending resignation chat message...`);
      await databaseMultiplayerState.sendChatMessage(roomId, resignationMessage, publicKey?.toString() || '', playerRole);
      
      addDebugMessage(`✅ Resignation complete: ${winner} wins!`);
      setGameStatus(`${winner} wins by resignation!`);
      
    } catch (error) {
      addDebugMessage(`❌ Error during resignation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error resigning game:', error);
      setGameStatus(`Error resigning game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTimeoutGame = async (timedOutPlayer: 'white' | 'black') => {

    
    if (!roomId) {
      console.error('Cannot handle timeout: missing room ID');
      return;
    }
    
    try {
      // The timed-out player loses, opponent wins
      const winner = timedOutPlayer === 'white' ? 'black' : 'white';
      setGameState((prev: any) => ({
        ...prev,
        winner,
        gameActive: false,
        lastUpdated: Date.now()
      }));
      
      // Save timeout result to database
      const updatedState = {
        ...gameState,
        winner,
        gameActive: false,
        lastUpdated: Date.now()
      };
      
      await databaseMultiplayerState.saveGameState(roomId, updatedState);
      
      // Notify backend about game completion
      if (websocketService && websocketService.isConnected()) {
    
        websocketService.gameComplete({
          roomId,
          winner,
          gameResult: 'timeout',
          playerRole
        });
      }
      
      // Send chat message about timeout
      const timeoutMessage = `${timedOutPlayer} ran out of time. ${winner} wins!`;
      await databaseMultiplayerState.sendChatMessage(roomId, timeoutMessage, publicKey?.toString() || '', playerRole);
      
      setGameStatus(`${winner} wins - ${timedOutPlayer} timed out!`);
      
    } catch (error) {
      console.error('Error handling timeout:', error);
      setGameStatus(`Error handling timeout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
    setRoomId('');
    setPlayerRole(null);
    
    setEscrowCreated(false);
    setWinningsClaimed(false);
    setClaimingInProgress(false);
    setTimeoutClaimingDone(false);
    setOpponentEscrowCreated(false);
    setBothEscrowsReady(false);
    setHasDeposited(false);
    setGameStatus('Welcome to Knightsbridge Chess!');
    
    // Refresh leaderboard when returning to menu (with delay to ensure any pending backend operations complete)
    setTimeout(() => {
      fetchLeaderboard();
    }, 1000);
  };

  // Test backend connection
  const handleTestConnection = async () => {
    try {
  
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

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError('');
      
  
      
      const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/api/leaderboard`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
  
        setLeaderboard(data.leaderboard || []);
      } else {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }
      
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      setLeaderboardError(error instanceof Error ? error.message : 'Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // 🚛 TOYOTA: Removed buggy detectCheckmate and checkIfKingCanEscape functions
  // Now using proven ChessEngine.isCheckmate() for reliable FIDE-compliant checkmate detection
  
  // Helper function to validate chess moves
  const validateLocalMove = (position: any, fromSquare: string, toSquare: string, currentPlayer: string, gameState?: any): boolean => {
    const piece = position[fromSquare];
    if (!piece) return false;
    
    // Check if piece belongs to current player using our helper function
    const pieceColor = getPieceColorFromAnyFormat(piece);
    if (pieceColor !== currentPlayer) return false;
    
    // Check if destination square is occupied by own piece
    const targetPiece = position[toSquare];
    if (targetPiece) {
      const targetColor = getPieceColorFromAnyFormat(targetPiece);
      if (targetColor === currentPlayer) return false;
    }
    
    // Basic move validation (simplified)
    const fromFile = fromSquare[0];
    const fromRank = parseInt(fromSquare[1]);
    const toFile = toSquare[0];
    const toRank = parseInt(toSquare[1]);
    
    const fileDiff = Math.abs(fromFile.charCodeAt(0) - toFile.charCodeAt(0));
    const rankDiff = Math.abs(fromRank - toRank);
    
    // Get piece type for easier comparisons
    const pieceType = getPieceTypeFromAnyFormat(piece);
    
    // Pawn moves
    if (pieceType === 'pawn') {
      const direction = pieceColor === 'white' ? 1 : -1;
      const startRank = pieceColor === 'white' ? 2 : 7;
      
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
      // Capture move (including en passant)
      if (fileDiff === 1 && rankDiff === 1) {
        // Regular capture
        if (targetPiece) {
          return true; // Allow capturing any piece, including pawns
        }
        // En passant capture - check if target square is the en passant target
        return gameState?.enPassantTarget === toSquare;
      }
      return false;
    }
    
    // King moves
    if (pieceType === 'king') {
      // Normal king moves (one square in any direction)
      if (fileDiff <= 1 && rankDiff <= 1) {
        return true;
      }
      
      // Castling moves (king moves 2 squares horizontally)
      if (rankDiff === 0 && fileDiff === 2) {
        const isKingside = toFile > fromFile;
        const rookFile = isKingside ? 'h' : 'a';
        const rookSquare = rookFile + fromRank;
        const rookPiece = position[rookSquare];
        
        // Check basic castling conditions
        if (!rookPiece || getPieceTypeFromAnyFormat(rookPiece) !== 'rook') return false;
        if (getPieceColorFromAnyFormat(rookPiece) !== currentPlayer) return false;
        
        // Check if path is clear between king and rook
        const startFile = isKingside ? fromFile.charCodeAt(0) + 1 : rookSquare.charCodeAt(0) + 1;
        const endFile = isKingside ? rookSquare.charCodeAt(0) - 1 : fromFile.charCodeAt(0) - 1;
        
        for (let fileCode = startFile; fileCode <= endFile; fileCode++) {
          const checkSquare = String.fromCharCode(fileCode) + fromRank;
          if (position[checkSquare]) return false;
        }
        
        // Check if king is currently in check (can't castle out of check)
        if (isKingInCheck(position, currentPlayer)) return false;
        
        // Check if king would pass through check during castling
        const middleSquare = String.fromCharCode(fromFile.charCodeAt(0) + (isKingside ? 1 : -1)) + fromRank;
        const tempPosition = { ...position };
        tempPosition[middleSquare] = tempPosition[fromSquare];
        delete tempPosition[fromSquare];
        if (isKingInCheck(tempPosition, currentPlayer)) return false;
        
        // Check if king would be in check after castling
        const finalPosition = { ...position };
        finalPosition[toSquare] = finalPosition[fromSquare];
        delete finalPosition[fromSquare];
        if (isKingInCheck(finalPosition, currentPlayer)) return false;
        
        return true;
      }
      
      return false;
    }
    
    // Queen moves
    if (pieceType === 'queen') {
      return (fileDiff === 0 || rankDiff === 0 || fileDiff === rankDiff) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Rook moves
    if (pieceType === 'rook') {
      return (fileDiff === 0 || rankDiff === 0) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Bishop moves
    if (pieceType === 'bishop') {
      return fileDiff === rankDiff && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Knight moves
    if (pieceType === 'knight') {
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
    let kingSquare = null;
    
    // Find the king using our helper function
    for (const square in position) {
      const piece = position[square];
      if (piece && getPieceTypeFromAnyFormat(piece) === 'king' && getPieceColorFromAnyFormat(piece) === currentPlayer) {
        kingSquare = square;
        break;
      }
    }
    
    if (!kingSquare) return false;
    
    // Check if any opponent piece can attack the king
    const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
    
    for (const square in position) {
      const piece = position[square];
      if (piece && getPieceColorFromAnyFormat(piece) === opponentColor) {
        // Simple check: can this piece attack the king?
        if (canPieceAttackSquare(position, square, kingSquare, piece, opponentColor)) {
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
    
    // Get piece type for easier comparisons
    const pieceType = getPieceTypeFromAnyFormat(piece);
    
    // Pawn attacks
    if (pieceType === 'pawn') {
      const direction = pieceColor === 'white' ? 1 : -1;
      return fileDiff === 1 && toRank === fromRank + direction;
    }
    
    // King attacks
    if (pieceType === 'king') {
      return fileDiff <= 1 && rankDiff <= 1;
    }
    
    // Queen attacks
    if (pieceType === 'queen') {
      return (fileDiff === 0 || rankDiff === 0 || fileDiff === rankDiff) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Rook attacks
    if (pieceType === 'rook') {
      return (fileDiff === 0 || rankDiff === 0) && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Bishop attacks
    if (pieceType === 'bishop') {
      return fileDiff === rankDiff && 
             !isPathBlocked(position, fromSquare, toSquare);
    }
    
    // Knight attacks
    if (pieceType === 'knight') {
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
    
    // Reset game state flags
    setWinningsClaimed(false);
    setClaimingInProgress(false);
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
  
    }
    
    // Set game mode back to lobby to start fresh
    setGameMode('lobby');
    setGameStatus('New game room created! Join with the new room ID.');
    

  };

  const handleDeclareWinner = (winner: 'white' | 'black') => {

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
  
      databaseMultiplayerState.saveGameState(roomId, updatedGameState);
    }
  };
  
  const handleTestCheckmate = () => {

    
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
    

    
    // Test check detection first
    const whiteInCheck = isKingInCheck(checkmatePosition, 'white');
    const blackInCheck = isKingInCheck(checkmatePosition, 'black');
    

    
    // 🚛 TOYOTA: Test checkmate detection using proven engine
    const whiteCheckmate = ChessEngine.isCheckmate(checkmatePosition, 'white', gameState);
    const blackCheckmate = ChessEngine.isCheckmate(checkmatePosition, 'black', gameState);
    

    
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

    
    // Test basic move validation

    const testMoves = [
      { from: 'e2', to: 'e4', piece: '♙', player: 'white' },
      { from: 'e7', to: 'e5', piece: '♟', player: 'black' },
      { from: 'g1', to: 'f3', piece: '♘', player: 'white' }
    ];
    
    testMoves.forEach(move => {
      const isValid = validateLocalMove(gameState.position, move.from, move.to, move.player);

    });
    
    // Test check detection for both players
    const whiteInCheck = isKingInCheck(gameState.position, 'white');
    const blackInCheck = isKingInCheck(gameState.position, 'black');
    
    // 🚛 TOYOTA: Test checkmate detection for both players using proven engine
    const whiteCheckmate = ChessEngine.isCheckmate(gameState.position, 'white', gameState);
    const blackCheckmate = ChessEngine.isCheckmate(gameState.position, 'black', gameState);
    

    
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
    

    
    // Add message to local state immediately for UI responsiveness
    setChatMessages(prev => [...prev, newMessage]);
    
    // Send via database system
    if (roomId && publicKey) {
      databaseMultiplayerState.sendChatMessage(roomId, message, publicKey.toString(), playerRole)
        .then((response) => {
          if (response.success) {
      
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

  // Load chat messages from database (with delay to prevent race condition)
  useEffect(() => {
    if (roomId) {
      // Add small delay to ensure database transaction commits first
      const loadChatMessages = async () => {
        try {
          // Wait longer for database transaction to commit (more conservative)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const messages = await databaseMultiplayerState.getChatMessages(roomId);
          if (messages && Array.isArray(messages)) {
            // Convert timestamp strings back to numbers
            const messagesWithTimestamps = messages.map((msg: any) => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp
            }));
            setChatMessages(messagesWithTimestamps);
          }
        } catch (error) {
          console.error('Error loading chat messages:', error);
          // If first attempt fails, try once more after longer delay (network issues)
          setTimeout(async () => {
            try {
              const messages = await databaseMultiplayerState.getChatMessages(roomId);
              if (messages && Array.isArray(messages)) {
                setChatMessages(messages);
              }
            } catch (retryError) {
              console.error('Retry also failed for chat messages:', retryError);
            }
          }, 1000);
        }
      };
      
      loadChatMessages();
    }
  }, [roomId]);

  // Fetch room status
  const fetchRoomStatus = useCallback(async () => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      try {
        const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        
        if (roomStatus) {
          setRoomStatus(roomStatus);
        }
      } catch (error) {
        console.error('Error fetching room status:', error);
      }
    }
  }, [roomId]);

  // Fetch room status when entering lobby + Toyota reliability polling
  useEffect(() => {
    if (gameMode === 'lobby' && roomId) {
      addDebugMessage(`🔄 Fetching initial room status for lobby`);
      fetchRoomStatus();
      
      // MOBILE RELIABILITY: Smart connection health monitoring
      // Less frequent polling with mobile-specific connection recovery
      addDebugMessage(`📱 Starting mobile-optimized connection monitoring`);
      let missedUpdates = 0;
      const isLikelyMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      const healthCheckInterval = setInterval(() => {
        // Only poll if we suspect connection issues or on mobile
        const shouldCheck = isLikelyMobile || missedUpdates > 0;
        
        if (shouldCheck) {
          addDebugMessage(`📱 Connection health check (mobile: ${isLikelyMobile}, missed: ${missedUpdates})`);
          fetchRoomStatus().catch(() => {
            missedUpdates++;
            addDebugMessage(`⚠️ Connection issue detected (count: ${missedUpdates})`);
            
            if (missedUpdates > 2) {
              addDebugMessage(`🔄 Multiple failures detected, forcing WebSocket reconnect...`);
              // Force WebSocket reconnection for mobile reliability
              try {
                if (databaseMultiplayerState.isConnected()) {
                  databaseMultiplayerState.disconnect();
                  setTimeout(() => {
                    databaseMultiplayerState.connect();
                    addDebugMessage(`✅ WebSocket reconnection attempted`);
                  }, 1000);
                }
              } catch (error) {
                addDebugMessage(`❌ Reconnection failed: ${error}`);
              }
              missedUpdates = 0;
            }
          });
        }
      }, isLikelyMobile ? 8000 : 12000); // More frequent on mobile
      
      return () => {
        addDebugMessage(`📱 Stopping mobile connection monitoring`);
        clearInterval(healthCheckInterval);
      };
    }
  }, [gameMode, roomId, fetchRoomStatus, addDebugMessage]);

  // MOBILE RELIABILITY: Handle page visibility changes (mobile backgrounding/foregrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && roomId) {
        addDebugMessage(`📱 App returned to foreground, checking connection health...`);
        
        // Give mobile browsers a moment to restore connections
        setTimeout(() => {
          if (gameMode === 'lobby' || gameMode === 'game') {
            addDebugMessage(`🔄 Foreground recovery: Refreshing room status`);
            fetchRoomStatus();
            
            // For active games, also refresh game state to catch resignations/moves
            if (gameMode === 'game') {
              addDebugMessage(`🎮 Foreground recovery: Refreshing game state`);
              databaseMultiplayerState.getGameState(roomId)
                .then((gameState) => {
                  if (gameState) {
                    addDebugMessage(`✅ Game state refreshed after foreground`);
                    setGameState(gameState);
                    
                    // Handle any game endings that happened while backgrounded
                    if (gameState.winner && !gameState.gameActive) {
                      const isWinner = gameState.winner === playerRole;
                      const statusMessage = isWinner ? 'You won! 🎉' : 'You lost 😞';
                      addDebugMessage(`🏆 Game ended while backgrounded: ${statusMessage}`);
                      setGameStatus(statusMessage);
                    }
                  }
                })
                .catch((error) => {
                  addDebugMessage(`⚠️ Error refreshing game state: ${error.message}`);
                });
            }
            
            // Check WebSocket connection health
            if (!databaseMultiplayerState.isConnected()) {
              addDebugMessage(`🔌 WebSocket disconnected after backgrounding, reconnecting...`);
              databaseMultiplayerState.connect();
            }
          }
        }, 1000);
      } else if (document.visibilityState === 'hidden') {
        addDebugMessage(`📱 App backgrounded - connections may be suspended`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, gameMode, fetchRoomStatus, addDebugMessage]);

  // MOBILE RELIABILITY: Connection heartbeat for active games
  useEffect(() => {
    const isLikelyMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (gameMode === 'game' && roomId && isLikelyMobile) {
      addDebugMessage(`📱 Starting mobile game connection heartbeat`);
      
      let lastHeartbeat = Date.now();
      const heartbeatInterval = setInterval(() => {
        // Test connection health by checking if we can fetch room status
        const heartbeatStart = Date.now();
        
        databaseMultiplayerState.getRoomStatus(roomId)
          .then(() => {
            const latency = Date.now() - heartbeatStart;
            lastHeartbeat = Date.now();
            
            // Only log if latency is concerning
            if (latency > 3000) {
              addDebugMessage(`📱 Heartbeat slow (${latency}ms) - connection may be degraded`);
            }
          })
          .catch((error) => {
            const timeSinceLastSuccess = Date.now() - lastHeartbeat;
            addDebugMessage(`💔 Heartbeat failed (${timeSinceLastSuccess}ms ago): ${error.message}`);
            
            // If heartbeat has been failing for >15 seconds, force reconnection
            if (timeSinceLastSuccess > 15000) {
              addDebugMessage(`🔄 Heartbeat failure threshold reached, forcing reconnection...`);
              try {
                databaseMultiplayerState.disconnect();
                setTimeout(() => {
                  databaseMultiplayerState.connect();
                  addDebugMessage(`✅ Mobile heartbeat reconnection attempted`);
                }, 1000);
              } catch (reconnectError) {
                addDebugMessage(`❌ Heartbeat reconnection failed: ${reconnectError}`);
              }
              lastHeartbeat = Date.now(); // Reset timer
            }
          });
      }, 10000); // Check every 10 seconds on mobile
      
      return () => {
        addDebugMessage(`📱 Stopping mobile game heartbeat`);
        clearInterval(heartbeatInterval);
      };
    }
  }, [gameMode, roomId, addDebugMessage]);

  // Listen for real-time chat messages
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleChatMessage = (message: any) => {
        try {
          const newMessage = {
            ...message,
            playerId: message.playerRole || message.playerId, // Map playerRole to playerId
            playerName: message.playerRole || message.playerName, // Use playerRole as playerName
            timestamp: typeof message.timestamp === 'string' ? new Date(message.timestamp).getTime() : message.timestamp
          };
          
          setChatMessages(prev => {
            const updated = [...prev, newMessage];
            return updated;
          });
        } catch (error) {
          console.error('❌ Error in handleChatMessage:', error);
        }
      };

      // Use the databaseMultiplayerState callback system instead of direct socket listeners
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        try {
          if (eventData.eventType === 'chatMessage') {
            handleChatMessage(eventData.data);
          }
        } catch (error) {
          console.error('❌ Error in chat message callback:', error);
          console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            eventData: eventData
          });
        }
      });
      
      return cleanup;
    }
  }, [roomId, databaseMultiplayerState.isConnected()]);

  // Listen for escrow updates and refresh room status
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleEscrowUpdate = () => {
        fetchRoomStatus();
      };

      // Use the databaseMultiplayerState callback system
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        if (eventData.eventType === 'escrowUpdated') {
          handleEscrowUpdate();
        }
      });
      
      return cleanup;
    }
  }, [roomId, fetchRoomStatus]);

  // Listen for game state updates
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleGameStateUpdated = (data: any) => {
        addDebugMessage(`🎯 handleGameStateUpdated called for room: ${data.roomId || 'unknown'}`);
        
        // Skip if this is our own broadcast
        const currentSocketId = (databaseMultiplayerState as any).socket?.id;
        
        if (data.senderId && currentSocketId === data.senderId) {
          addDebugMessage(`⏩ Skipping own broadcast (senderId: ${data.senderId})`);
          return;
        }
        
        if (data.gameState) {
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
          
          // Only update if the state has actually changed AND the received state is newer
          if (localStateHash !== receivedStateHash && receivedTimestamp >= localTimestamp) {
            addDebugMessage(`🔄 Game state update: local vs received different, updating...`);
            addDebugMessage(`🎮 New state: winner=${data.gameState.winner}, gameActive=${data.gameState.gameActive}`);
            
            sendLogToBackend('info', 'State has changed and is newer, updating from server', {
              fromPlayer: gameState.currentPlayer,
              toPlayer: data.gameState.currentPlayer,
              localTimestamp,
              receivedTimestamp
            });
            
            // Set flag to prevent saving back to server
            setIsReceivingServerUpdate(true);
            
            // TOYOTA FIX: Preserve essential game properties when updating from server
            const updatedGameState = {
              ...data.gameState,
              // Ensure gameActive is true for ongoing games (unless explicitly ended)
              gameActive: data.gameState.winner || data.gameState.draw ? false : true,
              // Preserve current player if not set in server data
              currentPlayer: data.gameState.currentPlayer || gameState.currentPlayer || 'white'
            };
            
            // Update game state
            setGameState(updatedGameState);
            
            // CRITICAL FIX: Handle game ending scenarios (resignations, checkmates, etc.)
            if (data.gameState.winner) {
              const isWinner = data.gameState.winner === playerRole;
              const statusMessage = isWinner ? `You won! 🎉` : `You lost 😞`;
              addDebugMessage(`🏆 Game ended: ${statusMessage} (winner: ${data.gameState.winner})`);
              setGameStatus(statusMessage);
            } else if (data.gameState.draw) {
              addDebugMessage(`🤝 Game ended in a draw`);
              setGameStatus('Game ended in a draw 🤝');
            }
            
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
              sendLogToBackend('info', 'Server update processing completed', { delay });
            }, delay);
          } else {
            addDebugMessage(`⏭️ Skipping game state update: localHash=${localStateHash === receivedStateHash ? 'same' : 'different'}, timestamp=${receivedTimestamp >= localTimestamp ? 'newer' : 'older'}`);
          }
        } else {
          addDebugMessage(`⚠️ No gameState in update data`);
        }
      };

      // Use the databaseMultiplayerState callback system
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        if (eventData.eventType === 'gameStateUpdated') {
          handleGameStateUpdated(eventData.data);
        }
      });
      
      return cleanup;
    }
  }, [roomId, gameMode, addDebugMessage, gameState, playerRole]);

  // Listen for game started event
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleGameStarted = (data: any) => {
        addDebugMessage(`🎮 Main useEffect received gameStarted event for room: ${data.roomId}`);
        
        if (data.roomId === roomId) {
          // TOYOTA RELIABILITY: Validate that both players have actually deposited
          // before starting the game (prevent premature game start)
          if (roomStatus && roomStatus.players && roomStatus.players.length === 2) {
            const bothPlayersHaveEscrows = roomStatus.escrowCount >= 2;
            
            if (bothPlayersHaveEscrows) {
              addDebugMessage('✅ Main useEffect: Both players have deposited, starting game');
              setGameMode('game');
            } else {
              addDebugMessage(`⚠️ Main useEffect: gameStarted event received but not all players have deposited yet (count=${roomStatus.escrowCount}). Ignoring.`);
              return; // Don't start the game yet
            }
          } else {
            addDebugMessage(`⚠️ Main useEffect: gameStarted event received but room not ready (players=${roomStatus?.players?.length || 0}). Ignoring.`);
            return; // Don't start the game yet
          }
        }
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
        // TOYOTA RELIABILITY: Handle room status updates without auto-starting game
        // The game should only start via proper gameStarted WebSocket event
        // when both players have confirmed deposits
        addDebugMessage(`🔄 Room updated received: ${JSON.stringify(data)}`);
        
        if (data.roomId === roomId) {
          addDebugMessage(`🔄 Room update matches current room, refreshing status...`);
          // Update room status to reflect changes (like escrow updates)
          fetchRoomStatus().then(() => {
            addDebugMessage(`🔄 Room status refreshed after update. Players: ${roomStatus?.players?.length || 0}, Escrows: ${roomStatus?.escrowCount || 0}`);
          }).catch((error) => {
            addDebugMessage(`❌ Error refreshing room status: ${error.message}`);
          });
        } else {
          addDebugMessage(`⚠️ Room update for different room: ${data.roomId} vs ${roomId}`);
        }
      };

      // Use the databaseMultiplayerState callback system
      addDebugMessage(`🔌 Setting up WebSocket listeners for room: ${roomId}`);
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        addDebugMessage(`📡 WebSocket event received: ${eventData.eventType} for room: ${eventData.data?.roomId || 'unknown'}`);
        
        if (eventData.eventType === 'gameStarted') {
          handleGameStarted(eventData.data);
        } else if (eventData.eventType === 'roomUpdated') {
          handleRoomUpdated(eventData.data);
        } else if (eventData.eventType === 'gameStateUpdated') {
          addDebugMessage(`🎯 Game state updated event received - delegating to main handler`);
          // This is handled by the main gameStateUpdated useEffect hook above
        } else if (eventData.eventType === 'connected') {
          addDebugMessage(`🔌 WebSocket connected event received`);
          // TOYOTA RECONNECTION: Update connection status when feature enabled
          if (FEATURES.RECONNECTION) {
            setConnectionStatus('connected');
            addDebugMessage(`🚛 TOYOTA: Connection restored`);
          }
        } else if (eventData.eventType === 'disconnected') {
          addDebugMessage(`🔌 WebSocket disconnected event received`);
          // TOYOTA RECONNECTION: Update connection status when feature enabled
          if (FEATURES.RECONNECTION) {
            setConnectionStatus('disconnected');
            addDebugMessage(`🚛 TOYOTA: Connection lost, will auto-retry`);
          }
        } else if (eventData.eventType === 'reconnecting') {
          addDebugMessage(`🔌 WebSocket reconnecting event received`);
          // TOYOTA RECONNECTION: Update connection status when feature enabled
          if (FEATURES.RECONNECTION) {
            setConnectionStatus('connecting');
            addDebugMessage(`🚛 TOYOTA: Attempting to reconnect...`);
          }
        } else {
          addDebugMessage(`⚠️ Unknown WebSocket event type: ${eventData.eventType}`);
        }
      });
      
      return cleanup;
    }
  }, [roomId, gameMode, roomStatus, fetchRoomStatus, addDebugMessage]);

  // Check game state when reconnecting to handle missed events
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const checkGameState = async () => {
        try {
          // Show reconnection status
          if (gameMode === 'menu') {
            setGameStatus('🔄 Checking for active game...');
          }
          
          const gameState = await databaseMultiplayerState.getGameState(roomId);
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          
          // SAFE RECONNECTION: Only reconnect if all conditions are met
          if (gameState && gameState.gameActive && connected && publicKey && roomStatus) {
            // Validate wallet matches room role (critical security check)
            const isValidPlayer = validateWalletForRole(roomStatus, playerRole, publicKey.toString());
            
            if (isValidPlayer) {
              // Additional safety: Only reconnect to games that have started properly
              const bothPlayersPresent = roomStatus.players && roomStatus.players.length === 2;
              const gameHasMoves = gameState.moveHistory && gameState.moveHistory.length > 0;
              const gameNotFinished = !gameState.winner && !gameState.draw;
              
              if (bothPlayersPresent && gameNotFinished && gameHasMoves) {
                // Safe to reconnect - restore game state (only games with actual moves)
                console.log('✅ Reconnection: Game has moves, restoring game state');
                setGameState(gameState);
                setGameMode('game');
                setGameStatus(`🔄 Reconnected to game! You are ${playerRole}.`);
          
                return;
              }
            } else {
              // Wallet mismatch - show warning but don't break anything
              const mismatchMsg = getWalletMismatchMessage(roomStatus, playerRole, publicKey.toString());
              if (mismatchMsg) {
                setGameStatus(mismatchMsg);
                return;
              }
            }
          }
          
          // No active game found or conditions not met - normal flow
          if (gameMode === 'menu') {
            setGameStatus('Welcome to Knightsbridge Chess!');
          }
          
        } catch (error) {
          console.error('Error checking game state:', error);
          // Graceful fallback - don't break normal flow
          if (gameMode === 'menu') {
            setGameStatus('Welcome to Knightsbridge Chess!');
          }
        }
      };

      // Check game state when connection is established
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        if (eventData.eventType === 'connected') {
          checkGameState();
        }
      });
      
      return cleanup;
    }
  }, [roomId]);

  // Poll for game state changes when in lobby (fallback for missed WebSocket events)
  useEffect(() => {
    if (gameMode === 'lobby' && roomId) {
      // Disable polling to prevent connection issues - rely only on WebSocket events
      
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
            timeLimit={timeLimit}
            setTimeLimit={setTimeLimit}
            balance={balance}
            connected={connected}
            isLoading={appLoading}
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
          />
        );
      
      case 'lobby':
        return (
          <LobbyView
            roomId={roomId}
            playerRole={playerRole}
            playerWallet={publicKey?.toString() || ''}
            betAmount={betAmount}
            timeLimit={timeLimit}
            roomStatus={roomStatus}
            escrowCreated={escrowCreated}
            connected={connected}
            isLoading={appLoading}
            onCreateEscrow={handleCreateEscrow}
            onDepositStake={handleDepositStake}
            onStartGame={handleStartGame}
            onBackToMenu={handleBackToMenu}
            opponentEscrowCreated={opponentEscrowCreated}
            bothEscrowsReady={bothEscrowsReady}
            hasDeposited={hasDeposited}
            // Toyota Reconnection features
            gameState={gameState}
            connectionStatus={connectionStatus}
            onResumeGame={() => {
              addDebugMessage('🚛 TOYOTA: Resume game triggered from lobby');
              if (gameState && gameState.gameActive && gameState.moveHistory?.length > 0) {
                setGameMode('game');
                addDebugMessage(`🎯 Resuming active game: ${gameState.moveHistory.length} moves, ${gameState.currentPlayer}'s turn`);
              }
            }}
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
          onTimeoutGame={handleTimeoutGame}
            onClaimWinnings={handleClaimWinnings}
            onBackToMenu={handleBackToMenu}
            winningsClaimed={winningsClaimed}
            isLoading={appLoading}
            betAmount={betAmount}
            timeLimit={timeLimit}
            onTimerUpdate={handleTimerUpdate}
          />
        );
      
      default:
        return <div>Unknown game mode</div>;
    }
  };



  // Check for special routes
  if (window.location.pathname === '/terms') {
    return (
      <ErrorBoundary>
        <TermsPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App" style={{ 
        backgroundColor: theme.background, 
        color: theme.text,
        minHeight: '100vh',
        fontFamily: 'Inter, Segoe UI, Roboto, system-ui, sans-serif',
        width: '100%',
        overflowX: 'hidden' // Prevent horizontal scroll
      }}>
        {/* Header */}
        <Header 
          currentView={gameMode}
          roomId={roomId}
          balance={balance}
          connected={connected}
          onLogoClick={() => {
            setGameMode('menu');
            setRoomId('');
            setGameState(null);
          }}
        />

        {/* TOYOTA RECONNECTION: Connection status banner (only when feature enabled) */}
        <FeatureWrapper feature="RECONNECTION">
          <ConnectionBanner 
            status={connectionStatus}
            onManualReconnect={() => {
              addDebugMessage('🚛 TOYOTA: Manual reconnection triggered');
              setConnectionStatus('connecting');
              // Force reconnection via databaseMultiplayerState
              databaseMultiplayerState.connect();
            }}
          />
        </FeatureWrapper>

        {/* Debug Panel for Mobile Testing (Toggle with triple-tap on status) */}
        {showDebugPanel && (
          <div style={{
            position: 'fixed',
            top: '80px',
            left: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: '#00ff00',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 9999,
            maxHeight: '200px',
            overflow: 'auto',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              borderBottom: '1px solid #333',
              paddingBottom: '4px'
            }}>
              <strong>🚛 Debug Log</strong>
              <button
                onClick={() => setShowDebugPanel(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #666',
                  color: '#ff6666',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                ✕
              </button>
            </div>
            {debugLog.map((message, index) => (
              <div key={index} style={{ marginBottom: '2px', wordBreak: 'break-word' }}>
                {message}
              </div>
            ))}
            {debugLog.length === 0 && (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                No debug messages yet...
              </div>
            )}
          </div>
        )}

        {/* Debug Panel Toggle - Triple-tap any game status message */}
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          <div 
            onClick={(e) => {
              // Triple-tap detection for mobile
              const now = Date.now();
              const lastTap = (e.target as any).lastTap || 0;
              const tapCount = ((e.target as any).tapCount || 0) + 1;
              
              if (now - lastTap < 500) { // 500ms between taps
                (e.target as any).tapCount = tapCount;
                if (tapCount >= 3) {
                  setShowDebugPanel(!showDebugPanel);
                  addDebugMessage('🚛 Debug panel toggled');
                  (e.target as any).tapCount = 0;
                }
              } else {
                (e.target as any).tapCount = 1;
              }
              (e.target as any).lastTap = now;
            }}
            style={{
              padding: '8px',
              color: theme.textSecondary,
              fontSize: textSizes.small,
              cursor: 'pointer',
              userSelect: 'none',
              border: showDebugPanel ? `1px dashed ${theme.primary}` : 'none',
              borderRadius: '4px'
            }}
          >
            {gameStatus}
            {!showDebugPanel && (
              <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '2px' }}>
                Triple-tap to show debug
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main style={{ 
          padding: isDesktopLayout ? '2rem' : '1rem',
          paddingLeft: isDesktopLayout ? '2rem' : '1rem',
          paddingRight: isDesktopLayout ? '2rem' : '1rem',
          maxWidth: '100vw',
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          paddingTop: isDesktopLayout ? '2rem' : '1rem'
        }}>
          {renderContent()}
        </main>

        {/* Footer - Documentation Link (only on homepage) */}
        {gameMode === 'menu' && (
          <footer style={{
            padding: isDesktopLayout ? '2rem' : '1.5rem',
            marginTop: isDesktopLayout ? '3rem' : '2rem',
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            textAlign: 'center'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '1rem' : '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: theme.textSecondary,
                fontSize: isDesktopLayout ? '0.9rem' : '0.8rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📚</span>
                <span>Need help getting started?</span>
              </div>
              
              <a
                href="https://docs.knightsbridge.games"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: theme.primary,
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: isDesktopLayout ? '0.9rem' : '0.8rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 2px 8px ${theme.primary}30`,
                  border: `1px solid ${theme.primary}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 2px 8px ${theme.primary}30`;
                }}
              >
                <span>📖</span>
                <span>View Documentation</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>↗</span>
              </a>
            </div>
            
            <div style={{
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: theme.textSecondary,
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <span>Complete guides • Game rules • Smart contracts • Developer resources</span>
              <span>•</span>
              <a
                href="/terms"
                style={{
                  color: theme.primary,
                  textDecoration: 'underline',
                  opacity: 1,
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Terms & Conditions
              </a>
            </div>
          </footer>
        )}

        {/* Notification System */}
        <NotificationSystem notifications={notifications} onRemove={removeNotification} />
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