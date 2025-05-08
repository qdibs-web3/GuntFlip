// scripts/deployCoinFlip.js
const hre = require("hardhat");

async function main() {
  // Get the signers (the account that will deploy the contract)
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // --- 1. Deploy MockERC20 Token (for wagers and payouts) ---
  // If you have an existing ERC20 token on Abstract testnet you want to use,
  // you can skip this deployment and use its address directly.
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const paymentToken = await MockERC20.deploy("Test Wager Token", "TWT");
  await paymentToken.waitForDeployment();
  const paymentTokenAddress = await paymentToken.getAddress();
  console.log("MockERC20 (Payment Token) deployed to:", paymentTokenAddress);

  // --- 2. Define CoinFlip Constructor Arguments ---
  const initialFeeWallet = deployer.address; // Owner's wallet for fees
  const initialFeePercentage = 500; // 5% (500 basis points)
  const initialMaxWager = hre.ethers.parseUnits("100", 18); // e.g., 100 tokens
  const initialMinWager = hre.ethers.parseUnits("1", 18);   // e.g., 1 token

  // --- 3. Deploy CoinFlip Contract ---
  const CoinFlip = await hre.ethers.getContractFactory("CoinFlip");
  const coinFlip = await CoinFlip.deploy(
    paymentTokenAddress,
    initialFeeWallet,
    initialFeePercentage,
    initialMaxWager,
    initialMinWager
  );
  await coinFlip.waitForDeployment();
  const coinFlipAddress = await coinFlip.getAddress();
  console.log("CoinFlip contract deployed to:", coinFlipAddress);

  // --- Optional: Mint some tokens to the CoinFlip contract for initial liquidity ---
  // This is important if the contract needs to pay out winnings immediately
  // and the first few players might win before enough fees are collected.
  const initialContractFunding = hre.ethers.parseUnits("200", 18); // e.g., fund with 200 TWT
  if (initialContractFunding > 0n) {
    console.log(`Minting ${hre.ethers.formatUnits(initialContractFunding, 18)} TWT to the CoinFlip contract for initial liquidity...`);
    const mintTx = await paymentToken.mint(coinFlipAddress, initialContractFunding);
    await mintTx.wait();
    console.log("Successfully funded CoinFlip contract with initial TWT.");
  }

  console.log("\n--- Deployment Summary ---");
  console.log("Payment Token (MockERC20) Address:", paymentTokenAddress);
  console.log("CoinFlip Contract Address:", coinFlipAddress);
  console.log("Fee Wallet (Owner):", initialFeeWallet);
  console.log("Deployer Account:", deployer.address);
  console.log("--------------------------");
  console.log("Next steps: You might want to interact with your contract, or verify it on a block explorer.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
