import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const deployedContracts = {
  StakingContract: {
    [31337]: {
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      blockNumber: 1,
    },
  },
  MockERC20: {
    [31337]: {
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
      blockNumber: 1,
    },
  },
} as const;

export default deployedContracts satisfies GenericContractsDeclaration;