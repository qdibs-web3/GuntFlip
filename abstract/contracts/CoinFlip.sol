// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CoinFlip
 * @dev A smart contract for a coin flip game where users can wager tokens.
 * The contract owner can manage fees, payment tokens, and game parameters.
 */
contract CoinFlip is Ownable, Pausable, ReentrancyGuard {
    IERC20 public paymentToken;
    address public feeWallet;
    uint256 public feePercentage; // Basis points, e.g., 500 for 5%
    uint256 public maxWager;
    uint256 public minWager;

    enum CoinSide { Heads, Tails }

    struct Game {
        address player;
        CoinSide choice;
        uint256 wagerAmount;
        uint256 feeAmount;
        uint256 payoutAmount;
        CoinSide result;
        bool settled;
    }

    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;

    event GameCreated(uint256 indexed gameId, address indexed player, CoinSide choice, uint256 wagerAmount);
    event GameSettled(uint256 indexed gameId, address indexed player, CoinSide result, uint256 payoutAmount, uint256 feeAmount);
    event PaymentTokenUpdated(address indexed newPaymentToken);
    event FeeWalletUpdated(address indexed newFeeWallet);
    event FeePercentageUpdated(uint256 newFeePercentage);
    event MaxWagerUpdated(uint256 newMaxWager);
    event MinWagerUpdated(uint256 newMinWager);

    modifier validWager(uint256 _wagerAmount) {
        require(_wagerAmount >= minWager, "Wager is below minimum limit");
        require(_wagerAmount <= maxWager, "Wager is above maximum limit");
        _;
    }

    /**
     * @dev Constructor to initialize the contract.
     * @param _initialPaymentToken Address of the ERC20 token used for wagers and payouts.
     * @param _initialFeeWallet Address where collected fees will be sent.
     * @param _initialFeePercentage Initial fee percentage in basis points (e.g., 500 for 5%).
     * @param _initialMaxWager Initial maximum wager amount.
     * @param _initialMinWager Initial minimum wager amount.
     */
    constructor(
        address _initialPaymentToken,
        address _initialFeeWallet,
        uint256 _initialFeePercentage,
        uint256 _initialMaxWager,
        uint256 _initialMinWager
    ) Ownable(msg.sender) {
        require(_initialPaymentToken != address(0), "Payment token cannot be zero address");
        require(_initialFeeWallet != address(0), "Fee wallet cannot be zero address");
        require(_initialFeePercentage <= 10000, "Fee percentage cannot exceed 100%"); // Max 10000 basis points
        require(_initialMinWager > 0, "Min wager must be greater than 0");
        require(_initialMaxWager >= _initialMinWager, "Max wager must be >= min wager");

        paymentToken = IERC20(_initialPaymentToken);
        feeWallet = _initialFeeWallet;
        feePercentage = _initialFeePercentage;
        maxWager = _initialMaxWager;
        minWager = _initialMinWager;
    }

    /**
     * @dev Allows a player to place a wager on a coin flip.
     * @param _choice The player's choice (Heads or Tails).
     * @param _wagerAmount The amount of tokens to wager.
     */
    function flip(CoinSide _choice, uint256 _wagerAmount) 
        external 
        whenNotPaused 
        nonReentrant 
        validWager(_wagerAmount) 
    {
        require(paymentToken.balanceOf(msg.sender) >= _wagerAmount, "Insufficient token balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= _wagerAmount, "Token allowance not set or insufficient");

        // Transfer wager from player to contract
        bool success = paymentToken.transferFrom(msg.sender, address(this), _wagerAmount);
        require(success, "Token transfer failed");

        uint256 gameId = gameIdCounter++;
        Game storage newGame = games[gameId];
        newGame.player = msg.sender;
        newGame.choice = _choice;
        newGame.wagerAmount = _wagerAmount;

        // Determine coin flip result (pseudo-random)
        CoinSide actualResult = _getRandomCoinSide(gameId, msg.sender, block.timestamp);
        newGame.result = actualResult;

        uint256 fee = (_wagerAmount * feePercentage) / 10000;
        newGame.feeAmount = fee;

        if (actualResult == _choice) { // Player wins
            uint256 winnings = _wagerAmount - fee; // Player gets back wager minus fee
            uint256 payout = _wagerAmount + winnings; // Total payout is original wager + (wager - fee)
            newGame.payoutAmount = payout;
            require(paymentToken.balanceOf(address(this)) >= payout + fee, "Contract insufficient balance for payout and fee");
            
            // Transfer winnings to player
            if (payout > 0) {
                bool payoutSuccess = paymentToken.transfer(msg.sender, payout);
                require(payoutSuccess, "Payout transfer failed");
            }
        } else { // Player loses
            newGame.payoutAmount = 0; // Player gets nothing back
            // The wagered amount remains in the contract, part of which is the fee.
            require(paymentToken.balanceOf(address(this)) >= fee, "Contract insufficient balance for fee");
        }

        // Transfer fee to fee wallet
        if (fee > 0) {
            bool feeTransferSuccess = paymentToken.transfer(feeWallet, fee);
            require(feeTransferSuccess, "Fee transfer failed");
        }

        newGame.settled = true;
        emit GameCreated(gameId, msg.sender, _choice, _wagerAmount);
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
     * @dev Updates the payment token contract address.
     * @param _newPaymentToken The address of the new ERC20 payment token.
     */
    function setPaymentToken(address _newPaymentToken) external onlyOwner {
        require(_newPaymentToken != address(0), "New payment token cannot be zero address");
        paymentToken = IERC20(_newPaymentToken);
        emit PaymentTokenUpdated(_newPaymentToken);
    }

    /**
     * @dev Updates the fee wallet address.
     * @param _newFeeWallet The address of the new fee wallet.
     */
    function setFeeWallet(address _newFeeWallet) external onlyOwner {
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
     * @param _newMaxWager The new maximum wager amount.
     */
    function setMaxWager(uint256 _newMaxWager) external onlyOwner {
        require(_newMaxWager >= minWager, "Max wager must be >= min wager");
        maxWager = _newMaxWager;
        emit MaxWagerUpdated(_newMaxWager);
    }

    /**
     * @dev Updates the minimum wager amount.
     * @param _newMinWager The new minimum wager amount.
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
        require(_tokenAddress != address(paymentToken), "Cannot withdraw game payment token with this function");
        IERC20 token = IERC20(_tokenAddress);
        bool success = token.transfer(owner(), _amount);
        require(success, "Token withdrawal failed");
    }

    /**
     * @dev Allows the owner to withdraw stuck Ether from the contract.
     */
    function withdrawStuckEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept Ether (though not directly used by core game logic)
    receive() external payable {}
    fallback() external payable {}
}

