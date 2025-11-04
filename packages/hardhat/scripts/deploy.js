const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get the deployer/signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy MockERC20 - Staking Token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const stakingToken = await MockERC20.deploy("Staking Token", "STK");
  await stakingToken.waitForDeployment();
  console.log("Staking Token deployed to:", await stakingToken.getAddress());

  // Deploy MockERC20 - Reward Token  
  const rewardToken = await MockERC20.deploy("Reward Token", "RWD");
  await rewardToken.waitForDeployment();
  console.log("Reward Token deployed to:", await rewardToken.getAddress());

  // Deploy StakingContract dengan token addresses yang benar
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    await stakingToken.getAddress(),
    await rewardToken.getAddress()
  );
  await stakingContract.waitForDeployment();
  console.log("StakingContract deployed to:", await stakingContract.getAddress());

  // Mint reward tokens ke StakingContract untuk rewards
  const rewardAmount = ethers.parseEther("1000000"); // 1M RWD
  await rewardToken.mint(await stakingContract.getAddress(), rewardAmount);
  console.log("Minted", ethers.formatEther(rewardAmount), "RWD to StakingContract");

  // Mint staking tokens ke deployer untuk testing
  const stakingAmount = ethers.parseEther("10000"); // 10K STK
  await stakingToken.mint(deployer.address, stakingAmount);
  console.log("Minted", ethers.formatEther(stakingAmount), "STK to deployer");

  // Setup reward rate
  await stakingContract.setRewardRate(ethers.parseEther("0.000031709")); // ~1 token per day
  console.log("Reward rate set");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Staking Token (STK):", await stakingToken.getAddress());
  console.log("Reward Token (RWD):", await rewardToken.getAddress());
  console.log("Staking Contract:", await stakingContract.getAddress());
  console.log("Deployer:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });