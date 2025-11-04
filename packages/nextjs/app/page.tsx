'use client';

import { StakingInterface } from "../components/StakingInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 font-sans">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DeFi Staking dApp
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Stake your tokens and earn rewards with our secure and efficient staking platform
          </p>
        </header>
        
        <StakingInterface />
      </div>
    </div>
  );
}