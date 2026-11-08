// Tạo bản nháp BCTN theo Điều 43–44 (Quy định trình bày BCTN, ĐH Thủ Dầu Một).
// Chạy: npm run build (trong report/) → build.cjs tạo build/raw.docx, update-index.py cập nhật mục lục bằng LibreOffice
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LineRuleType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, ImageRun,
  Footer, PageNumber, NumberFormat, TableOfContents, LevelFormat, PageBreak,
} = require('docx');
const C = require('./content.cjs');

// ── Đánh số bảng / hình theo chương (Bảng 2.3, Hình 3.1; phụ lục: Bảng A.1) và thay [[key]] trong văn bản ──
const labels = {};
{
  let chap = null; const cnt = {};
  for (const it of [...C.moDau, ...C.ch1, ...C.ch2, ...C.placeholders, ...C.appendix]) {
    if (it.h1) {
      const m = it.h1.match(/^CHƯƠNG (\d+)/) || it.h1.match(/^PHỤ LỤC ([A-Z])/);
      chap = m ? m[1] : null; cnt.table = 0; cnt.fig = 0;
    }
    for (const kind of ['table', 'fig']) {
      if (it[kind] === undefined || !it.key) continue;
      const label = `${kind === 'table' ? 'Bảng' : 'Hình'} ${chap}.${++cnt[kind]}`;
      labels[it.key] = label;
      it[kind] = `${label}. ${it[kind]}`;
    }
  }
}
const fixRefs = (s) => s.replace(/\[\[(\w+)\]\]/g, (_, k) => {
  if (!labels[k]) throw new Error(`Không tìm thấy nhãn [[${k}]]`);
  return labels[k];
});

const FONT = 'Times New Roman';
const SIZE = 28; // 14pt
const CM = (x) => Math.round(x * 567); // cm → twip
const SPACING = { before: 80, after: 80, line: 400, lineRule: LineRuleType.AT_LEAST }; // 4pt / 4pt / at least 20pt
const DIAG = path.join(__dirname, '..', 'docs', 'diagrams');
const TEXT_W = 21 - 3.5 - 2; // cm

// ── Tài liệu tham khảo: xếp theo a, b, c rồi đánh số lại trích dẫn trong bài ──
const sortKey = (t) => (t.startsWith('[') ? 'Bybit' : t).toLowerCase();
const order = C.refs.map((t, i) => ({ t, old: i + 1 })).sort((a, b) => sortKey(a.t).localeCompare(sortKey(b.t)));
const renum = {}; order.forEach((r, i) => { renum[r.old] = i + 1; });
// nhóm trích dẫn liền nhau: đánh số mới, xếp tăng dần, viết dạng [4],[14],[15]
const fixCite = (s) => s.replace(/\[\d+\](?:,\s*\[\d+\])*/g, (grp) =>
  grp.match(/\d+/g).map((n) => renum[n] ?? Number(n)).sort((a, b) => a - b).map((n) => `[${n}]`).join(','));

// ── Inline: **đậm**, `mã` ──
function runs(text, base = {}) {
  text = fixCite(fixRefs(text));
  return text.split(/(\*\*.+?\*\*|`.+?`)/g).filter(Boolean).map((part) => {
    if (part.startsWith('**')) return new TextRun({ ...base, text: part.slice(2, -2), bold: true });
    if (part.startsWith('`')) return new TextRun({ ...base, text: part.slice(1, -1), font: 'Courier New', size: (base.size || SIZE) - 4 });
    return new TextRun({ ...base, text: part });
  });
}
const P = (text, opt = {}) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: CM(1) }, spacing: SPACING, ...opt, children: runs(text, opt.run || {}) });
const center = (text, run = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: SPACING, children: runs(text, run) });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });


