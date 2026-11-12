// Tạo slide bảo vệ: node report/slides.cjs  ->  report/BaoVe_NguyenMinhTuyen.pptx
// Mở và chỉnh được bằng LibreOffice Impress hoặc PowerPoint. Font Arial để hiển thị giống nhau trên mọi máy.
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');

const APPLY_THEME = process.env.APPLY_THEME_JS; // tùy chọn: ghi bảng màu vào theme của file
const OUT = path.join(__dirname, 'BaoVe_NguyenMinhTuyen.pptx');
const DIAG = path.join(__dirname, '..', 'docs', 'diagrams');
const IMG = path.join(__dirname, 'img');

const THEME = {
  name: 'CleanHandover',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '1B2A24', lt1: 'FFFFFF', dk2: '15382C', lt2: 'EDF3EF',
    accent1: '1F7A4D', accent2: 'B42318', accent3: '2E9E5B', accent4: '5E6E67',
    accent5: 'C9DDD1', accent6: '0E5A8A', hlink: '1F7A4D', folHlink: '15382C',
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 in
pres.author = 'Nguyễn Minh Tuyền';
pres.company = 'Trường Đại học Thủ Dầu Một';
pres.title = 'CleanHandover - Báo cáo tốt nghiệp';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const W = 10, H = 5.625, M = 0.5;

// ── Layouts ──
pres.defineSlideMaster({
  title: 'DARK',
  background: { color: HEX.dk2 },
  objects: [],
});
pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: HEX.lt1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.3, w: W - 2 * M, h: 0.75, fontSize: 26, bold: true, color: C.text2, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    { text: { text: 'CleanHandover · Nguyễn Minh Tuyền', options: { x: M, y: H - 0.38, w: 5, h: 0.25, fontSize: 9, color: C.accent4, margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.5, y: H - 0.38, w: 0.5, h: 0.25, fontSize: 9, color: C.accent4, align: 'right' },
});

let n = 0;
const content = (section, title, notes) => {
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section });
  s.addText(title, { placeholder: 'title' });
  if (notes) s.addNotes(notes);
  n++;
  return s;
};
const png = (file, dir = DIAG) => {
  const p = path.join(dir, file);
  const b = fs.readFileSync(p);
  return { path: p, ratio: b.readUInt32BE(16) / b.readUInt32BE(20) };
};
// ảnh vừa khung (x, y, w, h) giữ tỉ lệ, căn giữa
const fit = (s, img, x, y, w, h, extra = {}) => {
  let iw = w, ih = w / img.ratio;
  if (ih > h) { ih = h; iw = h * img.ratio; }
  s.addImage({ path: img.path, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, ...extra });
};
const card = (s, x, y, w, h, fill = C.background2) =>
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.08 });
const tag = (s, text, x, y, fill, color = C.background1, w = 0.55) =>
  s.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, x, y, w, h: 0.3, rectRadius: 0.06, fill: { color: fill }, color, fontSize: 11, bold: true, align: 'center', valign: 'middle', margin: 0, isTextBox: true });

// ── 1. Trang bìa ──
pres.addSection({ title: 'Mở đầu' });
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Mở đầu' });
  s.addText('TRƯỜNG ĐẠI HỌC THỦ DẦU MỘT · VIỆN CÔNG NGHỆ SỐ', { x: M, y: 0.45, w: 9, h: 0.3, fontSize: 11, color: C.accent5, bold: true, charSpacing: 1, margin: 0, isTextBox: true });
  s.addText('BÁO CÁO TỐT NGHIỆP', { x: M, y: 1.15, w: 9, h: 0.3, fontSize: 13, color: C.accent5, margin: 0, isTextBox: true });
  s.addText('Xây dựng hệ thống chuyển giao quyền kiểm soát ví đa chữ ký CleanHandover', { x: M, y: 1.5, w: 8.6, h: 1.5, fontSize: 32, bold: true, color: C.background1, valign: 'top', margin: 0, isTextBox: true });
  s.addText([
    { text: 'Sinh viên: ', options: { color: C.accent5 } }, { text: 'Nguyễn Minh Tuyền · 2124801040049 · D21HTTT01', options: { breakLine: true } },
    { text: 'Giảng viên hướng dẫn: ', options: { color: C.accent5 } }, { text: 'Hồ Đắc Hưng' },
  ], { x: M, y: 3.7, w: 9, h: 0.75, fontSize: 15, color: C.background1, margin: 0, paraSpaceAfter: 4, isTextBox: true });
  s.addText('Bình Dương, 2026', { x: M, y: 4.85, w: 4, h: 0.3, fontSize: 11, color: C.accent5, margin: 0, isTextBox: true });
  s.addNotes('Kính chào hội đồng. Em là Nguyễn Minh Tuyền, lớp D21HTTT01. Đề tài của em là xây dựng hệ thống CleanHandover: chuyển giao quyền kiểm soát một ví đa chữ ký Safe giữa người bán và người mua mà không cần bên trung gian.');
}

// ── 2. Vấn đề ──
{
  const s = content('Mở đầu', 'Mua một ví Safe là mua cả những gì giấu trong ví',
    'Ví Safe có thể đang giữ tài sản, NFT, quyền owner của hợp đồng, nên có nhu cầu bán cả ví. Khó ở chỗ quyền kiểm soát không chỉ nằm ở danh sách owner: người bán có thể để lại các cửa hậu bên trái. Guard và fallback handler còn không có hàm đọc công khai. Sự cố Bybit cho thấy chỉ một thay đổi cấu hình là mất toàn bộ ví.');
  const items = [
    ['Owner ẩn', 'Người bán giữ lại một owner phụ'],
    ['Module', 'Thực thi giao dịch không cần chữ ký owner'],
    ['Guard', 'Chặn mọi giao dịch của người mua'],
    ['Fallback handler', 'Giả mạo chữ ký thay ví (EIP-1271)'],
    ['Rút tài sản', 'Ví trống ngay trước lúc bàn giao'],
  ];
  items.forEach(([h, d], i) => {
    const y = 1.25 + i * 0.72;
    tag(s, '!', M, y + 0.08, C.accent2, C.background1, 0.36);
    s.addText(h, { x: M + 0.55, y, w: 4.6, h: 0.3, fontSize: 15, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.55, y: y + 0.3, w: 4.6, h: 0.3, fontSize: 13, color: C.accent4, margin: 0, isTextBox: true });
  });
  card(s, 6.0, 1.25, 3.5, 3.45, C.background2);
  s.addText('1,5 tỷ USD', { x: 6.2, y: 1.55, w: 3.1, h: 0.8, fontSize: 38, bold: true, color: C.accent2, margin: 0, isTextBox: true });
  s.addText('Bybit, 02/2025: các bên ký phê duyệt một giao dịch trên giao diện bị chèn mã độc; giao dịch thay hợp đồng logic của ví Safe.', { x: 6.2, y: 2.4, w: 3.1, h: 1.5, fontSize: 13, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
  s.addText('Nguồn: Sygnia (2025); FBI, PSA I-022625', { x: 6.2, y: 4.2, w: 3.1, h: 0.3, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
}

// ── 3. Mục tiêu ──
{
  const s = content('Mở đầu', 'Mục tiêu: tiền chỉ đến người bán khi ví đã sạch',
    'Mục tiêu tổng quát bám theo đề cương: hệ thống phi tập trung, không cần trung gian, kiểm chứng trên blockchain. Sáu mục tiêu cụ thể tương ứng sáu ô.');
  const goals = [
    ['Hợp đồng ký quỹ', 'Xác minh "bàn giao sạch" nguyên tử tại thời điểm giải ngân'],
    ['Xác minh tài sản', 'ETH, ERC-20, ERC-721, quyền owner theo Ownable'],
    ['Kiến trúc hai trục', 'Trục loại ví và trục loại tài sản, cắm thêm được'],
    ['Mô hình nguy cơ', '13 kịch bản tấn công và bộ kiểm thử chứng minh'],
    ['Dapp và trợ lý', 'Chỉ ra từng điều kiện chưa đạt và cách khắc phục'],
    ['Công khai', 'Chạy trên Sepolia, mã nguồn xác minh trên Etherscan, tự kiểm chứng được'],
  ];
  const cw = 2.85, ch = 1.55, gx = 0.225, gy = 0.3;
  goals.forEach(([h, d], i) => {
    const x = M + (i % 3) * (cw + gx), y = 1.3 + Math.floor(i / 3) * (ch + gy);
    card(s, x, y, cw, ch);
    s.addText(String(i + 1).padStart(2, '0'), { x: x + 0.2, y: y + 0.15, w: 1, h: 0.35, fontSize: 18, bold: true, color: C.accent1, margin: 0, isTextBox: true });
    s.addText(h, { x: x + 0.2, y: y + 0.52, w: cw - 0.4, h: 0.32, fontSize: 15, bold: true, color: C.text2, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.2, y: y + 0.86, w: cw - 0.4, h: 0.6, fontSize: 12, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
  });
}

// ── 4. Bàn giao sạch ──
pres.addSection({ title: 'Thiết kế' });
{
  const s = content('Thiết kế', 'Thế nào là "bàn giao sạch"',
    'Định nghĩa trung tâm của đề tài: ví được coi là bàn giao sạch khi đồng thời thỏa bảy điều kiện cấu hình và người mua còn nhận đủ tài sản mình kỳ vọng. Guard, module guard và fallback handler không có hàm đọc, phải đọc thẳng khe lưu trữ qua getStorageAt.');
  const conds = [
    ['T7', 'Ví chạy mã Safe chính thức'], ['T1', 'Tập owner đúng bằng tập mới'], ['T2', 'Ngưỡng ký đúng thỏa thuận'],
    ['T3', 'Không còn module nào'], ['T4', 'Không có guard'], ['T4b', 'Không có module guard'], ['T5', 'Fallback handler hợp lệ'],
  ];
  conds.forEach(([t, txt], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 3.25, y = 1.3 + row * 0.62;
    tag(s, t, x, y + 0.03, C.text2, C.background1, 0.55);
    s.addText(txt, { x: x + 0.7, y, w: 2.5, h: 0.36, fontSize: 13, color: C.text1, valign: 'middle', margin: 0, isTextBox: true });
  });
  // tài sản
  tag(s, 'T6', M + 3.25, 1.3 + 3 * 0.62 + 0.03, C.accent1, C.background1, 0.55);
  s.addText('Tài sản kỳ vọng còn đủ', { x: M + 3.95, y: 1.3 + 3 * 0.62, w: 2.5, h: 0.36, fontSize: 13, bold: true, color: C.accent1, valign: 'middle', margin: 0, isTextBox: true });
  card(s, 7.15, 1.3, 2.35, 3.3, C.background2);
  s.addText('Cấu hình ẩn', { x: 7.33, y: 1.5, w: 2.0, h: 0.35, fontSize: 15, bold: true, color: C.text2, margin: 0, isTextBox: true });
  s.addText('Guard, module guard và fallback handler không có hàm đọc công khai. Verifier đọc thẳng khe lưu trữ của ví qua getStorageAt; đọc lỗi thì coi như chưa đạt.', { x: 7.33, y: 1.9, w: 2.0, h: 2.5, fontSize: 12, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
  s.addText('Mã T là kịch bản tấn công tương ứng trong mô hình nguy cơ', { x: M, y: 4.45, w: 6, h: 0.3, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
}

// ── 5. Phương án ban đầu ──
{
  const s = content('Thiết kế', 'Phương án đầu tiên bị kiểm thử fuzz phá',
    'Ban đầu người bán tự bàn giao bằng một giao dịch của ví, hợp đồng chỉ kiểm tra rồi giải ngân. Phương án này qua hết kiểm thử viết tay. Fuzz tìm ra phản ví dụ: người bán gộp lệnh hoàn tất và lệnh gian lận vào một MultiSend; Safe chỉ kiểm chữ ký một lần ở đầu nên lệnh phía sau vẫn chạy sau khi tiền đã giải ngân.');
  fit(s, png('v1-attack.png'), M, 1.2, 3.6, 3.6);
  s.addText([
    { text: 'Người bán tự bàn giao, hợp đồng chỉ kiểm tra', options: { bold: true, color: C.text2, breakLine: true } },
    { text: 'Qua toàn bộ kiểm thử viết tay.', options: { breakLine: true } },
  ], { x: 4.5, y: 1.25, w: 5, h: 0.75, fontSize: 14, color: C.text1, margin: 0, paraSpaceAfter: 4, isTextBox: true });
  s.addText([
    { text: 'Fuzz tìm ra phản ví dụ', options: { bold: true, color: C.accent2, breakLine: true } },
    { text: 'Gộp "hoàn tất" và một lệnh gian lận trong cùng MultiSend. Safe chỉ kiểm chữ ký một lần ở đầu, nên lệnh sau vẫn chạy khi tiền đã giải ngân.' },
  ], { x: 4.5, y: 2.1, w: 5, h: 1.3, fontSize: 14, color: C.text1, valign: 'top', margin: 0, paraSpaceAfter: 4, isTextBox: true });
  card(s, 4.5, 3.6, 5, 1.05, C.background2);
  s.addText('Bài học: chỉ bên giữ quyền điều khiển tới cuối giao dịch mới bảo đảm được trạng thái cuối.', { x: 4.7, y: 3.65, w: 4.6, h: 0.95, fontSize: 14, bold: true, color: C.text2, valign: 'middle', margin: 0, isTextBox: true });
}

// ── 6. Phương án chọn ──
{
  const s = content('Thiết kế', 'Phương án chọn: hợp đồng ký quỹ tự bàn giao',
    'Đảo vai trò: hợp đồng ký quỹ là module duy nhất và tự làm việc bàn giao trong hàm finalizeHandover. Chỗ hở còn lại là người bán bọc finalize trong giao dịch của ví; vì vậy lúc nạp tiền hợp đồng ghi nonce của ví, mọi giao dịch của owner đều làm nonce tăng và khóa bàn giao, người mua được hủy lấy lại tiền.');
  const steps = [
    ['1', 'Chuẩn bị', 'Người bán bật hợp đồng ký quỹ làm module duy nhất của ví'],
    ['2', 'Nạp tiền', 'Người mua nạp; hợp đồng ghi nonce, ví bị khóa'],
    ['3', 'Bàn giao', 'finalizeHandover: thêm owner mới, xóa owner cũ, đặt ngưỡng, tự gỡ module'],
    ['4', 'Giải ngân', 'Kiểm lại toàn bộ điều kiện và tài sản rồi mới ghi có cho người bán'],
  ];
  const sw = 2.0, gap = 0.25;
  steps.forEach(([k, h, d], i) => {
    const x = M + i * (sw + gap);
    card(s, x, 1.3, sw, 2.25, i === 3 ? C.text2 : C.background2);
    const fg = i === 3 ? C.background1 : C.text1;
    s.addText(k, { x: x + 0.18, y: 1.45, w: 0.5, h: 0.45, fontSize: 24, bold: true, color: i === 3 ? C.accent5 : C.accent1, margin: 0, isTextBox: true });
    s.addText(h, { x: x + 0.18, y: 1.92, w: sw - 0.36, h: 0.32, fontSize: 14, bold: true, color: fg, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.18, y: 2.27, w: sw - 0.36, h: 1.2, fontSize: 12, color: fg, valign: 'top', margin: 0, isTextBox: true });
  });
  s.addText([
    { text: 'Một giao dịch duy nhất: ', options: { bold: true } }, { text: 'sai một điều kiện thì mọi thay đổi bị hoàn tác.', options: { breakLine: true } },
    { text: 'Khóa nonce: ', options: { bold: true } }, { text: 'ví bị động vào sau khi nạp tiền thì bàn giao bị khóa, người mua hủy để lấy lại tiền.' },
  ], { x: M, y: 3.8, w: 9, h: 0.9, fontSize: 14, color: C.text1, margin: 0, paraSpaceAfter: 6, isTextBox: true });
}

// ── 7. Kiến trúc hai trục ──
{
  const s = content('Thiết kế', 'Kiến trúc hai trục, không khóa quản trị',
    'Hợp đồng ký quỹ không đọc trực tiếp trạng thái của Safe mà hỏi qua giao diện IWalletVerifier; tài sản kiểm qua IAssetChecker. Muốn thêm loại ví hay loại tài sản thì viết thêm một hợp đồng cài giao diện tương ứng. Hợp đồng không có owner, không có hàm quản trị, không có proxy nâng cấp.');
  fit(s, png('architecture.png'), M, 1.2, 9, 1.75);
  const cols = [
    ['Trục ví · IWalletVerifier', 'Adapter tham chiếu SafeWalletVerifier cho Safe 1.3.0, 1.4.1, 1.5.0 (8 singleton chính thức).'],
    ['Trục tài sản · IAssetChecker', 'Bốn bộ kiểm tra: số dư ETH, số dư ERC-20, chủ NFT ERC-721, owner() theo Ownable.'],
    ['Bất biến sau triển khai', 'Không owner, không hàm quản trị, không proxy: không ai đổi được luật, kể cả tác giả.'],
  ];
  cols.forEach(([h, d], i) => {
    const x = M + i * 3.07;
    card(s, x, 3.15, 2.86, 1.5);
    s.addText(h, { x: x + 0.18, y: 3.27, w: 2.5, h: 0.32, fontSize: 13, bold: true, color: C.text2, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.18, y: 3.62, w: 2.5, h: 0.95, fontSize: 12, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
  });
}

// ── 8. Vòng đời ──
{
  const s = content('Thiết kế', 'Vòng đời một giao dịch',
    'Bốn trạng thái. Bàn giao và giải ngân gộp trong một hàm nên không có trạng thái trung gian nào để tấn công. Tiền được rút theo kiểu pull-payment: hợp đồng chỉ ghi có, người nhận tự rút.');
  fit(s, png('state.png'), M, 1.15, 5.4, 3.6);
  const st = [
    ['OPEN', 'Đã niêm yết; người bán chuẩn bị ví', C.accent4],
    ['FUNDED', 'Người mua đã nạp; ví bị khóa', C.accent6],
    ['COMPLETED', 'Đã bàn giao sạch, đã ghi có cho người bán', C.accent1],
    ['CANCELLED', 'Hủy, quá hạn hoặc ví bị thay đổi; hoàn tiền', C.accent2],
  ];
  st.forEach(([k, d, col], i) => {
    const y = 1.35 + i * 0.8;
    tag(s, k, 6.2, y, col, C.background1, 1.3);
    s.addText(d, { x: 6.2, y: y + 0.34, w: 3.3, h: 0.36, fontSize: 12, color: C.text1, margin: 0, isTextBox: true });
  });
}

// ── 9. Mô hình nguy cơ ──
{
  const s = content('Thiết kế', 'Mô hình nguy cơ: 13 kịch bản tấn công',
    'Mỗi kịch bản có một cơ chế phòng thủ trên chuỗi và ca kiểm thử tương ứng. T13 là giới hạn đã biết: rút qua allowance đã cấp từ trước, nếu xảy ra sau bàn giao thì đọc trạng thái ví không phát hiện được.');
  const rows = [
    ['T1', 'Giữ owner ẩn'], ['T2', 'Sai ngưỡng ký'], ['T3', 'Cài module cửa hậu'], ['T4', 'Cài guard / module guard'],
    ['T5', 'Fallback handler giả chữ ký'], ['T6', 'Rút tài sản'], ['T7', 'Đổi singleton giả mạo'],
    ['T8', 'Bọc bàn giao trong giao dịch của ví'], ['T9', 'Đổi điều kiện phút chót'], ['T10', 'Ôm tiền, kéo dài'],
    ['T11', 'Người mua phá ví sau khi nhận'], ['T12', 'Reentrancy'], ['T13', 'Allowance cấp từ trước'],
  ];
  rows.forEach(([t, txt], i) => {
    const col = Math.floor(i / 7), row = i % 7;
    const x = M + col * 4.6, y = 1.2 + row * 0.47;
    const limit = t === 'T13';
    tag(s, t, x, y + 0.04, limit ? C.accent4 : C.text2, C.background1, 0.6);
    s.addText(txt + (limit ? '  (giới hạn đã biết)' : ''), { x: x + 0.75, y, w: 3.8, h: 0.38, fontSize: 13, color: limit ? C.accent4 : C.text1, valign: 'middle', margin: 0, isTextBox: true });
  });
}

// ── 10. Dapp ──
pres.addSection({ title: 'Ứng dụng' });
{
  const s = content('Ứng dụng', 'Dapp và trợ lý hướng dẫn bàn giao',
    'Dapp chạy hoàn toàn trong trình duyệt, không có máy chủ. Trợ lý đọc mặt nạ bit hợp đồng trả về, nên giao diện và hợp đồng không thể đánh giá khác nhau. Trợ lý chỉ chẩn đoán và hướng dẫn, không tự gửi giao dịch thay người bán, đúng đề cương. Ba màn tra cứu đọc từ sự kiện của hợp đồng.');
  s.addText([
    { text: 'Đọc kết quả từ chính hợp đồng (getReadiness, getHandoverStatus)', options: { bullet: true, breakLine: true } },
    { text: 'Mỗi điều kiện gắn một mã T và một hướng dẫn khắc phục', options: { bullet: true, breakLine: true } },
    { text: 'Chỉ chẩn đoán, không tự gửi giao dịch thay người bán', options: { bullet: true, breakLine: true } },
    { text: 'Làm mới mỗi 12 giây; hộp xem lại trước mọi thao tác chuyển tiền', options: { bullet: true, breakLine: true } },
    { text: 'Tra cứu: danh sách, chi tiết, lịch sử theo địa chỉ, đọc từ sự kiện', options: { bullet: true } },
  ], { x: M, y: 1.25, w: 3.7, h: 3.4, fontSize: 13, color: C.text1, valign: 'top', margin: 0, paraSpaceAfter: 8, isTextBox: true });
  const shot = png('02-ban-vua-niem-yet.png', IMG);
  fit(s, shot, 4.4, 1.2, 5.1, 3.5, { shadow: { type: 'outer', color: '000000', opacity: 0.18, blur: 6, offset: 2, angle: 90 } });
  s.addText('Báo cáo kiểm tra khi ví chưa sẵn sàng (chạy thử trên mạng cục bộ)', { x: 4.4, y: 4.72, w: 5.1, h: 0.25, fontSize: 10, color: C.accent4, align: 'center', margin: 0, isTextBox: true });
}

// ── 11. Kiểm thử ──
pres.addSection({ title: 'Kết quả' });
{
  const s = content('Kết quả', 'Kiểm thử: không vi phạm bất biến nào',
    'Ba lớp kiểm chứng. Kiểm thử theo kịch bản: 38 ca, chạy cả trên Safe 1.4.1 và 1.5.0. Fuzz: 7 seed, mỗi seed 1000 kịch bản ngẫu nhiên, kiểm bốn bất biến sau mỗi kịch bản. Trong đó có 960 lần thử bọc finalize trong giao dịch của người bán, không lần nào thành công. Slither và Mythril không phát hiện lỗi ngoài mô hình nguy cơ.');
  const stats = [['38', 'ca kiểm thử theo kịch bản'], ['7.000', 'kịch bản fuzz, 3 biến thể Safe'], ['0', 'vi phạm bất biến'], ['960 / 0', 'lần gian lận T8 / thành công']];
  stats.forEach(([v, l], i) => {
    const y = 1.2 + i * 0.85;
    s.addText(v, { x: M, y, w: 1.9, h: 0.55, fontSize: 30, bold: true, color: i === 2 ? C.accent1 : C.text2, margin: 0, isTextBox: true });
    s.addText(l, { x: M + 2.0, y: y + 0.1, w: 2.4, h: 0.4, fontSize: 13, color: C.text1, valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addChart(pres.charts.BAR, [{
    name: 'Kịch bản', labels: ['Hoàn tất (ví sạch)', 'Từ chối lúc nạp', 'Từ chối lúc bàn giao, hoàn tiền'], values: [2987, 3296, 717],
  }], {
    x: 5.0, y: 1.15, w: 4.5, h: 3.3, barDir: 'bar',
    chartColors: [HEX.accent1], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 11, dataLabelColor: HEX.dk1, dataLabelFormatCode: '0',
    showTitle: true, title: 'Kết cục của 7.000 kịch bản fuzz', titleFontSize: 13, titleColor: HEX.dk2, titleFontFace: '+mn-lt',
    catAxisLabelFontSize: 11, catAxisLabelColor: HEX.dk1, catAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt',
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false, catAxisOrientation: 'maxMin',
  });
  s.addText('Slither, Mythril: không phát hiện lỗi nằm ngoài mô hình nguy cơ', { x: 5.0, y: 4.45, w: 4.5, h: 0.3, fontSize: 11, color: C.accent4, margin: 0, isTextBox: true });
}

// ── 12. Sepolia ──
{
  const s = content('Kết quả', 'Chạy thật trên Sepolia',
    'Các hợp đồng triển khai bằng Remix và MetaMask, mã nguồn đã xác minh trên Etherscan. Ngày 07/11/2026 một giao dịch thật đã chạy trọn vòng đời trên Sepolia với ví SafeL2 1.5.0. Sau bàn giao: owner duy nhất là người mua, không module, không guard, số dư hợp đồng ký quỹ về 0.');
  const rows = [
    ['Bước', 'Gas'],
    ['Bật hợp đồng ký quỹ làm module', '278.413'],
    ['Niêm yết (createTrade)', '1.501.384'],
    ['Nạp tiền (deposit)', '218.536'],
    ['Hoàn tất bàn giao (finalizeHandover)', '429.632'],
    ['Rút tiền (withdraw)', '40.694'],
  ].map((r, i) => r.map((t, j) => ({ text: t, options: { bold: i === 0, color: i === 0 ? HEX.lt1 : HEX.dk1, fill: { color: i === 0 ? HEX.dk2 : (i % 2 ? HEX.lt1 : HEX.lt2) }, align: j === 1 ? 'right' : 'left', valign: 'middle' } })));
  s.addTable(rows, { x: M, y: 1.25, w: 5.2, colW: [3.8, 1.4], fontSize: 12, fontFace: 'Arial', rowH: 0.42, border: { type: 'solid', pt: 0.5, color: HEX.accent5 }, margin: [0, 0.1, 0, 0.1] });
  s.addText('Giao dịch thực nghiệm #1, 07/11/2026, ví SafeL2 1.5.0', { x: M, y: 3.88, w: 5.2, h: 0.3, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
  card(s, 6.05, 1.25, 3.45, 2.55, C.background2);
  s.addText([
    { text: 'Hợp đồng ký quỹ', options: { bold: true, color: C.text2, breakLine: true } },
    { text: '0xD0a1fed4…c297009c351', options: { fontFace: 'Courier New', breakLine: true } },
    { text: 'Đã xác minh trên Etherscan', options: { color: C.accent1, breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Sau bàn giao', options: { bold: true, color: C.text2, breakLine: true } },
    { text: 'Owner duy nhất là người mua, không module, không guard; hợp đồng ký quỹ không giữ lại đồng nào.' },
  ], { x: 6.25, y: 1.4, w: 3.1, h: 2.3, fontSize: 12, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
}

// ── 13. Demo ──
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Kết quả' });
  n++;
  s.addText('DEMO', { x: M, y: 0.6, w: 9, h: 0.4, fontSize: 14, bold: true, color: C.accent5, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText('nguyenminhtuyentdmu.github.io/websafeexchange', { x: M, y: 1.1, w: 9, h: 0.7, fontSize: 24, bold: true, color: C.background1, margin: 0, isTextBox: true, hyperlink: { url: 'https://nguyenminhtuyentdmu.github.io/websafeexchange/' } });
  const demo = ['Niêm yết ví và đọc báo cáo của trợ lý', 'Nạp tiền: ví bị khóa', 'Hoàn tất: ví sạch, người mua là owner duy nhất', 'Tra cứu giao dịch và lịch sử theo địa chỉ'];
  demo.forEach((d, i) => {
    const y = 2.2 + i * 0.6;
    s.addText(String(i + 1), { shape: pres.shapes.OVAL, x: M, y, w: 0.42, h: 0.42, fill: { color: C.accent1 }, color: C.background1, fontSize: 14, bold: true, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.6, y, w: 8, h: 0.42, fontSize: 16, color: C.background1, valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addText('Mã nguồn: github.com/nguyenminhtuyenTDMU/websafeexchange', { x: M, y: 4.85, w: 9, h: 0.3, fontSize: 12, color: C.accent5, margin: 0, isTextBox: true });
  s.addNotes('Chuyển sang trình duyệt có MetaMask ở mạng Sepolia. Nếu mạng chậm, dùng ảnh chụp trong báo cáo chương 4.');
}

// ── 14. Kết luận ──
pres.addSection({ title: 'Kết luận' });
{
  const s = content('Kết luận', 'Kết luận',
    'Đạt đủ các mục tiêu đề cương. Hạn chế chính là quyền đã ủy thác ra ngoài ví, như allowance hay chữ ký đã lưu, không phát hiện được bằng cách đọc trạng thái ví; hệ thống chưa được kiểm toán độc lập. Hướng phát triển bám đề cương: hồ sơ uy tín, khu vực niêm yết, mở rộng loại tài sản và loại ví.');
  const cols = [
    ['Đạt được', C.accent1, ['Hợp đồng ký quỹ bàn giao nguyên tử, không khóa quản trị', 'Kiến trúc hai trục, adapter cho Safe', '13 kịch bản tấn công có bằng chứng kiểm chứng', 'Dapp, trợ lý, tra cứu; chạy thật trên Sepolia']],
    ['Hạn chế', C.accent2, ['Quyền đã ủy thác ra ngoài ví (allowance, chữ ký đã lưu)', 'Token rebase, thu phí khi chuyển', 'Giới hạn 10 owner, 20 tài sản', 'Chưa kiểm toán độc lập']],
    ['Hướng phát triển', C.accent6, ['Hồ sơ uy tín on-chain, khu vực niêm yết', 'Tài sản DeFi, quyền DAO; ví ERC-4337', 'Bàn giao đa mạng', 'Subgraph, WalletConnect, kiểm chứng hình thức']],
  ];
  cols.forEach(([h, col, items], i) => {
    const x = M + i * 3.07;
    card(s, x, 1.25, 2.86, 3.4);
    tag(s, h, x + 0.18, 1.42, col, C.background1, 1.75);
    s.addText(items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })),
      { x: x + 0.18, y: 1.9, w: 2.55, h: 2.65, fontSize: 12, color: C.text1, valign: 'top', margin: 0, paraSpaceAfter: 6, isTextBox: true });
  });
}

// ── 15. Cảm ơn ──
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Kết luận' });
  n++;
  s.addText('Em xin cảm ơn quý thầy cô đã lắng nghe', { x: M, y: 1.6, w: 9, h: 0.9, fontSize: 32, bold: true, color: C.background1, margin: 0, isTextBox: true });
  s.addText('Kính mong nhận được câu hỏi và góp ý của hội đồng', { x: M, y: 2.5, w: 9, h: 0.5, fontSize: 18, color: C.accent5, margin: 0, isTextBox: true });
  s.addText([
    { text: 'Dapp: nguyenminhtuyentdmu.github.io/websafeexchange', options: { breakLine: true } },
    { text: 'Mã nguồn: github.com/nguyenminhtuyenTDMU/websafeexchange' },
  ], { x: M, y: 4.3, w: 9, h: 0.7, fontSize: 12, color: C.accent5, margin: 0, paraSpaceAfter: 4, isTextBox: true });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  if (APPLY_THEME) await require(APPLY_THEME).applyTheme(OUT, THEME);
  console.log(`Đã tạo ${OUT} (${n + 1} slide)`);
})();
