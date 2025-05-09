// src/components/Navbar.js
import React from 'react';
import { useWallet } from '../context/WalletProvider';
import logo from '../assets/nav.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const { walletAddress, connect, disconnect, isLoading, isConnecting, error, account } = useWallet();

  const handleConnect = () => {
    if (connect && !isConnecting && !isLoading) {
      connect();
    }
  };

  const handleDisconnect = () => {
    if (disconnect) {
      disconnect();
    }
  };

  return (
    <nav className="navbar">
      <img
        src={logo}
        alt="Logo"
        className="logo"
        onClick={() => window.location.href = '/'}
      />

      <div className="wallet-section">
        {isConnecting && <span className="wallet-status">Connecting...</span>}
        {isLoading && !isConnecting && <span className="wallet-status">Loading Account...</span>}
        {error && <span className="wallet-status wallet-error">Error: {error.message || 'Failed'}</span>}

        {!isConnecting && !isLoading && !error && walletAddress && (
          <div className="wallet-connected">
            <span className="wallet-address-display">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button className="connect-button1 disconnect-button" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
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
