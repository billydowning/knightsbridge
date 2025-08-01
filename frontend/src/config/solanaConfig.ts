/**
 * Solana Configuration
 * Centralized configuration for Solana blockchain integration
 */

import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Network Configuration
export const SOLANA_NETWORK = WalletAdapterNetwork.Devnet;
export const SOLANA_RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// Program and Wallet Addresses
export const CHESS_PROGRAM_ID = new PublicKey('F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr');
export const FEE_WALLET_ADDRESS = new PublicKey('8nX9YShMbTwfKCEVTHVrFrDspZCKQEfrCwPnA2AknLj4');

// Transaction Configuration
export const TRANSACTION_TIMEOUT = 30000; // 30 seconds
export const CONFIRMATION_COMMITMENT = 'confirmed' as const;

// Fee Configuration (in SOL)
export const PLATFORM_FEE_PERCENTAGE = 0.05; // 5% platform fee
export const MIN_BET_AMOUNT = 0.1; // Minimum bet in SOL
export const MAX_BET_AMOUNT = 100; // Maximum bet in SOL
export const DEFAULT_BET_AMOUNT = 0.1; // Default bet amount

// Error Messages
export const SOLANA_ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PROGRAM_NOT_FOUND: 'Chess program not found on the blockchain',
  INVALID_AMOUNT: `Bet amount must be between ${MIN_BET_AMOUNT} and ${MAX_BET_AMOUNT} SOL`,
} as const;

// Development Configuration
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const ENABLE_TRANSACTION_SIMULATION = IS_DEVELOPMENT;

// Supported Wallets
export const SUPPORTED_WALLETS = [
  'Phantom',
  'Backpack',
  'Solflare',
  'Slope',
] as const;

export type SupportedWallet = typeof SUPPORTED_WALLETS[number];