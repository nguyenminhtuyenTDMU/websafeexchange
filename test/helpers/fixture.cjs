/**
 * Bộ khởi tạo dùng chung cho test CleanHandover, chạy trên bộ hợp đồng Safe v1.4.1 CHÍNH THỨC
 * (artifact build sẵn của @safe-global/safe-contracts).
 *
 * SAFE_VARIANT=L2 để dùng SafeL2 (bản mà app.safe.global dùng trên Sepolia); mặc định là Safe.
 * SAFE_VERSION=1.5.0 để dùng Safe 1.5.0 (@safe-global/safe-smart-account); mặc định là 1.4.1 (@safe-global/safe-contracts).
 */
const { ethers } = require("hardhat");
const path = require("path");

const SAFE_PACKAGE = process.env.SAFE_VERSION === "1.5.0" ? "safe-smart-account" : "safe-contracts";
const SAFE_ARTIFACTS = path.join(
  __dirname, "..", "..", "node_modules", "@safe-global", SAFE_PACKAGE, "build", "artifacts", "contracts"
);
const loadSafeArtifact = (rel) => require(path.join(SAFE_ARTIFACTS, rel));
const SINGLETON_ARTIFACT = process.env.SAFE_VARIANT === "L2" ? "SafeL2.sol/SafeL2.json" : "Safe.sol/Safe.json";

const SENTINEL = "0x0000000000000000000000000000000000000001";
const ONE_ETH = ethers.parseEther("1");
const PRICE = ethers.parseEther("2");
const TOKEN_AMOUNT = ethers.parseEther("1000");
const NFT_ID = 7;

// Bit của SafeWalletVerifier
const BIT = {
  NOT_OFFICIAL_SAFE: 1n << 0n,
  OWNERS_MISMATCH: 1n << 1n,
  THRESHOLD_MISMATCH: 1n << 2n,
  MODULES_ENABLED: 1n << 3n,
  GUARD_SET: 1n << 4n,
  MODULE_GUARD_SET: 1n << 5n,
  FALLBACK_HANDLER: 1n << 6n,
  EXECUTOR_NOT_ENABLED: 1n << 7n,
};
const CHECKER = { ETH: 0, ERC20: 1, ERC721: 2, OWNABLE: 3 };
const Status = { NONE: 0n, OPEN: 1n, FUNDED: 2n, COMPLETED: 3n, CANCELLED: 4n };

async function deployFromArtifact(rel, signer, args = []) {
  const art = loadSafeArtifact(rel);
  const c = await new ethers.ContractFactory(art.abi, art.bytecode, signer).deploy(...args);
  await c.waitForDeployment();
  return c;
}

async function latestTime() {
  return (await ethers.provider.getBlock("latest")).timestamp;
}

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/** Chữ ký "approved by msg.sender" (v = 1): owner tự gửi execTransaction. */
function ownerSig(address) {
  return ethers.concat([ethers.zeroPadValue(address, 32), ethers.ZeroHash, "0x01"]);
}

function encodeMultiSend(txs) {
  return ethers.concat(
    txs.map((t) =>
      ethers.solidityPacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [0, t.to, t.value || 0, ethers.dataLength(t.data || "0x"), t.data || "0x"]
      )
    )
  );
}

const call = (contract, fn, args, value) => ({
  to: contract.target,
  data: contract.interface.encodeFunctionData(fn, args),
  value,
});

