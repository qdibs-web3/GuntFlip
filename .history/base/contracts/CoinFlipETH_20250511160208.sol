// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CoinFlipETH
 * @dev A smart contract for a coin flip game where users can wager native ETH.
 * The contract owner can manage fees and game parameters.
 *          .___._____.                      __  .__     
  ______ __| _/|__\_ |__   ______     _____/  |_|  |__  
 / ____// __ | |  || __ \ /  ___/   _/ __ \   __\  |  \ 
< <_|  / /_/ | |  || \_\ \\___ \    \  ___/|  | |   Y  \
 \__   \____ | |__||___  /____  > /\ \___  >__| |___|  /
    |__|    \/         \/     \/  \/     \/          \/
 *
 */
contract CoinFlipETH is Ownable, Pausable, ReentrancyGuard {
    address payable public feeWallet;
    uint256 public feePercentage; // Basis points, e.g., 500 for 5%
    uint256 public maxWager;
    uint256 public minWager;

    enum CoinSide { Heads, Tails }

    struct Game {
        address player;
        CoinSide choice;
        uint256 wagerAmount; // ETH wagered
        uint256 feeAmount;   // ETH fee
        uint256 payoutAmount; // ETH payout to player (wager + winnings - fee, or 0 if loss)
        CoinSide result;
        bool settled;
    }

    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;

    event GameCreated(uint256 indexed gameId, address indexed player, CoinSide choice, uint256 wagerAmount);
    event GameSettled(uint256 indexed gameId, address indexed player, CoinSide result, uint256 payoutAmount, uint256 feeAmount);
    event FeeWalletUpdated(address indexed newFeeWallet);
    event FeePercentageUpdated(uint256 newFeePercentage);
    event MaxWagerUpdated(uint256 newMaxWager);
    event MinWagerUpdated(uint256 newMinWager);

    modifier validWager() {
        require(msg.value >= minWager, "Wager is below minimum limit");
        require(msg.value <= maxWager, "Wager is above maximum limit");
        _;
    }

    /**
     * @dev Constructor to initialize the contract.
     * @param _initialFeeWallet Address where collected fees will be sent.
     * @param _initialFeePercentage Initial fee percentage in basis points (e.g., 500 for 5%).
     * @param _initialMaxWager Initial maximum wager amount in Wei.
     * @param _initialMinWager Initial minimum wager amount in Wei.
     */
    constructor(
        address payable _initialFeeWallet,
        uint256 _initialFeePercentage,
        uint256 _initialMaxWager,
        uint256 _initialMinWager
    ) Ownable(msg.sender) {
        require(_initialFeeWallet != address(0), "Fee wallet cannot be zero address");
        require(_initialFeePercentage <= 10000, "Fee percentage cannot exceed 100%"); // Max 10000 basis points
        require(_initialMinWager > 0, "Min wager must be greater than 0");
        require(_initialMaxWager >= _initialMinWager, "Max wager must be >= min wager");

        feeWallet = _initialFeeWallet;
        feePercentage = _initialFeePercentage;
        maxWager = _initialMaxWager;
        minWager = _initialMinWager;
    }

    /**
     * @dev Allows a player to place a wager on a coin flip using ETH.
     * @param _choice The player\\u2019s choice (Heads or Tails).
     */
    function flip(CoinSide _choice) 
        external 
        payable
        whenNotPaused 
        nonReentrant 
        validWager 
    {
        uint256 wagerAmount = msg.value;
        uint256 gameId = gameIdCounter++;
        
        Game storage newGame = games[gameId];
        newGame.player = msg.sender;
        newGame.choice = _choice;
        newGame.wagerAmount = wagerAmount;

        // Determine coin flip result (pseudo-random)
        CoinSide actualResult = _getRandomCoinSide(gameId, msg.sender, block.timestamp);
        newGame.result = actualResult;

        uint256 fee = (wagerAmount * feePercentage) / 10000;
        newGame.feeAmount = fee;

        if (actualResult == _choice) { // Player wins
            // Player gets back (wager * 2) - fee. Net win is wager - fee.
            uint256 grossPayout = wagerAmount * 2;
            uint256 playerReceives = grossPayout - fee;
            newGame.payoutAmount = playerReceives; 

            require(address(this).balance >= playerReceives + fee, "Contract insufficient balance for payout and fee");
            
            // Transfer winnings to player
            if (playerReceives > 0) {
                (bool success, ) = msg.sender.call{value: playerReceives}("");
                require(success, "Payout transfer failed");
            }
        } else { // Player loses
            newGame.payoutAmount = 0; // Player gets nothing back from the wager
            // The wagered amount (msg.value) remains in the contract, part of which is the fee.
            require(address(this).balance >= fee, "Contract insufficient balance for fee transfer");
        }

        // Transfer fee to fee wallet
        if (fee > 0) {
            (bool feeSuccess, ) = feeWallet.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        newGame.settled = true;
        emit GameCreated(gameId, msg.sender, _choice, wagerAmount);
        emit GameSettled(gameId, msg.sender, actualResult, newGame.payoutAmount, fee);
    }

    /**
     * @dev Generates a pseudo-random coin side.
     * WARNING: This is NOT cryptographically secure for high-value applications.
     * For production, consider using an oracle like Chainlink VRF.
     * @param _gameId Unique identifier for the game.
     * @param _player Address of the player.
     * @param _timestamp Current block timestamp.
     * @return CoinSide (Heads or Tails).
     */
    function _getRandomCoinSide(uint256 _gameId, address _player, uint256 _timestamp) internal view returns (CoinSide) {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(_gameId, _player, _timestamp, block.prevrandao, address(this))));
        return randomNumber % 2 == 0 ? CoinSide.Heads : CoinSide.Tails;
    }

    // --- Admin Functions ---

    /**
     * @dev Updates the fee wallet address.
     * @param _newFeeWallet The address of the new fee wallet.
     */
    function setFeeWallet(address payable _newFeeWallet) external onlyOwner {
        require(_newFeeWallet != address(0), "New fee wallet cannot be zero address");
        feeWallet = _newFeeWallet;
        emit FeeWalletUpdated(_newFeeWallet);
    }

    /**
     * @dev Updates the fee percentage.
     * @param _newFeePercentage The new fee percentage in basis points (e.g., 500 for 5%).
     */
    function setFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 10000, "Fee percentage cannot exceed 100%");
        feePercentage = _newFeePercentage;
        emit FeePercentageUpdated(_newFeePercentage);
    }

    /**
     * @dev Updates the maximum wager amount.
     * @param _newMaxWager The new maximum wager amount in Wei.
     */
    function setMaxWager(uint256 _newMaxWager) external onlyOwner {
        require(_newMaxWager >= minWager, "Max wager must be >= min wager");
        maxWager = _newMaxWager;
        emit MaxWagerUpdated(_newMaxWager);
    }

    /**
     * @dev Updates the minimum wager amount.
     * @param _newMinWager The new minimum wager amount in Wei.
     */
    function setMinWager(uint256 _newMinWager) external onlyOwner {
        require(_newMinWager > 0, "Min wager must be greater than 0");
        require(maxWager >= _newMinWager, "Max wager must be >= new min wager");
        minWager = _newMinWager;
        emit MinWagerUpdated(_newMinWager);
    }

    /**
     * @dev Pauses the contract, preventing new games.
     */
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @dev Unpauses the contract, allowing new games.
     */
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    /**
     * @dev Allows the owner to withdraw any stuck ERC20 tokens from the contract.
     * This is a safety measure in case tokens are accidentally sent to the contract.
     * @param _tokenAddress The address of the ERC20 token to withdraw.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdrawStuckTokens(address _tokenAddress, uint256 _amount) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        // This function is for other ERC20 tokens, not the native ETH wager currency.
        IERC20 token = IERC20(_tokenAddress); // Need to import IERC20 if not already
        bool success = token.transfer(owner(), _amount);
        require(success, "Token withdrawal failed");
    }

    /**
     * @dev Allows the owner to withdraw all Ether from the contract (except what might be locked for ongoing games if logic was different).
     * Primarily for fees or if ETH gets stuck.
     */
    function withdrawContractBalance() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept Ether (e.g. direct sends, though not primary interaction method)
    receive() external payable {}
    fallback() external payable {}
}

// Minimal IERC20 interface for withdrawStuckTokens
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

