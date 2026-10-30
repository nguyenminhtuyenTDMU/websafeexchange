/**
 * Bộ kiểm thử CleanHandover chạy trên bộ hợp đồng Safe v1.4.1 CHÍNH THỨC (artifact từ @safe-global/safe-contracts).
 *
 * Mỗi `describe("T..")` tương ứng một kịch bản trong threat model (docs/THREAT_MODEL.md):
 * kẻ tấn công thực hiện hành vi gian lận ngay trong giao dịch bàn giao, và hệ thống phải chặn được.
 *
 * Chạy: npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path");

const SAFE_ARTIFACTS = path.join(
  __dirname, "..", "node_modules", "@safe-global", "safe-contracts", "build", "artifacts", "contracts"
);
const loadSafeArtifact = (rel) => require(path.join(SAFE_ARTIFACTS, rel));

const SENTINEL = "0x0000000000000000000000000000000000000001";
const ONE_ETH = ethers.parseEther("1");
const PRICE = ethers.parseEther("2");

// Bit trạng thái của SafeWalletVerifier
const BIT = {
  NOT_OFFICIAL_SAFE: 1n << 0n,
  OWNERS_MISMATCH: 1n << 1n,
  THRESHOLD_MISMATCH: 1n << 2n,
  MODULES_ENABLED: 1n << 3n,
  GUARD_SET: 1n << 4n,
  MODULE_GUARD_SET: 1n << 5n,
  FALLBACK_HANDLER: 1n << 6n,
};
// Chỉ số asset checker trong escrow
const CHECKER = { ETH: 0, ERC20: 1, ERC721: 2, OWNABLE: 3 };
const Status = { NONE: 0n, OPEN: 1n, FUNDED: 2n, COMPLETED: 3n, CANCELLED: 4n };

async function deployFromArtifact(rel, signer, args = []) {
  const art = loadSafeArtifact(rel);
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, signer);
  const c = await factory.deploy(...args);
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

/** Chữ ký kiểu "approved by msg.sender" (v = 1) của Safe: owner tự gửi execTransaction. */
function ownerSig(addresses) {
  const sorted = [...addresses].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
  return ethers.concat(
    sorted.map((a) => ethers.concat([ethers.zeroPadValue(a, 32), ethers.ZeroHash, "0x01"]))
  );
}

