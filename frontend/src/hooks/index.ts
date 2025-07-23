/**
 * Custom hooks index file
 * Exports all custom hooks for easy importing
 */

// Core hooks
export { useTheme } from './useTheme';
export { useSolanaWallet } from './useSolanaWallet';
export { useGameState } from './useGameState';
export { useWebSocket } from './useWebSocket';

// Performance optimization hooks
export { 
  useChessOptimizations, 
  useDebounce, 
  useThrottle 
} from './useChessOptimizations';