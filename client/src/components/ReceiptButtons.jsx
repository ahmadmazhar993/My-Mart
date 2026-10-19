import React, { useRef, useState } from 'react';
import Receipt from './Receipt';
import { receiptService } from '../services/receipt';
import { Eye, Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';

const PRINT_STYLES = `
  body { margin: 0; padding: 16px; background: #F3F4F6; display: flex; justify-content: center; }
  @media print {
    body { background: #fff; padding: 0; }
  }
`;

const ReceiptButtons = ({ order, martInfo = {}, receipt = null }) => {
    const containerRef = useRef();
    const { addToast } = useToast();
    const [downloading, setDownloading] = useState(false);

    const openReceiptWindow = ({ autoPrint = false } = {}) => {
        const html = (containerRef.current && containerRef.current.outerHTML) || document.querySelector('.receipt-root')?.outerHTML;
        if (!html) return null;

        const win = window.open('', '_blank', 'width=860,height=1000');
        if (!win) return null;

        win.document.write(`
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
        if (downloading) return;
        const el = containerRef.current || document.querySelector('.receipt-root');
        setDownloading(true);
        addToast('Preparing your receipt…', 'info');
        try {
            await receiptService.downloadPdfFromElement(
                el,
                `receipt-${receipt?.invoice_number || order.invoice_number || order.display_order_id || order.orderCode || order.orderID || order.id}.pdf`,
                'a4'
            );
            addToast('Receipt downloaded', 'success');
        } catch (err) {
            addToast('Could not download the receipt. Please try again.', 'error');
        } finally {
            setDownloading(false);
        }
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
                    disabled={downloading}
                    aria-busy={downloading}
                    className={`${baseBtn} bg-primary text-white border-transparent hover:bg-primary-600 disabled:cursor-wait disabled:opacity-70`}
                >
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {downloading ? 'Preparing PDF…' : 'Download PDF'}
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