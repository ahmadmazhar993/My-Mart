import api from './api';

// Adjust if badge text in the PDF still looks slightly high/low.
const BADGE_TEXT_NUDGE_PX = 3;

export const receiptService = {
  getReceiptByOrderId: (orderId) => api.get(`/receipts/order/${orderId}`),
  // Generate PDF from a DOM element (receipt container)
async downloadPdfFromElement(el, filename = 'receipt.pdf', format = 'a4') {
  if (!el) throw new Error('Element is required');

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const SCALE = 2;

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // The receipt lives in an off-screen wrapper (left: -9999). Capture a fixed-width clone that is
  // moved back into view so the PDF is laid out exactly like the on-screen receipt.
  const width = Math.min(el.offsetWidth || 720, 720);
  const canvas = await html2canvas(el, {
    scale: SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    width,
    windowWidth: Math.max(width, 840),
    onclone: (doc) => {
      const clone = doc.querySelector('.receipt-root');
      if (!clone) return;
      clone.style.width = `${width}px`;
      clone.style.maxWidth = `${width}px`;
      clone.style.margin = '0';
      // html2canvas draws text inside fixed-height badges a few px low; lift it back to centre.
      // Only affects this off-screen clone, never the on-screen/print receipt.
      clone.querySelectorAll('.pdf-nudge').forEach((n) => {
        n.style.position = 'relative';
        n.style.top = `-${n.dataset.nudge || BADGE_TEXT_NUDGE_PX}px`;
      });
      for (let p = clone.parentElement; p && p !== doc.body; p = p.parentElement) {
        p.style.position = 'static';
        p.style.left = '0';
        p.style.top = '0';
        p.style.width = 'auto';
        p.style.zIndex = 'auto';
      }
    },
  });

  const imgData = canvas.toDataURL('image/png');

  // --- Thermal 80mm receipt printer format ---
  if (format === 'thermal80') {
    const pxToMm = 25.4 / 96; // standard 96dpi px->mm conversion
    const widthMm = 80;
    // undo the html2canvas scale factor before converting to mm
    const heightMm = (canvas.height / SCALE) * pxToMm;

    const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm] });
    pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
    pdf.save(filename);
    return;
  }

  // --- A4 / Letter format: receipt centred on the page with a margin around it ---
  const pdf = new jsPDF('p', 'mm', format === 'a4' ? 'a4' : 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const imgW = maxW;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= maxH) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
    pdf.save(filename);
    return;
  }

  // Long receipts: slice the canvas into page-sized strips so every page keeps its margin.
  const sliceHpx = Math.floor((maxH * canvas.width) / imgW);
  for (let y = 0, page = 0; y < canvas.height; y += sliceHpx, page += 1) {
    const h = Math.min(sliceHpx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, imgW, (h * imgW) / canvas.width);
  }
  pdf.save(filename);
  },
};