async function deployFixture() {
  const [deployer, seller, buyer, buyer2, attacker, stranger] = await ethers.getSigners();

  const singleton = await deployFromArtifact(SINGLETON_ARTIFACT, deployer);
  const factory = await deployFromArtifact("proxies/SafeProxyFactory.sol/SafeProxyFactory.json", deployer);
  const compatHandler = await deployFromArtifact(
    "handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json", deployer
  );
  const multiSend = await deployFromArtifact("libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json", deployer);
  const safeAbi = loadSafeArtifact(SINGLETON_ARTIFACT).abi;

  const verifier = await (await ethers.getContractFactory("SafeWalletVerifier")).deploy([singleton.target]);
  const checkers = [];
  for (const name of ["EthBalanceChecker", "Erc20BalanceChecker", "Erc721OwnerChecker", "OwnableOwnerChecker"]) {
    checkers.push(await (await ethers.getContractFactory(name)).deploy());
  }
  const escrow = await (await ethers.getContractFactory("CleanHandoverEscrow")).deploy(
    [verifier.target], checkers.map((c) => c.target)
  );

  // Ví Safe 1-of-1 của người bán, fallback handler chuẩn
  const initializer = singleton.interface.encodeFunctionData("setup", [
    [seller.address], 1, ethers.ZeroAddress, "0x", compatHandler.target, ethers.ZeroAddress, 0, ethers.ZeroAddress,
  ]);
  const receipt = await (await factory.createProxyWithNonce(singleton.target, initializer, 1)).wait();
  const proxyAddress = receipt.logs
    .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
    .find((e) => e && e.name === "ProxyCreation").args.proxy;
  const safe = new ethers.Contract(proxyAddress, safeAbi, deployer);

  // Tài sản trong ví
  const token = await (await ethers.getContractFactory("MockERC20")).deploy();
  const nft = await (await ethers.getContractFactory("MockERC721")).deploy();
  const ownable = await (await ethers.getContractFactory("MockOwnable")).deploy(proxyAddress);
  const guard = await (await ethers.getContractFactory("MockGuard")).deploy();
  await token.mint(proxyAddress, TOKEN_AMOUNT);
  await nft.mint(proxyAddress, NFT_ID);
  await deployer.sendTransaction({ to: proxyAddress, value: ONE_ETH });

  /** Owner `signer` thực thi một giao dịch Safe (1 lời gọi, hoặc MultiSend nếu truyền mảng). */
  const execSafe = (signer, txOrTxs, { operation = 0 } = {}) => {
    if (Array.isArray(txOrTxs)) {
      const data = multiSend.interface.encodeFunctionData("multiSend", [encodeMultiSend(txOrTxs)]);
      return safe.connect(signer).execTransaction(
        multiSend.target, 0, data, 1, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, ownerSig(signer.address)
      );
    }
    const t = txOrTxs;
    return safe.connect(signer).execTransaction(
      t.to, t.value || 0, t.data || "0x", operation, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress,
      ownerSig(signer.address)
    );
  };
  const safeCall = (fn, args) => call(safe, fn, args);

  const baseParams = async (overrides = {}) => ({
    wallet: proxyAddress,
    verifierId: 0,
    buyer: buyer.address,
    price: PRICE,
    deadline: (await latestTime()) + 3600,
    newOwners: [buyer.address],
    threshold: 1,
    allowedFallbackHandler: compatHandler.target,
    assets: [
      { checkerId: CHECKER.ETH, token: ethers.ZeroAddress, value: ONE_ETH },
      { checkerId: CHECKER.ERC20, token: token.target, value: TOKEN_AMOUNT },
      { checkerId: CHECKER.ERC721, token: nft.target, value: NFT_ID },
      { checkerId: CHECKER.OWNABLE, token: ownable.target, value: 0 },
    ],
    ...overrides,
  });

  /** Người bán bật escrow làm module (bước chuẩn bị bắt buộc trước khi người mua nạp tiền). */
  const enableEscrowModule = () => execSafe(seller, safeCall("enableModule", [escrow.target]));

  /** Niêm yết (không chuẩn bị ví). Trả về tradeId. */
  const list = async (overrides = {}) => {
    await escrow.connect(seller).createTrade(await baseParams(overrides));
    return escrow.tradeCount();
  };

  const depositFor = async (id, signer = buyer) => {
    const { termsHash, price } = await escrow.trades(id);
    return escrow.connect(signer).deposit(id, termsHash, { value: price });
  };

  /** Luồng chuẩn: chuẩn bị ví → niêm yết → nạp tiền. Trả về tradeId. */
  const openAndFund = async (overrides = {}) => {
    await enableEscrowModule();
    const id = await list(overrides);
    await depositFor(id);
    return id;
  };

  return {
    deployer, seller, buyer, buyer2, attacker, stranger,
    singleton, factory, compatHandler, multiSend, safe, proxyAddress, guard,
    verifier, checkers, escrow, token, nft, ownable,
    execSafe, safeCall, baseParams, enableEscrowModule, list, depositFor, openAndFund,
  };
}

/** Dựng môi trường một lần, các lần sau chỉ quay về snapshot (nhanh hơn nhiều so với deploy lại). */
let cached;
async function loadFixture(fn) {
  if (cached && cached.fn === fn) {
    await ethers.provider.send("evm_revert", [cached.snapshot]);
    cached.snapshot = await ethers.provider.send("evm_snapshot", []);
    return cached.result;
  }
  const result = await fn();
  cached = { fn, result, snapshot: await ethers.provider.send("evm_snapshot", []) };
  return result;
}

module.exports = {
  loadFixture,
  SENTINEL, ONE_ETH, PRICE, TOKEN_AMOUNT, NFT_ID, BIT, CHECKER, Status,
  deployFixture, latestTime, increaseTime, call, ownerSig, encodeMultiSend,
};