function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function figure(item) {
  const file = path.join(DIAG, item.img);
  const { w, h } = pngSize(file);
  const widthCm = Math.min(item.w || TEXT_W, TEXT_W);
  const px = Math.round(widthCm / 2.54 * 96);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: px, height: Math.round(px * h / w) } })] }),
    new Paragraph({ style: 'CaptionFigure', children: runs(item.fig) }),
  ];
}
function table(item) {
  const totalTw = CM(TEXT_W);
  const sum = item.widths.reduce((a, b) => a + b, 0);
  const colW = item.widths.map((w) => Math.round(totalTw * w / sum));
  colW[colW.length - 1] = totalTw - colW.slice(0, -1).reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text, i, head) => new TableCell({
    width: { size: colW[i], type: WidthType.DXA }, borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: head ? { fill: 'E7E6E6', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({ alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 20, after: 20, line: 300, lineRule: LineRuleType.AT_LEAST },
      children: runs(text, { size: 26, bold: head || undefined }) })],
  });
  return [
    new Paragraph({ style: 'CaptionTable', children: runs(item.table) }),
    new Table({
      width: { size: totalTw, type: WidthType.DXA }, columnWidths: colW,
      rows: [
        new TableRow({ tableHeader: true, children: item.cols.map((c, i) => cell(c, i, true)) }),
        ...item.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
      ],
    }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [] }),
  ];
}
function render(items) {
  const out = [];
  for (const it of items) {
    if (it.h1) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(it.h1)] }));
    else if (it.h2) out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(it.h2.toUpperCase())] }));
    else if (it.h3) out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(it.h3)] }));
    else if (it.h4) out.push(new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun(it.h4)] }));
    else if (it.p) out.push(P(it.p));
    else if (it.ul) it.ul.forEach((t) => out.push(new Paragraph({ numbering: { reference: 'dash', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: SPACING, children: runs(t) })));
    else if (it.fig) out.push(...figure(it));
    else if (it.table) out.push(...table(it));
  }
  return out;
}

// Nội dung chính (render trước để có danh mục bảng/hình)
const body = render([...C.moDau, ...C.ch1, ...C.ch2, ...C.placeholders]);
body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('TÀI LIỆU THAM KHẢO')] }));
body.push(new Paragraph({ spacing: SPACING, children: [new TextRun({ text: 'Tiếng Anh', bold: true })] }));
order.forEach((r, i) => body.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: SPACING, indent: { left: CM(1), hanging: CM(1) }, children: runs(`${i + 1}. ${r.t}`) })));
body.push(...render(C.appendix));

const frontTitle = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 }, children: [new TextRun({ text: t, bold: true })] });
// khối ký tên căn giữa nửa phải trang
const signLine = (text, run = {}, before = 0) => new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: CM(5) }, spacing: { before, after: 0 }, children: [new TextRun({ text, ...run })] });
const front = [
  frontTitle('LỜI CAM ĐOAN'), ...C.front.camDoan.map((t) => P(t)),
  signLine('Thành phố Hồ Chí Minh, ngày … tháng 12 năm 2026', { italics: true }, 480),
  signLine('Người thực hiện', { bold: true }, 80),
  signLine('Nguyễn Minh Tuyền', { bold: true }, 1440),
  pageBreak(),
  frontTitle('LỜI CẢM ƠN'), ...C.front.camOn.map((t) => P(t)),
  pageBreak(),
  frontTitle('TÓM TẮT'), ...C.front.tomTat.map((t) => P(t)),
  pageBreak(),
  frontTitle('MỤC LỤC'),
  new TableOfContents('MỤC LỤC', { hyperlink: true, headingStyleRange: '1-3' }),
  pageBreak(),
  frontTitle('DANH MỤC CÁC CHỮ VIẾT TẮT'),
  ...table({ table: '', widths: [3, 12.5], cols: ['Từ viết tắt', 'Từ hoặc cụm từ đầy đủ'], rows: C.front.vietTat }).slice(1),
  pageBreak(),
  frontTitle('DANH MỤC CÁC BẢNG'),
  new TableOfContents('Danh mục các bảng', { hyperlink: true, stylesWithLevels: [{ styleName: 'Chu thich bang', level: 1 }] }),
  pageBreak(),
  frontTitle('DANH MỤC CÁC HÌNH'),
  new TableOfContents('Danh mục các hình', { hyperlink: true, stylesWithLevels: [{ styleName: 'Chu thich hinh', level: 1 }] }),
];

// ── Bìa (theo bố cục bài mẫu của Viện: logo, khung viền, thông tin sinh viên lệch phải) ──
function jpgSize(buf) {
  for (let i = 2; i < buf.length;) {
    const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('không đọc được kích thước JPEG');
}
const LOGO = fs.readFileSync(path.join(__dirname, 'assets', 'logo-tdmu.jpg'));
const logoSize = jpgSize(LOGO);
const info = (label, value) => new Paragraph({ indent: { left: CM(4.5) }, spacing: { before: 40, after: 40 }, children: [
  new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value, bold: true })] });
