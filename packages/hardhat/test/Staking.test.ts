import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("StakingContract", function () {
  let staking: any;
  let stakingToken: any;
  let rewardToken: any;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock Tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await MockERC20Factory.deploy("Staking Token", "STK");
    rewardToken = await MockERC20Factory.deploy("Reward Token", "RWD");

    // Deploy Staking Contract
    const StakingFactory = await ethers.getContractFactory("StakingContract");
    staking = await StakingFactory.deploy(
      await stakingToken.getAddress(),
      await rewardToken.getAddress()
    );

    // Transfer tokens to users untuk testing
    //const ownerAddress = await owner.getAddress();
    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();
    
    await stakingToken.transfer(user1Address, ethers.parseEther("1000"));
    await stakingToken.transfer(user2Address, ethers.parseEther("1000"));
    
    // Fund reward pool (sebagai owner)
    await rewardToken.transfer(await staking.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await staking.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct staking token", async function () {
      expect(await staking.stakingToken()).to.equal(await stakingToken.getAddress());
    });

    it("Should set the correct reward token", async function () {
      expect(await staking.rewardToken()).to.equal(await rewardToken.getAddress());
    });
  });

  describe("Staking Functionality", function () {
    it("Should allow users to stake tokens", async function () {
      const user1Address = await user1.getAddress();
      const stakeAmount = ethers.parseEther("100");

      // Approve dan stake
      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // Check staked balance
      const stakedBalance = await staking.balances(user1Address);
      expect(stakedBalance).to.equal(stakeAmount);
    });

    it("Should update total supply when staking", async function () {
      const stakeAmount = ethers.parseEther("100");

      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      const totalSupply = await staking.totalSupply();
      expect(totalSupply).to.equal(stakeAmount);
    });

    it("Should emit Staked event", async function () {
      const stakeAmount = ethers.parseEther("100");
      const user1Address = await user1.getAddress();

      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      
      await expect(staking.connect(user1).stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(user1Address, stakeAmount);
    });
  });

  describe("Reward Calculation", function () {
    it("Should calculate rewards over time", async function () {
      const user1Address = await user1.getAddress();
      const stakeAmount = ethers.parseEther("100");

      // Stake tokens
      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // Advance time (1 hour)
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Check earned rewards
      const earned = await staking.earned(user1Address);
      expect(Number(ethers.formatEther(earned))).to.be.gt(0); // Should have earned some rewards
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set reward rate", async function () {
      const newRewardRate = 200;
      await staking.setRewardRate(newRewardRate);
      expect(await staking.rewardRate()).to.equal(newRewardRate);
    });

    it("Should not allow non-owner to set reward rate", async function () {
      const newRewardRate = 200;
      await expect(
        staking.connect(user1).setRewardRate(newRewardRate)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });
});