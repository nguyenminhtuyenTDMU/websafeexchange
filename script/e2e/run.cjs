// Kiểm thử đầu-cuối qua giao diện: điều khiển Chrome đóng vai người bán và người mua trên node Hardhat local.
// Ví được giả lập bằng một EIP-1193 provider chuyển yêu cầu tới node (tài khoản thử nghiệm của Hardhat đã mở khóa sẵn),
// nên không cần MetaMask và không dùng private key thật nào. Ảnh chụp từng bước lưu ở script/e2e/out/.
//
// Thứ tự chạy (xem script/e2e/README.md):
//   1. npx hardhat node --config hardhat.config.cjs
//   2. SAFE_VERSION=1.5.0 SAFE_VARIANT=L2 npx hardhat run script/e2e/deploy-local.cjs --network localhost --config hardhat.config.cjs
//   3. npx vite --mode e2e --port 5175
//   4. node script/e2e/run.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { ethers } = require("ethers");

const APP = process.env.E2E_APP || "http://localhost:5175";
const RPC = "http://127.0.0.1:8545";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = path.join(__dirname, "out");
const state = JSON.parse(fs.readFileSync(path.join(__dirname, "state.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const PRICE = "0.5";

/** Ví giả lập: trả về đúng một tài khoản, mọi lời gọi khác chuyển thẳng tới node. */
const walletShim = (account) => `
  (() => {
    const ACC = ${JSON.stringify(account)};
    const RPC = ${JSON.stringify(RPC)};
    window.ethereum = {
      isMetaMask: true,
      on() {}, removeListener() {},
      async request({ method, params }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACC];
        if (method === "eth_chainId") return "0x7a69";
        if (method === "net_version") return "31337";
        if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
        if (method === "wallet_requestPermissions" || method === "wallet_getPermissions") return [{ parentCapability: "eth_accounts" }];
        const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params: params || [] }) });
        const j = await r.json();
        if (j.error) { const e = new Error(j.error.message); e.code = j.error.code; e.data = j.error.data; throw e; }
        return j.result;
      },
    };
  })();`;

let step = 0;
const errors = [];
async function shot(page, name) {
  const file = path.join(OUT, `${String(++step).padStart(2, "0")}-${name}.png`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  ảnh:", path.basename(file));
}
async function newRole(browser, account, label) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(walletShim(account));
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  return page;
}
async function connect(page) {
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await page.getByRole("button", { name: /0x[0-9a-fA-F]{4}…/ }).waitFor();
}
async function txSucceeded(page) {
  await page.getByText("Giao dịch thành công").first().waitFor({ timeout: 30_000 });
}

/** Việc người bán làm trong Safe{Wallet}: bật escrow làm module (chữ ký "approved by msg.sender", v = 1). */
async function enableModuleAsSeller() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const seller = await provider.getSigner(state.seller);
  const safe = new ethers.Contract(state.safe, [
    "function enableModule(address)",
    "function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes) payable returns (bool)",
  ], seller);
  const data = safe.interface.encodeFunctionData("enableModule", [state.escrow]);
  const sig = ethers.concat([ethers.zeroPadValue(state.seller, 32), ethers.ZeroHash, "0x01"]);
  await (await safe.execTransaction(state.safe, 0, data, 0, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, sig)).wait();
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    console.log("Người bán niêm yết ví");
    const seller = await newRole(browser, state.seller, "người bán");
    await seller.goto(`${APP}/?noguide#/sell`);
    await connect(seller);
    await seller.locator("#wallet").fill(state.safe);
    await seller.getByText("Ví chạy mã Safe chính thức").waitFor();
    await seller.locator("#buyer").fill(state.buyer);
    await seller.locator("#price").fill(PRICE);
    await seller.getByRole("button", { name: "Thêm tài sản" }).click();
    await seller.getByLabel("Số lượng tối thiểu (ETH)").fill("0.5");
    await shot(seller, "ban-dien-form");
    await seller.getByRole("button", { name: "Niêm yết ví" }).click();
    await seller.waitForURL(/#\/trade\/\d+/, { timeout: 30_000 });
    await seller.getByText("Báo cáo kiểm tra ví trước khi nạp tiền").waitFor();
    await shot(seller, "ban-vua-niem-yet");
    const tradeUrl = seller.url().replace(/\?noguide/, "");

    console.log("Người bán bật escrow làm module (thao tác trong Safe{Wallet})");
    await enableModuleAsSeller();
    await seller.reload();
    await seller.getByText("Ví sẵn sàng").waitFor({ timeout: 30_000 });
    await shot(seller, "ban-vi-san-sang");

    console.log("Người mua xem, khai báo tài sản kỳ vọng và nạp tiền");
    const buyer = await newRole(browser, state.buyer, "người mua");
    await buyer.goto(tradeUrl.replace("#/", "?noguide#/"));
    await connect(buyer);
    await buyer.getByRole("button", { name: /Xem lại và nạp/ }).waitFor();
    await shot(buyer, "mua-truoc-khi-nap");
    await buyer.getByRole("button", { name: /Xem lại và nạp/ }).click();
    const dep = buyer.getByRole("alertdialog");
    await dep.waitFor();
    await shot(buyer, "mua-hop-xac-nhan-nap");
    await dep.getByRole("checkbox").click();
    await dep.getByRole("button", { name: `Nạp ${PRICE} ETH` }).click();
    await txSucceeded(buyer);
    await buyer.getByText("Ví đang được đóng băng").waitFor({ timeout: 30_000 });
    await shot(buyer, "mua-da-nap");

    console.log("Người mua hoàn tất bàn giao");
    await buyer.getByRole("button", { name: "Hoàn tất bàn giao" }).click();
    const fin = buyer.getByRole("alertdialog");
    await fin.waitFor();
    await shot(buyer, "mua-hop-xac-nhan-hoan-tat");
    await fin.getByRole("button", { name: "Hoàn tất bàn giao" }).click();
    await txSucceeded(buyer);
    await buyer.getByText("Ví đã được bàn giao sạch").waitFor({ timeout: 30_000 });
    await shot(buyer, "mua-da-hoan-tat");

    console.log("Người bán rút tiền");
    await seller.reload();
    await seller.getByRole("button", { name: `Rút ${PRICE} ETH` }).click();
    await txSucceeded(seller);
    await shot(seller, "ban-da-rut");

    console.log("Tra cứu");
    await buyer.goto(`${APP}/?noguide#/trades`);
    await buyer.getByRole("switch").click();
    await buyer.getByText("#1").waitFor();
    await shot(buyer, "tra-cuu-danh-sach");
    await buyer.goto(`${APP}/?noguide#/history/${state.safe}`);
    await buyer.getByText("#1").waitFor();
    await shot(buyer, "tra-cuu-lich-su");

    // Đối chiếu trên chuỗi
    const provider = new ethers.JsonRpcProvider(RPC);
    const owners = await new ethers.Contract(state.safe, ["function getOwners() view returns (address[])"], provider).getOwners();
    console.log("Owner của ví sau bàn giao:", owners.join(", "));
    console.log(owners.length === 1 && owners[0].toLowerCase() === state.buyer.toLowerCase() ? "KẾT QUẢ: ĐẠT" : "KẾT QUẢ: SAI");
  } catch (e) {
    console.error("LỖI:", e.message);
    const pages = browser.contexts().flatMap((c) => c.pages());
    for (const [i, p] of pages.entries()) await p.screenshot({ path: path.join(OUT, `loi-${i}.png`), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    if (errors.length) console.log("Lỗi console:\n" + errors.slice(0, 20).join("\n"));
    await browser.close();
  }
})();
