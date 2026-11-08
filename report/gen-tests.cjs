// Chạy bộ kiểm thử trên Safe 1.4.1 và SafeL2 1.5.0, ghi kết quả vào testcases.json cho phụ lục báo cáo.
// Chạy: node report/gen-tests.cjs (từ thư mục gốc repo)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const run = (env) => execSync('npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs', {
  cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
});

function parse(out) {
  const rows = [];
  let group = '';
  for (const line of out.split(/\r?\n/)) {
    const g = line.match(/^ {4}(\S.*)$/);
    const ok = line.match(/^ {6}✔ (.*?)(?: \(\d+ms\))?$/);
    const skip = line.match(/^ {6}- (.*)$/);
    if (g) group = g[1];
    else if (ok) rows.push({ group, title: ok[1], result: 'Đạt' });
    else if (skip) rows.push({ group, title: skip[1], result: 'Không áp dụng' });
  }
  return rows;
}

const a = parse(run({}));
const b = parse(run({ SAFE_VERSION: '1.5.0', SAFE_VARIANT: 'L2' }));
const byTitle = new Map(b.map((r) => [r.title, r.result]));
const rows = a.map((r) => ({ ...r, title: r.title.replace(/ => /g, ' → '), v141: r.result, v150: byTitle.get(r.title) || '?' }));
fs.writeFileSync(path.join(__dirname, 'testcases.json'), JSON.stringify(rows, null, 1) + '\n');
console.log(`${rows.length} ca kiểm thử → report/testcases.json`);
