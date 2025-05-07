// src/components/Navbar.js
// This version is designed to work with WalletProvider_with_logout.js
import React from 'react';
import { useWallet } from '../context/WalletProvider';
import logo from '../assets/nav.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const { walletAddress, connect, disconnect, isLoading, isConnecting, isDisconnecting, error, account } = useWallet();

  console.log("[Navbar] Rendering. WalletAddress:", walletAddress, "isLoading:", isLoading, "isConnecting:", isConnecting, "isDisconnecting:", isDisconnecting, "Error:", error, "Account:", account);

  const handleConnect = () => {
    if (connect && !isConnecting && !isLoading && !isDisconnecting) {
      console.log("[Navbar] Calling connect function");
      connect();
    } else if (isConnecting || isLoading || isDisconnecting) {
      console.log("[Navbar] Wallet operation in progress...");
    } else {
      console.error("[Navbar] Connect function not available.");
    }
  };

  const handleDisconnect = () => {
    if (disconnect && !isDisconnecting && !isLoading) {
      console.log("[Navbar] Calling disconnect function");
      disconnect();
    } else if (isDisconnecting || isLoading) {
      console.log("[Navbar] Wallet operation in progress...");
    } else {
      console.error("[Navbar] Disconnect function not available.");
    }
  };

  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="logo" onClick={() => window.location.href = '/' } />
      <div className="wallet-section">
        {isConnecting && <span className="wallet-status">Connecting...</span>}
        {isDisconnecting && <span className="wallet-status">Disconnecting...</span>}
        {isLoading && !isConnecting && !isDisconnecting && <span className="wallet-status">Loading Account...</span>}
        {error && <span className="wallet-status wallet-error">Error: {error.message || 'Failed'}</span>}
        
        {!isConnecting && !isDisconnecting && !isLoading && !error && walletAddress && (
          <>
            <span className="wallet-address-display">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            <button 
              className="connect-button disconnect-button" 
              onClick={handleDisconnect} 
              disabled={isDisconnecting || isLoading}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </>
        )}
        
        {!isConnecting && !isDisconnecting && !isLoading && !error && !walletAddress && (
          <button 
            className="connect-button" 
            onClick={handleConnect} 
            disabled={isConnecting || isLoading || isDisconnecting}
          >
            {(isConnecting || isLoading || isDisconnecting) ? 'Processing...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

