// Cắt chân trang (72px cuối) và dải nền trống phía dưới nội dung của ảnh chụp e2e.
const fs = require('fs'), path = require('path');
const { PNG } = require(path.join(__dirname, '..', 'node_modules', 'pngjs'));
// Chạy: node report/crop-screens.cjs  (sau khi npm run e2e tạo ảnh mới)
const src = path.join(__dirname, '..', 'script', 'e2e', 'out'), dst = path.join(__dirname, 'img');
for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.png'))) {
  const im = PNG.sync.read(fs.readFileSync(path.join(src, f)));
  const { width: w } = im; const h = im.height - 72;
  const at = (x, y) => { const i = (y * w + x) * 4; return im.data[i] + im.data[i + 1] + im.data[i + 2]; };
  const ref = at(Math.floor(w / 2), h - 2);
  let last = h - 1;
  outer: for (let y = h - 1; y > 0; y--) for (let x = 0; x < w; x += 3) if (Math.abs(at(x, y) - ref) > 15) { last = y; break outer; }
  const nh = Math.min(h, last + 24);
  const out = new PNG({ width: w, height: nh });
  im.data.copy(out.data, 0, 0, w * nh * 4);
  fs.writeFileSync(path.join(dst, f), PNG.sync.write(out));
  console.log(f, im.height, '->', nh);
}
