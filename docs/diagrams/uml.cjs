// Sinh sơ đồ use case và sơ đồ tuần tự (Graphviz, toạ độ cố định).
// Chạy: node docs/diagrams/uml.cjs && (cd docs/diagrams && for f in usecase seq-*; do ...; done)  — xem README.
const fs = require('fs');
const path = require('path');
const OUT = __dirname;

const FONT = 'Arial';
const head = (name) => [
  `digraph "${name}" {`,
  `  graph [splines=false, outputorder=edgesfirst, pad=0.2, bgcolor=white];`,
  `  node [fontname="${FONT}", fontsize=11];`,
  `  edge [fontname="${FONT}", fontsize=10, arrowsize=0.7];`,
];
const esc = (s) => s.replace(/"/g, '\\"');
const pos = (x, y) => `pos="${x.toFixed(1)},${(-y).toFixed(1)}!"`;
let pid = 0;
const pt = (lines, x, y) => { const id = `p${pid++}`; lines.push(`  ${id} [shape=point, width=0, height=0, label="", ${pos(x, y)}];`); return id; };
const text = (lines, x, y, s, extra = '') => { const id = `t${pid++}`; lines.push(`  ${id} [shape=plaintext, margin=0, height=0, width=0, label="${esc(s)}", ${pos(x, y)}${extra}];`); return id; };

// ───────────── Sơ đồ tuần tự ─────────────
// spec: { name, participants: [[id, label]], steps: [ {from,to,msg,ret?} | {self,msg} | {frame,text,from,to,steps:[...]} ] }
function sequence(spec) {
  pid = 0;
  const L = head(spec.name);
  const GAP = spec.gap || 175, X0 = 90, STEP = 34;
  const xs = {}; spec.participants.forEach(([id], i) => { xs[id] = X0 + i * GAP; });
  const rows = [];
  let y = 70;
  const frames = [];
  const walk = (steps, depth) => {
    for (const s of steps) {
      if (s.frame) {
        const start = y; y += 22;
        walk(s.steps, depth + 1);
        frames.push({ ...s, y0: start - 8, y1: y - 10, depth });
        y += 8;
      } else {
        rows.push({ ...s, y });
        y += s.self ? STEP + 14 : STEP;
      }
    }
  };
  walk(spec.steps, 0);
  const bottom = y + 10;

  // đầu đối tượng + đường sống
  spec.participants.forEach(([id, label]) => {
    const x = xs[id];
    L.push(`  h_${id} [shape=box, style="rounded,filled", fillcolor="#dbe9f7", label="${esc(label)}", ${pos(x, 0)}];`);
    const a = pt(L, x, 18), b = pt(L, x, bottom);
    L.push(`  ${a} -> ${b} [style=dashed, color="#888888", arrowhead=none];`);
    L.push(`  h_${id}b [shape=box, style="rounded,filled", fillcolor="#dbe9f7", label="${esc(label)}", ${pos(x, bottom + 18)}];`);
  });

  // khung loop / alt
  for (const f of frames) {
    const pad = 70 - f.depth * 8;
    const x0 = xs[f.from] - pad, x1 = xs[f.to] + pad;
    const c = [pt(L, x0, f.y0), pt(L, x1, f.y0), pt(L, x1, f.y1), pt(L, x0, f.y1)];
    for (let i = 0; i < 4; i++) L.push(`  ${c[i]} -> ${c[(i + 1) % 4]} [arrowhead=none, color="#555555"];`);
    const tag = `${f.frame} [${f.text}]`;
    text(L, x0 + 6 + tag.length * 2.7, f.y0 + 10, tag, ', fontsize=10, fontcolor="#333333"');
  }

  // thông điệp
  for (const r of rows) {
    if (r.self) {
      const x = xs[r.self];
      const a = pt(L, x, r.y), b = pt(L, x + 30, r.y), c = pt(L, x + 30, r.y + 16), d = pt(L, x, r.y + 16);
      L.push(`  ${a} -> ${b} [arrowhead=none]; ${b} -> ${c} [arrowhead=none]; ${c} -> ${d};`);
      const lines = r.msg.split('\n');
      const w = Math.max(...lines.map((s) => s.length)) * 5.3;
      text(L, x + 38 + w / 2, r.y + 8, r.msg, ', fontsize=10, labeljust=l');
    } else {
      const x1 = xs[r.from], x2 = xs[r.to];
      const a = pt(L, x1, r.y), b = pt(L, x2, r.y);
      L.push(`  ${a} -> ${b} [${r.ret ? 'style=dashed, arrowhead=vee' : 'arrowhead=normal'}];`);
      const n = r.msg.split('\n').length;
      text(L, (x1 + x2) / 2, r.y - 7 - (n - 1) * 6, r.msg, ', fontsize=10');
    }
  }
  L.push('}');
  fs.writeFileSync(path.join(OUT, `${spec.name}.dot`), L.join('\n') + '\n');
}

// ───────────── Sơ đồ use case ─────────────
function actor(L, x, y, label) {
  L.push(`  a${pid++} [shape=circle, width=0.28, height=0.28, fixedsize=true, label="", ${pos(x, y)}];`);
  const neck = pt(L, x, y + 10), hip = pt(L, x, y + 34);
  const armL = pt(L, x - 16, y + 20), armR = pt(L, x + 16, y + 20);
  const legL = pt(L, x - 13, y + 54), legR = pt(L, x + 13, y + 54);
  L.push(`  ${neck} -> ${hip} [arrowhead=none]; ${armL} -> ${armR} [arrowhead=none];`);
  L.push(`  ${hip} -> ${legL} [arrowhead=none]; ${hip} -> ${legR} [arrowhead=none];`);
  text(L, x, y + 70, label, ', fontsize=11');
  return pt(L, x, y + 24);
}
function usecase() {
  pid = 0;
  const L = head('usecase');
  const ucs = [
    ['UC01', 'Niêm yết ví'],
    ['UC02', 'Chuẩn bị ví\n(bật escrow làm module)'],
    ['UC03', 'Kiểm tra trạng thái ví'],
    ['UC04', 'Nạp tiền và khai báo\ntài sản kỳ vọng'],
    ['UC05', 'Hoàn tất bàn giao'],
    ['UC06', 'Hủy giao dịch'],
    ['UC07', 'Rút tiền'],
    ['UC08', 'Tra cứu giao dịch'],
  ];
  const CX = 330, Y0 = 60, DY = 62;
  const top = Y0 - 50, bot = Y0 + (ucs.length - 1) * DY + 40;
  const c = [pt(L, CX - 150, top), pt(L, CX + 150, top), pt(L, CX + 150, bot), pt(L, CX - 150, bot)];
  for (let i = 0; i < 4; i++) L.push(`  ${c[i]} -> ${c[(i + 1) % 4]} [arrowhead=none, color="#555555"];`);
  text(L, CX, top + 14, 'Hệ thống CleanHandover', ', fontsize=12');
  const node = {};
  ucs.forEach(([id, label], i) => {
    node[id] = id;
    L.push(`  ${id} [shape=ellipse, width=2.6, height=0.62, fixedsize=true, style=filled, fillcolor="#fdf1d6", label="${esc(label)}", ${pos(CX, Y0 + 20 + i * DY)}];`);
  });
  const seller = actor(L, 20, 230, 'Người bán');
  const buyer = actor(L, 640, 150, 'Người mua');
  const viewer = actor(L, 640, 400, 'Người xem\n(bất kỳ ai)');
  // nối vào mép trái / phải của ô use case để đường không cắt qua ô khác
  const yOf = (u) => Y0 + 20 + ucs.findIndex(([id]) => id === u) * DY;
  const link = (a, ids, side) => ids.forEach((u) => {
    const e = pt(L, CX + side * 93, yOf(u));
    L.push(`  ${a} -> ${e} [arrowhead=none];`);
  });
  link(seller, ['UC01', 'UC02', 'UC03', 'UC06', 'UC07'], -1);
  link(buyer, ['UC03', 'UC04', 'UC05', 'UC06', 'UC07'], 1);
  link(viewer, ['UC05', 'UC06', 'UC08'], 1);
  L.push('}');
  fs.writeFileSync(path.join(OUT, 'usecase.dot'), L.join('\n') + '\n');
}

const P = { S: 'Người bán', B: 'Người mua', E: 'CleanHandoverEscrow', V: 'SafeWalletVerifier', C: 'Asset checker', W: 'Ví Safe' };
const parts = (...ids) => ids.map((id) => [id, P[id]]);

usecase();

sequence({
  name: 'seq-create', participants: parts('S', 'E', 'V', 'C'),
  steps: [
    { from: 'S', to: 'E', msg: 'createTrade(params)' },
    { from: 'E', to: 'V', msg: 'isSupportedWallet(ví)' },
    { from: 'V', to: 'E', msg: 'true', ret: true },
    { from: 'E', to: 'V', msg: 'isController(ví, người bán)' },
    { from: 'V', to: 'E', msg: 'true', ret: true },
    { self: 'E', msg: 'kiểm tra người mua, giá, hạn chót,\ntập owner mới, ngưỡng ký' },
    { frame: 'loop', text: 'mỗi tài sản chào bán', from: 'E', to: 'C', steps: [
      { from: 'E', to: 'C', msg: 'holds(ví, token, value)' },
      { from: 'C', to: 'E', msg: 'true', ret: true },
    ] },
    { self: 'E', msg: 'lưu giao dịch (OPEN),\ntính termsHash' },
    { from: 'E', to: 'S', msg: 'TradeCreated(id, termsHash)', ret: true },
  ],
});

sequence({
  name: 'seq-prepare', participants: parts('S', 'W', 'E', 'V'),
  steps: [
    { from: 'S', to: 'W', msg: 'execTransaction(enableModule(escrow))' },
    { self: 'W', msg: 'kiểm tra chữ ký owner,\nnonce + 1, thêm module' },
    { from: 'S', to: 'E', msg: 'getReadiness(id)' },
    { from: 'E', to: 'V', msg: 'checkReadiness(ví, escrow, handler)' },
    { from: 'V', to: 'W', msg: 'đọc singleton, module,\nguard, fallback handler' },
    { from: 'W', to: 'V', msg: 'cấu hình hiện tại', ret: true },
    { from: 'V', to: 'E', msg: 'readinessMask', ret: true },
    { from: 'E', to: 'S', msg: '(readinessMask, assetMask)', ret: true },
  ],
});

sequence({
  name: 'seq-deposit', participants: parts('B', 'E', 'V', 'C'),
  steps: [
    { from: 'B', to: 'E', msg: 'trades(id), getAssets(id)' },
    { from: 'E', to: 'B', msg: 'điều kiện, termsHash, tài sản chào bán', ret: true },
    { from: 'B', to: 'E', msg: 'deposit(id, termsHash, expectedAssets)\n+ P ETH' },
    { self: 'E', msg: 'kiểm tra người mua, số tiền, hạn chót,\ntermsHash; tập kỳ vọng nằm trong tập chào bán' },
    { from: 'E', to: 'V', msg: 'checkReadiness(ví, escrow, handler)' },
    { from: 'V', to: 'E', msg: '0', ret: true },
    { frame: 'loop', text: 'mỗi tài sản kỳ vọng', from: 'E', to: 'C', steps: [
      { from: 'E', to: 'C', msg: 'holds(ví, token, value)' },
      { from: 'C', to: 'E', msg: 'true', ret: true },
    ] },
    { from: 'E', to: 'V', msg: 'txNonce(ví)' },
    { from: 'V', to: 'E', msg: 'nonce', ret: true },
    { self: 'E', msg: 'lưu nonceAtFunding,\ntrạng thái FUNDED' },
    { from: 'E', to: 'B', msg: 'TradeFunded(id, P, nonce)', ret: true },
  ],
});

sequence({
  name: 'seq-finalize', participants: parts('B', 'E', 'V', 'W', 'C'), gap: 165,
  steps: [
    { from: 'B', to: 'E', msg: 'finalizeHandover(id)' },
    { from: 'E', to: 'V', msg: 'txNonce(ví)' },
    { from: 'V', to: 'E', msg: 'nonce (phải bằng nonceAtFunding)', ret: true },
    { from: 'E', to: 'V', msg: 'isController(ví, người bán)' },
    { from: 'V', to: 'E', msg: 'true', ret: true },
    { from: 'E', to: 'V', msg: 'handoverCalls(ví, owner mới, ngưỡng)' },
    { from: 'V', to: 'E', msg: 'danh sách lời gọi', ret: true },
    { frame: 'loop', text: 'mỗi lời gọi', from: 'E', to: 'W', steps: [
      { from: 'E', to: 'W', msg: 'execTransactionFromModule(...)\nthêm owner / xóa owner / ngưỡng / gỡ module' },
      { from: 'W', to: 'E', msg: 'true', ret: true },
    ] },
    { from: 'E', to: 'V', msg: 'checkHandover(ví, owner mới, ngưỡng, handler)' },
    { from: 'V', to: 'E', msg: '0 (ví sạch)', ret: true },
    { frame: 'loop', text: 'mỗi tài sản kỳ vọng', from: 'E', to: 'C', steps: [
      { from: 'E', to: 'C', msg: 'holds(ví, token, value)' },
      { from: 'C', to: 'E', msg: 'true', ret: true },
    ] },
    { self: 'E', msg: 'COMPLETED, ghi có P\ncho người bán' },
    { from: 'E', to: 'B', msg: 'TradeCompleted(id)', ret: true },
  ],
});

sequence({
  name: 'seq-cancel', participants: parts('B', 'E', 'V', 'C'),
  steps: [
    { from: 'B', to: 'E', msg: 'cancelByBuyer(id)' },
    { frame: 'alt', text: 'giao dịch đã nạp tiền', from: 'E', to: 'C', steps: [
      { from: 'E', to: 'V', msg: 'txNonce(ví)' },
      { from: 'V', to: 'E', msg: 'nonce', ret: true },
      { from: 'E', to: 'C', msg: 'holds(...) với tập kỳ vọng' },
      { from: 'C', to: 'E', msg: 'kết quả', ret: true },
      { self: 'E', msg: 'chỉ cho hủy nếu nonce đổi\nhoặc thiếu tài sản' },
    ] },
    { self: 'E', msg: 'CANCELLED, ghi có P\ncho người mua' },
    { from: 'E', to: 'B', msg: 'TradeCancelled(id, lý do, true)', ret: true },
    { from: 'B', to: 'E', msg: 'withdraw()' },
    { from: 'E', to: 'B', msg: 'chuyển P ETH, Withdrawn', ret: true },
  ],
});

console.log('Đã sinh usecase.dot và các seq-*.dot');
