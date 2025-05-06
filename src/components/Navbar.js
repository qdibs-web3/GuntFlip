// src/components/Navbar.js
import React from 'react';
import { useWallet } from '../context/WalletProvider';
import logo from '../assets/nav.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const { walletAddress, connect } = useWallet();

  // Ensure the connect function is available
  const handleConnect = () => {
    if (connect) {
      connect();
    } else {
      console.error("Connect function not available from WalletProvider");
      alert("Wallet connection function is not ready. Please try again later.");
    }
  };

  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="logo" onClick={() => window.location.href = '/'} />
      <div className="wallet-section">
        {walletAddress ? (
          <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
        ) : (
          <button className="connect-button" onClick={handleConnect}>Abstract Connect</button> // Added className and wrapped connect call
        )}
      </div>
    </nav>
  );
};

export default Navbar;

