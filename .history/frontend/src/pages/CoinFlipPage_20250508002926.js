import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletProvider";
import { createPublicClient, http, createWalletClient, custom, parseEther, formatEther } from "viem";
import { COINFLIP_CONTRACT_ADDRESS, abstractTestnetChain } from "../config";
import CoinFlipETHABI from "../abis/CoinFlipETH.json"; // Assuming you renamed or replaced CoinFlip.json
import coinImage from "../assets/heads.png"; // Assuming you have this image
import headsImage from "../assets/heads.png";
import tailsImage from "../assets/tails.png";
import './styles/CoinFlip.css';


const CoinFlipPage = () => {
  const { walletAddress, account, isConnecting, isLoading: isWalletLoading, error: walletError, connect, disconnect } = useWallet();
  const [selectedSide, setSelectedSide] = useState(null); // "heads" or "tails"
  const [wager, setWager] = useState("0.001"); // Default wager in ETH
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null); // { outcome: "win"/"loss", side: "heads"/"tails" }
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);

  // Viem public client for reading data
  const publicClient = createPublicClient({
    chain: abstractTestnetChain,
    transport: http(), // Uses the proxy from package.json for local dev
  });

  // Function to get Viem wallet client for writing transactions
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

  // Define fetchEthBalance using useCallback
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

  // Define fetchGameHistory using useCallback
  const fetchGameHistory = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    try {
      const logs = await publicClient.getLogs({
        address: COINFLIP_CONTRACT_ADDRESS,
        event: CoinFlipETHABI.find(item => item.name === "GameSettled" && item.type === "event"),
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
      // setError("Could not fetch game history.");
    }
  }, [publicClient, walletAddress]);

  // useEffect for fetching initial ETH balance
  useEffect(() => {
    fetchEthBalance();
  }, [fetchEthBalance]);

  // useEffect for fetching initial game history and setting up interval
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
      minWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI, functionName: 'minWager' }));
      maxWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI, functionName: 'maxWager' }));
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Could not fetch wager limits. Using defaults.");
      minWagerEth = "0.001"; // Fallback
      maxWagerEth = "0.1";   // Fallback
    }

    if (!wager || parseFloat(wager) < parseFloat(minWagerEth) || parseFloat(wager) > parseFloat(maxWagerEth)) {
      return setError(`Enter a valid wager between ${minWagerEth} and ${maxWagerEth} ETH.`);
    }

    const walletClient = await getWalletClient();
    if (!walletClient) return; 

    setIsFlipping(true);

    try {
      const wagerInWei = parseEther(wager);
      const choiceAsNumber = selectedSide === "heads" ? 0 : 1; // 0 for Heads, 1 for Tails in contract

      console.log(`Flipping with ${wager} ETH for ${selectedSide}...`);
      const flipTxHash = await walletClient.writeContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: CoinFlipETHABI,
        functionName: "flip",
        args: [choiceAsNumber],
        value: wagerInWei, // Send ETH with the transaction
        account: walletClient.account, 
      });

      console.log("Flip transaction sent:", flipTxHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      console.log("Flip transaction confirmed:", receipt);

      // Find the GameSettled event from the transaction receipt
      const gameSettledEvent = receipt.logs
        .map(log => {
          try {
            return publicClient.decodeEventLog({
              abi: CoinFlipETHABI,
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
        fetchEthBalance(); // Now correctly calls the function defined in component scope
        fetchGameHistory(); // Now correctly calls the function defined in component scope
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

  return (
    <div className="container mx-auto p-4 text-center max-w-md bg-gray-800 text-white rounded-xl shadow-2xl">
      <h1 className="text-4xl font-bold mb-6 text-purple-400">GuntFlip ETH</h1>
      
      {walletAddress ? (
        <div className="mb-4">
          <p className="text-sm">Connected: <span className="font-mono text-purple-300">{walletAddress}</span></p>
          <p className="text-sm">Balance: <span className="font-mono text-green-400">{parseFloat(ethBalance).toFixed(4)} ETH</span></p>
          <button onClick={disconnect} className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs">Disconnect</button>
        </div>
      ) : (
        <button 
          onClick={connect} 
          disabled={isConnecting || isWalletLoading}
          className="px-6 py-3 mb-6 bg-purple-600 hover:bg-purple-700 rounded-lg text-xl font-semibold transition duration-150 ease-in-out"
        >
          {isConnecting || isWalletLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {walletError && <p className="text-red-400 text-sm mb-4">Wallet Error: {walletError.message}</p>}

      <div className="mb-8 relative w-48 h-48 mx-auto flex items-center justify-center">
        {isFlipping ? (
          <div className="animate-ping">
            <img src={coinImage} alt="Flipping Coin" className="w-40 h-40" />
          </div>
        ) : flipResult ? (
          <img src={flipResult.side === "heads" ? headsImage : tailsImage} alt={flipResult.side} className="w-40 h-40" />
        ) : (
          <img src={coinImage} alt="Coin" className="w-40 h-40" />
        )}
      </div>

      {flipResult && !isFlipping && (
        <div className="mb-6 text-2xl font-semibold">
          {flipResult.outcome === "win" && <p className="text-green-400">You Won! It was {flipResult.side}!</p>}
          {flipResult.outcome === "loss" && <p className="text-red-400">You Lost! It was {flipResult.side}.</p>}
          {flipResult.outcome === "error" && <p className="text-yellow-400">Flip Error. Check console.</p>}
          {flipResult.outcome === "unknown" && <p className="text-yellow-400">Flip outcome unknown. Check console.</p>}
        </div>
      )}

      <div className="mb-6 flex justify-center space-x-4">
        <button 
          onClick={() => setSelectedSide("heads")} 
          className={`px-8 py-3 rounded-lg text-lg font-semibold border-2 ${selectedSide === "heads" ? "bg-purple-500 border-purple-300" : "bg-gray-700 border-gray-600 hover:bg-gray-600"}`}
        >
          Heads
        </button>
        <button 
          onClick={() => setSelectedSide("tails")} 
          className={`px-8 py-3 rounded-lg text-lg font-semibold border-2 ${selectedSide === "tails" ? "bg-purple-500 border-purple-300" : "bg-gray-700 border-gray-600 hover:bg-gray-600"}`}
        >
          Tails
        </button>
      </div>

      <div className="mb-6">
        <label htmlFor="wager" className="block mb-2 text-lg">Wager Amount (ETH):</label>
        <input 
          type="number" 
          id="wager" 
          value={wager} 
          onChange={(e) => setWager(e.target.value)} 
          min="0.001" 
          max="0.1" // Consider fetching these limits from contract
          step="0.001" 
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <button 
        onClick={handleDegen}
        disabled={!walletAddress || isFlipping || !selectedSide}
        className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 rounded-lg text-xl font-bold text-gray-900 transition duration-150 ease-in-out disabled:opacity-50"
      >
        {isFlipping ? "Flipping..." : "Degen Flip!"}
      </button>

      {error && <p className="text-red-400 mt-4 text-sm">Error: {error}</p>}
      
      <div className="mt-8 pt-4 border-t border-gray-700">
        <h2 className="text-xl font-semibold mb-3 text-purple-300">Recent Games (Your Wallet)</h2>
        {gameHistory.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {gameHistory.map((game, index) => (
              <li key={index} className={`p-2 rounded ${game.won ? "bg-green-700 bg-opacity-30" : "bg-red-700 bg-opacity-30"}`}>
                ID: {game.gameId} - Chose: {game.playerChoice}, Result: {game.result}, Wager: {game.wager} ETH, Payout: {game.payout} ETH - {game.won ? "Won" : "Lost"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No game history found for your wallet.</p>
        )}
      </div>
    </div>
  );
};

export default CoinFlipPage;

