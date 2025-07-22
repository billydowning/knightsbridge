import React, { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Import our custom modules
import { MenuView, LobbyView, GameView } from './components';
import { SOLANA_RPC_ENDPOINT } from './config';
import { useSolanaWallet } from './hooks/useSolanaWallet';
import { useWebSocket } from './hooks/useWebSocket';
import databaseMultiplayerState from './services/databaseMultiplayerState';
import type { ChatMessage } from './components/ChatBox';
import { ENV_CONFIG } from './config/appConfig';
import { ChessEngine } from './engine/chessEngine';

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

// Main Chess App Component
function ChessApp() {
  // Solana wallet hook
  const { 
    publicKey, 
    connected, 
    balance, 
    checkBalance, 
    isLoading 
  } = useSolanaWallet();

  // App state
  const [gameMode, setGameMode] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [playerRole, setPlayerRole] = useState<'white' | 'black' | null>(null);
  const [escrowCreated, setEscrowCreated] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('Welcome to Knightsbridge Chess!');
  const [winningsClaimed, setWinningsClaimed] = useState<boolean>(false);
  
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
    lastMove: null
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Helper functions for WebSocket integration
  const handleOpponentMove = (moveData: any) => {
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
  };

  const applyMovesToGameState = (moves: any[]) => {
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
  };

  // WebSocket hook for real-time game communication
  const {
    sendMove,
    sendChatMessage: wsSendChatMessage
  } = useWebSocket({
    gameId: roomId,
    playerId: publicKey?.toString(),
    playerName: publicKey?.toString().slice(0, 6) + '...' + publicKey?.toString().slice(-4),
    onMoveReceived: (moveData) => {
      console.log('Move received via WebSocket:', moveData);
      // Handle move received from opponent
      handleOpponentMove(moveData);
    },
    onChatMessageReceived: (message) => {
      console.log('Chat message received via WebSocket:', message);
      setChatMessages(prev => [...prev, {
        id: message.id,
        player: message.playerName,
        message: message.message,
        timestamp: new Date(message.timestamp)
      }]);
    },
    onGameStateUpdate: (gameState) => {
      console.log('Game state updated via WebSocket:', gameState);
      // Update local game state with server state
      if (gameState.moves && gameState.moves.length > 0) {
        // Apply moves to local game state
        applyMovesToGameState(gameState.moves);
      }
    },
    onPlayerJoined: (player) => {
      console.log('Player joined via WebSocket:', player);
      setGameStatus(`Opponent joined! Game starting...`);
    },
    onGameStarted: (gameData) => {
      console.log('Game started via WebSocket:', gameData);
      setGameMode('game');
      setGameStatus('Game started!');
    },
    onPlayerDisconnected: (player) => {
      console.log('Player disconnected via WebSocket:', player);
      setGameStatus('Opponent disconnected');
    }
  });

  // Update game status when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      setGameStatus(`Wallet connected: ${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`);
      checkBalance();
    } else if (!connected) {
      setGameStatus('Please connect your wallet to start');
    }
  }, [connected, publicKey, checkBalance]);

  // Update game status when balance changes
  useEffect(() => {
    if (connected && balance > 0) {
      setGameStatus(`Balance: ${balance.toFixed(3)} SOL`);
    }
  }, [balance, connected]);

  // Auto-start game when both escrows are ready
  useEffect(() => {
    if (bothEscrowsReady && gameMode === 'lobby') {
      console.log('🎮 Both escrows ready, starting game automatically...');
      console.log('🔍 Debug - Room status:', databaseMultiplayerState.getRoomStatus(roomId));
      console.log('🔍 Debug - Both escrows ready:', bothEscrowsReady);
      console.log('🔍 Debug - Game mode:', gameMode);
      console.log('🔍 Debug - Player role:', playerRole);
      
      setTimeout(() => {
        setGameMode('game');
        setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
      }, 2000);
    }
  }, [bothEscrowsReady, gameMode, playerRole, roomId]);

  // Set up multiplayer sync when room ID or game mode changes
  useEffect(() => {
    if (roomId && (gameMode === 'lobby' || gameMode === 'game')) {
      console.log('🔄 Setting up multiplayer sync for room:', roomId, 'mode:', gameMode);
      
      const cleanup = databaseMultiplayerState.setupStorageSync(() => {
        console.log('📡 Multiplayer sync triggered');
        
        // Sync game state from database (only in game mode)
        if (gameMode === 'game') {
          // Add a small delay to prevent race conditions with recent moves
          setTimeout(() => {
            databaseMultiplayerState.getGameState(roomId).then((savedGameState) => {
              if (savedGameState) {
                console.log('📥 Loading game state from database:', savedGameState);
                
                // Only update if the saved state is significantly newer than our current state
                // This prevents overriding with stale data and race conditions
                if (!gameState.lastUpdated || savedGameState.lastUpdated > gameState.lastUpdated + 100) {
                  console.log('✅ Updating game state with newer database state');
                  setGameState(savedGameState);
                } else {
                  console.log('⏭️ Skipping update - local state is newer or too recent');
                }
              }
            }).catch(error => {
              console.error('Error loading game state:', error);
            });
          }, 500); // 500ms delay to prevent race conditions
        }
        
        // Check room status for escrow updates (works in both lobby and game modes)
        databaseMultiplayerState.getRoomStatus(roomId).then((roomStatus) => {
          if (roomStatus) {
            console.log('📊 Room status updated:', roomStatus);
            const escrowCount = Object.keys(roomStatus.escrows).length;
            const playerWallet = publicKey?.toString();
            
            // Check if opponent has created an escrow (not counting our own)
            const opponentEscrowExists = roomStatus.escrows && 
              Object.keys(roomStatus.escrows).some(escrowWallet => 
                escrowWallet !== playerWallet
              );
            
            // Update escrow status
            setOpponentEscrowCreated(opponentEscrowExists);
            setBothEscrowsReady(escrowCount >= 2);
            
            // Auto-start game if both escrows are ready
            if (escrowCount >= 2 && gameMode === 'lobby') {
              console.log('🎮 Both escrows ready, starting game automatically...');
              setGameMode('game');
              setGameStatus('Game started! Both escrows are ready.');
            }
          }
        }).catch(error => {
          console.error('Error getting room status:', error);
        });
      });
      
      return cleanup;
    }
  }, [roomId, gameMode]);

  // Poll for room status updates (fallback for real-time sync)
  useEffect(() => {
    if (roomId && gameMode === 'lobby') {
      const interval = setInterval(async () => {
        try {
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          if (roomStatus) {
            const escrowCount = Object.keys(roomStatus.escrows).length;
            const playerWallet = publicKey?.toString();
            
            // Check if opponent has created an escrow (not counting our own)
            const opponentEscrowExists = roomStatus.escrows && 
              Object.keys(roomStatus.escrows).some(escrowWallet => 
                escrowWallet !== playerWallet
              );
            
            // Update escrow status
            setOpponentEscrowCreated(opponentEscrowExists);
            setBothEscrowsReady(escrowCount >= 2);
            
            // Auto-start game if both escrows are ready
            if (escrowCount >= 2) {
              console.log('🎮 Both escrows ready, starting game automatically...');
              setGameMode('game');
              setGameStatus('Game started! Both escrows are ready.');
            }
          }
        } catch (error) {
          console.error('Error polling room status:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [roomId, gameMode]);

  // Save game state to database when it changes
  useEffect(() => {
    if (roomId && gameMode === 'game') {
      console.log('💾 Saving game state to database for sync');
      databaseMultiplayerState.saveGameState(roomId, gameState).catch(error => {
        console.error('Error saving game state:', error);
      });
    }
  }, [gameState, roomId, gameMode]);

  // Reset game state when game starts
  useEffect(() => {
    if (gameMode === 'game') {
      console.log('🎮 Game mode changed to game, resetting game state...');
      
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
        lastMove: null
      };
      
      setGameState(newGameState);
      console.log('Game started with player role:', playerRole, 'initial currentPlayer:', newGameState.currentPlayer);
    }
  }, [gameMode, playerRole]);

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
      await databaseMultiplayerState.addEscrow(roomId, playerWallet, betAmount);
      
      // Update local state to show escrow was created
      setEscrowCreated(true);
      
      setGameStatus(`Escrow created! Bet: ${betAmount} SOL. Waiting for opponent...`);
      console.log('✅ Escrow created successfully');
      
      // Check if both players have created escrows
      const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
      if (roomStatus && roomStatus.escrowCount >= 2) {
        setBothEscrowsReady(true);
        console.log('💰 Both escrows ready!');
      }
      
    } catch (error) {
      console.error('Error creating escrow:', error);
      setGameStatus(`Error creating escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSquareClick = (square: string) => {
    if (!roomId || gameMode !== 'game') return;
    
    // If no square is selected, select this square if it has a piece
    if (!gameState.selectedSquare) {
      const piece = gameState.position[square];
      if (piece) {
        const pieceColor = ChessEngine.getPieceColor(piece);
        if (pieceColor === gameState.currentPlayer) {
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
          return;
        }
      }
      return;
    }
    
    // If a square is selected, try to move
    const fromSquare = gameState.selectedSquare;
    const toSquare = square;
    
    // Validate move using existing function
    if (validateMove(gameState.position, fromSquare, toSquare, gameState.currentPlayer)) {
      // Create new position by making the move
      const newPosition = { ...gameState.position };
      newPosition[toSquare] = newPosition[fromSquare];
      newPosition[fromSquare] = '';
      
      const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      const nextPlayerInCheck = isKingInCheck(newPosition, nextPlayer);
      
      // Create updated game state
      const updatedGameState = {
        ...gameState,
        position: newPosition,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        lastMove: { from: fromSquare, to: toSquare },
        inCheck: nextPlayerInCheck,
        lastUpdated: Date.now()
      };
      
      // Save to database FIRST (single source of truth)
      databaseMultiplayerState.saveGameState(roomId, updatedGameState)
        .then(() => {
          console.log('✅ Game state saved to database');
          console.log('🔄 Turn changed from', gameState.currentPlayer, 'to', nextPlayer);
          // Only update local state AFTER successful database save
          setGameState(updatedGameState);
          
          // Add a small delay before allowing real-time sync to prevent race conditions
          setTimeout(() => {
            console.log('✅ Move completed and synchronized');
          }, 100);
        })
        .catch(error => {
          console.error('❌ Failed to save game state:', error);
          setGameStatus('Error saving move. Please try again.');
        });
    } else {
      // Invalid move - just update selection
      const piece = gameState.position[square];
      if (piece) {
        const pieceColor = ChessEngine.getPieceColor(piece);
        if (pieceColor === gameState.currentPlayer) {
          setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
        } else {
          setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        }
      } else {
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
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }
    
    const playerWallet = publicKey.toString();
    
    try {
      // If no room ID provided, create a new room
      if (!roomId.trim()) {
        const newRoomId = `ROOM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Create room using database multiplayer state
        const role = await databaseMultiplayerState.createRoom(newRoomId, playerWallet);
        if (role) {
          setPlayerRole(role);
          setRoomId(newRoomId); // Set room ID after successful creation
          setGameStatus(`Room created: ${newRoomId} - You are ${role}. Share this ID with your opponent!`);
          setGameMode('lobby'); // Proceed directly to lobby
        } else {
          setGameStatus('Failed to create room');
          return;
        }
      } else {
        // Joining existing room
        const role = await databaseMultiplayerState.joinRoom(roomId, playerWallet);
        if (role) {
          setPlayerRole(role);
          setGameStatus(`Joined room: ${roomId} - You are ${role}. Waiting for opponent...`);
          
          // Check if game has already started or both escrows are ready
          const roomStatus = await databaseMultiplayerState.getRoomStatus(roomId);
          if (roomStatus) {
            const escrowCount = Object.keys(roomStatus.escrows).length;
            console.log('💰 Room escrow count:', escrowCount);
            
            // Only set escrow status if the current player has created their escrow
            // Don't auto-start game until both players have actually created escrows
            if (escrowCount >= 1) {
              setOpponentEscrowCreated(true);
            }
            
            // Only set both escrows ready if we have 2 escrows AND the game hasn't started yet
            if (escrowCount >= 2 && !roomStatus.gameStarted) {
              setBothEscrowsReady(true);
              console.log('💰 Both escrows ready, game will start automatically...');
              setGameStatus(`Both escrows ready! Game will start automatically...`);
            }
            
            if (roomStatus.gameStarted) {
              console.log('🎮 Game already started, loading game state...');
              
              // Load existing game state if available
              const savedGameState = await databaseMultiplayerState.getGameState(roomId);
              if (savedGameState) {
                console.log('📥 Loading existing game state:', savedGameState);
                setGameState(savedGameState);
              }
              
              setTimeout(() => {
                setGameMode('game');
                setGameStatus(`Game in progress! You are ${role}.`);
              }, 1000);
            }
          }
          
          setGameMode('lobby');
        } else {
          setGameStatus('Failed to join room. Room may not exist or be full.');
          return;
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setGameStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Helper function to detect checkmate
  const detectCheckmate = (position: any, currentPlayer: string): boolean => {
    console.log('🔍 Checking for checkmate...');
    console.log('Position:', position);
    console.log('Current player:', currentPlayer);
    
    // Find the king of the current player
    const kingSymbol = currentPlayer === 'white' ? '♔' : '♚';
    let kingFound = false;
    let kingSquare = null;
    
    // Check if king still exists on the board
    for (const square in position) {
      if (position[square] === kingSymbol) {
        kingFound = true;
        kingSquare = square;
        break;
      }
    }
    
    console.log('King symbol:', kingSymbol);
    console.log('King found:', kingFound);
    console.log('King square:', kingSquare);
    
    if (!kingFound) {
      console.log('🏆 CHECKMATE DETECTED! King was captured!');
      return true;
    }
    
    // Additional check: if king is in check and can't move
    if (kingSquare) {
      const isInCheck = isKingInCheck(position, currentPlayer);
      if (isInCheck) {
        console.log('⚠️ King is in check, checking if it can escape...');
        const canEscape = checkIfKingCanEscape(position, kingSquare, currentPlayer);
        if (!canEscape) {
          console.log('🏆 CHECKMATE DETECTED! King is trapped!');
          return true;
        }
      }
    }
    
    console.log('✅ King still exists and can escape, no checkmate');
    return false;
  };
  

  
  // Helper function to check if king can escape
  const checkIfKingCanEscape = (position: any, kingSquare: string, currentPlayer: string): boolean => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    // Check all adjacent squares for king escape
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      for (let rankIndex = 0; rankIndex < ranks.length; rankIndex++) {
        const targetSquare = files[fileIndex] + ranks[rankIndex];
        const fileDiff = Math.abs(files[fileIndex].charCodeAt(0) - kingSquare[0].charCodeAt(0));
        const rankDiff = Math.abs(parseInt(ranks[rankIndex]) - parseInt(kingSquare[1]));
        
        // Only check adjacent squares
        if (fileDiff <= 1 && rankDiff <= 1 && targetSquare !== kingSquare) {
          // Check if square is empty or contains opponent piece
          const targetPiece = position[targetSquare];
          if (!targetPiece || (currentPlayer === 'white' ? ['♚', '♛', '♜', '♝', '♞', '♟'] : ['♔', '♕', '♖', '♗', '♘', '♙']).includes(targetPiece)) {
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
    }
    
    console.log('❌ King cannot escape');
    return false;
  };
  
  // Helper function to validate chess moves
  const validateMove = (position: any, fromSquare: string, toSquare: string, currentPlayer: string): boolean => {
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
    
    // Clear any existing game state from localStorage
    if (roomId) {
      localStorage.removeItem(`chess_game_${roomId}`);
      localStorage.removeItem(`chess_chat_${roomId}`);
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
    
    // Save game state to localStorage for multiplayer sync
    if (roomId) {
      console.log('💾 Saving winner declaration to localStorage');
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
      const isValid = validateMove(gameState.position, move.from, move.to, move.player);
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
      player: playerRole,
      message,
      timestamp: new Date()
    };
    
    console.log('💬 Sending chat message:', newMessage);
    
    // Add message to local state
    setChatMessages(prev => [...prev, newMessage]);
    
    // Save to localStorage for multiplayer sync
    if (roomId) {
      const chatKey = `chess_chat_${roomId}`;
      const existingMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
      const updatedMessages = [...existingMessages, newMessage];
      localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: chatKey,
        newValue: JSON.stringify(updatedMessages)
      }));
    }
  };

  // Load chat messages from localStorage
  useEffect(() => {
    if (roomId) {
      const chatKey = `chess_chat_${roomId}`;
      const savedMessages = localStorage.getItem(chatKey);
      if (savedMessages) {
        try {
          const messages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setChatMessages(messagesWithDates);
        } catch (error) {
          console.error('Error loading chat messages:', error);
        }
      }
    }
  }, [roomId]);

  // Listen for chat message updates from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('chess_chat_') && event.newValue) {
        try {
          const messages = JSON.parse(event.newValue);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setChatMessages(messagesWithDates);
        } catch (error) {
          console.error('Error parsing chat messages:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
            isLoading={isLoading}
          />
        );
      
      case 'lobby':
        return (
          <LobbyView
            roomId={roomId}
            playerRole={playerRole}
            playerWallet={publicKey?.toString() || ''}
            betAmount={betAmount}
            roomStatus={null}
            escrowCreated={escrowCreated}
            connected={connected}
            isLoading={isLoading}
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
            betAmount={betAmount}
            gameState={gameState}
            onSquareClick={handleSquareClick}
            onResignGame={handleResignGame}
            onClaimWinnings={handleClaimWinnings}
            onStartNewGame={handleStartNewGameWithEscrow}
            onBackToMenu={handleBackToMenu}
            winningsClaimed={winningsClaimed}
            isLoading={isLoading}
            onDeclareWinner={handleDeclareWinner}
            onTestCheckmate={handleTestCheckmate}
            onTestCurrentBoard={handleTestCurrentBoard}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
          />
        );
      
      default:
        return <div>Unknown game mode</div>;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>♟️ Knightsbridge Chess</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <WalletMultiButton />
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {gameStatus}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '2rem' }}>
        {renderContent()}
      </div>
    </div>
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
            <ChessApp />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App;