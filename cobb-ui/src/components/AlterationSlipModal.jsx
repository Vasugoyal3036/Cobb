import React, { useState } from 'react';
import { X, Printer, Scissors, Calendar, User, Phone, Save } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AlterationSlipModal({
  isOpen,
  onClose,
  initialData = null,
  darkMode = true,
  storeId = 'DEMO_STORE_001',
  showToast
}) {
  const [customerName, setCustomerName] = useState(initialData?.CustomerName || '');
  const [phone, setPhone] = useState(initialData?.Phone || '9138122820');
  const [category, setCategory] = useState(initialData?.Category || 'Trouser');
  const [quantity, setQuantity] = useState(initialData?.Quantity || '1');
  const [instructions, setInstructions] = useState('');
  const [tailorName, setTailorName] = useState('Akshat Goyal');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handlePrintAndSave = async (onlySave = false) => {
    // 1. Save to database
    try {
      setIsSaving(true);
      const targetStore = storeId === 'ALL' ? 'DEMO_STORE_001' : storeId;
      const alterationsRef = collection(db, `stores/${targetStore}/alterations`);
      await addDoc(alterationsRef, {
        customerName,
        phone,
        category,
        quantity: parseInt(quantity, 10) || 1,
        instructions,
        tailorName,
        expectedDate,
        createdAt: serverTimestamp(),
        status: 'Pending',
        storeName: 'Cobb Garments Pundri'
      });
      showToast?.('Alteration slip saved to database!', 'success');
    } catch (err) {
      console.error('Error saving alteration:', err);
      showToast?.('Failed to save to database. Proceeding to print.', 'error');
    } finally {
      setIsSaving(false);
    }

    if (onlySave) {
      onClose();
      return;
    }

    // 2. Print via popup window
    setIsPrinting(true);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      showToast?.('Popup blocked! Please allow popups to print.', 'error');
      setIsPrinting(false);
      return;
    }

    const printHtml = `
      <html>
        <head>
          <title>Alteration Slip</title>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 300px; /* Thermal printer width */
              margin: 0 auto;
              padding: 10px;
              color: #000;
              font-size: 14px;
              line-height: 1.4;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .title { font-weight: bold; font-size: 18px; margin: 0; }
            .subtitle { font-size: 12px; margin: 5px 0 0 0; }
            .section { margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { font-weight: bold; }
            .instructions { margin-top: 5px; border: 1px solid #000; padding: 5px; min-height: 40px; }
            .footer { text-align: center; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-size: 12px; }
            .signature { margin-top: 30px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">COBB GARMENTS PUNDRI</h1>
            <p class="subtitle">ALTERATION SLIP</p>
          </div>
          
          <div class="section">
            <div class="row"><span class="label">Date:</span> <span>${new Date().toLocaleDateString()}</span></div>
            <div class="row"><span class="label">Exp. Date:</span> <span>${new Date(expectedDate).toLocaleDateString()}</span></div>
          </div>

          <div class="section">
            <div class="row"><span class="label">Customer:</span> <span>${customerName || 'Walk-in'}</span></div>
            <div class="row"><span class="label">Phone:</span> <span>${phone}</span></div>
          </div>

          <div class="section">
            <div class="row"><span class="label">Category:</span> <span>${category}</span></div>
            <div class="row"><span class="label">Quantity:</span> <span>${quantity}</span></div>
            <div class="label">Instructions:</div>
            <div class="instructions">${instructions || 'None'}</div>
          </div>
          
          <div class="signature">
            <p>Auth: <strong>${tailorName}</strong></p>
          </div>

          <div class="footer">
            Thank you for shopping with Cobb!<br/>
            Please bring this slip for pickup.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    
    // Give time to render then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
      onClose(); // Close modal after print
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          darkMode ? 'bg-[#141720] border-[#2e3342]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
              <Scissors className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              New Alteration Slip
            </h3>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Store Info Readonly */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            darkMode ? 'bg-[#141720] border-[#2e3342]' : 'bg-slate-50 border-slate-200'
          }`}>
            <Printer className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Printing Location</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cobb Garments Pundri</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Customer Name (Optional)</label>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition ${
                    darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Mobile Number</label>
              <div className="relative">
                <Phone className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition ${
                    darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Expected Date</label>
              <div className="relative">
                <Calendar className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition ${
                    darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Cloth Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Trouser"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="col-span-1">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="col-span-2">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Alteration Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Length reduce by 2 inches, Waist loose by 1 inch"
                rows={2}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition resize-none ${
                  darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="col-span-2">
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Authorized Signature (Preset)</label>
              <input
                type="text"
                value={tailorName}
                onChange={e => setTailorName(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  darkMode ? 'bg-[#161922] border-[#2e3342] text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t flex justify-end gap-3 ${
          darkMode ? 'bg-[#141720] border-[#2e3342]' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-bold rounded-lg border transition ${
              darkMode ? 'bg-transparent border-[#2e3342] text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Cancel
          </button>
          
          <button
            onClick={() => handlePrintAndSave(true)}
            disabled={isPrinting || isSaving}
            className={`px-4 py-2 text-sm font-bold rounded-lg border transition flex items-center gap-2 ${
              darkMode ? 'bg-[#181b24] border-[#2e3342] text-slate-200 hover:bg-[#202532]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isSaving && !isPrinting ? (
              <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Only</span>
          </button>

          <button
            onClick={() => handlePrintAndSave(false)}
            disabled={isPrinting || isSaving}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-70"
          >
            {isPrinting || isSaving ? (
              <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>Save & Print Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
