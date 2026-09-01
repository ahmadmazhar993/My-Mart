import api from './api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const receiptService = {
  getReceiptByOrderId: (orderId) => api.get(`/receipts/order/${orderId}`),
  // Generate PDF from a DOM element (receipt container)
async downloadPdfFromElement(el, filename = 'receipt.pdf', format = 'a4') {
  if (!el) throw new Error('Element is required');

  const SCALE = 2;

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const original = {
    height: el.style.height,
    maxHeight: el.style.maxHeight,
    overflow: el.style.overflow,
  };

  el.style.height = 'auto';
  el.style.maxHeight = 'none';
  el.style.overflow = 'visible';

  let canvas;
  try {
    canvas = await html2canvas(el, {
      scale: SCALE,
      useCORS: true,
      allowTaint: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      height: el.scrollHeight,
      width: el.scrollWidth,
    });
  } finally {
    el.style.height = original.height;
    el.style.maxHeight = original.maxHeight;
    el.style.overflow = original.overflow;
  }

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

    // --- A4 / Letter format ---
    const pdf = new jsPDF('p', 'mm', format === 'a4' ? 'a4' : 'letter');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    // If the content fits on a single page, just add and save
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
      return;
    }

    // Multi-page: slide the full image up by one page height each iteration
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  },
};