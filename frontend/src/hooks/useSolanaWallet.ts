// @ts-nocheck
/**
 * Custom hook for Solana wallet operations
 * Handles balance checking, transactions, and escrow management
 */

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3, Idl } from '@coral-xyz/anchor';
import type { ChessEscrow } from '../idl/chess_escrow';
import ChessEscrowIDL from '../idl/chess_escrow.json';
import { databaseMultiplayerState } from '../services/databaseMultiplayerState';
import { CHESS_PROGRAM_ID, FEE_WALLET_ADDRESS } from '../config/solanaConfig';

export interface SolanaWalletHook {
  // Wallet state
  publicKey: PublicKey | null;
  connected: boolean;
  balance: number;
  
  // Wallet operations
  checkBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  createEscrow: (roomId: string, betAmount: number) => Promise<boolean>;
  joinAndDepositStake: (roomId: string, betAmount: number) => Promise<boolean>;
  claimWinnings: (roomId: string, playerRole: string, gameWinner: string | null, isDraw: boolean) => Promise<string>;
  recordMove: (roomId: string, moveNotation: string, positionHash: Uint8Array) => Promise<boolean>;
  declareResult: (roomId: string, winner: 'white' | 'black' | null, reason: string) => Promise<string>;
  handleTimeout: (roomId: string) => Promise<string>;
  cancelGame: (roomId: string) => Promise<boolean>;
  getGameStatus: (roomId: string) => Promise<any>;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for Solana wallet operations
 */
export const useSolanaWallet = (): SolanaWalletHook => {
  // Log Anchor version for debugging
  console.log('🔍 Debug - Anchor version: 0.31.1 (from package.json)');
  try {
    const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
    const { connection } = useConnection();
    
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Check balance when wallet connects (with retry limit)
    const [balanceCheckAttempts, setBalanceCheckAttempts] = useState<number>(0);
    const maxBalanceCheckAttempts = 3;

    useEffect(() => {
      if (connected && publicKey) {
        // Reset attempts when wallet reconnects
        setBalanceCheckAttempts(0);
        checkBalance();
      }
    }, [connected, publicKey]); // Only run when wallet connection changes, not on balanceCheckAttempts changes

    /**
     * Get Anchor program instance
     */
    const getProgram = async (): Promise<Program<ChessEscrow> | null> => {
      console.log('🔍 Debug - GetProgram - Starting function');
      console.log('🔍 Debug - GetProgram - Public Key:', publicKey?.toString());
      console.log('🔍 Debug - GetProgram - Sign Transaction:', signTransaction ? 'Available' : 'Not available');
      
      if (!publicKey || !signTransaction) {
        console.log('🔍 Debug - GetProgram - Missing publicKey or signTransaction');
        return null;
      }
      
      // Create a wallet adapter that matches the expected interface
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions: async (transactions: any[]) => {
          return Promise.all(transactions.map(tx => signTransaction(tx)));
        }
      };
      
      console.log('🔍 Debug - GetProgram - Created wallet adapter');
      
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      );
      
      console.log('🔍 Debug - GetProgram - Created provider');
      
      // Try to fetch IDL from the program itself first
      try {
        console.log('🔍 Debug - GetProgram - Attempting to fetch IDL from chain...');
        const programId = new web3.PublicKey(CHESS_PROGRAM_ID);
        const program = await Program.at(programId, provider);
        console.log('🔍 Debug - GetProgram - Successfully loaded program from chain');
        return program;
      } catch (chainError) {
        console.log('🔍 Debug - GetProgram - Chain IDL fetch failed, using local IDL');
        console.log('🔍 Debug - GetProgram - Chain error:', chainError);
        
        // Fall back to local IDL
        console.log('🔍 Debug - GetProgram - Using static IDL import');
      }
      
      // Validate IDL completeness
      console.log('🔍 Debug - GetProgram - ChessEscrowIDL:', ChessEscrowIDL ? 'Available' : 'Not available');
      console.log('🔍 Debug - GetProgram - CHESS_PROGRAM_ID:', CHESS_PROGRAM_ID.toString());
      console.log('🔍 Debug - GetProgram - IDL validation:', {
        hasInstructions: !!ChessEscrowIDL?.instructions,
        instructionCount: ChessEscrowIDL?.instructions?.length,
        hasAccounts: !!ChessEscrowIDL?.accounts,
        hasTypes: !!ChessEscrowIDL?.types,
        hasMetadata: !!ChessEscrowIDL?.metadata,
        address: ChessEscrowIDL?.address
      });
      
      // Check each instruction is complete
      if (ChessEscrowIDL?.instructions) {
        ChessEscrowIDL.instructions.forEach((instruction, i) => {
          console.log(`🔍 Debug - Instruction ${i} (${instruction.name}):`, {
            hasAccounts: !!instruction.accounts,
            hasArgs: !!instruction.args,
            accountsComplete: instruction.accounts?.every(acc => 
              acc.name && (acc.pda ? acc.pda.seeds : true)
            )
          });
        });
      }
      
      // Check for specific instruction completeness
      const depositStake = ChessEscrowIDL?.instructions?.find(i => i.name === 'deposit_stake');
      console.log('🔍 Debug - deposit_stake instruction:', depositStake);
      
      if (!depositStake || !depositStake.accounts || depositStake.accounts.some(acc => !acc.name)) {
        throw new Error('IDL is incomplete or corrupted - deposit_stake instruction missing');
      }
      
      // Debug account structures specifically
      console.log('🔍 Debug - Checking account types in IDL:');
      if (ChessEscrowIDL.accounts) {
        ChessEscrowIDL.accounts.forEach((account, i) => {
          console.log(`🔍 Debug - Account ${i} (${account.name}):`, {
            hasType: !!account.type,
            hasFields: !!account.type?.fields,
            fieldCount: account.type?.fields?.length
          });
          
          // Check each field has proper type definitions
          if (account.type?.fields) {
            account.type.fields.forEach((field, j) => {
              console.log(`🔍 Debug -   Field ${j} (${field.name}):`, {
                hasType: !!field.type,
                typeValue: field.type
              });
            });
          }
        });
      } else {
        console.log('🔍 Debug - NO ACCOUNTS SECTION FOUND IN IDL!');
      }

      // Check custom types
      console.log('🔍 Debug - Custom types in IDL:');
      if (ChessEscrowIDL.types) {
        ChessEscrowIDL.types.forEach((type, i) => {
          console.log(`🔍 Debug - Type ${i} (${type.name}):`, {
            hasType: !!type.type,
            typeKind: type.type?.kind,
            hasFields: !!type.type?.fields,
            hasVariants: !!type.type?.variants
          });
        });
      } else {
        console.log('🔍 Debug - NO TYPES SECTION FOUND IN IDL!');
      }
      
      // Try using the IDL directly without Program constructor
      try {
        console.log('🔍 Debug - GetProgram - About to create Program');
        console.log('🔍 Debug - GetProgram - IDL type:', typeof ChessEscrowIDL);
        console.log('🔍 Debug - GetProgram - IDL keys:', Object.keys(ChessEscrowIDL));
        
        // Enhanced debugging - log the full IDL structure
        console.log('🔍 Debug - GetProgram - Full IDL:', JSON.stringify(ChessEscrowIDL, null, 2));
        
        // Try creating program with explicit type casting
        const program = new Program(ChessEscrowIDL as any, CHESS_PROGRAM_ID, provider);
        console.log('🔍 Debug - GetProgram - Program created successfully');
        return program;
      } catch (error) {
        console.error('🔍 Debug - GetProgram - Error creating Program:', error);
        console.error('🔍 Debug - GetProgram - Error stack:', error.stack);
        throw error;
      }
    };

