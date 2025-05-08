import React, { useState } from 'react';
import '../styles/CoinFlip.css';
import heads from '../assets/heads.png';
import tails from '../assets/tails.png';
import { useWallet } from '../context/WalletProvider';


const CoinFlipPage = () => {
  const { walletAddress } = useWallet();
  const [selectedSide, setSelectedSide] = useState('');
  const [wager, setWager] = useState('');

  const presetAmounts = ['0.0025', '0.005', '0.0075', '0.01'];

  const handleWagerInput = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.001 && num <= 0.01) {
      setWager(val);
    }
  };

  const handleDegen = () => {
    if (!walletAddress) return alert("Connect wallet first.");
    if (!selectedSide) return alert("Select heads or tails.");
    if (!wager) return alert("Enter a valid wager between 0.001 and 0.01 ETH.");
    alert(`Flipping ${selectedSide} with ${wager} ETH...`);
  };

  return (
    <div className="coinflip-container">
      {!walletAddress ? (
        <div className="wallet-warning">Please connect Abstract wallet to Degen</div>
      ) : (
        <div className="coinflip-box">
          <div className="box-header">
            <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
          <div className="coin-images">
            <div className="coin-option">
              <img src={heads} alt="Heads" />
              <span>Heads</span>
            </div>
            <div className="coin-option">
              <img src={tails} alt="Tails" />
              <span>Tails</span>
            </div>
          </div>

          <div className="coinflip-options">
            <div className="left-side">
              {presetAmounts.map((amt) => (
                <button key={amt} onClick={() => setWager(amt)}>{amt}</button>
              ))}
            </div>
            <div className="right-side">
              <div className="selection-buttons">
                <button
                  className={selectedSide === 'heads' ? 'selected' : ''}
                  onClick={() => setSelectedSide('heads')}
                >
                  Heads
                </button>
                <button
                  className={selectedSide === 'tails' ? 'selected' : ''}
                  onClick={() => setSelectedSide('tails')}
                >
                  Tails
                </button>
              </div>
              <input
                type="number"
                placeholder="Enter wager"
                value={wager}
                min="0.001"
                max="0.01"
                step="0.0001"
                onChange={(e) => handleWagerInput(e.target.value)}
              />
              <button className="degen-button" onClick={handleDegen}>Degen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinFlipPage;
