import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletProvider";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  parseEther,
  formatEther,
} from "viem";
import {
  COINFLIP_CONTRACT_ADDRESS,
  abstractTestnetChain,
} from "../config";
import CoinFlipETHABI from "../abis/CoinFlipETH.json";
import coinImage from "../assets/heads.png";
import headsImage from "../assets/heads.png";
import tailsImage from "../assets/tails.png";
import "../styles/CoinFlipPage.css";
import logo from '../assets/nav.png';

const CoinFlipPage = () => {
  const {
    walletAddress,
    account,
    isConnecting,
    isLoading: isWalletLoading,
    error: walletError,
    connect,
  } = useWallet();

  const [selectedSide, setSelectedSide] = useState(null);
  const [wager, setWager] = useState("0.001");
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null);
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);
  const presetWagers = ["0.001", "0.005", "0.01"];

  const publicClient = createPublicClient({
    chain: abstractTestnetChain,
    transport: http(),
  });

  const getWalletClient = useCallback(async () => {
    if (!account || !account.connector) {
      console.error("Wallet account or connector not available from AGW.");
      setError(
        "Wallet connector not available. Please ensure your AGW wallet is connected and configured correctly."
      );
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
      const gameSettledEventAbi = CoinFlipETHABI.abi.find(
        (item) => item.name === "GameSettled" && item.type === "event"
      );
      if (!gameSettledEventAbi) {
        console.error("GameSettled event ABI not found.");
        return;
      }
      const logs = await publicClient.getLogs({
        address: COINFLIP_CONTRACT_ADDRESS,
        event: gameSettledEventAbi,
        args: { player: walletAddress },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const history = logs
        .map((log) => ({
          gameId: log.args.gameId.toString(),
          playerChoice: log.args.choice === 0 ? "Heads" : "Tails",
          result: log.args.result === 0 ? "Heads" : "Tails",
          wager: formatEther(log.args.wagerAmount),
          payout: formatEther(log.args.payoutAmount),
          won: log.args.payoutAmount > 0,
        }))
        .reverse();
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
    
    if (!walletAddress) {
      setError("Connect wallet first.");
      setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
      return;
    }
  
    if (!selectedSide) {
      setError("Select heads or tails.");
      setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
      return;
    }
  
    let minWagerEth, maxWagerEth;
    try {
      minWagerEth = formatEther(
        await publicClient.readContract({
          address: COINFLIP_CONTRACT_ADDRESS,
          abi: CoinFlipETHABI.abi,
          functionName: "minWager",
        })
      );
      maxWagerEth = formatEther(
        await publicClient.readContract({
          address: COINFLIP_CONTRACT_ADDRESS,
          abi: CoinFlipETHABI.abi,
          functionName: "maxWager",
        })
      );
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Could not fetch wager limits. Using defaults.");
      setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
      minWagerEth = "0.001";
      maxWagerEth = "0.1";
    }
  
    if (
      !wager ||
      parseFloat(wager) < parseFloat(minWagerEth) ||
      parseFloat(wager) > parseFloat(maxWagerEth)
    ) {
      setError(
        `Enter a valid wager between ${minWagerEth} and ${maxWagerEth} ETH.`
      );
      setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
      return;
    }
  
    const walletClient = await getWalletClient();
    if (!walletClient) return;
  
    setIsFlipping(true);
  
    try {
      const wagerInWei = parseEther(wager);
      const choiceAsNumber = selectedSide === "heads" ? 0 : 1;
  
      const flipTxHash = await walletClient.writeContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: CoinFlipETHABI.abi,
        functionName: "flip",
        args: [choiceAsNumber],
        value: wagerInWei,
        account: walletClient.account,
      });
  
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: flipTxHash,
      });
  
      const gameSettledEvent = receipt.logs
        .map((log) => {
          try {
            return publicClient.decodeEventLog({
              abi: CoinFlipETHABI.abi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find(
          (decodedLog) =>
            decodedLog &&
            decodedLog.eventName === "GameSettled" &&
            decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase()
        );
  
      if (gameSettledEvent) {
        const gameResult =
          gameSettledEvent.args.result === choiceAsNumber ? "win" : "loss";
        const actualSide = gameSettledEvent.args.result === 0 ? "heads" : "tails";
        setFlipResult({ outcome: gameResult, side: actualSide });
        fetchEthBalance();
        fetchGameHistory();
      } else {
        setError("Could not determine game outcome from transaction.");
        setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
        setFlipResult({ outcome: "unknown", side: "unknown" });
      }
    } catch (err) {
      console.error("Error during flip:", err);
      setError(
        err.shortMessage || err.message || "An error occurred during the flip."
      );
      setTimeout(() => setError(""), 3000); // Error disappears after 3 seconds
      setFlipResult({ outcome: "error", side: "unknown" });
    } finally {
      setIsFlipping(false);
    }
  };
  

  return (
    <div className="coinflip-container">
      <div className="coinflip-box">
        <img src={logo} alt="GuntFlip ETH" className="page-title" />

        {walletAddress ? (
          <div className="wallet-info-active">
            <p>
              Connected: <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </p>
            <p>
              Balance:{" "}
              <span className="balance-info">
                {parseFloat(ethBalance).toFixed(4)} ETH
              </span>
            </p>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting || isWalletLoading}
            className="connect-wallet-button"
          >
            {isConnecting || isWalletLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        {walletError && (
          <p className="wallet-warning">Wallet Error: {walletError.message}</p>
        )}

        <div className="coin-display-area">
          {isFlipping ? (
            <div className="coin-flipping-animation">
              <img src={coinImage} alt="Flipping Coin" className="coin-image" />
            </div>
          ) : flipResult ? (
            <img
              src={flipResult.side === "heads" ? headsImage : tailsImage}
              alt={flipResult.side}
              className="coin-image"
            />
          ) : (
            <div className="coin-placeholder">Make your coin flip bet!</div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="coinflip-controls">
        <div className="side-selection">
          <button
            className={selectedSide === "heads" ? "selected" : ""}
            onClick={() => setSelectedSide("heads")}
          >
            Heads
          </button>
          <button
            className={selectedSide === "tails" ? "selected" : ""}
            onClick={() => setSelectedSide("tails")}
          >
            Tails
          </button>
        </div>

          <div className="wager-input">
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              placeholder="Enter wager in ETH"
            />
            <div className="preset-wagers">
              {presetWagers.map((amount) => (
                <button key={amount} onClick={() => setWager(amount)}>
                  {amount} ETH
                </button>
              ))}
            </div>
          </div>

          <button
            className="degen-button"
            onClick={handleDegen}
            disabled={isFlipping}
          >
            {isFlipping ? "Flipping..." : "Degen"}
          </button>
        </div>

        <div className="game-history">
          <h3>Last 10 Games</h3>
          <ul>
            {gameHistory.map((game) => (
              <li key={game.gameId}>
                #{game.gameId}: You chose {game.playerChoice}, Result:{" "}
                {game.result} — {game.won ? "✅ Won" : "❌ Lost"} ({game.wager} ETH)
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CoinFlipPage;
