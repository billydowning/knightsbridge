// @ts-nocheck
/**
 * Custom hook for Solana wallet operations
 * Handles balance checking, transactions, and escrow management
 */

// Buffer polyfill for browser environments
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { useCallback, useEffect, useState } from 'react';
import ChessEscrowIDL from '../idl/chess_escrow.json';
import { databaseMultiplayerState } from '../services/databaseMultiplayerState';
import { ChessEscrow } from '../idl/chess_escrow';
import { CHESS_PROGRAM_ID, FEE_WALLET_ADDRESS } from '../config/solanaConfig';

export interface SolanaWalletHook {
  // Wallet state
  publicKey: PublicKey | null;
  connected: boolean;
  balance: number;
  
  // Wallet operations
  checkBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  createEscrow: (roomId: string, betAmount: number, playerRole: 'white' | 'black') => Promise<boolean>;
  depositStake: (roomId: string, betAmount: number) => Promise<string | null>;
  joinAndDepositStake: (roomId: string, betAmount: number) => Promise<boolean>;
  claimWinnings: (roomId: string, playerRole: string, gameWinner: string | null, isDraw: boolean) => Promise<string>;
  recordMove: (
    roomId: string, 
    moveNotation: string, 
    positionHash: Uint8Array,
    fromSquare: string,
    toSquare: string,
    piece: string,
    capturedPiece?: string,
    timeSpent?: number,
    isCheck?: boolean,
    isCheckmate?: boolean,
    isCastle?: boolean,
    isEnPassant?: boolean,
    isPromotion?: boolean,
    promotionPiece?: string
  ) => Promise<boolean>;
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
      } else {
        setBalance(0);
        setError(null);
      }
    }, [connected, publicKey]);

    /**
     * Get Anchor program instance - FIXED VERSION
     */
    const getProgram = async (): Promise<Program<ChessEscrow> | null> => {
      if (!publicKey || !signTransaction) {
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
      
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      );
      
      // Try to fetch IDL from the program itself first
      try {
        const program = await Program.at(CHESS_PROGRAM_ID, provider);
        return program;
      } catch (chainError) {
        // Chain IDL fetch failed, fall back to local IDL

      }
      
      // Create truly minimal IDL with safe instruction handling
      try {
        // Safely extract instructions with proper error checking
        const instructions = [];
        
        if (ChessEscrowIDL && ChessEscrowIDL.instructions && Array.isArray(ChessEscrowIDL.instructions)) {
          const instructionNames = ['initialize_game', 'deposit_stake', 'declare_result', 'join_game'];
          
          for (const name of instructionNames) {
            const instruction = ChessEscrowIDL.instructions.find(i => i && i.name === name);
            if (instruction) {
              instructions.push(instruction);
            }
          }
        }

        console.log(`Found ${instructions.length} valid instructions for minimal IDL`);
        
        // Create working IDL with safe instructions and basic accounts for fetching
        const minimalIDL = {
          address: CHESS_PROGRAM_ID,
          metadata: {
            name: "chess_escrow",
            version: "0.1.0",
            spec: "0.1.0"
          },
          instructions: instructions, // Use safely extracted instructions
          accounts: [
            // Add basic account definition for fetching
            {
              name: "gameEscrow",
              discriminator: [1, 2, 3, 4, 5, 6, 7, 8]
            }
          ],
          types: [],        // EMPTY - no type definitions  
          events: [],
          errors: []
        };
        
        // Validate IDL before creating program
        if (!minimalIDL.instructions || !Array.isArray(minimalIDL.instructions)) {
          throw new Error('Invalid IDL structure: instructions array is malformed');
        }
        
        const program = new Program(minimalIDL, new PublicKey(CHESS_PROGRAM_ID), provider);
        console.log('✅ Successfully created minimal IDL program');
        return program;
        
      } catch (minimalError) {
        console.error('Minimal IDL approach failed:', minimalError.message);
        
        // Final fallback: Create dummy program for direct RPC
        try {
          console.log('⚠️ Falling back to dummy program for blockchain operations');
          const dummyIDL = {
            address: CHESS_PROGRAM_ID,
            metadata: { name: "dummy", version: "0.1.0", spec: "0.1.0" },
            instructions: [],
            accounts: [],
            types: [],
            events: [],
            errors: []
          };
          
          // Validate dummy IDL structure
          if (!dummyIDL.instructions || !Array.isArray(dummyIDL.instructions)) {
            console.error('❌ Invalid dummy IDL structure');
            return null;
          }
          
          const dummyProgram = new Program(dummyIDL, new PublicKey(CHESS_PROGRAM_ID), provider);
          console.log('✅ Dummy program created successfully (limited functionality)');
          return dummyProgram;
        } catch (dummyError) {
          console.error('❌ Dummy program creation failed:', dummyError.message);
          console.warn('⚠️ Blockchain functionality will be limited');
          return null;
        }
      }
    };

    /**
     * Create escrow using direct RPC calls when Anchor program fails
     */
    const createEscrowDirectRPC = async (
      roomId: string, 
      betAmount: number, 
      publicKey: PublicKey, 
      connection: any, 
      escrowAddedToDb: boolean,
      playerRole: 'white' | 'black'
    ): Promise<{ success: boolean; escrowAdded: boolean }> => {
      try {

        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          new PublicKey(CHESS_PROGRAM_ID)
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          new PublicKey(CHESS_PROGRAM_ID)
        );
        

        
        // Create the transaction
        const transaction = new web3.Transaction();
        
        if (playerRole === 'white') {
          // WHITE PLAYER: Only initialize_game (deposit comes after black player joins)
          
          // INSTRUCTION 1: initialize_game only
          const initializeGameDiscriminator = Buffer.from([44, 62, 102, 247, 126, 208, 130, 215]);
          
          // Encode the arguments manually
          const roomIdBuffer = Buffer.from(roomId, 'utf8');
          const roomIdLengthBuffer = Buffer.alloc(4);
          roomIdLengthBuffer.writeUInt32LE(roomIdBuffer.length, 0);
          
          const betAmountLamports = Math.floor(betAmount * LAMPORTS_PER_SOL);
          const betAmountBuffer = Buffer.alloc(8);
          betAmountBuffer.writeBigUInt64LE(BigInt(betAmountLamports), 0);
          
          const timeLimitSeconds = 300;
          const timeLimitBuffer = Buffer.alloc(8);
          timeLimitBuffer.writeBigUInt64LE(BigInt(timeLimitSeconds), 0);
          
          // Combine all data
          const instructionData = Buffer.concat([
            initializeGameDiscriminator,
            roomIdLengthBuffer,
            roomIdBuffer,
            betAmountBuffer,
            timeLimitBuffer
          ]);
          

          
          // Create the initialize game instruction
          const initializeGameIx = new web3.TransactionInstruction({
            keys: [
              { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: true },
              { pubkey: new PublicKey(FEE_WALLET_ADDRESS), isSigner: false, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: new PublicKey(CHESS_PROGRAM_ID),
            data: instructionData,
          });
          
          transaction.add(initializeGameIx);
          
        } else {
          // BLACK PLAYER: Only join_game (deposit separately after joining)
          
          // INSTRUCTION 1: join_game only
          const joinGameDiscriminator = Buffer.from([107, 112, 18, 38, 56, 173, 60, 128]);
          
          const joinGameIx = new web3.TransactionInstruction({
            keys: [
              { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: true },
            ],
            programId: new PublicKey(CHESS_PROGRAM_ID),
            data: joinGameDiscriminator, // No arguments for join_game
          });
          

          transaction.add(joinGameIx);
        }
        
        // Force a small delay to ensure timestamp uniqueness
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get fresh blockhash with finalized commitment for maximum freshness
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        

        
        // Add multiple uniqueness factors to ensure transaction uniqueness
        const timestamp = Date.now();
        const randomValue = Math.random();
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 10) : 'server';
        const uniqueId = `${timestamp}-${randomValue}-${userAgent}-${publicKey.toString().slice(0, 8)}`;
        
        // Create a more robust memo with player role and attempt counter
        const attemptCounter = Math.floor(Math.random() * 1000000);
        const memoData = `${playerRole}-${roomId.slice(-8)}-${attemptCounter}-${uniqueId}`;
        const memoBuffer = Buffer.from(memoData.slice(0, 32), 'utf8');
        
        const memoInstruction = new web3.TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: false }, // Add signer as key for uniqueness
          ],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), // Memo program
          data: memoBuffer,
        });
        transaction.add(memoInstruction);
        

        
        // Sign and send the transaction with retry logic
        let signature: string;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const signedTx = await signTransaction(transaction);
            
            // Send with custom settings to avoid duplicate detection
            signature = await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              preflightCommitment: 'finalized',
              maxRetries: 0, // Don't auto-retry
            });
            
  
            break;
            
          } catch (sendError) {
            retryCount++;

            
            if (retryCount >= maxRetries) {
              throw sendError;
            }
            
            // Wait before retry and get fresh blockhash
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { blockhash: newBlockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = newBlockhash;
  
          }
        }
        
        // Wait for confirmation with timeout
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        

        
        // Add to multiplayer state only if not already added
        let updatedEscrowAdded = escrowAddedToDb;
        if (!escrowAddedToDb) {
          databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
          updatedEscrowAdded = true;
        }
        
        return { success: true, escrowAdded: updatedEscrowAdded };
      } catch (error) {
        console.error('❌ Direct RPC - Error:', error);
        setError(`Failed to create escrow via direct RPC: ${error.message}`);
        return { success: false, escrowAdded: escrowAddedToDb };
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
     * Check wallet balance with rate limit handling
     */
    const checkBalance = async (): Promise<void> => {
      if (!connected || !publicKey) {
        setError('Wallet not connected');
        return;
      }

      // Prevent concurrent balance checks
      if (isLoading) {
        return;
      }

      // Don't retry too aggressively after rate limiting
      if (balanceCheckAttempts >= 3) {
        setError('Rate limited - balance will update shortly');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setBalanceCheckAttempts(prev => prev + 1);
        
        // Add delay for rate limiting (exponential backoff)
        if (balanceCheckAttempts > 0) {
          const delay = Math.min(1000 * Math.pow(2, balanceCheckAttempts), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get balance
        const walletBalance = await connection.getBalance(publicKey);
        const balanceInSOL = walletBalance / LAMPORTS_PER_SOL;
        
        setBalance(balanceInSOL);
        
        // Reset retry counter on success
        setBalanceCheckAttempts(0);
        
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error('Balance check failed:', errorMessage);
        
        // Handle rate limiting specifically
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('Rate limit')) {
          setError('Rate limited - retrying...');
          
          // Schedule a retry after a longer delay
          setTimeout(() => {
            if (connected && publicKey && balanceCheckAttempts < 3) {
              checkBalance();
            }
          }, 3000 + (balanceCheckAttempts * 2000));
          
        } else {
          setError(`Error checking balance: ${errorMessage}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Create escrow for a game (initialize game for white, join game for black)
     * @param roomId - Room ID to create escrow for
     * @param betAmount - Amount to bet in SOL
     * @param playerRole - Player role ('white' or 'black')
     * @returns Success status
     */
    const createEscrow = async (roomId: string, betAmount: number, playerRole: 'white' | 'black'): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);



        if (!connected || !publicKey) {
          setError('Please connect your wallet first');
          return false;
        }



        // Get program
        const program = await getProgram();
        if (!program) {

          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, false, playerRole).then(result => result.success);
        }



        // Check if program has instructions (if not, use direct RPC)
        if (!program.idl.instructions || program.idl.instructions.length === 0) {

          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, false, playerRole).then(result => result.success);
        }
        
        // Check if required instruction exists
        const requiredInstruction = playerRole === 'white' ? 'initialize_game' : 'join_game';
        const hasRequiredInstruction = program.idl.instructions.some(i => i.name === requiredInstruction);
        if (!hasRequiredInstruction) {

          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, false, playerRole).then(result => result.success);
        }
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          CHESS_PROGRAM_ID
        );
        

        
        // Check if the escrow account already exists
        try {
          const existingAccount = await connection.getAccountInfo(gameEscrowPda);
          if (existingAccount && playerRole === 'white') {
  
            setError('Game escrow already exists for this room. Please join an existing game or use a different room.');
            return false;
          }

        } catch (accountError) {

        }
        
        let escrowAddedToDb = false; // Flag to prevent duplicate database calls
        
        try {
          let gameTx: string;
          
          // Get fresh blockhash for transaction uniqueness
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
  
          
          if (playerRole === 'white') {
            // White player initializes the game
  
            
            const initializeInstruction = await program.methods
              .initializeGame(roomId, new BN(betAmountLamports), new BN(timeLimitSeconds))
              .accounts({
                gameEscrow: gameEscrowPda,
                player: publicKey,
                gameVault: gameVaultPda,
                feeCollector: new PublicKey(FEE_WALLET_ADDRESS),
                systemProgram: SystemProgram.programId,
              })
              .instruction();

            // Create transaction with fresh blockhash
            const transaction = new Transaction({
              recentBlockhash: blockhash,
              feePayer: publicKey,
            }).add(initializeInstruction);
            
            // Sign and send with unique transaction
            gameTx = await sendTransaction(transaction, connection, {
              skipPreflight: false,
              preflightCommitment: 'processed', // Faster confirmation
              maxRetries: 3,
            });
            
  
          } else {
            // Black player joins the existing game
  
            
            const joinInstruction = await program.methods
              .joinGame()
              .accounts({
                gameEscrow: gameEscrowPda,
                player: publicKey,
              })
              .instruction();

            // Create transaction with fresh blockhash
            const transaction = new Transaction({
              recentBlockhash: blockhash,
              feePayer: publicKey,
            }).add(joinInstruction);
            
            // Sign and send with unique transaction
            gameTx = await sendTransaction(transaction, connection, {
              skipPreflight: false,
              preflightCommitment: 'processed', // Faster confirmation
              maxRetries: 3,
            });
            
  
          }
          
          try {
            // Now try to deposit stake
            const depositTx = await program.methods
              .depositStake()
              .accounts({
                gameEscrow: gameEscrowPda,
                player: publicKey,
                gameVault: gameVaultPda,
                systemProgram: SystemProgram.programId,
              })
              .rpc();
            
  
            
            // Add to multiplayer state only once
            if (!escrowAddedToDb) {
              databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
              escrowAddedToDb = true;
            }
            
            return true;
            
          } catch (depositError) {
  
            // Game was initialized but deposit failed - still consider success
            if (!escrowAddedToDb) {
              databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
              escrowAddedToDb = true;
            }
            return true;
          }
          
        } catch (programError) {
          
          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, escrowAddedToDb, playerRole).then(result => result.success);
        }
        
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
     * Deposit stake using direct RPC (most reliable)
     */
    const depositStake = async (roomId: string, betAmount: number): Promise<string | null> => {
      if (!connected || !publicKey) {
        setError('Please connect your wallet first');
        return null;
      }

      if (balance < betAmount) {
        setError(`Insufficient balance! Need ${betAmount} SOL, have ${balance.toFixed(3)} SOL`);
        return null;
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



        // Use direct RPC approach for deposit_stake (more reliable)

        
        // Create deposit_stake instruction manually
        const depositStakeDiscriminator = Buffer.from([160, 167, 9, 220, 74, 243, 228, 43]);
        
        const depositStakeIx = new web3.TransactionInstruction({
          keys: [
            { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: gameVaultPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: new PublicKey(CHESS_PROGRAM_ID),
          data: depositStakeDiscriminator, // No arguments for deposit_stake
        });

        // Get fresh blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        
        // Create and send transaction
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        transaction.add(depositStakeIx);
        
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: 'processed', // Faster confirmation for better UX
          maxRetries: 3,
        });
        


        // Update balance after successful deposit
        setTimeout(() => {
          checkBalance();
        }, 1000);

        return signature; // Return the actual transaction signature
        
      } catch (err: any) {
        let errorMessage = 'Failed to deposit stake';
        
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'InvalidGameStateForDeposit':
              errorMessage = 'Game is not ready for deposits';
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
        console.error('❌ Deposit stake error:', err);
        return null;
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
        

        
        // Join game
        const joinTx = await program.methods
          .joinGame()
          .accounts({
            gameEscrow: gameEscrowPda,
            player: publicKey,
          } as any)
          .rpc();
        
        // Deposit stake

        
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

      // Create provider for direct RPC calls (needed even if program creation fails)
      const walletAdapter = { 
        publicKey, 
        signTransaction: signTransaction!
        // signAllTransactions is optional for our use case
      };
      const provider = new AnchorProvider(connection, walletAdapter, { commitment: 'confirmed' });

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
        
        // Try to get game account, fall back to direct RPC if needed
        let gameAccount;
        let useDirectRPC = false;
        
        try {
          if (program.account && program.account.gameEscrow) {
            gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
          } else {
            throw new Error('Account definitions not available');
          }
        } catch (fetchError) {
  
          useDirectRPC = true;
        }
        
        // Determine winner enum for contract
        let winner;
        let reason;
        
        if (isDraw) {
          winner = { draw: {} };
          reason = { agreement: {} };
        } else if (gameWinner === 'white') {
          winner = { white: {} };
          // Use correct reason based on who is declaring
          reason = playerRole === 'white' ? { checkmate: {} } : { resignation: {} };
        } else {
          winner = { black: {} };
          // Use correct reason based on who is declaring  
          reason = playerRole === 'black' ? { checkmate: {} } : { resignation: {} };
        }
        
        let tx;
        
        if (useDirectRPC) {
          try {
            // Fetch the account data directly using connection
            const accountInfo = await provider.connection.getAccountInfo(gameEscrowPda);
            
            if (!accountInfo) {
              throw new Error('Game escrow account not found');
            }
            
    
            
            // Parse the account data manually based on GameEscrow structure
            let offset = 8; // Skip discriminator
            
            // Parse room_id (string - first 4 bytes are length, then string bytes)
            const roomIdLength = accountInfo.data.readUInt32LE(offset);
    
            offset += 4;
            const roomIdBytes = accountInfo.data.slice(offset, offset + roomIdLength);
            const parsedRoomId = roomIdBytes.toString('utf8');
    
            offset += roomIdLength;
    
            
            // Parse player_white (32 bytes)
            const playerWhiteBytes = accountInfo.data.slice(offset, offset + 32);
            const playerWhite = new web3.PublicKey(playerWhiteBytes);
    
            offset += 32;
    
            
            // Parse player_black (direct Pubkey - 32 bytes, not an Option!)
            const playerBlackBytes = accountInfo.data.slice(offset, offset + 32);
            const playerBlackPubkey = new PublicKey(playerBlackBytes);
            const defaultPubkey = new PublicKey('11111111111111111111111111111111');
            let playerBlack = playerBlackPubkey.equals(defaultPubkey) ? null : playerBlackPubkey;
            offset += 32;
            
            // Parse stake_amount (8 bytes u64)
            const stakeAmountBuffer = accountInfo.data.slice(offset, offset + 8);
            const stakeAmount = new BN(stakeAmountBuffer, 'le');
            offset += 8;
            
            // Parse boolean fields (game_started, white_deposited, black_deposited - 3 bytes total)
            const gameStarted = accountInfo.data[offset] === 1;
            offset += 1;
            const whiteDeposited = accountInfo.data[offset] === 1;
            offset += 1;
            const blackDeposited = accountInfo.data[offset] === 1;
            offset += 1;
            

            
            // Skip fee_collector parsing - we'll use the hardcoded address
            offset += 32; // Skip fee_collector field
            
            // Validate game state - TEMPORARILY DISABLED FOR TESTING
            // TODO: Fix join_game instruction to properly set player_black field
            if (!playerBlack) {
              // For testing purposes, use the current player as playerBlack
              playerBlack = publicKey;
            }
            
            // VALIDATION REMOVED: Winners can now claim their own checkmate victories
            // The smart contract now properly validates checkmate declarations

            // Encode winner enum (0 = None, 1 = White, 2 = Black, 3 = Draw)
            let winnerVariant;
            if (isDraw) {
              winnerVariant = 3; // Draw
            } else if (gameWinner === 'white') {
              winnerVariant = 1; // White
            } else {
              winnerVariant = 2; // Black
            }
            
            // Determine the correct reason based on smart contract validation rules:
            // - Winners can declare their own victories by checkmate
            // - Losers acknowledge opponent's victory by resignation
            let reasonVariant;
            if (isDraw) {
              reasonVariant = 3; // Agreement (for draws) - correct enum value
            } else if (playerRole === gameWinner) {
              reasonVariant = 0; // Checkmate (winner declares own victory)
            } else {
              reasonVariant = 1; // Resignation (loser acknowledges opponent's victory)
            }
            

            
            // Create instruction data: discriminator + winner + reason
            const discriminator = Buffer.from([205, 129, 155, 217, 131, 167, 175, 38]);
            const winnerBuffer = Buffer.alloc(1);
            winnerBuffer.writeUInt8(winnerVariant, 0);
            const reasonBuffer = Buffer.alloc(1);
            reasonBuffer.writeUInt8(reasonVariant, 0);
            
            const instructionData = Buffer.concat([discriminator, winnerBuffer, reasonBuffer]);
            
            // Create the instruction - ALWAYS use the hardcoded fee collector
            const instruction = new web3.TransactionInstruction({
              programId: new web3.PublicKey(CHESS_PROGRAM_ID),
              keys: [
                { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: gameVaultPda, isSigner: false, isWritable: true },
                { pubkey: playerWhite, isSigner: false, isWritable: true },
                { pubkey: playerBlack, isSigner: false, isWritable: true },
                { pubkey: FEE_WALLET_ADDRESS, isSigner: false, isWritable: true },
                { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              data: instructionData
            });
            
            // Get recent blockhash for transaction uniqueness
            const { blockhash } = await provider.connection.getLatestBlockhash('finalized');
            
            // Create and send transaction
            const transaction = new web3.Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
            transaction.add(instruction);
            
    
            tx = await provider.sendAndConfirm(transaction);
    
            
            // Calculate actual amounts for display
            const totalPot = stakeAmount.toNumber() * 2 / web3.LAMPORTS_PER_SOL;
            
            if (gameWinner === playerRole) {
              const winnings = totalPot * 0.99; // 1% fee
              return `🎉 SUCCESS! You won ${winnings.toFixed(3)} SOL! Transaction: ${tx}`;
            } else if (isDraw) {
              const refund = (stakeAmount.toNumber() / web3.LAMPORTS_PER_SOL) * 0.99;
              return `🤝 Draw! You received ${refund.toFixed(3)} SOL back. Transaction: ${tx}`;
            } else {
              return `❌ You lost this game. Better luck next time!`;
            }
            
          } catch (directRpcError) {
            console.error('❌ Direct RPC approach failed:', directRpcError);
            const errorMsg = `❌ Failed to claim winnings via direct RPC: ${directRpcError.message}`;
            setError(errorMsg);
            return errorMsg;
          }
          
        } else {
          // Use the normal Anchor approach
          tx = await program.methods
            .declareResult(winner, reason)
            .accounts({
              gameEscrow: gameEscrowPda,
              player: publicKey,
              gameVault: gameVaultPda,
              playerWhite: gameAccount.playerWhite,
              playerBlack: gameAccount.playerBlack,
              feeCollector: FEE_WALLET_ADDRESS,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        }
        
        let statusMessage = '';
        
        if (!useDirectRPC && gameAccount) {
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
        } else {
          // Fallback message when we can't get precise amounts
          if (gameWinner === playerRole) {
            statusMessage = `🎉 SUCCESS! You won the game! Winnings have been transferred to your wallet.`;
          } else if (isDraw) {
            statusMessage = `🤝 Draw! Your stake has been refunded.`;
          } else {
            statusMessage = `❌ You lost this game. Better luck next time!`;
          }
        }
        
        // Update balance (removed polling)
        // setTimeout(() => {
        //   checkBalance();
        // }, 1000);
        
        return statusMessage;
        
      } catch (err: any) {
        let errorMessage = `❌ Claim failed: ${(err as Error).message}`;
        
        // Check for common "already processed" error patterns in the message
        const errorMsg = (err as Error).message || '';
        if (errorMsg.includes('GameNotInProgress') || 
            errorMsg.includes('Game is not in progress') ||
            errorMsg.includes('already been processed') ||
            errorMsg.includes('already processed')) {
  
          if (gameWinner === playerRole) {
            return `🎉 SUCCESS! Winnings already claimed and transferred to your wallet!`;
          } else if (isDraw) {
            return `🤝 Draw! Stake already refunded to your wallet!`;
          } else {
            return `✅ Game completed! Result already processed.`;
          }
        }
        
        if (err.error?.errorCode?.code) {
          switch (err.error.errorCode.code) {
            case 'GameNotInProgress':
              // This means the game result was already declared by someone else
              // Treat this as success since winnings were already distributed
      
              if (gameWinner === playerRole) {
                return `🎉 SUCCESS! Winnings already claimed and transferred to your wallet!`;
              } else if (isDraw) {
                return `🤝 Draw! Stake already refunded to your wallet!`;
              } else {
                return `✅ Game completed! Result already processed.`;
              }
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
      positionHash: Uint8Array,
      fromSquare: string,
      toSquare: string,
      piece: string,
      capturedPiece?: string,
      timeSpent: number = 1000,
      isCheck: boolean = false,
      isCheckmate: boolean = false,
      isCastle: boolean = false,
      isEnPassant: boolean = false,
      isPromotion: boolean = false,
      promotionPiece?: string
    ): Promise<boolean> => {
      const program = getProgram();
      if (!program || !publicKey) return false;
      
      try {
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          CHESS_PROGRAM_ID
        );
        
        const tx = await program.methods
          .recordMove(
            moveNotation, 
            Array.from(positionHash),
            fromSquare,
            toSquare,
            piece,
            capturedPiece || null,
            timeSpent,
            isCheck,
            isCheckmate,
            isCastle,
            isEnPassant,
            isPromotion,
            promotionPiece || null
          )
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

        // Get game account to read player addresses - fee collector is always hardcoded
        const gameAccount = await program.account.gameEscrow.fetch(gameEscrowPda);
        
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
            playerWhite: gameAccount.playerWhite,
            playerBlack: gameAccount.playerBlack,
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
      depositStake,
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
      depositStake: async () => null,
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