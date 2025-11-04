'use client';

import { useState, useEffect } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";

// ABI untuk MockERC20
const MOCK_ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ABI untuk StakingContract
const STAKING_ABI = [
  {
    name: "stake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "exit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "balances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "earned",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "stakingToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "rewardToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "rewardRate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const CONTRACT_ADDRESSES = {
  StakingContract: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" as `0x${string}`,
  MockERC20: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as `0x${string}`,
};

export function StakingInterface() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction tracking
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Reset loading states when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      setIsLoading(false);
      setIsApproving(false);
      setTxHash(undefined);
      setError(null);
    }
  }, [isConfirmed]);

  // Get contract addresses
  const { data: stakingTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "stakingToken",
  });

  const { data: rewardTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "rewardToken",
  });

  // User balances and data
  const { data: stakingTokenBalance, refetch: refetchStakingBalance } = useBalance({
    address: connectedAddress,
    token: stakingTokenAddress,
  });

  const { data: rewardTokenBalance, refetch: refetchRewardBalance } = useBalance({
    address: connectedAddress,
    token: rewardTokenAddress,
  });

  const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "balances",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  const { data: earnedRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "earned",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  const { data: totalStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "totalSupply",
  });

  const { data: rewardRate } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingContract,
    abi: STAKING_ABI,
    functionName: "rewardRate",
  });

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stakingTokenAddress,
    abi: MOCK_ERC20_ABI,
    functionName: "allowance",
    args: connectedAddress && CONTRACT_ADDRESSES.StakingContract 
      ? [connectedAddress, CONTRACT_ADDRESSES.StakingContract] 
      : undefined,
  });

  // Contract write functions
  const { writeContractAsync } = useWriteContract();

  // Refetch balances after successful transactions
  useEffect(() => {
    if (isConfirmed) {
      refetchStakingBalance();
      refetchRewardBalance();
      refetchStakedBalance();
      refetchAllowance();
    }
  }, [isConfirmed, refetchStakingBalance, refetchRewardBalance, refetchStakedBalance, refetchAllowance]);

  // Handler functions
  const handleStake = async () => {
    if (!stakeAmount || !stakingTokenAddress) {
      setError("Please enter stake amount");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const stakeAmountWei = parseEther(stakeAmount);
      
      // Check if user has sufficient balance
      if (stakingTokenBalance && stakingTokenBalance.value < stakeAmountWei) {
        setError("Insufficient balance");
        setIsLoading(false);
        return;
      }

      console.log("Starting stake process...");
      console.log("Stake amount:", stakeAmount);
      console.log("Stake amount in wei:", stakeAmountWei.toString());
      console.log("User balance:", stakingTokenBalance?.value.toString());
      console.log("Allowance:", allowance?.toString());
      console.log("Staking Token Address:", stakingTokenAddress);
      console.log("Staking Contract Address:", CONTRACT_ADDRESSES.StakingContract);

      // Check if we need approval
      const currentAllowance = allowance || 0n;
      if (currentAllowance < stakeAmountWei) {
        console.log("Approval needed...");
        setIsApproving(true);
        
        // Approve first
        const approveHash = await writeContractAsync({
          address: stakingTokenAddress,
          abi: MOCK_ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.StakingContract, stakeAmountWei],
        });
        
        console.log("Approval hash:", approveHash);
        setTxHash(approveHash);

        // Wait for approval confirmation - FIXED: use the hook instead
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for confirmation
        console.log("Approval confirmed!");
        
        setIsApproving(false);
        
        // Refetch allowance after approval
        await refetchAllowance();
      }

      console.log("Proceeding to stake...");
      
      // Now stake the tokens
      const stakeHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.StakingContract,
        abi: STAKING_ABI,
        functionName: "stake",
        args: [stakeAmountWei],
      });
      
      console.log("Stake hash:", stakeHash);
      setTxHash(stakeHash);
      setStakeAmount("");
      
    } catch (error: any) {
      console.error("Staking error:", error);
      setError(`Staking failed: ${error.message || "Unknown error"}`);
      setIsLoading(false);
      setIsApproving(false);
      setTxHash(undefined);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      setError("Please enter withdraw amount");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const withdrawAmountWei = parseEther(withdrawAmount);
      
      // Check if user has sufficient staked balance
      if (stakedBalance && stakedBalance < withdrawAmountWei) {
        setError("Insufficient staked balance");
        setIsLoading(false);
        return;
      }

      console.log("Withdrawing...", withdrawAmountWei.toString());
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.StakingContract,
        abi: STAKING_ABI,
        functionName: "withdraw",
        args: [withdrawAmountWei],
      });
      
      setTxHash(hash);
      setWithdrawAmount("");
    } catch (error: any) {
      console.error("Withdraw error:", error);
      setError(`Withdraw failed: ${error.message || "Unknown error"}`);
      setIsLoading(false);
      setTxHash(undefined);
    }
  };

  const handleGetReward = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Claiming rewards...");
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.StakingContract,
        abi: STAKING_ABI,
        functionName: "getReward",
      });
      
      setTxHash(hash);
    } catch (error: any) {
      console.error("Get reward error:", error);
      setError(`Claim rewards failed: ${error.message || "Unknown error"}`);
      setIsLoading(false);
      setTxHash(undefined);
    }
  };

  const handleExit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Exiting...");
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.StakingContract,
        abi: STAKING_ABI,
        functionName: "exit",
      });
      
      setTxHash(hash);
    } catch (error: any) {
      console.error("Exit error:", error);
      setError(`Exit failed: ${error.message || "Unknown error"}`);
      setIsLoading(false);
      setTxHash(undefined);
    }
  };

  // Calculate APY (simplified)
  const calculateAPY = () => {
    if (!rewardRate || !totalStaked || totalStaked === 0n) return 0;
    const annualRewards = Number(rewardRate) * 60 * 60 * 24 * 365;
    const totalStakedNum = Number(formatEther(totalStaked));
    return totalStakedNum > 0 ? (annualRewards / totalStakedNum) * 100 : 0;
  };

  const apy = calculateAPY();

  // Debug: Check contract addresses and balances
  useEffect(() => {
    if (isConnected && connectedAddress) {
      console.log("=== DEBUG INFO ===");
      console.log("Connected Address:", connectedAddress);
      console.log("Staking Contract:", CONTRACT_ADDRESSES.StakingContract);
      console.log("MockERC20 Contract:", CONTRACT_ADDRESSES.MockERC20);
      console.log("Staking Token Address:", stakingTokenAddress);
      console.log("Reward Token Address:", rewardTokenAddress);
      console.log("Staking Token Balance:", stakingTokenBalance?.value.toString());
      console.log("Total Staked:", totalStaked?.toString());
      console.log("===================");
    }
  }, [isConnected, connectedAddress, stakingTokenAddress, rewardTokenAddress, stakingTokenBalance, totalStaked]);

  if (!isConnected) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3 font-sans">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 font-sans">
            Connect your wallet to start staking and earning rewards
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-medium font-sans">{error}</p>
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {(isLoading || isConfirming) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <div>
              <p className="text-blue-800 font-medium font-sans">
                {isApproving ? "Approving Tokens..." : isConfirming ? "Confirming Transaction..." : "Processing..."}
              </p>
              {txHash && (
                <p className="text-blue-600 text-sm font-sans">Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-medium font-sans">Transaction Confirmed!</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1 font-sans">Total Value Staked</p>
          <p className="text-2xl font-semibold text-gray-900 font-sans">
            {totalStaked ? Number(formatEther(totalStaked)).toLocaleString() : "0"} STK
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1 font-sans">Your Staked</p>
          <p className="text-2xl font-semibold text-gray-900 font-sans">
            {stakedBalance ? formatEther(stakedBalance) : "0"} STK
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1 font-sans">Your Rewards</p>
          <p className="text-2xl font-semibold text-gray-900 font-sans">
            {earnedRewards ? Number(formatEther(earnedRewards)).toFixed(4) : "0"} RWD
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1 font-sans">APY</p>
          <p className="text-2xl font-semibold text-gray-900 font-sans">
            {apy.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet Info Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-sans">Wallet Overview</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 text-sm font-semibold font-sans">STK</span>
                  </div>
                  <span className="text-gray-600 font-sans">Balance</span>
                </div>
                <span className="text-gray-900 font-semibold font-sans">
                  {stakingTokenBalance ? Number(formatEther(stakingTokenBalance.value)).toLocaleString() : "0"}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 text-sm font-semibold font-sans">RWD</span>
                  </div>
                  <span className="text-gray-600 font-sans">Balance</span>
                </div>
                <span className="text-gray-900 font-semibold font-sans">
                  {rewardTokenBalance ? Number(formatEther(rewardTokenBalance.value)).toLocaleString() : "0"}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-sans">Staked</span>
                </div>
                <span className="text-gray-900 font-semibold font-sans">
                  {stakedBalance ? formatEther(stakedBalance) : "0"}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-600 mb-4 font-sans">QUICK ACTIONS</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGetReward}
                  disabled={!earnedRewards || earnedRewards === 0n || isLoading}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="text-sm font-medium">Claim</span>
                </button>

                <button
                  onClick={handleExit}
                  disabled={!stakedBalance || stakedBalance === 0n || isLoading}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-sm font-medium">Exit All</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            {/* Tab Navigation */}
            <div className="flex space-x-1 p-1 rounded-xl bg-gray-100 mb-6">
              {["stake", "withdraw"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 font-sans ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "stake" ? "Stake Tokens" : "Withdraw Tokens"}
                </button>
              ))}
            </div>

            {/* Stake Tab */}
            {activeTab === "stake" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 font-sans">
                    Amount to Stake
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-sans"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-gray-500 text-sm font-sans">STK</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-2 font-sans">
                    <span>Available: {stakingTokenBalance ? Number(formatEther(stakingTokenBalance.value)).toLocaleString() : "0"} STK</span>
                    <button
                      onClick={() => setStakeAmount(stakingTokenBalance ? formatEther(stakingTokenBalance.value) : "0")}
                      className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={!stakeAmount || isLoading}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isApproving ? "Approving..." : "Staking..."}</span>
                    </div>
                  ) : (
                    "Stake Tokens"
                  )}
                </button>

                {/* Debug Info */}
                <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                  <div>Allowance: {allowance ? formatEther(allowance) : "0"} STK</div>
                  <div>Staking Token: {stakingTokenAddress}</div>
                  <div>Staking Contract: {CONTRACT_ADDRESSES.StakingContract}</div>
                </div>
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === "withdraw" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 font-sans">
                    Amount to Withdraw
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 font-sans"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-gray-500 text-sm font-sans">STK</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-2 font-sans">
                    <span>Staked: {stakedBalance ? formatEther(stakedBalance) : "0"} STK</span>
                    <button
                      onClick={() => setWithdrawAmount(stakedBalance ? formatEther(stakedBalance) : "0")}
                      className="text-orange-600 hover:text-orange-700 transition-colors font-medium"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || isLoading}
                  className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Withdraw Tokens"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}