const coverPage = () => [
  center('TRƯỜNG ĐẠI HỌC THỦ DẦU MỘT', { bold: true }),
  center('VIỆN CÔNG NGHỆ SỐ', { bold: true }),
  center('***********'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 360 }, children: [
    new ImageRun({ type: 'jpg', data: LOGO, transformation: { width: 200, height: Math.round(200 * logoSize.h / logoSize.w) } })] }),
  new Paragraph({ spacing: { before: 480 }, children: [] }),
  center('BÁO CÁO TỐT NGHIỆP', { bold: true, size: 36 }),
  new Paragraph({ spacing: { before: 480 }, children: [] }),
  center('ĐỀ TÀI:', { bold: true }),
  center('XÂY DỰNG HỆ THỐNG CHUYỂN GIAO QUYỀN KIỂM SOÁT VÍ ĐA CHỮ KÝ CLEANHANDOVER', { bold: true, size: 30 }),
  new Paragraph({ spacing: { before: 960 }, children: [] }),
  info('Sinh viên thực hiện', 'Nguyễn Minh Tuyền'),
  info('MSSV', '2124801040049'),
  info('Lớp', 'D21HTTT01'),
  info('Khóa', '2021 – 2026'),
  info('Ngành', 'Hệ thống thông tin'),
  info('Giảng viên hướng dẫn', '[học vị] Hồ Đắc Hưng'),
  new Paragraph({ spacing: { before: 1200 }, children: [] }),
  center('Thành phố Hồ Chí Minh, tháng 12/2026', { bold: true }),
];
const cover = coverPage();
const coverBorders = { pageBorders: { display: 'allPages', offsetFrom: 'text' },
  pageBorderTop: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 10 },
  pageBorderBottom: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 10 },
  pageBorderLeft: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 10 },
  pageBorderRight: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 10 } };

const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 26 })] })] });
const page = { size: { width: 11906, height: 16838 }, margin: { left: CM(3.5), right: CM(2), top: CM(2), bottom: CM(2) } };

const hd = (extra) => ({ run: { font: FONT, size: SIZE, color: '000000', ...extra.run }, paragraph: { spacing: { before: 120, after: 120, line: 400, lineRule: LineRuleType.AT_LEAST }, keepNext: true, keepLines: true, ...extra.paragraph } });
const doc = new Document({
  creator: 'Nguyễn Minh Tuyền',
  title: 'Báo cáo tốt nghiệp – CleanHandover (bản nháp)',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: SIZE }, paragraph: { spacing: SPACING } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hd({ run: { bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 }, outlineLevel: 0 } }) },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hd({ run: { bold: true }, paragraph: { alignment: AlignmentType.JUSTIFIED, outlineLevel: 1 } }) },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hd({ run: { bold: true }, paragraph: { alignment: AlignmentType.JUSTIFIED, outlineLevel: 2 } }) },
      { id: 'CaptionTable', name: 'Chu thich bang', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: SIZE, bold: true },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, keepNext: true } },
      { id: 'CaptionFigure', name: 'Chu thich hinh', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: SIZE, italics: true },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 } } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hd({ run: { italics: true }, paragraph: { alignment: AlignmentType.JUSTIFIED, outlineLevel: 3 } }) },
    ],
  },
  numbering: { config: [{ reference: 'dash', levels: [{ level: 0, format: LevelFormat.BULLET, text: '-', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: CM(1.2), hanging: CM(0.6) } } } }] }] },
  sections: [
    { properties: { page: { ...page, borders: coverBorders } }, children: cover },
    // bìa phụ: bắt đầu đánh số La Mã nhưng không in số
    { properties: { page: { ...page, borders: coverBorders, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } }, children: coverPage() },
    { properties: { page: { ...page, pageNumbers: { formatType: NumberFormat.LOWER_ROMAN } } }, footers: { default: footer }, children: front },
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } }, footers: { default: footer }, children: body },
  ],
});

// Bản thô; update-index.py mở bằng LibreOffice, cập nhật mục lục / danh mục rồi lưu thành bản cuối.
const out = path.join(__dirname, 'build', 'raw.docx');
fs.mkdirSync(path.dirname(out), { recursive: true });
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('Đã tạo', out); });
