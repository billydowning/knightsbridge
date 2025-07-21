import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

console.log('🚀 AnchorProvider loading...');

const network = 'devnet'; // Use 'mainnet-beta' for production
const endpoint = clusterApiUrl(network);
const wallets = [new PhantomWalletAdapter()];

console.log('🚀 Solana endpoint:', endpoint);
console.log('🚀 Wallets configured:', wallets.length);

export const AnchorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  console.log('🚀 AnchorProvider rendering...');
  
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