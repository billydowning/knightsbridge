import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useDatabaseMultiplayerState } from './services/databaseMultiplayerState';
import { useSolanaWallet } from './hooks/useSolanaWallet';
import websocketService from './services/websocketService';
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

  // Check if both escrows are ready and start game
  useEffect(() => {
    if (bothEscrowsReady && gameMode === 'lobby') {
      // Check room status to confirm game should start
      fetchRoomStatus().then(() => {
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
      // DISABLED: Auto-set bothEscrowsReady based on escrow count
      // This was causing premature game start before deposits
      /*
      if (roomStatus.escrowCount >= 2) {
        setBothEscrowsReady(true);
      }
      */
      console.log('🔍 Room status escrow check (disabled):', { escrowCount: roomStatus.escrowCount });
    }
  }, [roomStatus, gameMode]);

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
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
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
      
      console.log('🔍 Debug - Room Status:', roomStatus);
      console.log('🔍 Debug - Player Count:', roomStatus?.playerCount);
      console.log('🔍 Debug - Player Wallet:', playerWallet);
      console.log('🔍 Debug - Has Player Escrow:', hasPlayerEscrow);
      console.log('🔍 Debug - Is First Player:', isFirstPlayer);
      console.log('🔍 Debug - Player Role:', playerRole);
      
      let success = false;
      
      if (playerRole === 'white') {
        // White player - initialize the game escrow
        console.log('🔍 Debug - White player: Calling createEscrow (initialize_game)');
        success = await createEscrow(roomId, betAmount, playerRole);
      } else if (playerRole === 'black') {
        // Black player - join the existing escrow
        console.log('🔍 Debug - Black player: Calling createEscrow (join_game)');
        success = await createEscrow(roomId, betAmount, playerRole);
      } else {
        setGameStatus('Error: Player role not determined');
        setAppLoading(false);
        return;
      }
      
      if (success) {
        // Update database after successful blockchain transaction
        await databaseMultiplayerState.addEscrow(roomId, playerWallet, betAmount);
        
        // Update local state to show escrow was created
        setEscrowCreated(true);
        
        setGameStatus(`Escrow created on Solana! Bet: ${betAmount} SOL. Waiting for opponent...`);
        
        // Check if both players have created escrows
        const afterStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        // DISABLED: Set bothEscrowsReady based on escrow count (should be based on deposits)
        /*
        if (afterStatus && afterStatus.escrowCount >= 2) {
          setBothEscrowsReady(true);
        }
        */
        console.log('🔍 After escrow creation check (disabled):', { escrowCount: afterStatus?.escrowCount });
        
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
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }
    
    if (!roomId) {
      setGameStatus('No room ID available');
      return;
    }
    
    try {
      setGameStatus('Depositing stake to escrow...');
      setAppLoading(true);
      
      console.log('🔍 Debug - DepositStake - Starting deposit');
      console.log('🔍 Debug - DepositStake - Room ID:', roomId);
      console.log('🔍 Debug - DepositStake - Bet Amount:', betAmount);
      console.log('🔍 Debug - DepositStake - Player Role:', playerRole);
      
      // Call the depositStake function from the hook
      const success = await depositStake(roomId, betAmount);
      
      if (success) {
        setGameStatus(`✅ Deposit successful! ${betAmount} SOL deposited. Waiting for opponent...`);
        
        // Refresh room status to check if both players have deposited
        const afterStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        // DISABLED: Set bothEscrowsReady based on escrow count (should be based on actual deposits)
        /*
        if (afterStatus && afterStatus.escrowCount >= 2) {
          setBothEscrowsReady(true);
        }
        */
        
        // Listen for game start via WebSocket instead of polling
        console.log('🔌 Setting up WebSocket listener for game start...');
        
        const handleGameStarted = (data: any) => {
          console.log('🎮 Game started via WebSocket!', data);
          if (data.roomId === roomId) {
            setGameStatus('🎮 Both players deposited! Game starting...');
            setBothEscrowsReady(true);
            
            // Remove the listener after game starts
            const socket = (websocketService as any).socket;
            if (socket) {
              socket.off('gameStarted', handleGameStarted);
            }
          }
        };
        
        // Set up direct socket listener for gameStarted event
        if (websocketService && websocketService.isConnected()) {
          // Get direct socket access for this custom event
          const socket = (websocketService as any).socket;
          if (socket) {
            socket.on('gameStarted', handleGameStarted);
            
            // Set a timeout to clean up listener if game doesn't start
            setTimeout(() => {
              socket.off('gameStarted', handleGameStarted);
              console.log('⏰ WebSocket listener timeout - cleaning up');
              
              // Check one final time via room status
              databaseMultiplayerState.getRoomStatus(roomId).then(finalStatus => {
                if (finalStatus?.gameStarted) {
                  setGameStatus('🎮 Both players deposited! Game starting...');
                  setBothEscrowsReady(true);
                } else {
                  setGameStatus('⏰ Deposits complete but game not started. Try refreshing the page.');
                }
              });
            }, 120000); // 2 minutes timeout
          }
        }
        
        console.log('🔍 After deposit check (disabled):', { escrowCount: afterStatus?.escrowCount });
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
    console.log('🔍 Square clicked:', square);
    console.log('🔍 Game mode:', gameMode);
    console.log('🔍 Room ID:', roomId);
    console.log('🔍 Current player:', gameState.currentPlayer);
    console.log('🔍 Player role:', playerRole);
    console.log('🔍 Is player turn:', gameState.currentPlayer === playerRole);
    
    if (!roomId || gameMode !== 'game') {
      console.log('❌ Not in game mode or no room');
      return;
    }
    
    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerRole) {
      console.log('❌ Not player turn');
      setGameStatus(`It's ${gameState.currentPlayer}'s turn. You are ${playerRole}.`);
      return;
    }
    
    console.log('✅ Player turn confirmed');
    
    // If no square is selected, select this square if it has a piece
    if (!gameState.selectedSquare) {
      const piece = gameState.position[square];
      console.log('🔍 Piece on square:', piece);
      
      if (piece) {
        const pieceColor = getPieceColorFromAnyFormat(piece);
        console.log('🔍 Piece color:', pieceColor);
        console.log('🔍 Current player:', gameState.currentPlayer);
        console.log('🔍 Colors match:', pieceColor === gameState.currentPlayer);
        
        if (pieceColor === gameState.currentPlayer) {
          console.log('✅ Selecting piece at', square);
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          setGameStatus(`Selected ${piece} at ${square}`);
          return;
        } else {
          console.log('❌ Wrong piece color');
          setGameStatus(`Cannot select ${pieceColor} piece - it's ${gameState.currentPlayer}'s turn`);
        }
      } else {
        console.log('❌ No piece on square');
        setGameStatus('No piece on this square');
      }
      return;
    }
    
    // If a square is selected, try to move
    const fromSquare = gameState.selectedSquare;
    const toSquare = square;
    
    console.log('🔍 Attempting move from', fromSquare, 'to', toSquare);
    console.log('🔍 Game state position:', gameState.position);
    console.log('🔍 Current player:', gameState.currentPlayer);
    
    // Validate move using existing function
    const isValidMove = validateLocalMove(gameState.position, fromSquare, toSquare, gameState.currentPlayer);
    console.log('🔍 Move validation result:', isValidMove);
    
    if (isValidMove) {
      console.log('✅ Valid move - executing move');
      
      // Create new position by making the move
      const newPosition = { ...gameState.position };
      newPosition[toSquare] = newPosition[fromSquare];
      newPosition[fromSquare] = '';
      
      const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      const nextPlayerInCheck = isKingInCheck(newPosition, nextPlayer);
      const nextPlayerInCheckmate = detectCheckmate(newPosition, nextPlayer);
      
      // Determine winner if checkmate occurs
      const winner = nextPlayerInCheckmate ? gameState.currentPlayer : null;
      
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
      console.log('❌ Invalid move - updating selection instead');
      
      // Invalid move - just update selection
      const piece = gameState.position[square];
      if (piece) {
        const pieceColor = getPieceColorFromAnyFormat(piece);
        console.log('🔍 Destination square has piece:', piece, 'color:', pieceColor);
        if (pieceColor === gameState.currentPlayer) {
          console.log('🔍 Selecting new piece at', square);
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          setGameStatus(`Selected ${piece} at ${square}`);
        } else {
          console.log('🔍 Clearing selection - wrong color piece');
          setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
          setGameStatus('Invalid move - cleared selection');
        }
      } else {
        console.log('🔍 Clearing selection - empty destination square');
        setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        setGameStatus('Invalid move to empty square - cleared selection');
      }
    }
  };

  const handleClaimWinnings = async () => {
    if (!connected || !publicKey || !roomId || !gameState.winner) {
      setGameStatus('Cannot claim winnings: missing wallet, room, or winner');
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
      
      if (result === 'success') {
        setWinningsClaimed(true);
        setGameStatus('Winnings claimed successfully on Solana!');
      } else {
        setGameStatus(`Failed to claim winnings: ${result}`);
      }
      
    } catch (err) {
      console.error('❌ Claiming winnings failed:', err);
      setGameStatus('Failed to claim winnings. Please try again.');
    } finally {
      setAppLoading(false);
    }
  };

  const handleJoinRoom = async () => {
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
        // Create the room (backend will generate room ID)
        const result = await databaseMultiplayerState.createRoom(playerWallet);
        if (result.role && result.roomId) {
          setPlayerRole(result.role);
          setRoomId(result.roomId);
          setGameMode('lobby');
          setGameStatus(`Room created! Share Room ID: ${result.roomId} with your opponent`);
          
          // Get room status using the new room ID
          const roomStatus = await databaseMultiplayerState.getRoomStatus(result.roomId);
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
          }
        } else {
          setGameStatus('Failed to create room');
        }
      } else {
        // Joining an existing room
        const role = await databaseMultiplayerState.joinRoom(roomId, playerWallet);
        if (role) {
          setPlayerRole(role);
          setGameMode('lobby');
          setGameStatus(`Joined room as ${role}`);
          
          // Get room status using the current room ID
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          
          // Check if current player already has an escrow
          if (roomStatus && roomStatus.escrows && roomStatus.escrows[playerWallet]) {
            setEscrowCreated(true);
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
    
    if (!playerRole || !roomId) {
      console.error('Cannot resign: missing player role or room ID');
      return;
    }
    
    try {
      // Update local game state
      const winner = playerRole === 'white' ? 'black' : 'white';
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
      
      await databaseMultiplayerState.saveGameState(roomId, updatedState);
      
      // Send chat message about resignation
      const resignationMessage = `${playerRole} resigned the game. ${winner} wins!`;
      await databaseMultiplayerState.sendChatMessage(roomId, resignationMessage, publicKey?.toString() || '', playerRole);
      
      setGameStatus(`${winner} wins by resignation!`);
      
    } catch (error) {
      console.error('Error resigning game:', error);
      setGameStatus(`Error resigning game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    console.log('�� Checking for checkmate...');
    console.log('Position:', position);
    console.log('Current player:', currentPlayer);
    
    // First, check if the king is in check
    const isInCheck = isKingInCheck(position, currentPlayer);
    if (!isInCheck) {
      console.log('✅ King is not in check, no checkmate');
      return false;
    }
    
    // Find the king of the current player
    let kingSquare = null;
    
    // Find the king's position using our helper function
    for (const square in position) {
      const piece = position[square];
      if (piece && getPieceTypeFromAnyFormat(piece) === 'king' && getPieceColorFromAnyFormat(piece) === currentPlayer) {
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
        const isOwnPiece = targetPiece && getPieceColorFromAnyFormat(targetPiece) === currentPlayer;
        
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
      // Capture move
      if (fileDiff === 1 && rankDiff === 1) {
        return targetPiece && getPieceTypeFromAnyFormat(targetPiece) !== 'pawn';
      }
      return false;
    }
    
    // King moves
    if (pieceType === 'king') {
      return fileDiff <= 1 && rankDiff <= 1;
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
        const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
        
        if (roomStatus) {
          setRoomStatus(roomStatus);
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
        // Skip if this is our own broadcast
        const currentSocketId = (databaseMultiplayerState as any).socket?.id;
        
        if (data.senderId && currentSocketId === data.senderId) {
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
              sendLogToBackend('info', 'Server update processing completed', { delay });
            }, delay);
          }
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
  }, [roomId, gameMode]);

  // Listen for game started event
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const handleGameStarted = (data: any) => {
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
        // Check if game state is active as a fallback for gameStarted event
        if (data.gameState === 'active' && gameMode === 'lobby') {
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

      // Use the databaseMultiplayerState callback system
      const cleanup = databaseMultiplayerState.setupRealtimeSync(roomId, (eventData: any) => {
        if (eventData.eventType === 'gameStarted') {
          handleGameStarted(eventData.data);
        } else if (eventData.eventType === 'roomUpdated') {
          handleRoomUpdated(eventData.data);
        }
      });
      
      return cleanup;
    }
  }, [roomId, gameMode]);

  // Check game state when reconnecting to handle missed events
  useEffect(() => {
    if (roomId && databaseMultiplayerState.isConnected()) {
      const checkGameState = async () => {
        try {
          const gameState = await databaseMultiplayerState.getGameState(roomId);
          // DISABLED: Auto-switch to game mode based on database state
          // This was causing premature game start before deposits
          /*
          if (gameState && gameState.gameActive) {
            setGameMode('game');
          }
          */
          console.log('🔍 Reconnection game state check (disabled):', { gameState: gameState?.gameActive });
        } catch (error) {
          console.error('Error checking game state:', error);
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
            onDepositStake={handleDepositStake}
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