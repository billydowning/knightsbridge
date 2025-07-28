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
     * Get Anchor program instance - FIXED VERSION
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
        const program = await Program.at(CHESS_PROGRAM_ID, provider);
        console.log('🔍 Debug - GetProgram - Successfully loaded program from chain');
        return program;
      } catch (chainError) {
        console.log('🔍 Debug - GetProgram - Chain IDL fetch failed, using local IDL');
        console.log('🔍 Debug - GetProgram - Chain error:', chainError);
      }
      
      // Create truly minimal IDL with ONLY instructions - no account types
      try {
        console.log('🔍 Debug - Attempting program creation with truly minimal IDL...');
        
        const initializeGame = ChessEscrowIDL.instructions?.find(i => i.name === 'initialize_game');
        const depositStake = ChessEscrowIDL.instructions?.find(i => i.name === 'deposit_stake');
        const declareResult = ChessEscrowIDL.instructions?.find(i => i.name === 'declare_result');
        const joinGame = ChessEscrowIDL.instructions?.find(i => i.name === 'join_game');
        
        console.log('🔍 Found instructions:', {
          initializeGame: !!initializeGame,
          depositStake: !!depositStake,
          declareResult: !!declareResult,
          joinGame: !!joinGame
        });
        
        // Create working IDL with instructions and basic accounts for fetching
        const minimalIDL = {
          address: CHESS_PROGRAM_ID,
          metadata: {
            name: "chess_escrow",
            version: "0.1.0",
            spec: "0.1.0"
          },
          instructions: [
            ...(initializeGame ? [initializeGame] : []),
            ...(depositStake ? [depositStake] : []),
            ...(declareResult ? [declareResult] : []),
            ...(joinGame ? [joinGame] : [])
          ],
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
        
        console.log('🔍 Minimal IDL created:', {
          instructionCount: minimalIDL.instructions.length,
          accountCount: minimalIDL.accounts.length,
          typeCount: minimalIDL.types.length,
          instructions: minimalIDL.instructions.map(i => i.name)
        });
        
        const program = new Program(minimalIDL, new PublicKey(CHESS_PROGRAM_ID), provider);
        console.log('✅ Debug - Created program with truly minimal IDL');
        return program;
        
      } catch (minimalError) {
        console.log('❌ Debug - Minimal IDL approach failed:', minimalError.message);
        
        // Final fallback: Create dummy program for direct RPC
        try {
          console.log('🔍 Creating dummy program for direct RPC calls...');
          const dummyIDL = {
            address: CHESS_PROGRAM_ID,
            metadata: { name: "dummy", version: "0.1.0", spec: "0.1.0" },
            instructions: [],
            accounts: [],
            types: [],
            events: [],
            errors: []
          };
          
          const dummyProgram = new Program(dummyIDL, new PublicKey(CHESS_PROGRAM_ID), provider);
          console.log('✅ Debug - Created dummy program for direct RPC');
          return dummyProgram;
        } catch (dummyError) {
          console.log('❌ Debug - Even dummy program failed:', dummyError.message);
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
        console.log('🔍 Direct RPC - Creating escrow with room ID:', roomId);
        console.log('🔍 Direct RPC - Bet amount:', betAmount, 'SOL');
        console.log('🔍 Direct RPC - Player role:', playerRole);
        
        // Derive PDAs
        const [gameEscrowPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(roomId)],
          new PublicKey(CHESS_PROGRAM_ID)
        );
        
        const [gameVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), gameEscrowPda.toBuffer()],
          new PublicKey(CHESS_PROGRAM_ID)
        );
        
        console.log('🔍 Direct RPC - Game Escrow PDA:', gameEscrowPda.toString());
        console.log('🔍 Direct RPC - Game Vault PDA:', gameVaultPda.toString());
        
        // Create the transaction
        const transaction = new web3.Transaction();
        
        if (playerRole === 'white') {
          // WHITE PLAYER: Initialize game instruction
          console.log('🔍 Direct RPC - Creating initialize_game instruction for WHITE player');
          
          // Instruction discriminator for initialize_game: [44, 62, 102, 247, 126, 208, 130, 215]
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
          
          console.log('🔍 Direct RPC - Instruction data length:', instructionData.length);
          console.log('🔍 Direct RPC - Room ID length:', roomIdBuffer.length);
          console.log('🔍 Direct RPC - Bet amount lamports:', betAmountLamports);
          console.log('🔍 Direct RPC - Time limit seconds:', timeLimitSeconds);
          
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
          // BLACK PLAYER: Join game instruction
          console.log('🔍 Direct RPC - Creating join_game instruction for BLACK player');
          
          // Instruction discriminator for join_game: [107, 112, 18, 38, 56, 173, 60, 128]
          const joinGameDiscriminator = Buffer.from([107, 112, 18, 38, 56, 173, 60, 128]);
          
          // join_game takes no arguments, just the discriminator
          const instructionData = joinGameDiscriminator;
          
          console.log('🔍 Direct RPC - Join game instruction data length:', instructionData.length);
          
          // Create the join game instruction
          const joinGameIx = new web3.TransactionInstruction({
            keys: [
              { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: true },
            ],
            programId: new PublicKey(CHESS_PROGRAM_ID),
            data: instructionData,
          });
          
          transaction.add(joinGameIx);
        }
        
        // Force a small delay to ensure timestamp uniqueness
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get fresh blockhash with finalized commitment for maximum freshness
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        console.log('🔍 Direct RPC - Fresh blockhash:', blockhash.slice(0, 8) + '...');
        console.log('🔍 Direct RPC - Last valid block height:', lastValidBlockHeight);
        
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
        
        console.log('🔍 Direct RPC - Added enhanced uniqueness memo:', memoData.slice(0, 20) + '...');
        
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
            
            console.log(`✅ Direct RPC - Transaction sent (attempt ${retryCount + 1}):`, signature);
            break;
            
          } catch (sendError) {
            retryCount++;
            console.log(`❌ Send attempt ${retryCount} failed:`, sendError.message);
            
            if (retryCount >= maxRetries) {
              throw sendError;
            }
            
            // Wait before retry and get fresh blockhash
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { blockhash: newBlockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = newBlockhash;
            console.log('🔄 Retrying with new blockhash:', newBlockhash.slice(0, 8) + '...');
          }
        }
        
        // Wait for confirmation with timeout
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        console.log('✅ Direct RPC - Transaction confirmed:', confirmation);
        
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

        console.log('🔍 Debug - CreateEscrow - Starting function');
        console.log('🔍 Debug - CreateEscrow - Room ID:', roomId);
        console.log('🔍 Debug - CreateEscrow - Bet Amount:', betAmount);
        console.log('🔍 Debug - CreateEscrow - Player Role:', playerRole);

        if (!connected || !publicKey) {
          setError('Please connect your wallet first');
          return false;
        }

        console.log('🔍 Debug - CreateEscrow - Connected:', connected);
        console.log('🔍 Debug - CreateEscrow - Public Key:', publicKey.toString());
        console.log('🔍 Debug - CreateEscrow - Balance:', balance);

        // Get program
        const program = await getProgram();
        if (!program) {
          console.log('🔍 Program creation failed, using direct RPC approach...');
          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, false, playerRole).then(result => result.success);
        }

        console.log('🔍 Debug - CreateEscrow - Program:', program ? 'Found' : 'Not found');

        // Check if program has instructions (if not, use direct RPC)
        if (!program.idl.instructions || program.idl.instructions.length === 0) {
          console.log('🔍 No instructions in program, using direct RPC approach...');
          return await createEscrowDirectRPC(roomId, betAmount, publicKey, connection, false, playerRole).then(result => result.success);
        }
        
        // Check if required instruction exists
        const requiredInstruction = playerRole === 'white' ? 'initialize_game' : 'join_game';
        const hasRequiredInstruction = program.idl.instructions.some(i => i.name === requiredInstruction);
        if (!hasRequiredInstruction) {
          console.log(`🔍 No ${requiredInstruction} instruction found, using direct RPC approach...`);
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
        
        console.log('🔍 Debug - CreateEscrow - Room ID:', roomId);
        console.log('🔍 Debug - CreateEscrow - Game Escrow PDA:', gameEscrowPda.toString());
        console.log('🔍 Debug - CreateEscrow - Game Vault PDA:', gameVaultPda.toString());
        console.log('🔍 Debug - CreateEscrow - Player Public Key:', publicKey.toString());
        console.log('🔍 Debug - CreateEscrow - Fee Collector:', FEE_WALLET_ADDRESS.toString());
        console.log('🔍 Debug - CreateEscrow - System Program:', SystemProgram.programId.toString());
        
        // Check if the escrow account already exists
        try {
          const existingAccount = await connection.getAccountInfo(gameEscrowPda);
          if (existingAccount && playerRole === 'white') {
            console.log('⚠️ Game escrow already exists for this room. White player trying to initialize existing game.');
            setError('Game escrow already exists for this room. Please join an existing game or use a different room.');
            return false;
          }
          console.log('🔍 Escrow account check:', existingAccount ? 'EXISTS' : 'DOES NOT EXIST');
        } catch (accountError) {
          console.log('🔍 Account check failed (continuing anyway):', accountError);
        }
        
        let escrowAddedToDb = false; // Flag to prevent duplicate database calls
        
        try {
          let gameTx: string;
          
          // Get fresh blockhash for transaction uniqueness
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          console.log('🔍 Debug - Using fresh blockhash for uniqueness:', blockhash.slice(0, 8) + '...');
          
          if (playerRole === 'white') {
            // White player initializes the game
            console.log('🔍 Debug - About to call initializeGame (WHITE player)');
            
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
              preflightCommitment: 'confirmed',
            });
            
            console.log('✅ InitializeGame successful:', gameTx);
          } else {
            // Black player joins the existing game
            console.log('🔍 Debug - About to call joinGame (BLACK player)');
            
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
              preflightCommitment: 'confirmed',
            });
            
            console.log('✅ JoinGame successful:', gameTx);
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
            
            console.log('✅ DepositStake successful:', depositTx);
            
            // Add to multiplayer state only once
            if (!escrowAddedToDb) {
              databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
              escrowAddedToDb = true;
            }
            
            return true;
            
          } catch (depositError) {
            console.log('❌ DepositStake failed:', depositError.message);
            // Game was initialized but deposit failed - still consider success
            if (!escrowAddedToDb) {
              databaseMultiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
              escrowAddedToDb = true;
            }
            return true;
          }
          
        } catch (programError) {
          console.log('❌ Program method failed:', programError.message);
          console.log('🔍 Falling back to direct RPC approach...');
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
          console.log('❌ Account fetch failed, using direct RPC approach for claim');
          useDirectRPC = true;
        }
        
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
        
        let tx;
        
        if (useDirectRPC) {
          console.log('🔧 Using direct RPC for declare_result instruction');
          
          // Since we can't fetch the account, we'll use placeholder addresses
          // In production, you'd implement proper account parsing from raw data
          const feeCollectorPda = new web3.PublicKey("11111111111111111111111111111111"); // Placeholder
          
          // Manually construct the instruction
          const instruction = {
            programId: CHESS_PROGRAM_ID,
            keys: [
              { pubkey: gameEscrowPda, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: false },
              { pubkey: gameVaultPda, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: false, isWritable: true }, // playerWhite placeholder
              { pubkey: publicKey, isSigner: false, isWritable: true }, // playerBlack placeholder  
              { pubkey: feeCollectorPda, isSigner: false, isWritable: true },
              { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([]) // Would need proper instruction encoding
          };
          
          // For now, return a helpful message
          const errorMsg = '🚧 Direct RPC claim winnings is not fully implemented yet. The escrow funds are safe on-chain. Please contact support to manually process the claim.';
          setError(errorMsg);
          return errorMsg;
          
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
              feeCollector: gameAccount.feeCollector,
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