require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

// Hardhat chỉ dùng để biên dịch và chạy bộ kiểm thử ở máy local.
// Triển khai lên Sepolia thực hiện bằng Remix + MetaMask (xem docs/DEPLOY_REMIX.md).
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun", // cần cho transient storage (TSTORE/TLOAD)
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: { chainId: 31337, hardfork: "cancun" },
  },
};
