import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletProvider";
import {createPublicClient,http,createWalletClient,custom,parseEther,formatEther,decodeEventLog,} from "viem";
import {COINFLIP_CONTRACT_ADDRESS, baseSepoliaChain,} from "../config";
import CoinFlipETHABI from "../abis/CoinFlipETH.json";
import coinImage from "../assets/heads.png";
import headsImage from "../assets/heads.png";
import tailsImage from "../assets/tails.png";
import "../styles/CoinFlipPage.css";
import logo from "../assets/nav.png";

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
  const [isFlipping, setIsFlipping] = useState(false); // For the animation itself
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false); // For transaction confirmation period
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
        console.error("GameSettled event ABI not found in provided JSON.");
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
        .filter(log => log.args && log.args.hasOwnProperty("gameId") && log.args.hasOwnProperty("result") && log.args.hasOwnProperty("payoutAmount"))
        .map((log) => {
          const payout = formatEther(log.args.payoutAmount);
          return {
            gameId: log.args.gameId.toString(),
            result: log.args.result === 0 ? "Heads" : "Tails",
            payout: payout,
            won: log.args.payoutAmount > 0n, 
          };
        })
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
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!selectedSide) {
      setError("Select heads or tails.");
      setTimeout(() => setError(""), 3000);
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
      setTimeout(() => setError(""), 3000);
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
      setTimeout(() => setError(""), 3000);
      return;
    }

    const walletClient = await getWalletClient();
    if (!walletClient) return;

    setIsSubmittingTransaction(true);
    const currentWagerForFlip = wager; 

    try {
      const wagerInWei = parseEther(currentWagerForFlip);
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

      setIsSubmittingTransaction(false);
      setIsFlipping(true); 

      await new Promise(resolve => setTimeout(resolve, 3000));

      let gameSettledEventData = null;
      let gameSettledEventFound = false; 

      console.log("Attempting to find GameSettled event in receipt logs:", receipt.logs);

      for (const log of receipt.logs) {
        try {
          // Corrected: Use imported decodeEventLog utility
          const decodedLog = decodeEventLog({
            abi: CoinFlipETHABI.abi,
            data: log.data,
            topics: log.topics,
          });

          if (decodedLog) {
            console.log("Successfully decoded a log entry:", decodedLog.eventName, "Args:", decodedLog.args);
            if (
              decodedLog.eventName === "GameSettled" &&
              decodedLog.args.player &&
              decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase() &&
              decodedLog.args.hasOwnProperty("result") &&
              decodedLog.args.hasOwnProperty("payoutAmount")
            ) {
              gameSettledEventData = decodedLog.args;
              gameSettledEventFound = true;
              console.log("GameSettled event FOUND and matched player:", gameSettledEventData);
              break;
            }
          } else {
            console.log("decodeEventLog returned null/undefined for a log. Raw log:", log);
          }
        } catch (e) {
          console.warn("Error decoding a log entry. Raw log:", log, "Error:", e);
        }
      }

      if (gameSettledEventFound) {
        const gameResultOutcome =
          gameSettledEventData.result === choiceAsNumber ? "win" : "loss";
        const actualSide = gameSettledEventData.result === 0 ? "heads" : "tails";
        const payoutAmount = formatEther(gameSettledEventData.payoutAmount);
        const wageredAmountDisplay = currentWagerForFlip;
        
        setFlipResult({
          outcome: gameResultOutcome,
          side: actualSide,
          wagered: wageredAmountDisplay,
          payout: payoutAmount,
        });
        fetchEthBalance();
        fetchGameHistory();
      } else {
        console.error("GameSettled event was NOT found or not correctly decoded for player:", walletAddress, "Full transaction receipt:", receipt, "All raw logs from receipt:", receipt.logs);
        setError("Could not determine game outcome. Please ensure your ABI (CoinFlipETH.json) is up-to-date. Check browser console for detailed logs.");
        setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
      }
    } catch (err) {
      console.error("Error during flip transaction or processing:", err);
      setError(
        err.shortMessage || err.message || "An error occurred during the flip."
      );
      setFlipResult({ outcome: "error", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
      if (isSubmittingTransaction) {
        setIsSubmittingTransaction(false);
      }
    } finally {
      setIsFlipping(false);
    }
  };
// End of Part 1
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
          <div className="flip-result-display">
            <img
              src={flipResult.side === "heads" ? headsImage : tailsImage}
              alt={flipResult.side}
              className="coin-image"
            />
            {flipResult.outcome === "win" && (
              <p className="win-message">
                You Won! Wagered: {flipResult.wagered} ETH, Payout: {flipResult.payout} ETH
              </p>
            )}
            {flipResult.outcome === "loss" && (
              <p className="loss-message">
                You Lost. Wagered: {flipResult.wagered} ETH
              </p>
            )}
            {flipResult.outcome === "unknown" && (
              <p className="unknown-message">
                Outcome Unknown. Wagered: {flipResult.wagered} ETH. Check console for details.
              </p>
            )}
             {flipResult.outcome === "error" && (
              <p className="error-message-result">
                Flip Error. Wagered: {flipResult.wagered} ETH. Check console for details.
              </p>
            )}
          </div>
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
            step="0.001"
            min={presetWagers[0]} // A suggestion, actual min comes from contract
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
          disabled={isSubmittingTransaction || isFlipping}
        >
          {isSubmittingTransaction ? "Confirming..." : isFlipping ? "Flipping..." : "Degen Flip!"}
        </button>
      </div>

      <div className="game-history">
        <h3>Last 10 Games</h3>
        {gameHistory.length > 0 ? (
          <ul>
            {gameHistory.map((game) => (
              <li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>
                Game #{game.gameId}: Result: {game.result} — {game.won ? `✅ Won ${game.payout} ETH` : `❌ Loss (Payout: ${game.payout} ETH)`}
              </li>
            ))}
          </ul>
        ) : (
          <p>No game history yet.</p>
        )}
      </div>
    </div>
  </div>
);
};

export default CoinFlipPage;

