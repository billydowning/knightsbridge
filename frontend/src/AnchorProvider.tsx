import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SOLANA_RPC_ENDPOINT } from './config/solanaConfig';

// Use reliable RPC endpoint for production
const endpoint = SOLANA_RPC_ENDPOINT;
const wallets = [new PhantomWalletAdapter()];

export const AnchorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  try {
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  } catch (error) {
    console.error('❌ Error in AnchorProvider:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Wallet Connection Error</h1>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }
};