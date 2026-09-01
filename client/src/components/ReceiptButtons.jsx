import React, { useRef } from 'react';
import Receipt from './Receipt';
import { receiptService } from '../services/receipt';
import { Eye, Download, Printer, MessageCircle, Mail } from 'lucide-react';

const PRINT_STYLES = `
  body { margin: 0; padding: 24px; background: #F3F4F6; display: flex; justify-content: center; }
  @media print {
    body { background: #fff; padding: 0; }
  }
`;

const ReceiptButtons = ({ order, martInfo = {}, receipt = null }) => {
    const containerRef = useRef();

    const openReceiptWindow = ({ autoPrint = false } = {}) => {
        const html = (containerRef.current && containerRef.current.outerHTML) || document.querySelector('.receipt-root')?.outerHTML;
        if (!html) return null;

        const win = window.open('', '_blank', 'width=860,height=1000');
        if (!win) return null;

        win.document.write(`
  <html>
    <head>
      <title>Receipt${order?.orderCode ? ' - ' + order.orderCode : ''}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>${PRINT_STYLES}</style>
    </head>
    <body>${html}</body>
  </html>
`);
        win.document.close();

        if (autoPrint) {
            win.onload = () => {
                win.focus();
                win.print();
            };
        }
        return win;
    };

    const handleView = () => {
        openReceiptWindow();
    };

    const handleDownload = async () => {
        const el = containerRef.current || document.querySelector('.receipt-root');
        await receiptService.downloadPdfFromElement(
            el,
            `receipt-${order.orderID || order.orderCode}.pdf`,
            'a4'
        );
    };

    const handlePrint = () => {
        const win = openReceiptWindow({ autoPrint: true });
        if (win) {
            // give the tailwind CDN + layout a moment before printing
            setTimeout(() => {
                win.focus();
                win.print();
            }, 400);
        }
    };

    const handleShareWhatsApp = () => {
        const url = window.location.href;
        const text = `Your receipt for order ${order.orderCode || order.orderID}: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleEmail = () => {
        const subject = `Receipt for order ${order.orderCode || order.orderID}`;
        const body = `Please find your receipt for order ${order.orderCode || order.orderID}.`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
            body
        )}`;
    };

    const baseBtn =
        'inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5 transition-colors duration-150 border';

    return (
        <div className="space-y-3">
            {/* offscreen but mounted so html2canvas can render it */}
            <div style={{ position: 'absolute', left: -9999, top: 0, width: 840, zIndex: -1 }} aria-hidden>
                <Receipt ref={containerRef} data={{ order, receipt }} martInfo={martInfo} />
            </div>

            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={handleView}
                    className={`${baseBtn} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
                >
                    <Eye size={16} /> View Receipt
                </button>

                <button
                    type="button"
                    onClick={handleDownload}
                    className={`${baseBtn} text-white border-transparent`}
                    style={{ background: 'linear-gradient(90deg,#4F46E5,#7C3AED)' }}
                >
                    <Download size={16} /> Download PDF
                </button>

                <button
                    type="button"
                    onClick={handlePrint}
                    className={`${baseBtn} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
                >
                    <Printer size={16} /> Print
                </button>

                {/* <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className={`${baseBtn} bg-white text-green-700 border-green-200 hover:bg-green-50`}
                >
                    <MessageCircle size={16} /> WhatsApp
                </button>

                <button
                    type="button"
                    onClick={handleEmail}
                    className={`${baseBtn} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
                >
                    <Mail size={16} /> Email
                </button> */}
            </div>
        </div>
    );
};

export default ReceiptButtons;