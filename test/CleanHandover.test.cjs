/**
 * Bộ kiểm thử CleanHandover chạy trên bộ hợp đồng Safe v1.4.1 CHÍNH THỨC.
 * Mỗi `describe("T..")` tương ứng một kịch bản trong threat model (docs/THREAT_MODEL.md).
 *
 * Chạy:  npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs
 * SafeL2: SAFE_VARIANT=L2 npx hardhat test ...
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  SENTINEL, ONE_ETH, PRICE, NFT_ID, BIT, CHECKER, Status, deployFixture, loadFixture, increaseTime, call,
} = require("./helpers/fixture.cjs");

describe("CleanHandover — escrow bàn giao ví Safe", function () {
  let f;
  beforeEach(async function () {
    f = await loadFixture(deployFixture);
  });

  // ════════════════════════════════════════════════════════════════════════
  describe("Luồng chuẩn", function () {
    it("Chuẩn bị → niêm yết → nạp tiền → người mua hoàn tất: nhận ví sạch + tài sản, người bán nhận tiền", async function () {
      const { escrow, safe, seller, buyer, openAndFund } = f;
      const id = await openAndFund();

      await expect(escrow.connect(buyer).finalizeHandover(id))
        .to.emit(escrow, "TradeCompleted").withArgs(id, seller.address, buyer.address, PRICE);

      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      expect(await safe.getThreshold()).to.equal(1n);
      expect(await safe.isModuleEnabled(escrow.target)).to.equal(false);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
      expect(await escrow.getHandoverStatus(id)).to.deep.equal([0n, 0n]);
      await expect(escrow.connect(seller).withdraw()).to.changeEtherBalance(seller, PRICE);
    });

    it("Bàn giao cho nhiều owner mới với ngưỡng 2/2", async function () {
      const { escrow, safe, buyer, buyer2, openAndFund } = f;
      const id = await openAndFund({ newOwners: [buyer.address, buyer2.address], threshold: 2 });
      await escrow.connect(buyer).finalizeHandover(id);
      expect(new Set(await safe.getOwners())).to.deep.equal(new Set([buyer.address, buyer2.address]));
      expect(await safe.getThreshold()).to.equal(2n);
    });

    it("Bất kỳ ai cũng gọi được finalizeHandover (kết quả luôn như nhau)", async function () {
      const { escrow, safe, buyer, stranger, openAndFund } = f;
      const id = await openAndFund();
      await escrow.connect(stranger).finalizeHandover(id);
      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
    });

    it("Fallback handler bằng 0 cũng được chấp nhận", async function () {
      const { escrow, buyer, seller, execSafe, safeCall, openAndFund } = f;
      await execSafe(seller, safeCall("setFallbackHandler", [ethers.ZeroAddress]));
      const id = await openAndFund();
      await escrow.connect(buyer).finalizeHandover(id);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });

    it("Trợ lý đọc getReadiness để hướng dẫn người bán từng bước", async function () {
      const { escrow, seller, list, enableEscrowModule } = f;
      const id = await list();
      const [before] = await escrow.getReadiness(id);
      expect(before).to.equal(BIT.EXECUTOR_NOT_ENABLED);
      await enableEscrowModule();
      expect(await escrow.getReadiness(id)).to.deep.equal([0n, 0n]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  describe("T1 — Giữ chủ sở hữu ẩn", function () {
    it("Người bán cài thêm owner phụ của mình: escrow xóa MỌI owner cũ, chỉ còn người mua", async function () {
      const { escrow, safe, seller, buyer, attacker, stranger, execSafe, safeCall, openAndFund } = f;
      await execSafe(seller, safeCall("addOwnerWithThreshold", [attacker.address, 1]));
      await execSafe(seller, safeCall("addOwnerWithThreshold", [stranger.address, 1]));
      const id = await openAndFund();
      await escrow.connect(buyer).finalizeHandover(id);
      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      expect(await safe.getThreshold()).to.equal(1n);
    });

    it("Người mua đã là owner từ trước (người bán thêm vào) => bàn giao thất bại an toàn, người mua lấy lại tiền", async function () {
      const { escrow, safe, seller, buyer, execSafe, safeCall, enableEscrowModule, list, depositFor } = f;
      await execSafe(seller, safeCall("addOwnerWithThreshold", [buyer.address, 1]));
      await enableEscrowModule();
      const id = await list();
      await depositFor(id);
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.revertedWithCustomError(escrow, "HandoverCallFailed");
      expect(await safe.isOwner(seller.address)).to.equal(true);
      await increaseTime(3601);
      await escrow.cancelExpired(id);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
    });
  });

  describe("T2 — Sai ngưỡng ký", function () {
    it("Ngưỡng ký cũ của người bán không ảnh hưởng: escrow đặt đúng ngưỡng đã thỏa thuận", async function () {
      const { escrow, safe, seller, buyer, buyer2, attacker, execSafe, safeCall, openAndFund } = f;
      await execSafe(seller, safeCall("addOwnerWithThreshold", [attacker.address, 1]));
      const id = await openAndFund({ newOwners: [buyer.address, buyer2.address], threshold: 2 });
      await escrow.connect(buyer).finalizeHandover(id);
      expect(await safe.getThreshold()).to.equal(2n);
    });
  });

  describe("T3 — Cài cắm module", function () {
    it("Còn module khác ngoài escrow => không nhận tiền (MODULES_ENABLED)", async function () {
      const { escrow, seller, attacker, execSafe, safeCall, enableEscrowModule, list, depositFor } = f;
      await execSafe(seller, safeCall("enableModule", [attacker.address]));
      await enableEscrowModule();
      const id = await list();
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(BIT.MODULES_ENABLED, 0);
    });

    it("Chưa bật escrow làm module => không nhận tiền (EXECUTOR_NOT_ENABLED)", async function () {
      const { escrow, list, depositFor } = f;
      const id = await list();
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(BIT.EXECUTOR_NOT_ENABLED, 0);
    });

    it("Người bán gỡ module lạ rồi mới để người mua nạp => thành công", async function () {
      const { escrow, seller, buyer, attacker, execSafe, safeCall, openAndFund } = f;
      await execSafe(seller, safeCall("enableModule", [attacker.address]));
      await execSafe(seller, safeCall("disableModule", [SENTINEL, attacker.address]));
      const id = await openAndFund();
      await escrow.connect(buyer).finalizeHandover(id);
      expect((await escrow.trades(id)).status).to.equal(Status.COMPLETED);
    });
  });

  describe("T4 — Cài cắm guard", function () {
    it("Còn guard => không nhận tiền (GUARD_SET đọc từ storage slot)", async function () {
      const { escrow, seller, guard, execSafe, safeCall, enableEscrowModule, list, depositFor } = f;
      await execSafe(seller, safeCall("setGuard", [guard.target]));
      await enableEscrowModule();
      const id = await list();
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(BIT.GUARD_SET, 0);
    });
  });

  describe("T5 — Fallback handler độc", function () {
    it("Fallback handler lạ => không nhận tiền", async function () {
      const { escrow, seller, attacker, execSafe, safeCall, enableEscrowModule, list, depositFor } = f;
      await execSafe(seller, safeCall("setFallbackHandler", [attacker.address]));
      await enableEscrowModule();
      const id = await list();
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(BIT.FALLBACK_HANDLER, 0);
    });
  });

  describe("T4b — Module guard (chỉ có từ Safe 1.5.0)", function () {
    before(function () {
      if (process.env.SAFE_VERSION !== "1.5.0") this.skip();
    });

    it("Còn module guard => không nhận tiền (MODULE_GUARD_SET); gỡ đi thì bàn giao bình thường", async function () {
      const { escrow, seller, buyer, safe, execSafe, safeCall, enableEscrowModule, list, depositFor } = f;
      const moduleGuard = await (await ethers.getContractFactory("MockModuleGuard")).deploy();
      await execSafe(seller, safeCall("setModuleGuard", [moduleGuard.target]));
      await enableEscrowModule();
      const id = await list();
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(BIT.MODULE_GUARD_SET, 0);

      await execSafe(seller, safeCall("setModuleGuard", [ethers.ZeroAddress]));
      await depositFor(id);
      await escrow.connect(buyer).finalizeHandover(id);
      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
    });
  });

  describe("T6 — Rút tài sản", function () {
    it("Rút trước khi người mua nạp => không nhận tiền, chỉ đúng tài sản bị thiếu", async function () {
      const { escrow, seller, token, attacker, execSafe, enableEscrowModule, list, depositFor } = f;
      await enableEscrowModule();
      const id = await list();
      await execSafe(seller, call(token, "transfer", [attacker.address, 1]));
      await expect(depositFor(id)).to.be.revertedWithCustomError(escrow, "WalletNotReady").withArgs(0, 1n << 1n);
    });

    it("Rút sau khi người mua nạp (giao dịch Safe) => không hoàn tất được, người mua hủy ngay", async function () {
      const { escrow, seller, buyer, nft, safe, attacker, execSafe, openAndFund } = f;
      const id = await openAndFund();
      await execSafe(seller, call(nft, "transferFrom", [safe.target, attacker.address, NFT_ID]));
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.revertedWithCustomError(escrow, "WalletChangedSinceFunding");
      await escrow.connect(buyer).cancelByBuyer(id);
      await expect(escrow.connect(buyer).withdraw()).to.changeEtherBalance(buyer, PRICE);
    });

    it("Rút qua allowance cũ (không cần giao dịch Safe) => bị phát hiện, người mua hủy ngay", async function () {
      const { escrow, seller, buyer, token, safe, attacker, execSafe, openAndFund } = f;
      await execSafe(seller, call(token, "approve", [attacker.address, 1]));
      const id = await openAndFund();
      await token.connect(attacker).transferFrom(safe.target, attacker.address, 1);
      await expect(escrow.connect(buyer).finalizeHandover(id))
        .to.be.revertedWithCustomError(escrow, "HandoverNotClean").withArgs(0, 1n << 1n);
      await escrow.connect(buyer).cancelByBuyer(id);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
    });

    it("Chuyển quyền Ownable đi sau khi nạp => không hoàn tất được", async function () {
      const { escrow, seller, buyer, ownable, attacker, execSafe, openAndFund } = f;
      const id = await openAndFund();
      await execSafe(seller, call(ownable, "transferOwnership", [attacker.address]));
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.reverted;
    });
  });

  describe("T7 — Thay singleton (làm giả mọi hàm view)", function () {
    it("Singleton giả trả lời 'đã sạch' nhưng verifier vẫn phát hiện", async function () {
      const { safe, seller, buyer, verifier, proxyAddress, execSafe } = f;
      const switcher = await (await ethers.getContractFactory("SingletonSwitcher")).deploy();
      const fake = await (await ethers.getContractFactory("FakeSafeSingleton")).deploy(buyer.address);
      await execSafe(seller, call(switcher, "switchTo", [fake.target]), { operation: 1 });

      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      expect(await verifier.isSupportedWallet(proxyAddress)).to.equal(false);
      expect(await verifier.checkHandover(proxyAddress, [buyer.address], 1, ethers.ZeroAddress)).to.equal(BIT.NOT_OFFICIAL_SAFE);
      expect(await verifier.checkReadiness(proxyAddress, buyer.address, ethers.ZeroAddress)).to.equal(BIT.NOT_OFFICIAL_SAFE);
    });

    it("Không cho niêm yết ví không phải Safe chính thức", async function () {
      const { escrow, seller, baseParams } = f;
      await expect(escrow.connect(seller).createTrade(await baseParams({ wallet: seller.address })))
        .to.be.revertedWithCustomError(escrow, "UnsupportedWallet");
    });
  });

  describe("T8 — Gọi finalize từ bên trong giao dịch của ví (lỗ hổng fuzz test tìm ra ở thiết kế cũ)", function () {
    it("MultiSend [finalize, enableModule(attacker)] của người bán => revert, không có gì thay đổi", async function () {
      const { escrow, safe, seller, attacker, execSafe, safeCall, openAndFund } = f;
      const id = await openAndFund();
      await expect(
        execSafe(seller, [call(escrow, "finalizeHandover", [id]), safeCall("enableModule", [attacker.address])])
      ).to.be.reverted; // 1.4.1: "GS013", 1.5.0: custom error
      expect((await escrow.trades(id)).status).to.equal(Status.FUNDED);
      expect(await safe.isModuleEnabled(attacker.address)).to.equal(false);
      expect(await safe.getOwners()).to.deep.equal([seller.address]);
    });

    it("...và sau đó người mua vẫn hoàn tất bình thường (giao dịch revert không làm đổi nonce)", async function () {
      const { escrow, safe, seller, buyer, attacker, execSafe, safeCall, openAndFund } = f;
      const id = await openAndFund();
      await expect(
        execSafe(seller, [call(escrow, "finalizeHandover", [id]), safeCall("enableModule", [attacker.address])])
      ).to.be.reverted;
      await escrow.connect(buyer).finalizeHandover(id);
      expect(await safe.getOwners()).to.deep.equal([buyer.address]);
      expect(await safe.getModulesPaginated(SENTINEL, 10)).to.deep.equal([[], SENTINEL]);
    });

    it("Bất kỳ giao dịch Safe nào sau khi nạp tiền đều khóa finalize và mở quyền hủy cho người mua", async function () {
      const { escrow, seller, buyer, execSafe, safeCall, openAndFund } = f;
      const id = await openAndFund();
      await expect(escrow.connect(buyer).cancelByBuyer(id)).to.be.revertedWithCustomError(escrow, "NoSuspiciousActivity");
      await execSafe(seller, safeCall("setFallbackHandler", [ethers.ZeroAddress]));
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.revertedWithCustomError(escrow, "WalletChangedSinceFunding");
      await escrow.connect(buyer).cancelByBuyer(id);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
    });

    it("Không thể hoàn tất hai lần, không thể hoàn tất khi chưa nạp tiền", async function () {
      const { escrow, buyer, enableEscrowModule, list, depositFor } = f;
      await enableEscrowModule();
      const id = await list();
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
      await depositFor(id);
      await escrow.connect(buyer).finalizeHandover(id);
      await expect(escrow.connect(buyer).finalizeHandover(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
    });
  });

  describe("T9 — Đổi điều kiện phút chót", function () {
    it("Người bán hủy và niêm yết lại với ít tài sản hơn => khoản nạp theo termsHash cũ bị từ chối", async function () {
      const { escrow, seller, buyer, enableEscrowModule, list } = f;
      await enableEscrowModule();
      const id1 = await list();
      const { termsHash: seenHash } = await escrow.trades(id1);
      await escrow.connect(seller).cancelBySeller(id1);
      const id2 = await list({ assets: [] });
      await expect(escrow.connect(buyer).deposit(id2, seenHash, { value: PRICE }))
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
    it("Hết hạn mà chưa bàn giao => ai cũng hủy được, người mua rút lại tiền", async function () {
      const { escrow, buyer, stranger, openAndFund } = f;
      const id = await openAndFund();
      await expect(escrow.connect(stranger).cancelExpired(id)).to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
      await increaseTime(3601);
      await escrow.connect(stranger).cancelExpired(id);
      await expect(escrow.connect(buyer).withdraw()).to.changeEtherBalance(buyer, PRICE);
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
      const { escrow, buyer, stranger, enableEscrowModule, list } = f;
      await enableEscrowModule();
      const id = await list();
      const { termsHash } = await escrow.trades(id);
      await expect(escrow.connect(stranger).deposit(id, termsHash, { value: PRICE })).to.be.revertedWithCustomError(escrow, "NotBuyer");
      await expect(escrow.connect(buyer).deposit(id, termsHash, { value: ONE_ETH })).to.be.revertedWithCustomError(escrow, "WrongAmount");
    });

    it("Không nhận ETH gửi thẳng vào escrow", async function () {
      const { deployer, escrow } = f;
      await expect(deployer.sendTransaction({ to: escrow.target, value: 1n })).to.be.reverted;
    });

    it("Verifier không bị lừa bởi danh sách owner trùng lặp", async function () {
      const { verifier, seller, buyer, execSafe, safeCall, proxyAddress } = f;
      await execSafe(seller, safeCall("addOwnerWithThreshold", [buyer.address, 1]));
      const mask = await verifier.checkHandover(proxyAddress, [buyer.address, buyer.address], 1, ethers.ZeroAddress);
      expect(mask & BIT.OWNERS_MISMATCH).to.equal(BIT.OWNERS_MISMATCH);
    });
  });
});
