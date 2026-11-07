/**
 * Fuzz test bất biến cho toàn bộ vòng đời một giao dịch CleanHandover, chạy trên Safe v1.4.1 CHÍNH THỨC.
 *
 * Mỗi lượt, fast-check sinh ngẫu nhiên một kịch bản gồm 4 pha:
 *  A. Chuẩn bị (người bán, trước khi người mua nạp tiền): bật/không bật escrow làm module, cùng 0..4 hành vi
 *     ngẫu nhiên — có hại (cài module lạ, guard, fallback độc, owner phụ, rút ETH/ERC-20/NFT/Ownable, cấp allowance)
 *     hoặc vô hại / dọn dẹp (gỡ module lạ, gỡ guard, đặt fallback chuẩn).
 *  B. Người mua nạp tiền (có thể bị từ chối nếu ví chưa sẵn sàng).
 *  C. Sau khi nạp (người bán / kẻ tấn công): 0..2 hành vi, gồm cả hành vi có hại thực thi bằng giao dịch Safe,
 *     rút token qua allowance đã cấp ở pha A, và "finalize bọc": một MultiSend của người bán gọi
 *     finalizeHandover rồi chèn thêm lệnh có hại phía sau (lỗ hổng của thiết kế cũ).
 *  D. Người mua gọi finalizeHandover; nếu thất bại thì thử hủy để lấy lại tiền.
 *
 * Bất biến kiểm tra sau mỗi lượt (không cần đoán trước kết quả):
 *  (I1) COMPLETED  => ví sạch hoàn toàn: owners == [buyer], threshold == 1, không module (kể cả escrow), không guard,
 *                     fallback handler ∈ {0, handler đã thỏa thuận}, mọi tài sản niêm yết còn nguyên,
 *                     người bán được ghi có đúng giá.
 *  (I2) Chưa COMPLETED => người bán chưa được ghi có đồng nào và người bán vẫn là owner (ví chưa bị chuyển giao).
 *  (I3) Tiền của người mua không bao giờ bị kẹt: nếu đã nạp mà bàn giao thất bại thì người mua hủy được ngay.
 *  (I4) Tính đầy đủ: người bán trung thực (chuẩn bị đúng, không làm gì sau khi nạp) luôn hoàn tất được.
 *
 * Chạy: npx hardhat test test/CleanHandover.fuzz.test.cjs --config hardhat.config.cjs
 * Biến môi trường: FUZZ_RUNS (mặc định 300), FUZZ_SEED (tái lập), SAFE_VARIANT=L2.
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const fc = require("fast-check");
const {
  SENTINEL, ONE_ETH, PRICE, TOKEN_AMOUNT, NFT_ID, Status, deployFixture, call,
} = require("./helpers/fixture.cjs");

const NUM_RUNS = Number(process.env.FUZZ_RUNS || 300);
const SEED = process.env.FUZZ_SEED ? Number(process.env.FUZZ_SEED) : Date.now() % 2 ** 31;

const PREP_HARMFUL = [
  "enableModule", "setGuard", "setFallbackEvil", "addHiddenOwner",
  "drainEth", "drainToken", "drainNft", "drainOwnable", "approveAttacker",
];
const PREP_BENIGN = ["disableModule", "removeGuard", "setFallbackCompat", "setFallbackZero"];
const POST_HARMFUL = [
  "enableModule", "setGuard", "setFallbackEvil", "addHiddenOwner",
  "drainEth", "drainToken", "drainNft", "drainOwnable", "drainViaAllowance",
];
const POST_WRAPPED = ["wrappedFinalizeThenModule", "wrappedFinalizeThenDrain", "wrappedFinalizeThenOwner"];

const weighted = (pairs) => fc.oneof(...pairs.map(([arbitrary, weight]) => ({ arbitrary, weight })));

const scenarioArb = fc.record({
  enableEscrow: weighted([[fc.constant(true), 6], [fc.constant(false), 1]]),
  prep: fc.array(weighted([[fc.constantFrom(...PREP_BENIGN), 3], [fc.constantFrom(...PREP_HARMFUL), 2]]), { maxLength: 4 }),
  post: fc.array(weighted([[fc.constantFrom(...POST_HARMFUL), 1], [fc.constantFrom(...POST_WRAPPED), 1]]), { maxLength: 2 }),
  postEnabled: weighted([[fc.constant(false), 1], [fc.constant(true), 1]]),
}).map((s) => ({
  enableEscrow: s.enableEscrow,
  prep: s.prep,
  post: s.postEnabled ? s.post : [],
  honest: s.enableEscrow && s.prep.every((p) => PREP_BENIGN.includes(p)) && (!s.postEnabled || s.post.length === 0),
}));

describe("CleanHandover — fuzz bất biến toàn vòng đời giao dịch", function () {
  this.timeout(0);

  let f;
  let snapshot;
  const stats = {
    runs: 0, completed: 0, depositRejected: 0, finalizeRejected: 0, refunded: 0, honest: 0,
    wrappedTried: 0, wrappedCompleted: 0, harmfulPost: 0,
  };

  before(async function () {
    f = await deployFixture();
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  function actionTx(name) {
    const { safe, escrow, token, nft, ownable, attacker, guard, compatHandler, safeCall } = f;
    switch (name) {
      case "enableModule": return safeCall("enableModule", [attacker.address]);
      case "disableModule": return null; // tính động ở dưới (cần prevModule)
      case "setGuard": return safeCall("setGuard", [guard.target]);
      case "removeGuard": return safeCall("setGuard", [ethers.ZeroAddress]);
      case "setFallbackEvil": return safeCall("setFallbackHandler", [attacker.address]);
      case "setFallbackCompat": return safeCall("setFallbackHandler", [compatHandler.target]);
      case "setFallbackZero": return safeCall("setFallbackHandler", [ethers.ZeroAddress]);
      case "addHiddenOwner": return safeCall("addOwnerWithThreshold", [attacker.address, 1]);
      case "drainEth": return { to: attacker.address, value: 1n, data: "0x" };
      case "drainToken": return call(token, "transfer", [attacker.address, 1]);
      case "drainNft": return call(nft, "transferFrom", [safe.target, attacker.address, NFT_ID]);
      case "drainOwnable": return call(ownable, "transferOwnership", [attacker.address]);
      case "approveAttacker": return call(token, "approve", [attacker.address, ethers.MaxUint256]);
      default: throw new Error(name);
    }
  }

  /** Gỡ module `attacker` nếu đang bật (tính prevModule trong danh sách liên kết). */
  async function disableAttackerModuleTx() {
    const { safe, attacker, safeCall } = f;
    const [modules] = await safe.getModulesPaginated(SENTINEL, 10);
    const i = modules.indexOf(attacker.address);
    if (i < 0) return null;
    return safeCall("disableModule", [i === 0 ? SENTINEL : modules[i - 1], attacker.address]);
  }

  /** Thực thi một giao dịch Safe của người bán; giao dịch thất bại được bỏ qua (người bán chỉ là "thử"). */
  async function trySafe(tx) {
    if (!tx) return false;
    try {
      await (await f.execSafe(f.seller, tx)).wait();
      return true;
    } catch {
      return false;
    }
  }

  async function runPost(name, id) {
    const { escrow, token, safe, attacker } = f;
    if (name === "drainViaAllowance") {
      try { await (await token.connect(attacker).transferFrom(safe.target, attacker.address, 1)).wait(); } catch { /* chưa cấp allowance */ }
      return;
    }
    if (POST_WRAPPED.includes(name)) {
      stats.wrappedTried++;
      const tail = {
        wrappedFinalizeThenModule: actionTx("enableModule"),
        wrappedFinalizeThenDrain: actionTx("drainToken"),
        wrappedFinalizeThenOwner: actionTx("addHiddenOwner"),
      }[name];
      await trySafe([call(escrow, "finalizeHandover", [id]), tail]);
      if ((await escrow.trades(id)).status === Status.COMPLETED) stats.wrappedCompleted++;
      return;
    }
    stats.harmfulPost++;
    await trySafe(actionTx(name));
  }

  async function readState(id) {
    const { safe, escrow, seller, token, nft, ownable, proxyAddress } = f;
    const [modules] = await safe.getModulesPaginated(SENTINEL, 10);
    const slot = (s) => safe.getStorageAt(BigInt(ethers.id(s)), 1);
    const toAddr = (b) => ethers.getAddress("0x" + b.slice(-40));
    return {
      status: (await escrow.trades(id)).status,
      sellerCredit: await escrow.pendingWithdrawals(seller.address),
      owners: await safe.getOwners(),
      threshold: await safe.getThreshold(),
      modules,
      guard: toAddr(await slot("guard_manager.guard.address")),
      fallback: toAddr(await slot("fallback_manager.handler.address")),
      eth: await ethers.provider.getBalance(proxyAddress),
      tokenBal: await token.balanceOf(proxyAddress),
      nftOwner: await nft.ownerOf(NFT_ID),
      ownableOwner: await ownable.owner(),
    };
  }

  it(`Bất biến I1–I4 đúng với ${NUM_RUNS} kịch bản ngẫu nhiên`, async function () {
    const { escrow, seller, buyer, compatHandler, proxyAddress, enableEscrowModule, list, depositFor } = f;

    await fc.assert(
      fc.asyncProperty(scenarioArb, async (sc) => {
        await ethers.provider.send("evm_revert", [snapshot]);
        snapshot = await ethers.provider.send("evm_snapshot", []);
        stats.runs++;
        if (sc.honest) stats.honest++;

        // Pha A: niêm yết + chuẩn bị
        const id = await list();
        if (sc.enableEscrow) await enableEscrowModule();
        for (const p of sc.prep) {
          await trySafe(p === "disableModule" ? await disableAttackerModuleTx() : actionTx(p));
        }

        // Pha B: nạp tiền
        let funded = true;
        try { await (await depositFor(id)).wait(); } catch { funded = false; stats.depositRejected++; }

        if (funded) {
          // Pha C: hành vi sau khi nạp
          for (const p of sc.post) {
            if ((await escrow.trades(id)).status !== Status.FUNDED) break;
            await runPost(p, id);
          }
          // Pha D: người mua hoàn tất, thất bại thì hủy
          if ((await escrow.trades(id)).status === Status.FUNDED) {
            try {
              await (await escrow.connect(buyer).finalizeHandover(id)).wait();
            } catch {
              stats.finalizeRejected++;
              // I3: không bao giờ kẹt tiền
              await (await escrow.connect(buyer).cancelByBuyer(id)).wait();
              expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(PRICE);
              stats.refunded++;
            }
          }
        }

        const st = await readState(id);
        if (st.status === Status.COMPLETED) {
          stats.completed++;
          // I1
          expect(st.sellerCredit).to.equal(PRICE);
          expect(st.owners).to.deep.equal([buyer.address]);
          expect(st.threshold).to.equal(1n);
          expect(st.modules).to.deep.equal([]);
          expect(st.guard).to.equal(ethers.ZeroAddress);
          expect([ethers.ZeroAddress, compatHandler.target]).to.include(st.fallback);
          expect(st.eth >= ONE_ETH).to.equal(true);
          expect(st.tokenBal >= TOKEN_AMOUNT).to.equal(true);
          expect(st.nftOwner).to.equal(proxyAddress);
          expect(st.ownableOwner).to.equal(proxyAddress);
        } else {
          // I2
          expect(st.sellerCredit).to.equal(0n);
          expect(st.owners).to.include(seller.address);
          expect(st.owners).to.not.include(buyer.address);
        }
        // I4
        if (sc.honest) expect(st.status, `người bán trung thực bị từ chối: ${JSON.stringify(sc)}`).to.equal(Status.COMPLETED);
      }),
      { numRuns: NUM_RUNS, seed: SEED, verbose: 1 }
    );

    console.log(
      `      seed=${SEED} | ${stats.runs} kịch bản: ${stats.completed} hoàn tất (đều sạch), ` +
      `${stats.depositRejected} bị từ chối lúc nạp, ${stats.finalizeRejected} bị từ chối lúc bàn giao ` +
      `(${stats.refunded} đã hoàn tiền); ${stats.honest} kịch bản trung thực đều hoàn tất`
    );
    console.log(
      `      finalize bọc trong giao dịch của người bán: thử ${stats.wrappedTried} lần, thành công ${stats.wrappedCompleted} lần; ` +
      `hành vi có hại sau khi nạp: ${stats.harmfulPost} lần`
    );
    // Bộ sinh phải tạo đủ mọi loại kết quả, nếu không phép thử là vô nghĩa
    expect(stats.completed).to.be.greaterThan(0);
    expect(stats.depositRejected).to.be.greaterThan(0);
    expect(stats.finalizeRejected).to.be.greaterThan(0);
    expect(stats.wrappedTried).to.be.greaterThan(0);
    expect(stats.wrappedCompleted).to.equal(0);
  });
});
