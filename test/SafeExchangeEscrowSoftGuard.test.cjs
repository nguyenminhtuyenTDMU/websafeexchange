const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SafeExchangeEscrowSoftGuard", function () {
  async function deployFixture() {
    const [deployer, seller, buyer, other] = await ethers.getSigners();

    const GuardFactory = await ethers.getContractFactory("SafeExchangeEscrowSoftGuard");
    const guard = await GuardFactory.deploy();
    await guard.waitForDeployment();

    const guardAddress = await guard.getAddress();

    const MockSafeFactory = await ethers.getContractFactory("MockSafe");
    const mockSafe = await MockSafeFactory.deploy(guardAddress, [seller.address]);
    await mockSafe.waitForDeployment();

    const safeAddress = await mockSafe.getAddress();

    const ONE_ETH = ethers.parseEther("1");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    return {
      guard,
      guardAddress,
      mockSafe,
      safeAddress,
      deployer,
      seller,
      buyer,
      other,
      ONE_ETH,
      deadline,
    };
  }

  describe("Deployment", function () {
    it("Nên deploy thành công", async function () {
      const { guard, guardAddress } = await loadFixture(deployFixture);
      expect(guardAddress).to.be.properAddress;
    });
  });

  describe("getTradeId", function () {
    it("Nên tạo trade ID duy nhất từ buyer, seller, safe", async function () {
      const { guard, buyer, seller, safeAddress } = await loadFixture(deployFixture);

      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      expect(tradeId).to.be.a("string");
      expect(tradeId).to.have.lengthOf(66);
      expect(tradeId.startsWith("0x")).to.be.true;
    });

    it("Nên tạo trade ID khác nhau cho các tham số khác nhau", async function () {
      const { guard, buyer, seller, other, safeAddress } = await loadFixture(deployFixture);

      const tradeId1 = await guard.getTradeId(buyer.address, seller.address, safeAddress);
      const tradeId2 = await guard.getTradeId(other.address, seller.address, safeAddress);

      expect(tradeId1).to.not.equal(tradeId2);
    });
  });

  describe("armTrade", function () {
    it("Nên tạo trade mới khi seller là owner của Safe", async function () {
      const { guard, mockSafe, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await expect(guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline))
        .to.emit(guard, "TradeArmed");

      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);
      const trade = await guard.trades(tradeId);

      expect(trade.buyer).to.equal(buyer.address);
      expect(trade.seller).to.equal(seller.address);
      expect(trade.safeAddress).to.equal(safeAddress);
      expect(trade.amount).to.equal(ONE_ETH);
      expect(trade.status).to.equal(1);
    });

    it("Nên từ chối khi không phải owner của Safe", async function () {
      const { guard, safeAddress, buyer, other, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await expect(guard.connect(other).armTrade(safeAddress, buyer.address, ONE_ETH, deadline))
        .to.be.revertedWithCustomError(guard, "NotSeller");
    });

    it("Nên từ chối khi deadline đã qua", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH } = await loadFixture(deployFixture);

      const pastDeadline = Math.floor(Date.now() / 1000) - 3600;

      await expect(guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, pastDeadline))
        .to.be.revertedWithCustomError(guard, "DeadlinePassed");
    });

    it("Nên từ chối khi safe đã có trade đang hoạt động", async function () {
      const { guard, safeAddress, seller, buyer, other, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);

      await expect(guard.connect(seller).armTrade(safeAddress, other.address, ONE_ETH, deadline))
        .to.be.revertedWithCustomError(guard, "InvalidState");
    });

    it("Nên từ chối khi tham số không hợp lệ", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await expect(guard.connect(seller).armTrade(ethers.ZeroAddress, buyer.address, ONE_ETH, deadline))
        .to.be.revertedWithCustomError(guard, "Invalid");

      await expect(guard.connect(seller).armTrade(safeAddress, ethers.ZeroAddress, ONE_ETH, deadline))
        .to.be.revertedWithCustomError(guard, "Invalid");

      await expect(guard.connect(seller).armTrade(safeAddress, buyer.address, 0, deadline))
        .to.be.revertedWithCustomError(guard, "Invalid");
    });
  });

  describe("deposit", function () {
    it("Nên cho phép buyer gửi tiền đúng số lượng", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await expect(guard.connect(buyer).deposit(tradeId, { value: ONE_ETH }))
        .to.emit(guard, "TradeFunded")
        .withArgs(tradeId, buyer.address, ONE_ETH);

      const trade = await guard.trades(tradeId);
      expect(trade.status).to.equal(2);
      expect(trade.fundsHeld).to.be.true;
    });

    it("Nên từ chối khi không phải buyer", async function () {
      const { guard, safeAddress, seller, buyer, other, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await expect(guard.connect(other).deposit(tradeId, { value: ONE_ETH }))
        .to.be.revertedWithCustomError(guard, "NotBuyer");
    });

    it("Nên từ chối khi số tiền không đúng", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      const wrongAmount = ethers.parseEther("0.5");
      await expect(guard.connect(buyer).deposit(tradeId, { value: wrongAmount }))
        .to.be.revertedWithCustomError(guard, "Invalid");
    });

    it("Nên từ chối khi trade không ở trạng thái ARMED", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await guard.connect(buyer).deposit(tradeId, { value: ONE_ETH });

      await expect(guard.connect(buyer).deposit(tradeId, { value: ONE_ETH }))
        .to.be.revertedWithCustomError(guard, "InvalidState");
    });

    it("Nên từ chối khi deadline đã qua", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await time.increase(7200);

      await expect(guard.connect(buyer).deposit(tradeId, { value: ONE_ETH }))
        .to.be.revertedWithCustomError(guard, "DeadlinePassed");
    });
  });

  describe("cancelTimeout", function () {
    it("Nên hủy trade và hoàn tiền khi timeout", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await guard.connect(buyer).deposit(tradeId, { value: ONE_ETH });

      await time.increase(7200);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await expect(guard.cancelTimeout(tradeId))
        .to.emit(guard, "TradeCancelled")
        .withArgs(tradeId, buyer.address, seller.address, "TIMEOUT");

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter).to.be.gt(buyerBalanceBefore);

      const trade = await guard.trades(tradeId);
      expect(trade.status).to.equal(4);
      expect(trade.fundsHeld).to.be.false;
    });

    it("Nên từ chối khi deadline chưa qua", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await expect(guard.cancelTimeout(tradeId))
        .to.be.revertedWithCustomError(guard, "InvalidState");
    });
  });

  describe("withdrawRefund", function () {
    it("Nên từ chối khi trade không bị hủy", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      await expect(guard.withdrawRefund(tradeId))
        .to.be.revertedWithCustomError(guard, "InvalidState");
    });
  });

  describe("Mapping queries", function () {
    it("Nên trả về trade ID đang hoạt động cho Safe", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const expectedTradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      const activeTradeId = await guard.activeTradeBySafe(safeAddress);
      expect(activeTradeId).to.equal(expectedTradeId);
    });

    it("Nên lưu trade vào danh sách của buyer và seller", async function () {
      const { guard, safeAddress, seller, buyer, ONE_ETH, deadline } = await loadFixture(deployFixture);

      await guard.connect(seller).armTrade(safeAddress, buyer.address, ONE_ETH, deadline);
      const tradeId = await guard.getTradeId(buyer.address, seller.address, safeAddress);

      const buyerTrades = await guard.buyerTrades(buyer.address, 0);
      const sellerTrades = await guard.sellerTrades(seller.address, 0);

      expect(buyerTrades).to.equal(tradeId);
      expect(sellerTrades).to.equal(tradeId);
    });
  });

  describe("Receive ETH", function () {
    it("Nên nhận ETH trực tiếp", async function () {
      const { guard, guardAddress, deployer, ONE_ETH } = await loadFixture(deployFixture);

      await expect(deployer.sendTransaction({
        to: guardAddress,
        value: ONE_ETH,
      })).to.not.be.reverted;

      const balance = await ethers.provider.getBalance(guardAddress);
      expect(balance).to.equal(ONE_ETH);
    });
  });
});
