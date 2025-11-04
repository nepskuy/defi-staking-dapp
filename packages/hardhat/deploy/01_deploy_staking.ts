import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying contracts with account:", deployer);

  // Deploy Mock Tokens
  const stakingToken = await deploy("MockERC20", {
    from: deployer,
    args: ["Staking Token", "STK"],
    log: true,
  });

  const rewardToken = await deploy("MockERC20", {
    from: deployer,
    args: ["Reward Token", "RWD"],
    log: true,
  });

  // Deploy Staking Contract - pass deployer as initialOwner
  const stakingContract = await deploy("StakingContract", {
    from: deployer,
    args: [stakingToken.address, rewardToken.address],
    log: true,
  });

  console.log("Staking Token deployed to:", stakingToken.address);
  console.log("Reward Token deployed to:", rewardToken.address);
  console.log("Staking Contract deployed to:", stakingContract.address);

  // Verify ownership
  const stakingInstance = await hre.ethers.getContractAt("StakingContract", stakingContract.address);
  const owner = await stakingInstance.owner();
  console.log("Staking Contract owner:", owner);
};

export default func;
func.tags = ["Staking"];