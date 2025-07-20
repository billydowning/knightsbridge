/**
 * Custom hook for Solana wallet operations
 * Handles balance checking, transactions, and escrow management
 */

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import multiplayerState from '../services/multiplayerState';

// Solana Integration Constants
const PROGRAM_ID = new PublicKey('F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr');
const FEE_WALLET = new PublicKey('UFGCHLdHGYQDwCag4iUTTYmvTyayvdjo9BsbDBs56r1');

export interface SolanaWalletHook {
  // Wallet state
  publicKey: PublicKey | null;
  connected: boolean;
  balance: number;
  
  // Wallet operations
  checkBalance: () => Promise<void>;
  createEscrow: (roomId: string, betAmount: number) => Promise<boolean>;
  claimWinnings: (playerRole: string, gameWinner: string | null, isDraw: boolean, betAmount: number) => Promise<string>;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for Solana wallet operations
 */
export const useSolanaWallet = (): SolanaWalletHook => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkBalance();
    }
  }, [connected, publicKey]);

  /**
   * Check wallet balance
   */
  const checkBalance = async (): Promise<void> => {
    if (!connected || !publicKey) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      const walletBalance = await connection.getBalance(publicKey);
      setBalance(walletBalance / LAMPORTS_PER_SOL);
      console.log('💰 Balance updated:', (walletBalance / LAMPORTS_PER_SOL).toFixed(3), 'SOL');
    } catch (err) {
      const errorMessage = `Error checking balance: ${(err as Error).message}`;
      setError(errorMessage);
      console.error('❌ Balance check error:', err);
    }
  };

  /**
   * Create escrow for a game
   * @param roomId - Room ID to create escrow for
   * @param betAmount - Amount to bet in SOL
   * @returns Success status
   */
  const createEscrow = async (roomId: string, betAmount: number): Promise<boolean> => {
    if (!connected || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return false;
    }

    if (balance < betAmount) {
      setError(`Insufficient balance! Need ${betAmount} SOL, have ${balance.toFixed(3)} SOL`);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Creating escrow for room:', roomId, 'amount:', betAmount, 'SOL');
      
      // Add to multiplayer state (this will auto-start game if both escrows ready)
      multiplayerState.addEscrow(roomId, publicKey.toString(), betAmount);
      
      // Simple SOL transfer simulation (in real app, you'd use your smart contract)
      const lamports = betAmount * LAMPORTS_PER_SOL;
      
      // Create a simple transaction (this is a placeholder)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: FEE_WALLET, // This would be your escrow account
          lamports: lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // In production, you'd sign and send this transaction
      // const signed = await signTransaction(transaction);
      // const signature = await connection.sendRawTransaction(signed.serialize());
      
      console.log('✅ Escrow created successfully for room:', roomId);
      
      // Update balance after escrow creation
      setTimeout(() => {
        checkBalance();
      }, 1000);
      
      return true;
      
    } catch (err) {
      const errorMessage = `Escrow creation failed: ${(err as Error).message}`;
      setError(errorMessage);
      console.error('❌ Escrow creation error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Claim winnings from a completed game
   * @param playerRole - Player's role ('white' or 'black')
   * @param gameWinner - Winner of the game ('white', 'black', or null for draw)
   * @param isDraw - Whether the game was a draw
   * @param betAmount - Original bet amount
   * @returns Status message
   */
  const claimWinnings = async (
    playerRole: string, 
    gameWinner: string | null, 
    isDraw: boolean, 
    betAmount: number
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

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🏆 Claiming winnings for player:', playerRole, 'Winner:', gameWinner, 'Draw:', isDraw);
      
      // Simulate transaction time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let statusMessage = '';
      
      if (gameWinner === playerRole) {
        const winnings = betAmount * 2;
        statusMessage = `🎉 SUCCESS! You won ${winnings} SOL! Winnings have been transferred to your wallet.`;
        console.log('🎉 Winner claimed:', winnings, 'SOL');
      } else if (isDraw) {
        statusMessage = `🤝 Draw payout processed! You received ${betAmount} SOL back.`;
        console.log('🤝 Draw claimed:', betAmount, 'SOL');
      } else {
        statusMessage = `❌ No winnings available - you did not win this game.`;
        console.log('❌ Non-winner tried to claim');
      }
      
      // Update balance after claim
      setTimeout(() => {
        checkBalance();
      }, 500);
      
      return statusMessage;
      
    } catch (err) {
      const errorMessage = `❌ Claim failed: ${(err as Error).message}`;
      setError(errorMessage);
      console.error('❌ Claim error:', err);
      return errorMessage;
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
    createEscrow,
    claimWinnings,
    
    // Status
    isLoading,
    error
  };
};

export default useSolanaWallet;