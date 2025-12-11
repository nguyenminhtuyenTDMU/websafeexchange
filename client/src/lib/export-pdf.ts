import jsPDF from 'jspdf';

interface EvidenceData {
  hash: string;
  signature: string;
  signerAddress: string;
  timestamp: string;
  tradeId?: string;
  payload?: string;
}

export function exportEvidencePDF(evidence: EvidenceData): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SAFEEXCHANGE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Bang chung giao dich', pageWidth / 2, y, { align: 'center' });
  y += 15;

  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Thong tin bang chung', margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const addField = (label: string, value: string, isCode: boolean = false) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', margin, y);
    y += 5;
    
    pdf.setFont('helvetica', 'normal');
    
    if (isCode && value.length > 60) {
      const lines = pdf.splitTextToSize(value, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * 4 + 5;
    } else {
      pdf.text(value || 'Khong co', margin, y);
      y += 8;
    }
  };

  addField('Thoi gian tao', formatDateTime(evidence.timestamp));
  y += 3;

  if (evidence.tradeId) {
    addField('Ma giao dich (Trade ID)', evidence.tradeId);
    y += 3;
  }

  addField('Dia chi nguoi ky', evidence.signerAddress, true);
  y += 3;
  
  addField('Hash (Keccak-256)', evidence.hash, true);
  y += 3;
  
  addField('Chu ky so ECDSA', evidence.signature, true);
  y += 5;

  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Huong dan xac minh', margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  const instructions = [
    '1. Su dung ham ecrecover cua Ethereum de xac minh chu ky.',
    '2. So sanh dia chi khoi phuc duoc voi dia chi nguoi ky.',
    '3. Neu trung khop, bang chung la hop le va chua bi thay doi.',
    '4. Hash duoc tinh bang Keccak-256 cua noi dung goc.',
  ];
  
  instructions.forEach((instruction) => {
    pdf.text(instruction, margin, y);
    y += 5;
  });

  y += 10;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  if (evidence.payload) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Noi dung goc', margin, y);
    y += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    try {
      const parsed = JSON.parse(evidence.payload);
      const formattedPayload = JSON.stringify(parsed, null, 2);
      const lines = pdf.splitTextToSize(formattedPayload, contentWidth);
      
      if (y + lines.length * 4 > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      
      pdf.text(lines, margin, y);
      y += lines.length * 4 + 10;
    } catch {
      const lines = pdf.splitTextToSize(evidence.payload, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * 4 + 10;
    }
  }

  const footerY = pdf.internal.pageSize.getHeight() - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(128);
  pdf.text(
    'Tai lieu nay duoc tao tu dong boi SAFEEXCHANGE',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  pdf.text(
    `Ngay xuat: ${formatDateTime(new Date().toISOString())}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  const fileName = `evidence-${evidence.hash.slice(0, 10)}-${Date.now()}.pdf`;
  pdf.save(fileName);
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function exportTradeEvidencePDF(trade: {
  id: string;
  safeAddress: string;
  sellerAddress: string;
  buyerAddress?: string | null;
  priceEth: string;
  status: string;
  createdAt: string;
  deadline: string;
}): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SAFEEXCHANGE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Bien ban giao dich', pageWidth / 2, y, { align: 'center' });
  y += 15;

  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Thong tin giao dich', margin, y);
  y += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const addRow = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || 'Khong co', margin + 50, y);
    y += 7;
  };

  addRow('Ma giao dich', trade.id);
  addRow('Dia chi Safe', trade.safeAddress);
  addRow('Nguoi ban', trade.sellerAddress);
  addRow('Nguoi mua', trade.buyerAddress || 'Chua co');
  addRow('Gia (ETH)', trade.priceEth + ' ETH');
  addRow('Trang thai', translateStatus(trade.status));
  addRow('Ngay tao', formatDateTime(trade.createdAt));
  addRow('Han chot', formatDateTime(trade.deadline));

  y += 10;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  pdf.setFontSize(8);
  pdf.setTextColor(128);
  pdf.text(
    'Tai lieu nay chi mang tinh chat tham khao.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  const fileName = `trade-${trade.id.slice(0, 8)}-${Date.now()}.pdf`;
  pdf.save(fileName);
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Nhap',
    LISTED: 'Da dang',
    JOINED: 'Da tham gia',
    ARMED: 'Da kich hoat',
    FUNDED: 'Da ky quy',
    COMPLETED: 'Hoan tat',
    CANCELLED: 'Da huy',
  };
  return statusMap[status] || status;
}