    /**
     * Manual balance refresh (resets attempts)
     */
    const refreshBalance = async (): Promise<void> => {
      setBalanceCheckAttempts(0);
      await checkBalance();
    };

    /**
     * Check wallet balance
     */
    const checkBalance = async (): Promise<void> => {
      if (!connected || !publicKey) {
        setError('Wallet not connected');
        return;
      }

      // Prevent infinite retries
      if (balanceCheckAttempts >= maxBalanceCheckAttempts) {
        return;
      }

      // Prevent concurrent balance checks
      if (isLoading) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setBalanceCheckAttempts(prev => prev + 1);
        
        const walletBalance = await connection.getBalance(publicKey);
        setBalance(walletBalance / LAMPORTS_PER_SOL);
      } catch (err) {
        const errorMessage = `Error checking balance: ${(err as Error).message}`;
        setError(errorMessage);
        console.error('❌ Balance check error:', err);
        
        // If it's a network error, don't retry immediately
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          setBalanceCheckAttempts(maxBalanceCheckAttempts); // Prevent further attempts
        }
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Create escrow for a game (initialize game)
     * @param roomId - Room ID to create escrow for
     * @param betAmount - Amount to bet in SOL
     * @returns Success status
     */
    const createEscrow = async (roomId: string, betAmount: number): Promise<boolean> => {
      console.log('🔍 Debug - CreateEscrow - Starting function');
      console.log('🔍 Debug - CreateEscrow - Room ID:', roomId);
      console.log('🔍 Debug - CreateEscrow - Bet Amount:', betAmount);
      console.log('🔍 Debug - CreateEscrow - Connected:', connected);
      console.log('🔍 Debug - CreateEscrow - Public Key:', publicKey?.toString());
      console.log('🔍 Debug - CreateEscrow - Balance:', balance);
      
      if (!connected || !publicKey) {
        setError('Please connect your wallet first');
        return false;
      }

      if (balance < betAmount) {
        setError(`Insufficient balance! Need ${betAmount} SOL, have ${balance.toFixed(3)} SOL`);
        return false;
      }

      console.log('🔍 Debug - CreateEscrow - About to get program');
      const program = await getProgram();
      console.log('🔍 Debug - CreateEscrow - Program:', program ? 'Found' : 'Not found');
      if (!program) {
        setError('Failed to connect to program');
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        console.log('🔍 Debug - CreateEscrow - Room ID:', roomId);
        console.log('🔍 Debug - CreateEscrow - Game Escrow PDA:', gameEscrowPda.toString());
        console.log('🔍 Debug - CreateEscrow - Game Vault PDA:', gameVaultPda.toString());
        console.log('🔍 Debug - CreateEscrow - Player Public Key:', publicKey.toString());
        console.log('🔍 Debug - CreateEscrow - Fee Collector:', FEE_WALLET_ADDRESS.toString());
        console.log('🔍 Debug - CreateEscrow - System Program:', SystemProgram.programId.toString());
        
        // Initialize game
        console.log('🔍 Debug - CreateEscrow - About to call initializeGame with accounts:', {
          gameEscrow: gameEscrowPda.toString(),
          player: publicKey.toString(),
          feeCollector: FEE_WALLET_ADDRESS.toString(),
          systemProgram: SystemProgram.programId.toString(),
        });
        
        const tx = await program.methods
          .initializeGame(
            roomId,
            new BN(betAmount * LAMPORTS_PER_SOL),
            new BN(300) // 5 minute time limit
          )
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            feeCollector: FEE_WALLET_ADDRESS,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        
        // Now deposit stake
        console.log('🔍 Debug - CreateEscrow - About to call depositStake with accounts:', {
          gameEscrow: gameEscrowPda.toString(),
          player: publicKey.toString(),
          gameVault: gameVaultPda.toString(),
          systemProgram: SystemProgram.programId.toString(),
        });
        
        const depositTx = await program.methods
          .depositStake()
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            gameVault: gameVaultPda,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc();
        
        // Add to multiplayer state
        databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
        
        // Update balance after transactions (removed polling)
        // setTimeout(() => {
        //   checkBalance();
        // }, 1000);
        
        return true;
        
      } catch (err: any) {
        let errorMessage = 'Escrow creation failed';
        
        // Parse Anchor errors
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'RoomIdTooLong':
              errorMessage = 'Room ID is too long (max 32 characters)';
              break;
            case 'InvalidStakeAmount':
              errorMessage = 'Invalid stake amount';
              break;
            case 'AlreadyDeposited':
              errorMessage = 'You have already deposited for this game';
              break;
            default:
              errorMessage = err.error.errorCode.code;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('❌ Escrow creation error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Join existing game and deposit stake
     * @param roomId - Room ID to join
     * @param betAmount - Amount to bet in SOL
     * @returns Success status
     */
    const joinAndDepositStake = async (roomId: string, betAmount: number): Promise<boolean> => {
      if (!connected || !publicKey) {
        setError('Please connect your wallet first');
        return false;
      }

      if (balance < betAmount) {
        setError(`Insufficient balance! Need ${betAmount} SOL, have ${balance.toFixed(3)} SOL`);
        return false;
      }

      const program = await getProgram();
      if (!program) {
        setError('Failed to connect to program');
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        console.log('🔍 Debug - Room ID:', roomId);
        console.log('🔍 Debug - Game Escrow PDA:', gameEscrowPda.toString());
        console.log('🔍 Debug - Game Vault PDA:', gameVaultPda.toString());
        console.log('🔍 Debug - Player Public Key:', publicKey.toString());
        
        // Join game
        const joinTx = await program.methods
          .joinGame()
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
          } as any)
          .rpc();
        
        // Deposit stake
        console.log('🔍 Debug - About to call depositStake with accounts:', {
          gameEscrow: gameEscrowPda.toString(),
          player: publicKey.toString(),
          gameVault: gameVaultPda.toString(),
          systemProgram: SystemProgram.programId.toString(),
        });
        
        const depositTx = await program.methods
          .depositStake()
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            gameVault: gameVaultPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        // Add to multiplayer state
        databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
        
        // Update balance after transactions (removed polling)
        // setTimeout(() => {
        //   checkBalance();
        // }, 1000);
        
        return true;
        
      } catch (err: any) {
        let errorMessage = 'Failed to join game';
        
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'GameNotWaitingForPlayers':
              errorMessage = 'Game is not accepting new players';
              break;
            case 'CannotPlayAgainstSelf':
              errorMessage = 'You cannot play against yourself';
              break;
            case 'UnauthorizedPlayer':
              errorMessage = 'You are not authorized for this game';
              break;
            case 'AlreadyDeposited':
              errorMessage = 'You have already deposited for this game';
              break;
            default:
              errorMessage = err.error.errorCode.code;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('❌ Join game error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Claim winnings from a completed game
     * @param roomId - Room ID of the game
     * @param playerRole - Player's role ('white' or 'black')
     * @param gameWinner - Winner of the game ('white', 'black', or null for draw)
     * @param isDraw - Whether the game was a draw
     * @returns Status message
     */
    const claimWinnings = async (
      roomId: string,
      playerRole: string, 
      gameWinner: string | null, 
      isDraw: boolean
    ): Promise<string> => {
      if (!connected || !publicKey) {
        const errorMsg = 'Wallet not connected';
        setError(errorMsg);
        return errorMsg;
      }

      if (!gameWinner && !isDraw) {
        const errorMsg = 'Game is not finished yet';
        setError(errorMsg);
        return errorMsg;
      }

      const program = await getProgram();
      if (!program) {
        const errorMsg = 'Failed to connect to program';
        setError(errorMsg);
        return errorMsg;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        // Get game account to find player addresses
        const gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
        
        // Determine winner enum for contract
        let winner;
        let reason;
        
        if (isDraw) {
          winner = { draw: {} };
          reason = { agreement: {} }; // or stalemate
        } else if (gameWinner === 'white') {
          winner = { white: {} };
          reason = { checkmate: {} }; // You might need to determine actual reason
        } else {
          winner = { black: {} };
          reason = { checkmate: {} };
        }
        
        // Declare result
        const tx = await program.methods
          .declareResult(winner, reason)
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            gameVault: gameVaultPda,
            playerWhite: gameAccount.playerWhite,
            playerBlack: gameAccount.playerBlack,
            feeCollector: gameAccount.feeCollector,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        let statusMessage = '';
        
        if (gameWinner === playerRole) {
          // Winner gets 99% of total pot (1% fee)
          const totalPot = gameAccount.stakeAmount.toNumber() * 2 / LAMPORTS_PER_SOL;
          const winnings = totalPot * 0.99;
          statusMessage = `🎉 SUCCESS! You won ${winnings.toFixed(3)} SOL! Funds have been transferred to your wallet.`;
        } else if (isDraw) {
          // Each player gets back 49.5% (1% fee)
          const stake = gameAccount.stakeAmount.toNumber() / LAMPORTS_PER_SOL;
          const refund = stake * 0.99;
          statusMessage = `🤝 Draw! You received ${refund.toFixed(3)} SOL back.`;
        } else {
          statusMessage = `❌ You lost this game. Better luck next time!`;
        }
        
        // Update balance (removed polling)
        // setTimeout(() => {
        //   checkBalance();
        // }, 1000);
        
        return statusMessage;
        
      } catch (err: any) {
        let errorMessage = `❌ Claim failed: ${(err as Error).message}`;
        
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'GameNotInProgress':
              errorMessage = 'Game is not in progress';
              break;
            case 'UnauthorizedPlayer':
              errorMessage = 'You are not authorized to declare this result';
              break;
            case 'InvalidWinnerDeclaration':
              errorMessage = 'Invalid winner declaration';
              break;
            default:
              errorMessage = err.error.errorCode.code;
          }
        }
        
        setError(errorMessage);
        console.error('❌ Claim error:', err);
        return errorMessage;
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Record a move on-chain (for anti-cheat)
     */
    const recordMove = async (
      roomId: string, 
      moveNotation: string, 
      positionHash: Uint8Array
    ): Promise<boolean> => {
      const program = getProgram();
      if (!program || !publicKey) return false;
      
      try {
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const tx = await program.methods
          .recordMove(moveNotation, Array.from(positionHash))
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
          })
          .rpc();
        
        return true;
      } catch (err) {
        console.error('Failed to record move:', err);
        return false;
      }
    };

    /**
     * Handle timeout - can be called by anyone after time limit
     */
    const handleTimeout = async (roomId: string): Promise<string> => {
      const program = getProgram();
      if (!program || !publicKey) {
        return 'Failed to connect to program';
      }
      
      try {
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        const gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
        
        const tx = await program.methods
          .handleTimeout()
          .accounts({
            gameEscrow: gameEscrowPda,
            gameVault: gameVaultPda,
            playerWhite: gameAccount.playerWhite,
            playerBlack: gameAccount.playerBlack,
            feeCollector: gameAccount.feeCollector,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        // Update balance (removed polling)
        // setTimeout(() => checkBalance(), 1000);
        
        return 'Timeout claimed successfully!';
      } catch (err: any) {
        if (err.error?.errorCode?.code === 'TimeNotExceeded') {
          return 'Time limit has not been exceeded yet';
        }
        return `Failed to handle timeout: ${err.message}`;
      }
    };

    /**
     * Cancel game (only before it starts)
     */
    const cancelGame = async (roomId: string): Promise<boolean> => {
      const program = getProgram();
      if (!program || !publicKey) return false;
      
      try {
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        const gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
        
        const tx = await program.methods
          .cancelGame()
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            gameVault: gameVaultPda,
            playerWhite: gameAccount.playerWhite,
            playerBlack: gameAccount.playerBlack,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        // Update balance (removed polling)
        // setTimeout(() => checkBalance(), 1000);
        
        return true;
      } catch (err: any) {
        console.error('Failed to cancel game:', err);
        return false;
      }
    };

    /**
     * Get game status from blockchain
     */
    const getGameStatus = async (roomId: string): Promise<any> => {
      const program = getProgram();
      if (!program) return null;
      
      try {
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
        
        return {
          roomId: gameAccount.roomId,
          playerWhite: gameAccount.playerWhite.toString(),
          playerBlack: gameAccount.playerBlack.toString(),
          stakeAmount: gameAccount.stakeAmount.toNumber() / LAMPORTS_PER_SOL,
          gameState: Object.keys(gameAccount.gameState)[0],
          winner: gameAccount.winner ? Object.keys(gameAccount.winner)[0] : null,
          whiteDeposited: gameAccount.whiteDeposited,
          blackDeposited: gameAccount.blackDeposited,
          moveCount: gameAccount.moveCount,
          startedAt: gameAccount.startedAt.toNumber(),
          lastMoveTime: gameAccount.lastMoveTime.toNumber(),
        };
      } catch (err) {
        console.error('Failed to get game status:', err);
        return null;
      }
    };

    /**
     * Declare game result on blockchain
     * @param roomId - Room ID
     * @param winner - Winner of the game
     * @param reason - Reason for game end
     * @returns Transaction signature
     */
    const declareResult = async (roomId: string, winner: 'white' | 'black' | null, reason: string): Promise<string> => {
      if (!connected || !publicKey) {
        setError('Please connect your wallet first');
        return '';
      }

      const program = getProgram();
      if (!program) {
        setError('Failed to connect to program');
        return '';
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        
        // Convert winner to smart contract enum
        let gameWinner: any;
        switch (winner) {
          case 'white':
            gameWinner = { white: {} };
            break;
          case 'black':
            gameWinner = { black: {} };
            break;
          default:
            gameWinner = { draw: {} };
        }
        
        // Convert reason to smart contract enum
        let gameEndReason: any;
        switch (reason.toLowerCase()) {
          case 'checkmate':
            gameEndReason = { checkmate: {} };
            break;
          case 'resignation':
            gameEndReason = { resignation: {} };
            break;
          case 'timeout':
            gameEndReason = { timeout: {} };
            break;
          case 'stalemate':
            gameEndReason = { stalemate: {} };
            break;
          default:
            gameEndReason = { agreement: {} };
        }
        
        // Declare result
        const tx = await program.methods
          .declareResult(gameWinner, gameEndReason)
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
            gameVault: gameVaultPda,
            playerWhite: new web3.PublicKey('11111111111111111111111111111111'), // Will be set by program
            playerBlack: new web3.PublicKey('11111111111111111111111111111111'), // Will be set by program
            feeCollector: FEE_WALLET_ADDRESS,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        return tx;
        
      } catch (err: any) {
        let errorMessage = 'Game result declaration failed';
        
        // Parse Anchor errors
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'GameNotInProgress':
              errorMessage = 'Game is not in progress';
              break;
            case 'InvalidWinnerDeclaration':
              errorMessage = 'Invalid winner declaration';
              break;
            case 'UnauthorizedPlayer':
              errorMessage = 'You are not authorized to declare result';
              break;
            default:
              errorMessage = err.error.errorCode.code;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('❌ Game result declaration error:', err);
        return '';
      } finally {
        setIsLoading(false);
      }
    };

    return {
      // Wallet state
      publicKey,
      connected,
      balance,
      
      // Wallet operations
      checkBalance,
      refreshBalance,
      createEscrow,
      joinAndDepositStake,
      claimWinnings,
      recordMove,
      declareResult,
      handleTimeout,
      cancelGame,
      getGameStatus,
      
      // Status
      isLoading,
      error
    };
  } catch (err) {
    console.error('❌ useSolanaWallet hook encountered an error:', err);
    return {
      publicKey: null,
      connected: false,
      balance: 0,
      checkBalance: async () => {},
      refreshBalance: async () => {},
      createEscrow: async () => false,
      joinAndDepositStake: async () => false,
      claimWinnings: async () => 'Error',
      recordMove: async () => false,
      declareResult: async () => '',
      handleTimeout: async () => 'Error',
      cancelGame: async () => false,
      getGameStatus: async () => null,
      isLoading: false,
      error: 'Failed to initialize Solana wallet hook.'
    };
  }
};

export default useSolanaWallet;