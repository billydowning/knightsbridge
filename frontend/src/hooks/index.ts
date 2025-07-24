/**
 * Custom hooks index file
 * Exports all custom hooks for easy importing
 */

// Core hooks
export { useTheme } from '../App'; // useTheme is defined in App.tsx
export { useSolanaWallet } from './useSolanaWallet';
export { useGameState } from './useGameState';
export { useWebSocket } from './useWebSocket';

// Performance optimization hooks
export { 
  useChessOptimizations, 
  useDebounce, 
  useThrottle 
} from './useChessOptimizations';