async function execSafe(safe, signer, to, data, { operation = 0, value = 0 } = {}) {
  return safe
    .connect(signer)
    .execTransaction(to, value, data, operation, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, ownerSig([signer.address]));
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

describe("CleanHandover — escrow bàn giao ví Safe", function () {
  async function deployFixture() {
    const [deployer, seller, buyer, buyer2, attacker, stranger] = await ethers.getSigners();

    // ── Bộ hợp đồng Safe v1.4.1 chính thức ──
    const singleton = await deployFromArtifact("Safe.sol/Safe.json", deployer);
    const factory = await deployFromArtifact("proxies/SafeProxyFactory.sol/SafeProxyFactory.json", deployer);
    const compatHandler = await deployFromArtifact(
      "handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json", deployer
    );
    const multiSend = await deployFromArtifact("libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json", deployer);
    const safeAbi = loadSafeArtifact("Safe.sol/Safe.json").abi;

    // ── Hệ thống CleanHandover ──
    const verifier = await (await ethers.getContractFactory("SafeWalletVerifier")).deploy([await singleton.getAddress()]);
    const checkers = [];
    for (const name of ["EthBalanceChecker", "Erc20BalanceChecker", "Erc721OwnerChecker", "OwnableOwnerChecker"]) {
      checkers.push(await (await ethers.getContractFactory(name)).deploy());
    }
    const escrow = await (await ethers.getContractFactory("CleanHandoverEscrow")).deploy(
      [await verifier.getAddress()],
      await Promise.all(checkers.map((c) => c.getAddress()))
    );

    // ── Ví Safe 1-of-1 của người bán ──
    const initializer = singleton.interface.encodeFunctionData("setup", [
      [seller.address], 1, ethers.ZeroAddress, "0x", await compatHandler.getAddress(),
      ethers.ZeroAddress, 0, ethers.ZeroAddress,
    ]);
    const receipt = await (await factory.createProxyWithNonce(await singleton.getAddress(), initializer, 1)).wait();
    const proxyAddress = receipt.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "ProxyCreation").args.proxy;
    const safe = new ethers.Contract(proxyAddress, safeAbi, deployer);

    // ── Tài sản trong ví ──
    const token = await (await ethers.getContractFactory("MockERC20")).deploy();
    const nft = await (await ethers.getContractFactory("MockERC721")).deploy();
    const ownable = await (await ethers.getContractFactory("MockOwnable")).deploy(proxyAddress);
    await token.mint(proxyAddress, ethers.parseEther("1000"));
    await nft.mint(proxyAddress, 7);
    await deployer.sendTransaction({ to: proxyAddress, value: ONE_ETH });

    const baseParams = async (overrides = {}) => ({
      wallet: proxyAddress,
      verifierId: 0,
      buyer: buyer.address,
      price: PRICE,
      deadline: (await latestTime()) + 3600,
      newOwners: [buyer.address],
      threshold: 1,
      allowedFallbackHandler: await compatHandler.getAddress(),
      assets: [
        { checkerId: CHECKER.ETH, token: ethers.ZeroAddress, value: ONE_ETH },
        { checkerId: CHECKER.ERC20, token: await token.getAddress(), value: ethers.parseEther("1000") },
        { checkerId: CHECKER.ERC721, token: await nft.getAddress(), value: 7 },
        { checkerId: CHECKER.OWNABLE, token: await ownable.getAddress(), value: 0 },
      ],
      ...overrides,
    });

    /** Người bán niêm yết + người mua nạp tiền. Trả về tradeId. */
    const openAndFund = async (overrides = {}) => {
      const params = await baseParams(overrides);
      await escrow.connect(seller).createTrade(params);
      const id = await escrow.tradeCount();
      const { termsHash } = await escrow.trades(id);
      await escrow.connect(buyer).deposit(id, termsHash, { value: PRICE });
      return id;
    };

    const escrowAddr = await escrow.getAddress();
    const call = (contract, fn, args, value) => ({ to: contract.target, data: contract.interface.encodeFunctionData(fn, args), value });
    const begin = (id) => call(escrow, "beginHandover", [id]);
    const complete = (id) => call(escrow, "completeHandover", [id]);
    const swapToBuyer = () => call(safe, "swapOwner", [SENTINEL, seller.address, buyer.address]);

    /** Người bán thực thi MỘT giao dịch Safe: begin → [các lệnh ở giữa] → complete. */
    const atomicHandover = (id, middleTxs) => {
      const data = multiSend.interface.encodeFunctionData("multiSend", [
        encodeMultiSend([begin(id), ...middleTxs, complete(id)]),
      ]);
      return execSafe(safe, seller, multiSend.target, data, { operation: 1 });
    };

    return {
      deployer, seller, buyer, buyer2, attacker, stranger,
      singleton, factory, compatHandler, multiSend, safe, proxyAddress,
      verifier, checkers, escrow, escrowAddr, token, nft, ownable,
      baseParams, openAndFund, atomicHandover, call, swapToBuyer, begin, complete,
    };
  }

  let f;
  beforeEach(async function () {
    f = await deployFixture();
  });

  // ════════════════════════════════════════════════════════════════════════
  describe("Luồng chuẩn", function () {
    it("Bàn giao nguyên tử sạch: người mua nhận ví + tài sản, người bán nhận tiền", async function () {
      const { escrow, safe, seller, buyer, openAndFund, atomicHandover, swapToBuyer } = f;
      const id = await openAndFund();

      const [walletMaskBefore] = await escrow.getHandoverStatus(id);
      expect(walletMaskBefore & BIT.OWNERS_MISMATCH).to.equal(BIT.OWNERS_MISMATCH); // trợ lý thấy: chưa chuyển owner

      await expect(atomicHandover(id, [swapToBuyer()])).to.emit(escrow, "TradeCompleted").withArgs(id, seller.address, buyer.address, PRICE);

      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
      expect(await escrow.getHandoverStatus(id)).to.deep.equal([0n, 0n]);

      await expect(escrow.connect(seller).withdraw()).to.changeEtherBalance(seller, PRICE);
    });

    it("Bàn giao cho nhiều owner mới với ngưỡng 2/2", async function () {
      const { safe, buyer, buyer2, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund({ newOwners: [buyer.address, buyer2.address], threshold: 2 });
      await atomicHandover(id, [swapToBuyer(), call(safe, "addOwnerWithThreshold", [buyer2.address, 2])]);
      expect(await safe.getThreshold()).to.equal(2n);
      expect((await f.escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });

    it("Fallback handler bằng 0 cũng được chấp nhận", async function () {
      const { safe, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await atomicHandover(id, [call(safe, "setFallbackHandler", [ethers.ZeroAddress]), swapToBuyer()]);
      expect((await f.escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  describe("T1 — Giữ chủ sở hữu ẩn", function () {
    it("Người bán thêm người mua nhưng vẫn giữ mình làm owner => revert, ví không đổi", async function () {
      const { safe, seller, buyer, escrow, openAndFund, atomicHandover, call } = f;
      const id = await openAndFund();
      await expect(atomicHandover(id, [call(safe, "addOwnerWithThreshold", [buyer.address, 1])])).to.be.revertedWith("GS013");
      expect(await safe.getOwners()).to.deep.equal([seller.address]);
      expect((await escrow.trades(id)).status).to.equal(Status.FUNDED);
    });

    it("Người bán thay mình bằng một địa chỉ phụ của mình (đủ ngưỡng ký) => revert", async function () {
      const { safe, seller, buyer, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(
        atomicHandover(id, [swapToBuyer(), call(safe, "addOwnerWithThreshold", [attacker.address, 1])])
      ).to.be.revertedWith("GS013");
      expect(await safe.isOwner(buyer.address)).to.equal(false);
      expect(await safe.isOwner(seller.address)).to.equal(true);
    });
  });

  describe("T2 — Sai ngưỡng ký", function () {
    it("Thỏa thuận 2/2 nhưng người bán để 1/2 (một owner mới có thể tự rút) => revert", async function () {
      const { safe, buyer, buyer2, escrow, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund({ newOwners: [buyer.address, buyer2.address], threshold: 2 });
      await expect(
        atomicHandover(id, [swapToBuyer(), call(safe, "addOwnerWithThreshold", [buyer2.address, 1])])
      ).to.be.revertedWith("GS013");
      expect((await escrow.trades(id)).status).to.equal(Status.FUNDED);
    });
  });

  describe("T3 — Cài cắm module (backdoor rút tài sản không cần chữ ký)", function () {
    it("Module được bật ngay trong giao dịch bàn giao => revert", async function () {
      const { safe, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(atomicHandover(id, [call(safe, "enableModule", [attacker.address]), swapToBuyer()])).to.be.revertedWith("GS013");
    });

    it("Module được bật từ trước khi niêm yết => trợ lý báo MODULES_ENABLED, không thể hoàn tất", async function () {
      const { safe, seller, attacker, escrow, openAndFund, atomicHandover, swapToBuyer } = f;
      await execSafe(safe, seller, safe.target, safe.interface.encodeFunctionData("enableModule", [attacker.address]));
      const id = await openAndFund();
      const [mask] = await escrow.getHandoverStatus(id);
      expect(mask & BIT.MODULES_ENABLED).to.equal(BIT.MODULES_ENABLED);
      await expect(atomicHandover(id, [swapToBuyer()])).to.be.revertedWith("GS013");
    });

    it("Người bán gỡ module trước khi bàn giao => thành công", async function () {
      const { safe, seller, attacker, escrow, openAndFund, atomicHandover, swapToBuyer, call } = f;
      await execSafe(safe, seller, safe.target, safe.interface.encodeFunctionData("enableModule", [attacker.address]));
      const id = await openAndFund();
      await atomicHandover(id, [call(safe, "disableModule", [SENTINEL, attacker.address]), swapToBuyer()]);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });
  });

  describe("T4 — Cài cắm guard (kiểm duyệt / khóa giao dịch của người mua)", function () {
    it("Guard được đặt => revert; trợ lý đọc được guard qua storage slot", async function () {
      const { safe, seller, escrow, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const guard = await (await ethers.getContractFactory("MockGuard")).deploy();
      await execSafe(safe, seller, safe.target, safe.interface.encodeFunctionData("setGuard", [guard.target]));
      const id = await openAndFund();

      const [mask] = await escrow.getHandoverStatus(id);
      expect(mask & BIT.GUARD_SET).to.equal(BIT.GUARD_SET);
      await expect(atomicHandover(id, [swapToBuyer()])).to.be.revertedWith("GS013");

      // Gỡ guard trong cùng giao dịch bàn giao => hợp lệ
      await atomicHandover(id, [call(safe, "setGuard", [ethers.ZeroAddress]), swapToBuyer()]);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });
  });

  describe("T5 — Fallback handler độc (giả mạo chữ ký EIP-1271)", function () {
    it("Đổi fallback handler sang địa chỉ lạ => revert", async function () {
      const { safe, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(
        atomicHandover(id, [call(safe, "setFallbackHandler", [attacker.address]), swapToBuyer()])
      ).to.be.revertedWith("GS013");
    });
  });

  describe("T6 — Rút tài sản ngay trong giao dịch bàn giao (gộp giao dịch)", function () {
    it("Rút ETH => revert", async function () {
      const { attacker, openAndFund, atomicHandover, swapToBuyer } = f;
      const id = await openAndFund();
      await expect(
        atomicHandover(id, [{ to: attacker.address, value: 1n, data: "0x" }, swapToBuyer()])
      ).to.be.revertedWith("GS013");
    });

    it("Rút 1 wei token ERC-20 => revert", async function () {
      const { token, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(atomicHandover(id, [call(token, "transfer", [attacker.address, 1]), swapToBuyer()])).to.be.revertedWith("GS013");
    });

    it("Chuyển NFT ERC-721 đi => revert", async function () {
      const { nft, safe, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(
        atomicHandover(id, [call(nft, "transferFrom", [safe.target, attacker.address, 7]), swapToBuyer()])
      ).to.be.revertedWith("GS013");
    });

    it("Chuyển quyền Ownable của hợp đồng đi => revert", async function () {
      const { ownable, attacker, openAndFund, atomicHandover, swapToBuyer, call } = f;
      const id = await openAndFund();
      await expect(atomicHandover(id, [call(ownable, "transferOwnership", [attacker.address]), swapToBuyer()])).to.be.revertedWith("GS013");
    });

    it("Tài sản bị rút TRƯỚC (giao dịch riêng) => trợ lý báo đúng tài sản thiếu, người mua được hủy và hoàn tiền", async function () {
      const { safe, seller, buyer, token, attacker, escrow, openAndFund } = f;
      const id = await openAndFund();
      await execSafe(safe, seller, token.target, token.interface.encodeFunctionData("transfer", [attacker.address, 1]));

      const [, assetMask] = await escrow.getHandoverStatus(id);
      expect(assetMask).to.equal(1n << 1n); // tài sản thứ 2 (ERC-20)

      await expect(escrow.connect(buyer).cancelByBuyer(id)).to.emit(escrow, "TradeCancelled").withArgs(id, 2, true);
      await expect(escrow.connect(buyer).withdraw()).to.changeEtherBalance(buyer, PRICE);
    });
  });

  describe("T7 — Thay singleton (đổi 'bộ não' của ví để làm giả mọi hàm view)", function () {
    it("Singleton giả trả lời 'đã sạch' cho mọi câu hỏi nhưng verifier vẫn phát hiện", async function () {
      const { safe, seller, buyer, verifier, proxyAddress } = f;
      const switcher = await (await ethers.getContractFactory("SingletonSwitcher")).deploy();
      const fake = await (await ethers.getContractFactory("FakeSafeSingleton")).deploy(buyer.address);

      await execSafe(safe, seller, switcher.target, switcher.interface.encodeFunctionData("switchTo", [fake.target]), { operation: 1 });

      // Singleton giả "khai" buyer là owner duy nhất...
      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      // ...nhưng masterCopy() do proxy tự trả lời nên không thể làm giả.
      expect(await verifier.isSupportedWallet(proxyAddress)).to.equal(false);
      expect(await verifier.checkHandover(proxyAddress, [buyer.address], 1, ethers.ZeroAddress)).to.equal(BIT.NOT_OFFICIAL_SAFE);
    });

    it("Không cho niêm yết ví không phải Safe chính thức", async function () {
      const { escrow, seller, baseParams } = f;
      await expect(escrow.connect(seller).createTrade(await baseParams({ wallet: seller.address })))
        .to.be.revertedWithCustomError(escrow, "UnsupportedWallet");
    });
  });

  describe("T8 — Phá vỡ tính nguyên tử", function () {
    it("Gọi completeHandover mà không có beginHandover trong cùng giao dịch => NotAtomic", async function () {
      const { safe, seller, escrow, openAndFund, swapToBuyer, complete, multiSend } = f;
      const id = await openAndFund();
      const data = multiSend.interface.encodeFunctionData("multiSend", [encodeMultiSend([swapToBuyer(), complete(id)])]);
      await expect(execSafe(safe, seller, multiSend.target, data, { operation: 1 })).to.be.revertedWith("GS013");
      // Gọi trực tiếp từ ví để thấy đúng lỗi
      await expect(escrow.connect(seller).completeHandover(id)).to.be.revertedWithCustomError(escrow, "NotWallet");
    });

    it("beginHandover trong một giao dịch, completeHandover ở giao dịch sau => NotAtomic (cờ transient đã mất)", async function () {
      const { safe, seller, escrow, openAndFund, begin, complete, swapToBuyer, multiSend, buyer } = f;
      const id = await openAndFund();
      await execSafe(safe, seller, escrow.target, begin(id).data);
      await execSafe(safe, seller, safe.target, swapToBuyer().data);
      const data = complete(id).data;
      // Ví giờ thuộc người mua; người mua có gọi completeHandover cũng không trả tiền cho người bán được
      await expect(execSafe(safe, buyer, escrow.target, data)).to.be.revertedWith("GS013");
      expect((await escrow.trades(id)).status).to.equal(Status.FUNDED);
    });

    it("Tài khoản ngoài không thể tự gọi begin/complete thay ví", async function () {
      const { escrow, stranger, openAndFund } = f;
      const id = await openAndFund();
      await expect(escrow.connect(stranger).beginHandover(id)).to.be.revertedWithCustomError(escrow, "NotWallet");
      await expect(escrow.connect(stranger).completeHandover(id)).to.be.revertedWithCustomError(escrow, "NotWallet");
    });

    it("Không thể hoàn tất hai lần", async function () {
      const { escrow, safe, buyer, openAndFund, atomicHandover, swapToBuyer, begin, complete, multiSend } = f;
      const id = await openAndFund();
      await atomicHandover(id, [swapToBuyer()]);
      const data = multiSend.interface.encodeFunctionData("multiSend", [encodeMultiSend([begin(id), complete(id)])]);
      await expect(execSafe(safe, buyer, multiSend.target, data, { operation: 1 })).to.be.revertedWith("GS013");
      expect(await escrow.pendingWithdrawals(f.seller.address)).to.equal(PRICE);
    });
  });

  describe("T9 — Đổi điều kiện phút chót (front-running niêm yết)", function () {
    it("Người bán hủy và niêm yết lại với ít tài sản hơn => khoản nạp theo termsHash cũ bị từ chối", async function () {
      const { escrow, seller, buyer, baseParams } = f;
      await escrow.connect(seller).createTrade(await baseParams());
      const { termsHash: seenHash } = await escrow.trades(1);

      await escrow.connect(seller).cancelBySeller(1);
      await escrow.connect(seller).createTrade(await baseParams({ assets: [] }));

      await expect(escrow.connect(buyer).deposit(2, seenHash, { value: PRICE }))
        .to.be.revertedWithCustomError(escrow, "TermsMismatch");
    });

    it("Không thể niêm yết tài sản mà ví không nắm giữ", async function () {
      const { escrow, seller, baseParams, token } = f;
      const params = await baseParams({
        assets: [{ checkerId: CHECKER.ERC20, token: token.target, value: ethers.parseEther("1001") }],
      });
      await expect(escrow.connect(seller).createTrade(params)).to.be.revertedWithCustomError(escrow, "AssetNotHeld").withArgs(0);
    });
  });

  describe("T10 — Người bán ôm tiền / kéo dài thời gian", function () {
    it("Hết hạn mà chưa bàn giao => bất kỳ ai cũng hủy được, người mua rút lại tiền", async function () {
      const { escrow, buyer, stranger, openAndFund } = f;
      const id = await openAndFund();
      await expect(escrow.connect(stranger).cancelExpired(id)).to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
      await increaseTime(3601);
      await escrow.connect(stranger).cancelExpired(id);
      await expect(escrow.connect(buyer).withdraw()).to.changeEtherBalance(buyer, PRICE);
    });

    it("Ví có giao dịch bất thường sau khi nạp tiền => người mua hủy ngay, không cần chờ hết hạn", async function () {
      const { escrow, safe, seller, buyer, attacker, openAndFund } = f;
      const id = await openAndFund();
      await expect(escrow.connect(buyer).cancelByBuyer(id)).to.be.revertedWithCustomError(escrow, "NoSuspiciousActivity");
      await execSafe(safe, seller, safe.target, safe.interface.encodeFunctionData("enableModule", [attacker.address]));
      await escrow.connect(buyer).cancelByBuyer(id);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
    });

    it("Người bán hủy sau khi người mua đã nạp => tiền về người mua", async function () {
      const { escrow, seller, buyer, openAndFund } = f;
      const id = await openAndFund();
      await escrow.connect(seller).cancelBySeller(id);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
      expect(await escrow.pendingWithdrawals(seller.address)).to.equal(0n);
    });
  });

  describe("Kiểm tra quyền & tham số", function () {
    it("Chỉ owner hiện tại của Safe mới được niêm yết", async function () {
      const { escrow, stranger, baseParams } = f;
      await expect(escrow.connect(stranger).createTrade(await baseParams())).to.be.revertedWithCustomError(escrow, "NotController");
    });

    it("Một ví chỉ có một giao dịch đang mở", async function () {
      const { escrow, seller, baseParams } = f;
      await escrow.connect(seller).createTrade(await baseParams());
      await expect(escrow.connect(seller).createTrade(await baseParams())).to.be.revertedWithCustomError(escrow, "WalletBusy");
    });

    it("Từ chối tập owner mới trùng lặp / chứa người bán / ngưỡng không hợp lệ", async function () {
      const { escrow, seller, buyer, baseParams } = f;
      for (const o of [
        { newOwners: [buyer.address, buyer.address], threshold: 1 },
        { newOwners: [seller.address], threshold: 1 },
        { newOwners: [buyer.address], threshold: 2 },
        { newOwners: [buyer.address], threshold: 0 },
      ]) {
        await expect(escrow.connect(seller).createTrade(await baseParams(o))).to.be.revertedWithCustomError(escrow, "InvalidParams");
      }
    });

    it("Chỉ người mua được nạp, đúng số tiền", async function () {
      const { escrow, seller, buyer, stranger, baseParams } = f;
      await escrow.connect(seller).createTrade(await baseParams());
      const { termsHash } = await escrow.trades(1);
      await expect(escrow.connect(stranger).deposit(1, termsHash, { value: PRICE })).to.be.revertedWithCustomError(escrow, "NotBuyer");
      await expect(escrow.connect(buyer).deposit(1, termsHash, { value: ONE_ETH })).to.be.revertedWithCustomError(escrow, "WrongAmount");
    });

    it("Không nhận ETH gửi thẳng vào escrow", async function () {
      const { deployer, escrowAddr } = f;
      await expect(deployer.sendTransaction({ to: escrowAddr, value: 1n })).to.be.reverted;
    });

    it("Verifier không bị lừa bởi danh sách owner trùng lặp", async function () {
      const { verifier, safe, seller, buyer, openAndFund, atomicHandover, call, swapToBuyer, proxyAddress } = f;
      // Safe có owners [buyer, seller]; danh sách kỳ vọng [buyer, buyer] cùng độ dài
      await execSafe(safe, seller, safe.target, safe.interface.encodeFunctionData("addOwnerWithThreshold", [buyer.address, 1]));
      const mask = await verifier.checkHandover(proxyAddress, [buyer.address, buyer.address], 1, ethers.ZeroAddress);
      expect(mask & BIT.OWNERS_MISMATCH).to.equal(BIT.OWNERS_MISMATCH);
    });
  });
});
