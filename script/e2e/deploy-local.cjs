// Kiểm thử đầu-cuối trên máy: deploy bộ Safe chính thức, verifier, checker, escrow và một ví Safe của người bán
// lên node Hardhat local (dùng lại fixture của bộ test), rồi ghi cấu hình cho dapp và cho script điều khiển trình duyệt.
//   npx hardhat node --config hardhat.config.cjs
//   SAFE_VERSION=1.5.0 SAFE_VARIANT=L2 npx hardhat run script/e2e/deploy-local.cjs --network localhost --config hardhat.config.cjs
const fs = require("fs");
const path = require("path");
const { deployFixture } = require("../../test/helpers/fixture.cjs");

async function main() {
  const f = await deployFixture();
  const state = {
    escrow: f.escrow.target,
    verifier: f.verifier.target,
    safe: f.proxyAddress,
    seller: f.seller.address,
    buyer: f.buyer.address,
    compatHandler: f.compatHandler.target,
    token: f.token.target,
    nft: f.nft.target,
  };
  const root = path.join(__dirname, "..", "..");
  fs.writeFileSync(path.join(root, "client", ".env.e2e"), `VITE_CHAIN=local\nVITE_ESCROW=${state.escrow}\n`);
  fs.writeFileSync(path.join(__dirname, "state.json"), JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
