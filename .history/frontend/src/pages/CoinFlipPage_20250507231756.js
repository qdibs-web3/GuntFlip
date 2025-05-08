import React, { useState, useEffect, useCallback } from 'react';
import '../styles/CoinFlip.css';
import headsIcon from '../assets/heads.png'; // Renamed for clarity
import tailsIcon from '../assets/tails.png'; // Renamed for clarity
import pengLogo from '../assets/pengLogo.png'; // Assuming this is for the animation
import { useWallet } from '../context/WalletProvider';
import { createPublicClient, createWalletClient, http, custom, parseUnits, formatUnits, getContractEvents } from 'viem';
import { COINFLIP_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS, abstractTestnetChain } from '../config';
import CoinFlipABI from '../abis/CoinFlip.json';
import MockERC20ABI from '../abis/MockERC20.json';

const CoinFlipPage = () => {
  const { walletAddress, account, connect: connectWallet } = useWallet(); // account should provide EIP-1193 provider access
  const [selectedSide, setSelectedSide] = useState(''); // 'heads' (0) or 'tails' (1)
  const [wager, setWager] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null); // e.g., { message: 'You Won!', details: '...' } or { message: 'You Lost!', details: '...' }
  const [tokenBalance, setTokenBalance] = useState('0');
  const [gameHistory, setGameHistory] = useState([]);
  const [error, setError] = useState('');

  const presetAmounts = ['0.0025', '0.005', '0.0075', '0.01']; // These are in ETH/Token units, need to be parsed to wei
  const tokenDecimals = 18; // Assuming payment token has 18 decimals

  // Setup Viem clients
  const publicClient = createPublicClient({
    chain: abstractTestnetChain,
    transport: http(), // Uses default RPC from abstractTestnetChain
  });

  const getWalletClient = useCallback(async () => { // Added async here
    if (!account || !account.connector) { // Check for connector now
      console.error("Wallet account or connector not available from AGW.");
      setError("Wallet connector not available. Please ensure your AGW wallet is connected and configured correctly.");
      return null;
    }
    // AGW's account.connector should have a getProvider method
    try {
      const provider = await account.connector.getProvider(); // Await the provider
      if (!provider) {
        console.error("Failed to get provider from AGW connector.");
        setError("Failed to get provider from wallet connector.");
        return null;
      }
      return createWalletClient({
        account: account.address, // AGW provides the address directly
        chain: abstractTestnetChain,
        transport: custom(provider), // Use the provider from AGW connector
      });
    } catch (err) {
      console.error("Error getting provider from connector:", err);
      setError("Error initializing wallet client.");
      return null;
    }
  }, [account]);


  const fetchTokenBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const balance = await publicClient.readContract({
        address: TOKEN_CONTRACT_ADDRESS,
        abi: MockERC20ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      setTokenBalance(formatUnits(balance, tokenDecimals));
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError('Failed to fetch token balance.');
    }
  }, [walletAddress, publicClient, tokenDecimals]);

  const fetchGameHistory = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const logs = await publicClient.getLogs({
        address: COINFLIP_CONTRACT_ADDRESS,
        event: CoinFlipABI.find(item => item.name === 'GameSettled' && item.type === 'event'), // viem needs the event ABI item
        args: {
          player: walletAddress, // Filter by player
        },
        fromBlock: 'earliest', // Or a more recent block number for performance
        toBlock: 'latest',
      });

      const history = logs.map(log => ({
        gameId: log.args.gameId.toString(),
        result: log.args.result === 0 ? 'Heads' : 'Tails',
        choice: log.args.choice === 0 ? 'Heads' : 'Tails',
        wager: formatUnits(log.args.wagerAmount, tokenDecimals),
        payout: formatUnits(log.args.payoutAmount, tokenDecimals),
        won: log.args.payoutAmount > 0n,
        txHash: log.transactionHash,
      })).reverse(); // Show most recent first
      setGameHistory(history.slice(0, 10)); // Show last 10 games
    } catch (err) {
      console.error('Error fetching game history:', err);
      setError('Failed to fetch game history.');
    }
  }, [walletAddress, publicClient, tokenDecimals]);

  useEffect(() => {
    if (walletAddress) {
      fetchTokenBalance();
      fetchGameHistory();
    }
  }, [walletAddress, fetchTokenBalance, fetchGameHistory]);

  const handleWagerInput = (val) => {
    // Basic validation, can be improved
    if (val === '' || (parseFloat(val) >= 0.001 && parseFloat(val) <= 0.01)) {
      setWager(val);
    }
  };

  const handleDegen = async () => {
    setError('');
    setFlipResult(null);
    if (!walletAddress) return setError("Connect wallet first.");
    if (!selectedSide) return setError("Select heads or tails.");
    if (!wager || parseFloat(wager) < 0.001 || parseFloat(wager) > 0.01) {
      return setError("Enter a valid wager between 0.001 and 0.01.");
    }

    const walletClient = await getWalletClient(); // Add await here
    if (!walletClient) return; // Error already set by getWalletClient

    setIsFlipping(true);

    try {
      const wagerInWei = parseUnits(wager, tokenDecimals);
      const choiceAsNumber = selectedSide === 'heads' ? 0 : 1;

      // 1. Approve token spending
      console.log('Approving token spend...');
      const approveTxHash = await walletClient.writeContract({
        address: TOKEN_CONTRACT_ADDRESS,
        abi: MockERC20ABI,
        functionName: 'approve',
        args: [COINFLIP_CONTRACT_ADDRESS, wagerInWei],
        account: walletClient.account, // Ensure account is passed if not automatically picked up by transport
      });
      console.log('Approval transaction sent:', approveTxHash);
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log('Approval transaction confirmed.');

      // 2. Call the flip function
      console.log('Calling flip function...');
      const flipTxHash = await walletClient.writeContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: CoinFlipABI,
        functionName: 'flip',
        args: [choiceAsNumber, wagerInWei],
        account: walletClient.account,
      });
      console.log('Flip transaction sent:', flipTxHash);
      const flipReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      console.log('Flip transaction confirmed:', flipReceipt);

      // 3. Process result from events (GameSettled)
      // The event might not be immediately available, so a small delay or direct parsing from receipt is better
      // For simplicity, we'll refetch history which should pick it up. A more robust solution would parse flipReceipt.logs
      let gameOutcome = null;
      for (const log of flipReceipt.logs) {
        try {
            // This is a simplified way, ideally use viem's decodeEventLog if logs are not pre-parsed by AGW/Privy provider
            if (log.address.toLowerCase() === COINFLIP_CONTRACT_ADDRESS.toLowerCase()) {
                // A more robust way to find the event and decode it:
                const topics = log.topics;
                const eventAbiItem = CoinFlipABI.find(item => item.name === 'GameSettled' && item.type === 'event');
                if (eventAbiItem && topics[0] === publicClient.encodeEventTopics({ abi: [eventAbiItem] })[0]) {
                    const decodedLog = publicClient.decodeEventLog({ abi: [eventAbiItem], data: log.data, topics: topics });
                    if (decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase()) {
                        gameOutcome = decodedLog.args;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not parse a log entry:", e)
        }
      }

      if (gameOutcome) {
        const won = gameOutcome.payoutAmount > 0n;
        setFlipResult({
          message: won ? 'You Won!' : 'You Lost!',
          details: `Result: ${gameOutcome.result === 0 ? 'Heads' : 'Tails'}. You chose: ${selectedSide}. Wager: ${wager}. Payout: ${formatUnits(gameOutcome.payoutAmount, tokenDecimals)}`,
          won: won,
        });
      } else {
        setFlipResult({ message: 'Flip processed, but outcome unclear from logs.', details: 'Check transaction history.', won: false });
      }

      fetchTokenBalance(); // Update balance
      fetchGameHistory(); // Update history

    } catch (err) {
      console.error('Error during flip:', err);
      setError(err.shortMessage || err.message || 'An error occurred during the flip.');
      setFlipResult({ message: 'Flip Failed!', details: err.shortMessage || err.message, won: false });
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <div className="coinflip-container">
      {!walletAddress ? (
        <div className="wallet-prompt">
          <p>Please connect your Abstract wallet to play.</p>
          <button onClick={connectWallet} className="connect-wallet-button">Connect Wallet</button>
        </div>
      ) : (
        <div className="coinflip-box">
          <div className="box-header">
            <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            <span className="token-balance">Balance: {tokenBalance} TWT</span> {/* Assuming TWT is the symbol */}
          </div>

          {isFlipping ? (
            <div className="flipping-animation">
              <img src={pengLogo} alt="Flipping..." className="flipping-coin-icon" />
              <p>Flipping... Good luck!</p>
            </div>
          ) : flipResult ? (
            <div className={`flip-result ${flipResult.won ? 'won' : 'lost'}`}>
              <h3>{flipResult.message}</h3>
              <p>{flipResult.details}</p>
              <button onClick={() => { setFlipResult(null); setError(''); }}>Play Again</button>
            </div>
          ) : (
            <>
              <div className="coin-images">
                <div className={`coin-option ${selectedSide === 'heads' ? 'selected-image' : ''}`} onClick={() => setSelectedSide('heads')}>
                  <img src={headsIcon} alt="Heads" />
                  <span>Heads</span>
                </div>
                <div className={`coin-option ${selectedSide === 'tails' ? 'selected-image' : ''}`} onClick={() => setSelectedSide('tails')}>
                  <img src={tailsIcon} alt="Tails" />
                  <span>Tails</span>
                </div>
              </div>

              <div className="coinflip-options">
                <div className="left-side">
                  {presetAmounts.map((amt) => (
                    <button key={amt} onClick={() => setWager(amt)} className={wager === amt ? 'selected' : ''}>{amt}</button>
                  ))}
                  <input
                    type="number"
                    placeholder="0.001 - 0.01" // Updated placeholder
                    value={wager}
                    min="0.001"
                    max="0.01"
                    step="0.0001"
                    onChange={(e) => handleWagerInput(e.target.value)}
                    className="wager-input"
                  />
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
                  <button className="degen-button" onClick={handleDegen} disabled={isFlipping || !wager || !selectedSide}>
                    Degen Flip!
                  </button>
                </div>
              </div>
            </>
          )}
          {error && <p className="error-message">Error: {error}</p>}
          
          <div className="game-history">
            <h4>Recent Flips:</h4>
            {gameHistory.length === 0 && <p>No game history yet.</p>}
            <ul>
              {gameHistory.map((game, index) => (
                <li key={index} className={game.won ? 'history-won' : 'history-lost'}>
                  ID: {game.gameId} - Chose: {game.choice}, Result: {game.result}, Wager: {game.wager}, Payout: {game.payout} - 
                  <a href={`${abstractTestnetChain.blockExplorers.default.url}/tx/${game.txHash}`} target="_blank" rel="noopener noreferrer">View Tx</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinFlipPage;

