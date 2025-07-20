import React, { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Import our custom modules
import ChessEngine from './engine/chessEngine';
import { useGameState } from './hooks/useGameState';
import { useSolanaWallet } from './hooks/useSolanaWallet';
import multiplayerState from './services/multiplayerState';
import { MenuView, LobbyView, GameView } from './components';
import { SOLANA_NETWORK, SOLANA_RPC_ENDPOINT } from './config';

// Types
type AppGameMode = 'menu' | 'lobby' | 'game';

// Main Chess App Component
function ChessApp() {
  // Custom hooks
  const { gameState, makeMove, selectSquare, resetGame, setGameActive, setWinner, loadGameState, resignGame } = useGameState();
  const { publicKey, connected, balance, createEscrow, claimWinnings, isLoading, error } = useSolanaWallet();
  
  // App state
  const [gameMode, setGameMode] = useState<AppGameMode>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [playerRole, setPlayerRole] = useState<string>('');
  const [escrowCreated, setEscrowCreated] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('Connect wallet to start');
  const [winningsClaimed, setWinningsClaimed] = useState<boolean>(false);

  // Auto-sync room state and game state with real-time updates
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    if (roomId && publicKey) {
      console.log('🔧 Setting up sync for room:', roomId, 'mode:', gameMode);
      
      const timer = setTimeout(() => {
        cleanup = multiplayerState.setupStorageSync(() => {
          console.log('🔄 Real-time sync triggered for room:', roomId);
          syncRoomState();
        });
        
        const handleCustomSync = () => {
          console.log('🔄 Custom sync triggered for room:', roomId);
          syncRoomState();
        };
        
        window.addEventListener('gameStateChanged', handleCustomSync);
        syncRoomState();
        
        const originalCleanup = cleanup;
        cleanup = () => {
          if (originalCleanup) originalCleanup();
          window.removeEventListener('gameStateChanged', handleCustomSync);
        };
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (cleanup) cleanup();
      };
    }
  }, [roomId, publicKey, gameMode]);

  // Sync room state between tabs
  const syncRoomState = () => {
    if (!roomId || !publicKey) return;
    
    try {
      const roomStatus = multiplayerState.getRoomStatus(roomId);
      if (!roomStatus) {
        console.log('⚠️ No room status found for:', roomId);
        return;
      }
      
      const myWallet = publicKey.toString();
      const escrows = roomStatus.escrows || {};
      const escrowCount = roomStatus.escrowCount || 0;
      
      // Update escrow status
      if (escrows[myWallet] && !escrowCreated) {
        setEscrowCreated(true);
        console.log('✅ Detected my escrow in sync');
      } else if (!escrows[myWallet] && escrowCreated) {
        setEscrowCreated(false);
        console.log('🔄 Escrow reset detected in sync');
      }
      
      // Check if game should start
      if (escrowCount === 2 && roomStatus.gameStarted && gameMode !== 'game') {
        console.log('🎮 Starting game due to sync');
        setGameMode('game');
        setGameActive(true);
        setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
      }
      
      // Check if new game was started (escrows cleared)
      if (escrowCount === 0 && !roomStatus.gameStarted && gameMode === 'game') {
        console.log('🔄 New game started, returning to lobby');
        setGameMode('lobby');
        setEscrowCreated(false);
        setWinningsClaimed(false);
        setGameStatus(`New game started! You are ${playerRole}. Create escrow to begin.`);
      }
      
      // Sync game state (moves) if we're in game mode
      if (gameMode === 'game') {
        const savedGameState = multiplayerState.getGameState(roomId);
        
        if (savedGameState && savedGameState.position) {
          const savedMoveCount = savedGameState.moveHistory ? savedGameState.moveHistory.length : 0;
          const currentMoveCount = gameState.moveHistory ? gameState.moveHistory.length : 0;
          const savedTimestamp = savedGameState.lastUpdated || 0;
          const currentTimestamp = gameState.lastUpdated || 0;

          if (savedMoveCount > currentMoveCount || (savedMoveCount === currentMoveCount && savedTimestamp > currentTimestamp)) {
            console.log('🎯 Loading newer game state');
            loadGameState({
              ...savedGameState,
              lastUpdated: savedTimestamp,
            });
            
            // Update turn status based on game state
            if (savedGameState.winner) {
              // Check if this was a resignation by looking at move history vs game end
              const isResignation = savedGameState.moveHistory && 
                !ChessEngine.isCheckmate(savedGameState.position, savedGameState.currentPlayer, savedGameState) &&
                !ChessEngine.isStalemate(savedGameState.position, savedGameState.currentPlayer, savedGameState);
              
              if (isResignation) {
                const resignedPlayer = savedGameState.winner === 'white' ? 'black' : 'white';
                setGameStatus(`${resignedPlayer} resigned. ${savedGameState.winner} wins!`);
              } else {
                setGameStatus(`Game Over! ${savedGameState.winner} wins!`);
              }
            } else if (savedGameState.draw) {
              setGameStatus('Game Over! Draw!');
            } else {
              const isMyTurn = savedGameState.currentPlayer === playerRole;
              setGameStatus(isMyTurn ? `Your turn! You are ${playerRole}.` : `${savedGameState.currentPlayer === 'white' ? 'White' : 'Black'} player's turn. Waiting...`);
            }
          }
        }
      }
      
      // Update status messages for lobby
      if (gameMode === 'lobby') {
        if (escrowCount === 2) {
          setGameStatus(`Both escrows created! Game starting...`);
        } else if (escrowCreated) {
          setGameStatus(`Escrow created! Waiting for opponent... (${escrowCount}/2)`);
        } else {
          setGameStatus(`Create escrow to start new game. You are ${playerRole}.`);
        }
      }
    } catch (error) {
      console.error('❌ Error in syncRoomState:', error);
      setGameStatus('Sync error occurred. Game state may be inconsistent.');
    }
  };

  // Handle square clicks with complete chess rules
  const handleSquareClick = (square: string) => {
    if (!roomId || !gameState.gameActive) return;
    
    const isMyTurn = gameState.currentPlayer === playerRole;
    if (!isMyTurn) {
      setGameStatus(`Wait for ${gameState.currentPlayer === 'white' ? 'white' : 'black'} player's turn`);
      return;
    }
    
    const piece = gameState.position[square];
    const pieceColor = piece ? ChessEngine.getPieceColor(piece) : null;
    
    if (gameState.selectedSquare) {
      const result = makeMove(gameState.selectedSquare, square, roomId);
      if (result.success) {
        setGameStatus(result.message);
      } else {
        setGameStatus(result.message);
        if (piece && pieceColor === playerRole) {
          selectSquare(square);
        }
      }
    } else {
      if (piece && pieceColor === playerRole) {
        selectSquare(square);
        setGameStatus(`Selected ${piece}. Click on a highlighted square to move.`);
      } else if (piece) {
        setGameStatus("You can only move your own pieces!");
      } else {
        setGameStatus("Click on one of your pieces to select it.");
      }
    }
  };

  // Create escrow handler
  const handleCreateEscrow = async () => {
    const success = await createEscrow(roomId, betAmount);
    if (success) {
      setEscrowCreated(true);
      setTimeout(() => {
        const roomStatus = multiplayerState.getRoomStatus(roomId);
        if (roomStatus && roomStatus.escrowCount === 2 && roomStatus.gameStarted) {
          setGameStatus(`Both escrows created! Starting game...`);
        } else if (roomStatus) {
          setGameStatus(`Escrow created! Waiting for opponent... (${roomStatus.escrowCount}/2)`);
        }
      }, 100);
    } else {
      setGameStatus(error || 'Escrow creation failed');
    }
  };

  // Claim winnings handler
  const handleClaimWinnings = async () => {
    const result = await claimWinnings(playerRole, gameState.winner, gameState.draw, betAmount);
    setGameStatus(result);
    setWinningsClaimed(true);
  };

  // Join/Create Room
  const handleJoinRoom = () => {
    if (!connected || !publicKey) {
      setGameStatus('Please connect your wallet first');
      return;
    }

    const playerWallet = publicKey.toString();
    let finalRoomId = roomId.trim();
    let assignedRole = null;
    
    if (finalRoomId) {
      assignedRole = multiplayerState.joinRoom(finalRoomId, playerWallet);
      if (!assignedRole) {
        setGameStatus('Room not found or full. Please check the room ID.');
        return;
      }
    } else {
      finalRoomId = `ROOM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      assignedRole = multiplayerState.createRoom(finalRoomId, playerWallet);
      if (!assignedRole) {
        setGameStatus('Failed to create room. Please try again.');
        return;
      }
    }
    
    setRoomId(finalRoomId);
    setPlayerRole(assignedRole);
    setGameMode('lobby');
    
    const roomStatus = multiplayerState.getRoomStatus(finalRoomId);
    if (roomStatus) {
      setGameStatus(roomStatus.playerCount === 1 ? 
        `Room: ${finalRoomId} - You are ${assignedRole}. Waiting for opponent...` :
        `Room: ${finalRoomId} - Both players connected! You are ${assignedRole}.`);
    }
  };

  // Start Game
  const handleStartGame = () => {
    const roomStatus = multiplayerState.getRoomStatus(roomId);
    
    if (!roomStatus || roomStatus.playerCount < 2) {
      setGameStatus('Waiting for second player to join the room');
      return;
    }
    
    if (roomStatus.escrowCount < 2) {
      setGameStatus('Waiting for both players to create escrows');
      return;
    }
    
    setGameMode('game');
    setGameActive(true);
    setGameStatus(`Game started! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
    
    setTimeout(() => syncRoomState(), 500);
  };

  // Reset game handler
  const handleResetGame = () => {
    setWinningsClaimed(false);
    resetGame(roomId);
    setGameStatus(`Game reset! You are ${playerRole}. ${playerRole === 'white' ? 'Your turn!' : 'White goes first.'}`);
  };

  // Resign game handler
  const handleResignGame = () => {
    const resigningPlayer = playerRole as 'white' | 'black';
    const winner = resigningPlayer === 'white' ? 'black' : 'white';
    
    // Confirm resignation
    const confirmed = window.confirm(
      `Are you sure you want to resign? ${winner} will be declared the winner.`
    );
    
    if (confirmed) {
      resignGame(resigningPlayer, roomId);
      setGameStatus(`${playerRole} resigned. ${winner} wins!`);
      console.log(`🏳️ ${playerRole} player resigned. ${winner} wins by resignation.`);
    }
  };

  // Back to menu handler - clears room and resets state
  const handleBackToMenu = () => {
    // Clear all game-related state
    setGameMode('menu');
    setRoomId(''); // Clear the room field
    setPlayerRole('');
    setEscrowCreated(false);
    setWinningsClaimed(false);
    setGameStatus('Connect wallet to start');
    
    console.log('🔙 Returned to menu - room field cleared');
  };
  // Start new game with new escrow
  const handleStartNewGameWithEscrow = () => {
    setEscrowCreated(false);
    setWinningsClaimed(false);
    
    if (roomId) {
      multiplayerState.clearEscrows(roomId);
    }
    
    resetGame(roomId);
    setGameMode('lobby');
    setGameStatus(`New game started! You are ${playerRole}. Create escrow to begin.`);
    
    setTimeout(() => multiplayerState.triggerSync(), 100);
  };

  // Get room status for lobby view
  const roomStatus = roomId ? multiplayerState.getRoomStatus(roomId) : null;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        width: '100%',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>♚ Knightsbridge Chess</h1>
        
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <WalletMultiButton />
        </div>

        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          backgroundColor: winningsClaimed ? '#d4edda' : '#f0f0f0', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <strong>Status:</strong> {gameStatus}
        </div>

        {connected ? (
          <div>
            {gameMode === 'menu' && (
              <MenuView
                roomId={roomId}
                setRoomId={setRoomId}
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                balance={balance}
                connected={connected}
                isLoading={isLoading}
                onJoinRoom={handleJoinRoom}
              />
            )}
            
            {gameMode === 'lobby' && (
              <LobbyView
                roomId={roomId}
                playerRole={playerRole}
                playerWallet={publicKey?.toString() || ''}
                betAmount={betAmount}
                roomStatus={roomStatus}
                escrowCreated={escrowCreated}
                connected={connected}
                isLoading={isLoading}
                onCreateEscrow={handleCreateEscrow}
                onStartGame={handleStartGame}
                onBackToMenu={handleBackToMenu}
              />
            )}
            
            {gameMode === 'game' && (
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
              />
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#666' }}>
              Connect your Phantom wallet to start playing chess with SOL stakes!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component with Providers
function App() {
  const network = SOLANA_NETWORK;
  const endpoint = SOLANA_RPC_ENDPOINT;
  
  const wallets = [
    new PhantomWalletAdapter(),
    new BackpackWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ChessApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;