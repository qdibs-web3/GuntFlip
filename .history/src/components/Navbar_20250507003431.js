// src/components/Navbar.js
import React from 'react';
import { useWallet } from '../context/WalletProvider';
import logo from '../assets/nav.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const { walletAddress, connect, isLoading, isConnecting, error, account } = useWallet(); // Matched the WalletProvider_rollback.js context values

  console.log("[Navbar] Rendering. WalletAddress:", walletAddress, "isLoading:", isLoading, "isConnecting:", isConnecting, "Error:", error, "Account:", account);

  const handleConnect = () => {
    if (connect && !isConnecting && !isLoading) {
      console.log("[Navbar] Calling connect function");
      connect();
    } else if (isConnecting || isLoading) {
      console.log("[Navbar] Wallet connection/loading in progress...");
    } else {
      console.error("[Navbar] Connect function not available.");
    }
  };

  // Using a placeholder disconnect from the rollback version
  const handleDisconnect = () => {
    const { disconnect } = useWallet(); // Get it fresh in case of re-render
    if (disconnect) {
      console.log("[Navbar] Calling disconnect function (placeholder)");
      disconnect();
    } else {
      console.error("[Navbar] Disconnect function not available.");
    }
  };

  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="logo" onClick={() => window.location.href = '/'} />
      <div className="wallet-section">
        {isConnecting && <span className="wallet-status">Connecting...</span>}
        {isLoading && !isConnecting && <span className="wallet-status">Loading Account...</span>} 
        {error && <span className="wallet-status wallet-error">Error: {error.message || 'Failed'}</span>}
        
        {!isConnecting && !isLoading && !error && walletAddress && (
          <>
            <span className="wallet-address-display">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            {/* Disconnect button might not be fully functional with placeholder disconnect */}
            <button 
              className="connect-button disconnect-button" 
              onClick={handleDisconnect} 
            >
              Disconnect (Placeholder)
            </button>
          </>
        )}
        
        {!isConnecting && !isLoading && !error && !walletAddress && (
          <button 
            className="connect-button" 
            onClick={handleConnect} 
            disabled={isConnecting || isLoading}
          >
            {isConnecting || isLoading ? 'Processing...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

