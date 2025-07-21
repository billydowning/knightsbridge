import { useState, useEffect } from 'react';
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
import multiplayerState from './services/multiplayerState';
import type { ChatMessage } from './components/ChatBox';

// Types
type AppGameMode = 'menu' | 'lobby' | 'game';

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
  const [gameMode, setGameMode] = useState<AppGameMode>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [playerRole, setPlayerRole] = useState<string>('white');
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
      console.log('🔍 Debug - Room status:', multiplayerState.getRoomStatus(roomId));
      console.log('🔍 Debug - Both escrows ready:', bothEscrowsReady);
      console.log('🔍 Debug - Game mode:', gameMode);
      console.log('🔍 Debug - Player role:', playerRole);
      
      setTimeout(() => {
        setGameMode('game');
        setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
      }, 2000);
    }
  }, [bothEscrowsReady, gameMode, playerRole, roomId]);

  // Multiplayer state synchronization
  useEffect(() => {
    if (roomId && (gameMode === 'game' || gameMode === 'lobby')) {
      console.log('🔄 Setting up multiplayer sync for room:', roomId, 'mode:', gameMode);
      
      const cleanup = multiplayerState.setupStorageSync(() => {
        console.log('📡 Multiplayer sync triggered');
        
        // Sync game state from localStorage (only in game mode)
        if (gameMode === 'game') {
          const savedGameState = multiplayerState.getGameState(roomId);
          if (savedGameState) {
            console.log('📥 Loading game state from storage:', savedGameState);
            
            // Preserve winner if it exists in current state but not in saved state
            setGameState((currentState: any) => {
              const newState = { ...savedGameState };
              
              // If current state has a winner but saved state doesn't, preserve the winner
              if (currentState.winner && !savedGameState.winner) {
                console.log('🏆 Preserving winner from current state:', currentState.winner);
                newState.winner = currentState.winner;
                newState.gameActive = false;
              }
              
              return newState;
            });
          }
        }
        
        // Check room status for escrow updates (works in both lobby and game modes)
        const roomStatus = multiplayerState.getRoomStatus(roomId);
        if (roomStatus) {
          console.log('📊 Room status updated:', roomStatus);
          const escrowCount = Object.keys(roomStatus.escrows).length;
          console.log('💰 Escrow count:', escrowCount);
          
          // Update escrow status
          setOpponentEscrowCreated(escrowCount >= 2);
          setBothEscrowsReady(escrowCount >= 2);
          
          // If both escrows are ready and we're in lobby, auto-start game
          if (escrowCount >= 2 && gameMode === 'lobby' && !bothEscrowsReady) {
            console.log('🎮 Both escrows ready, auto-starting game...');
            setBothEscrowsReady(true);
          }
        }
      });
      
      return cleanup;
    }
  }, [roomId, gameMode, bothEscrowsReady]);

  // Periodic escrow status check (fallback for sync issues)
  useEffect(() => {
    if (roomId && gameMode === 'lobby' && !bothEscrowsReady) {
      console.log('⏰ Setting up periodic escrow check...');
      
      const interval = setInterval(() => {
        const roomStatus = multiplayerState.getRoomStatus(roomId);
        if (roomStatus) {
          const escrowCount = Object.keys(roomStatus.escrows).length;
          console.log('⏰ Periodic check - escrow count:', escrowCount);
          console.log('⏰ Periodic check - room status:', roomStatus);
          console.log('⏰ Periodic check - both escrows ready:', bothEscrowsReady);
          
          if (escrowCount >= 2 && !bothEscrowsReady) {
            console.log('💰 Both escrows detected via periodic check!');
            setOpponentEscrowCreated(true);
            setBothEscrowsReady(true);
          }
        }
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [roomId, gameMode, bothEscrowsReady]);

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



  const handleSquareClick = (square: string) => {
    console.log('Square clicked:', square);
    
    if (!gameState.gameActive) {
      console.log('Game is not active');
      return;
    }
    
    const isMyTurn = gameState.currentPlayer === playerRole;
    console.log('Turn check:', { currentPlayer: gameState.currentPlayer, playerRole, isMyTurn });
    if (!isMyTurn) {
      console.log('Not your turn');
      return;
    }
    
    // Get the piece at the clicked square
    const piece = (gameState.position as any)[square];
    // White pieces: ♔♕♖♗♘♙, Black pieces: ♚♛♜♝♞♟
    const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const pieceColor = piece ? (whitePieces.includes(piece) ? 'white' : 'black') : null;
    
    // If a square is already selected
    if (gameState.selectedSquare) {
      // Try to make a move from selected square to clicked square
      const fromSquare = gameState.selectedSquare;
      const toSquare = square;
      
      console.log(`Attempting move from ${fromSquare} to ${toSquare}`);
      
      // Validate the move
      const isValidMove = validateMove(gameState.position, fromSquare, toSquare, gameState.currentPlayer);
      
      console.log('🔍 Move validation:', {
        fromSquare,
        toSquare,
        piece: gameState.position[fromSquare],
        currentPlayer: gameState.currentPlayer,
        isValidMove
      });
      
      if (!isValidMove) {
        console.log('❌ Invalid move!');
        setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        return;
      }
      
      // Make the move
      const newPosition = { ...gameState.position };
      (newPosition as any)[toSquare] = (newPosition as any)[fromSquare];
      (newPosition as any)[fromSquare] = '';
      
      // Check if this move puts the current player's king in check
      const putsOwnKingInCheck = isKingInCheck(newPosition, gameState.currentPlayer);
      console.log('🔍 Check detection:', {
        putsOwnKingInCheck,
        currentPlayer: gameState.currentPlayer
      });
      
      if (putsOwnKingInCheck) {
        console.log('❌ Move would put own king in check!');
        setGameState((prev: any) => ({ ...prev, selectedSquare: null }));
        return;
      }
      
      // Check if a king was captured during this move
      const capturedPiece = (gameState.position as any)[toSquare];
      const isKingCapture = capturedPiece === '♔' || capturedPiece === '♚';
      
      console.log('🎯 Move analysis:', {
        fromSquare,
        toSquare,
        capturedPiece,
        isKingCapture,
        currentPlayer: gameState.currentPlayer
      });
      
      // Check for checkmate after the move
      const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      const isCheckmate = isKingCapture || detectCheckmate(newPosition, nextPlayer);
      
      console.log('🔍 Checkmate check:', {
        nextPlayer,
        isKingCapture,
        isCheckmate,
        currentPlayer: gameState.currentPlayer,
        winner: isCheckmate ? gameState.currentPlayer : null
      });
      
      // Check if the next player is in check
      const isNextPlayerInCheck = isKingInCheck(newPosition, nextPlayer);
      console.log('🔍 Next player check status:', {
        nextPlayer,
        isNextPlayerInCheck
      });
      
      // Update the game state
      const updatedGameState = {
        ...gameState,
        position: newPosition,
        selectedSquare: null,
        currentPlayer: nextPlayer,
        moveHistory: [...gameState.moveHistory, { from: fromSquare, to: toSquare }],
        lastMove: { from: fromSquare, to: toSquare },
        lastUpdated: Date.now(),
        gameActive: !isCheckmate,
        winner: isCheckmate ? gameState.currentPlayer : null,
        inCheck: isNextPlayerInCheck
      };
      
      // Update the game state using setState
      setGameState(updatedGameState);
      
      console.log('Move completed:', updatedGameState);
      console.log('Turn changed from', gameState.currentPlayer, 'to', updatedGameState.currentPlayer);
      
      if (isCheckmate) {
        console.log('🏆 CHECKMATE! Winner:', gameState.currentPlayer);
        setGameStatus(`🏆 ${gameState.currentPlayer} wins by checkmate!`);
      } else {
        // Manual testing mode - no automatic opponent moves
        // You can test both players by switching between screens
        console.log('Turn switched to:', updatedGameState.currentPlayer);
        console.log('To test the other player, open a new browser tab and join as the opposite color');
      }
      
      // Save game state to localStorage for multiplayer sync
      if (roomId) {
        console.log('💾 Saving game state to localStorage for sync');
        multiplayerState.saveGameState(roomId, updatedGameState);
      }
      
      // Debug: Log the final board state
      console.log('📊 Final board state after move:', newPosition);
      console.log('🎯 Game state after move:', {
        gameActive: updatedGameState.gameActive,
        winner: updatedGameState.winner,
        currentPlayer: updatedGameState.currentPlayer
      });
      
    } else {
      // Select a piece if it belongs to the current player
      if (piece && pieceColor === playerRole) {
        console.log(`Selected piece ${piece} at ${square}`);
        setGameState((prev: any) => ({ ...prev, selectedSquare: square }));
      } else if (piece) {
        console.log('You can only select your own pieces');
      } else {
        console.log('No piece at this square');
      }
    }
  };

  const handleCreateEscrow = async () => {
    console.log('🔧 handleCreateEscrow called');
    console.log('Connected:', connected);
    console.log('Room ID:', roomId);
    console.log('Bet Amount:', betAmount);
    
    if (!connected) {
      setGameStatus('Please connect your wallet first');
      return;
    }
    
    if (!roomId) {
      setGameStatus('No room ID found. Please go back to menu and create a room.');
      return;
    }
    
    console.log('Creating escrow for room:', roomId, 'amount:', betAmount);
    
    try {
      // For now, simulate escrow creation without blockchain
      // In production, this would call the actual Solana program
      setEscrowCreated(true);
      
      // Add escrow to multiplayer state
      if (!publicKey) {
        setGameStatus('Wallet not connected');
        return;
      }
      const playerWallet = publicKey.toString();
      multiplayerState.addEscrow(roomId, playerWallet, betAmount);
      
      setGameStatus(`Escrow created! Bet: ${betAmount} SOL. Waiting for opponent...`);
      console.log('✅ Escrow created successfully');
      
      // Check if both players have created escrows
      const roomStatus = multiplayerState.getRoomStatus(roomId);
      if (roomStatus && roomStatus.escrowCount >= 2) {
        setBothEscrowsReady(true);
        setOpponentEscrowCreated(true);
        setGameStatus('Both escrows created! Game will start automatically...');
      }
      
    } catch (err) {
      console.error('❌ Escrow creation failed:', err);
      setGameStatus('Escrow creation failed. Please try again.');
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

  const handleJoinRoom = () => {
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }
    
    const playerWallet = publicKey.toString();
    
    // If no room ID provided, create a new room
    if (!roomId.trim()) {
      const newRoomId = `ROOM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setRoomId(newRoomId);
      
      // Create room using multiplayer state
      const role = multiplayerState.createRoom(newRoomId, playerWallet);
      if (role) {
        setPlayerRole(role);
        setGameStatus(`Room created: ${newRoomId} - You are ${role}. Share this ID with your opponent!`);
      } else {
        setGameStatus('Failed to create room');
        return;
      }
    } else {
      // Joining existing room
      const role = multiplayerState.joinRoom(roomId, playerWallet);
      if (role) {
        setPlayerRole(role);
        setGameStatus(`Joined room: ${roomId} - You are ${role}. Waiting for opponent...`);
        
        // Check if game has already started or both escrows are ready
        const roomStatus = multiplayerState.getRoomStatus(roomId);
        if (roomStatus) {
          const escrowCount = Object.keys(roomStatus.escrows).length;
          console.log('💰 Room escrow count:', escrowCount);
          
          // Update escrow status immediately
          setOpponentEscrowCreated(escrowCount >= 2);
          setBothEscrowsReady(escrowCount >= 2);
          
          if (roomStatus.gameStarted) {
            console.log('🎮 Game already started, loading game state...');
            
            // Load existing game state if available
            const savedGameState = multiplayerState.getGameState(roomId);
            if (savedGameState) {
              console.log('📥 Loading existing game state:', savedGameState);
              setGameState(savedGameState);
            }
            
            setTimeout(() => {
              setGameMode('game');
              setGameStatus(`Game in progress! You are ${role}.`);
            }, 1000);
          } else if (escrowCount >= 2) {
            console.log('💰 Both escrows ready, game will start automatically...');
            setGameStatus(`Both escrows ready! Game will start automatically...`);
          }
        }
      } else {
        setGameStatus('Failed to join room. Room may not exist or be full.');
        return;
      }
    }
    
    setGameMode('lobby');
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
    setPlayerRole('');
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
      multiplayerState.saveGameState(roomId, updatedGameState);
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
    <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ChessApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;