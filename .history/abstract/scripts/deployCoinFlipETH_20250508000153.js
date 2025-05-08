const hre = require("hardhat");

async function main() {
  console.log("Deploying CoinFlipETH contract...");

  // --- Deployment Parameters for CoinFlipETH ---
  // TODO: Replace these with your desired values
  const initialFeeWallet = "0xED946D2F962cF5207E209CE0F16b629A293d0A8F"; // Replace with your actual fee wallet address
  const initialFeePercentage = 500; // 500 basis points = 5%
  const initialMinWager = hre.ethers.parseEther("0.001"); // Example: 0.001 ETH in Wei
  const initialMaxWager = hre.ethers.parseEther("0.1");   // Example: 0.1 ETH in Wei

  if (initialFeeWallet === "0xED946D2F962cF5207E209CE0F16b629A293d0A8F") {
    console.error("Please replace 0xYOUR_FEE_WALLET_ADDRESS_HERE with your actual fee wallet address in the deployment script.");
    process.exit(1);
  }
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy CoinFlipETH
  const CoinFlipETH = await hre.ethers.getContractFactory("CoinFlipETH");
  const coinFlipETH = await CoinFlipETH.deploy(
    initialFeeWallet,
    initialFeePercentage,
    initialMaxWager,
    initialMinWager
  );

  await coinFlipETH.waitForDeployment();

  const coinFlipETHAddress = await coinFlipETH.getAddress();
  console.log(`CoinFlipETH contract deployed to: ${coinFlipETHAddress}`);

  console.log("\n-----------------------------------------------------");
  console.log("Deployment complete.");
  console.log(`CoinFlipETH deployed at: ${coinFlipETHAddress}`);
  console.log("Constructor arguments used:");
  console.log(`  _initialFeeWallet: ${initialFeeWallet}`);
  console.log(`  _initialFeePercentage: ${initialFeePercentage}`);
  console.log(`  _initialMaxWager (Wei): ${initialMaxWager.toString()}`);
  console.log(`  _initialMinWager (Wei): ${initialMinWager.toString()}`);
  console.log("-----------------------------------------------------\n");

  // Optional: Wait a bit for block explorer to index, then try to verify
  // This is especially useful if verification is part of the same script run.
  // However, for manual verification or separate verification step, this might not be needed here.
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for 30 seconds before attempting verification to allow block explorer to index...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds delay

    try {
      console.log("Attempting to verify CoinFlipETH contract on Abscan...");
      await hre.run("verify:verify", {
        address: coinFlipETHAddress,
        constructorArguments: [
          initialFeeWallet,
          initialFeePercentage,
          initialMaxWager,
          initialMinWager
        ],
        // contract: "contracts/CoinFlipETH.sol:CoinFlipETH" // Optional: specify contract path if needed
      });
      console.log("Contract verification successful (or request submitted).");
    } catch (error) {
      console.error("Contract verification failed:", error.message);
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("Contract might already be verified.");
      } else {
        console.log("If verification failed, you might need to run it manually or check your hardhat.config.js etherscan/customChains settings and Abscan API key.");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

