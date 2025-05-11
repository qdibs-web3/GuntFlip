// src/components/Navbar.js
import React from 'react';
import { useWeb3 } from '@thirdweb-dev/react'; // Import Thirdweb hook
import logo from '../assets/nav.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const {
    connect,
    disconnect,
    isConnected,
    address,
    isConnecting,
    isLoading,
    error,
  } = useWeb3(); // Using Thirdweb's Web3 hook

  const handleConnect = () => {
    if (!isConnecting && !isLoading) {
      connect(); // Connect to wallet via Thirdweb
    }
  };

  const handleDisconnect = () => {
    if (disconnect) {
      disconnect(); // Disconnect wallet via Thirdweb
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

        {!isConnecting && !isLoading && !error && isConnected && address && (
          <div className="wallet-connected">
            <span className="wallet-address-display">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <button className="connect-button1 disconnect-button" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        )}

        {!isConnecting && !isLoading && !error && !isConnected && (
          <button
            className="connect-button1"
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
