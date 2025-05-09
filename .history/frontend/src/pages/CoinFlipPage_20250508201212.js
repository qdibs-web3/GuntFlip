import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletProvider";
import { createPublicClient, http, createWalletClient, custom, parseEther, formatEther } from "viem";
import { COINFLIP_CONTRACT_ADDRESS, abstractTestnetChain } from "../config";
import CoinFlipETHABI from "../abis/CoinFlipETH.json";
import coinImage from "../assets/heads.png";
import headsImage from "../assets/heads.png";
import tailsImage from "../assets/tails.png";
import "../styles/CoinFlipPage.css"; // Added CSS import

const CoinFlipPage = () => {
  const { walletAddress, account, isConnecting, isLoading: isWalletLoading, error: walletError, connect, disconnect } = useWallet();
  const [selectedSide, setSelectedSide] = useState(null);
  const [wager, setWager] = useState("0.001");
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null);
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);

  const presetWagers = ["0.001", "0.005", "0.01"]; // Preset wager options

  const publicClient = createPublicClient({
    chain: abstractTestnetChain,
    transport: http(),
  });

  const getWalletClient = useCallback(async () => {
    if (!account || !account.connector) {
      console.error("Wallet account or connector not available from AGW.");
      setError("Wallet connector not available. Please ensure your AGW wallet is connected and configured correctly.");
      return null;
    }
    try {
      const provider = await account.connector.getProvider();
      if (!provider) {
        console.error("Failed to get provider from AGW connector.");
        setError("Failed to get provider from wallet connector.");
        return null;
      }
      return createWalletClient({
        account: account.address,
        chain: abstractTestnetChain,
        transport: custom(provider),
      });
    } catch (err) {
      console.error("Error getting provider from connector:", err);
      setError("Error initializing wallet client.");
      return null;
    }
  }, [account]);

  const fetchEthBalance = useCallback(async () => {
    if (walletAddress && publicClient) {
      try {
        const balance = await publicClient.getBalance({ address: walletAddress });
        setEthBalance(formatEther(balance));
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
        setError("Could not fetch ETH balance.");
      }
    }
  }, [walletAddress, publicClient]);

  const fetchGameHistory = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    try {
      // Correctly access the ABI array using .abi
      const gameSettledEventAbi = CoinFlipETHABI.abi.find(item => item.name === "GameSettled" && item.type === "event");
      if (!gameSettledEventAbi) {
        console.error("GameSettled event ABI not found.");
        return;
      }
      const logs = await publicClient.getLogs({
        address: COINFLIP_CONTRACT_ADDRESS,
        event: gameSettledEventAbi,
        args: {
          player: walletAddress,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const history = logs.map(log => ({
        gameId: log.args.gameId.toString(),
        playerChoice: log.args.choice === 0 ? "Heads" : "Tails",
        result: log.args.result === 0 ? "Heads" : "Tails",
        wager: formatEther(log.args.wagerAmount),
        payout: formatEther(log.args.payoutAmount),
        won: log.args.payoutAmount > 0,
      })).reverse();
      setGameHistory(history.slice(0, 10));
    } catch (err) {
      console.error("Error fetching game history:", err);
    }
  }, [publicClient, walletAddress]);

  useEffect(() => {
    fetchEthBalance();
  }, [fetchEthBalance]);

  useEffect(() => {
    fetchGameHistory();
    const interval = setInterval(fetchGameHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchGameHistory]);

  const handleDegen = async () => {
    setError("");
    setFlipResult(null);
    if (!walletAddress) return setError("Connect wallet first.");
    if (!selectedSide) return setError("Select heads or tails.");

    let minWagerEth, maxWagerEth;
    try {
      minWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI.abi, functionName: 'minWager' }));
      maxWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI.abi, functionName: 'maxWager' }));
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Could not fetch wager limits. Using defaults.");
      minWagerEth = "0.001";
      maxWagerEth = "0.1";
    }

    if (!wager || parseFloat(wager) < parseFloat(minWagerEth) || parseFloat(wager) > parseFloat(maxWagerEth)) {
      return setError(`Enter a valid wager between ${minWagerEth} and ${maxWagerEth} ETH.`);
    }

    const walletClient = await getWalletClient();
    if (!walletClient) return;

    setIsFlipping(true);

    try {
      const wagerInWei = parseEther(wager);
      const choiceAsNumber = selectedSide === "heads" ? 0 : 1;

      console.log(`Flipping with ${wager} ETH for ${selectedSide}...`);
      const flipTxHash = await walletClient.writeContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: CoinFlipETHABI.abi, // Correctly access the ABI array
        functionName: "flip",
        args: [choiceAsNumber],
        value: wagerInWei,
        account: walletClient.account,
      });

      console.log("Flip transaction sent:", flipTxHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      console.log("Flip transaction confirmed:", receipt);

      const gameSettledEvent = receipt.logs
        .map(log => {
          try {
            // Correctly access the ABI array for decoding
            return publicClient.decodeEventLog({
              abi: CoinFlipETHABI.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch { return null; }
        })
        .find(decodedLog => decodedLog && decodedLog.eventName === "GameSettled" && decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase());

      if (gameSettledEvent) {
        const gameResult = gameSettledEvent.args.result === choiceAsNumber ? "win" : "loss";
        const actualSide = gameSettledEvent.args.result === 0 ? "heads" : "tails";
        setFlipResult({ outcome: gameResult, side: actualSide });
        console.log(`Game result: ${gameResult}, actual side: ${actualSide}`);
        fetchEthBalance();
        fetchGameHistory();
      } else {
        console.error("GameSettled event not found in transaction receipt.");
        setError("Could not determine game outcome from transaction.");
        setFlipResult({ outcome: "unknown", side: "unknown" });
      }

    } catch (err) {
      console.error("Error during flip:", err);
      setError(err.shortMessage || err.message || "An error occurred during the flip.");
      setFlipResult({ outcome: "error", side: "unknown" });
    } finally {
      setIsFlipping(false);
    }
  };

  Return
  (
    <div className="coinflip-container">
        <div className="coinflip-box">
            <h1 className="page-title">GuntFlip ETH</h1> {/* Assuming a CSS class for page title */} 
            
            {walletAddress ? (
                <div className="wallet-info-active"> {/* CSS: .box-header could be used or a new specific class */} 
                    <p>Connected: <span className="wallet-address">{walletAddress}</span></p>
                    <p>Balance: <span className="balance-info">{parseFloat(ethBalance).toFixed(4)} ETH</span></p> {/* New class for balance specific styling */} 
                    <button onClick={disconnect} className="disconnect-button">Disconnect</button> {/* New class */} 
                </div>
            ) : (
                <button 
                    onClick={connect} 
                    disabled={isConnecting || isWalletLoading}
                    className="connect-wallet-button" /* New class */ 
                >
                    {isConnecting || isWalletLoading ? "Connecting..." : "Connect Wallet"}
                </button>
            )}
            {walletError && <p className="wallet-warning">Wallet Error: {walletError.message}</p>}

            <div className="coin-display-area"> {/* New class for coin image area */} 
                {isFlipping ? (
                    <div className="coin-flipping-animation"> {/* Placeholder for CSS animation class, replacing animate-ping */} 
                        <img src={coinImage} alt="Flipping Coin" className="coin-image" /> {/* New class */} 
                    </div>
                ) : flipResult ? (
                    <img src={flipResult.side === "heads" ? headsImage : tailsImage} alt={flipResult.side} className="coin-image" />
                ) : (
                    <img src={coinImage} alt="Coin" className="coin-image" />
                )}
            </div>

            {flipResult && !isFlipping && (
                <div className="flip-result-display"> {/* New class */} 
                    {flipResult.outcome === "win" && <p className="result-win">You Won! It was {flipResult.side}!</p>} {/* New class */} 
                    {flipResult.outcome === "loss" && <p className="result-loss">You Lost! It was {flipResult.side}.</p>} {/* New class */} 
                    {flipResult.outcome === "error" && <p className="result-error">Flip Error. Check console.</p>} {/* New class */} 
                    {flipResult.outcome === "unknown" && <p className="result-unknown">Flip outcome unknown. Check console.</p>} {/* New class */} 
                </div>
            )}

            <div className="selection-area"> {/* CSS: .coinflip-options can be used if structure matches */} 
                <button 
                    onClick={() => setSelectedSide("heads")} 
                    className={`choice-button ${selectedSide === "heads" ? "selected" : ""}`} /* CSS: .right-side button and .selected */ 
                >
                    Heads
                </button>
                <button 
                    onClick={() => setSelectedSide("tails")} 
                    className={`choice-button ${selectedSide === "tails" ? "selected" : ""}`} /* CSS: .right-side button and .selected */ 
                >
                    Tails
                </button>
            </div>

            <div className="wager-input-area"> {/* Changed from wager-area to be more specific for the input section, CSS has .right-side for a flex container */} 
                <label htmlFor="wager" className="wager-label">Wager Amount (ETH):</label>
                <input 
                    type="number" 
                    id="wager" 
                    value={wager} 
                    onChange={(e) => setWager(e.target.value)} 
                    min="0.001" 
                    max="0.1" 
                    step="0.001" 
                    className="wager-input-field" /* CSS: .right-side input */ 
                />
                <div className="preset-wagers-container"> {/* New class */} 
                    {presetWagers.map(pw => (
                        <button 
                            key={pw} 
                            onClick={() => setWager(pw)} 
                            className={`preset-wager-button ${wager === pw ? "selected-wager" : ""}`} /* CSS: .left-side button and .selected-wager */ 
                        >
                            {pw} ETH
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleDegen}
                disabled={!walletAddress || isFlipping || !selectedSide}
                className="degen-button"
            >
                {isFlipping ? "Flipping..." : "Degen Flip!"}
            </button>

            {error && <p className="error-message">Error: {error}</p>} {/* New class, or reuse .wallet-warning */} 
            
            <div className="game-history-section"> {/* New class */} 
                <h2 className="section-title">Recent Games (Your Wallet)</h2> {/* New class */} 
                {gameHistory.length > 0 ? (
                    <ul className="game-history-list"> {/* New class */} 
                        {gameHistory.map((game, index) => (
                            <li key={index} className={`game-history-item ${game.won ? "won" : "lost"}`}> {/* New classes */} 
                                ID: {game.gameId} - Chose: {game.playerChoice}, Result: {game.result}, Wager: {game.wager} ETH, Payout: {game.payout} ETH - {game.won ? "Won" : "Lost"}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="no-history-message">No game history found for your wallet.</p> {/* New class */} 
                ,)
            </div>
        </div>
    </div>
)};

export default CoinFlipPage;

