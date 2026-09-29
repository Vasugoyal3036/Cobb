import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { triggerThermalPrint, DEFAULT_STORE_INFO } from '../utils/thermalReceipt';

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  receiptType = 'bill',
  billData = null,
  alterationData = null,
  exchangeData = null,
  storeInfo = DEFAULT_STORE_INFO
}) {
  const [paperWidth, setPaperWidth] = useState('80mm');

  const activeBill = billData || {};
  const activeAlt  = alterationData || {};

  const totalAmount    = Number(activeBill.Amount || activeBill.NET_AMOUNT || activeAlt.amount || 0);
  const grossAmount    = Number(activeBill.GrossAmount || activeBill.GROSS_AMOUNT || totalAmount);
  const discountAmount = Number(activeBill.DiscountAmount || activeBill.DISCOUNT_AMOUNT || 0);
  const discountPct    = grossAmount > 0 ? ((discountAmount / grossAmount) * 100).toFixed(1) : 0;

  const totalGst   = Number(activeBill.TotalGst || activeBill.TOTAL_GST_AMOUNT || 0);
  const cgst       = Number(activeBill.CGST || activeBill.Cgst || (totalGst > 0 ? totalGst / 2 : 0));
  const sgst       = Number(activeBill.SGST || activeBill.Sgst || (totalGst > 0 ? totalGst / 2 : 0));
  const igst       = Number(activeBill.IGST || activeBill.Igst || 0);
  const taxableVal = totalAmount - totalGst;

  const salesperson = activeBill.Salesperson || activeBill.SALESPERSON_NAME || '';

  if (!isOpen) return null;

  const items = activeBill.Items || activeBill.items || [];
  const charWidth = paperWidth === '80mm' ? 300 : 230;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Thermal Slip Generator (ESC/POS)</h3>
              <p className="text-xs text-slate-500">Optimized for 80mm &amp; 58mm POS thermal roll printers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium mr-1">Roll Width:</span>
            {['80mm', '58mm'].map(w => (
              <button
                key={w}
                onClick={() => setPaperWidth(w)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${paperWidth === w ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                {w === '80mm' ? '80mm (Standard)' : '58mm (Mini)'}
              </button>
            ))}
          </div>
          <button
            onClick={() => triggerThermalPrint('thermal-receipt-printable')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            Print Now
          </button>
        </div>

        {/* Paper Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60 dark:bg-slate-950 flex justify-center items-start">
          <div
            id="thermal-receipt-printable"
            style={{ width: `${charWidth}px` }}
            className="bg-white text-black p-4 font-mono text-xs shadow-xl border border-slate-300 relative rounded-sm transition-all"
          >
            {/* Store Header */}
            <div className="text-center font-black text-sm tracking-wide mb-0.5">
              {storeInfo?.name || 'COBB APPARELS'}
            </div>
            <div className="text-center text-[10px] text-slate-700 leading-tight">
              {storeInfo?.address || 'Fatehpur Road, Pundri, Haryana'}
            </div>
            <div className="text-center text-[10px] text-slate-700 leading-tight">
              Tel: {storeInfo?.phone || '+91 91381 22820'}
            </div>
            <div className="text-center text-[10px] text-slate-700 leading-tight">
              GSTIN: {storeInfo?.gstin || '06AABCC1234F1Z5'}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Document Title */}
            <div className="text-center font-bold text-xs uppercase tracking-wider">
              {receiptType === 'bill' && 'RETAIL TAX INVOICE'}
              {receiptType === 'alteration' && 'ALTERATION WORK JOB CARD'}
              {receiptType === 'exchange' && 'CREDIT NOTE / EXCHANGE SLIP'}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Bill Meta */}
            <div className="text-[11px] leading-relaxed space-y-0.5">
              <div className="flex justify-between">
                <span>Bill/Doc No:</span>
                <span className="font-bold">{activeBill.BillNumber || activeBill.CM_NO || activeAlt.tokenNumber || 'AUTO'}</span>
              </div>
              <div className="flex justify-between">
                <span>Date &amp; Time:</span>
                <span>{activeBill.BillTime ? new Date(activeBill.BillTime).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</span>
              </div>
              {(activeBill.CustomerName || activeAlt.customerName) && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{activeBill.CustomerName || activeAlt.customerName}</span>
                </div>
              )}
              {(activeBill.Phone || activeAlt.customerPhone) && (
                <div className="flex justify-between">
                  <span>Mobile:</span>
                  <span>{activeBill.Phone || activeAlt.customerPhone}</span>
                </div>
              )}
              {salesperson && (
                <div className="flex justify-between">
                  <span>Served by:</span>
                  <span className="font-bold">{salesperson}</span>
                </div>
              )}
              {(() => {
                let mode = activeBill.PaymentMode;
                const cash = Number(activeBill.CashAmount || 0);
                const upi = Number(activeBill.UpiAmount || 0);
                const card = Number(activeBill.CardAmount || 0);
                if (!mode || mode === 'Cash') {
                  if (upi > 0 && cash === 0 && card === 0) mode = 'UPI / Online';
                  else if (card > 0 && cash === 0 && upi === 0) mode = 'Debit / Credit Card';
                  else if ((cash > 0 && upi > 0) || (cash > 0 && card > 0) || (upi > 0 && card > 0)) mode = 'Split Payment';
                  else mode = mode || 'Cash';
                }
                return mode ? (
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="font-bold uppercase">{mode}</span>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Alteration Job Card */}
            {receiptType === 'alteration' && (
              <div className="text-[11px] bg-slate-50 p-2 border border-black mb-2">
                <div className="font-bold text-center underline mb-1">TAILOR SPECIFICATIONS</div>
                <div className="flex justify-between"><span>Item:</span><span className="font-bold">{activeAlt.item || 'Pant / Shirt'}</span></div>
                <div className="flex justify-between"><span>Adjustment:</span><span className="font-bold">{activeAlt.type || 'Length / Waist'}</span></div>
                <div className="flex justify-between">
                  <span>Promised Delivery:</span>
                  <span className="font-bold text-red-600">{activeAlt.deliveryDate || 'Tomorrow 6:00 PM'}</span>
                </div>
                {activeAlt.notes && (
                  <div className="mt-1"><span className="font-semibold">Notes: </span><span>{activeAlt.notes}</span></div>
                )}
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 ? (
              <table className="w-full text-[11px] mb-2">
                <thead>
                  <tr className="border-b border-dashed border-black">
                    <th className="text-left py-1">Item / Size</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">MRP</th>
                    <th className="text-right py-1">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const qty      = Number(it.Quantity || 1);
                    const netPrice = Number(it.NetPrice || it.NET || 0);
                    const mrp      = Number(it.MRP || it.Mrp || it.RATE || netPrice);
                    const itemDisc = mrp > 0 && mrp !== netPrice ? ((mrp - netPrice) / mrp * 100).toFixed(0) : null;
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1">
                          <div className="font-bold leading-tight">{it.ArticleName || it.ARTICLE_NAME || it.ArticleNo || 'Apparel'}</div>
                          <div className="text-[9px] text-slate-600">
                            {it.Size || it.PARA2_NAME || ''}{it.Color ? ` • ${it.Color}` : ''}
                            {itemDisc ? <span className="ml-1 text-green-700 font-semibold">({itemDisc}% off)</span> : null}
                          </div>
                        </td>
                        <td className="text-center py-1 font-bold">{qty}</td>
                        <td className="text-right py-1 text-slate-500">&#8377;{mrp.toLocaleString('en-IN')}</td>
                        <td className="text-right py-1 font-bold">&#8377;{(qty * netPrice).toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              receiptType !== 'alteration' && (
                <div className="text-center text-slate-500 py-2 italic text-[10px]">General Store Sale</div>
              )
            )}

            <div className="border-t border-dashed border-black my-2" />

            {/* Financial Summary */}
            <div className="text-[11px] space-y-0.5">
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Amount:</span>
                    <span>&#8377;{grossAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Discount ({discountPct}%):</span>
                    <span>- &#8377;{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {totalGst > 0 && (
                <>
                  <div className="flex justify-between text-slate-600 mt-1">
                    <span>Taxable Value:</span>
                    <span>&#8377;{taxableVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  {igst > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST:</span>
                      <span>&#8377;{igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      {cgst > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>CGST:</span>
                          <span>&#8377;{cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {sgst > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>SGST:</span>
                          <span>&#8377;{sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total GST:</span>
                    <span>&#8377;{totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between font-black text-sm border-y-2 border-black py-1 mt-1">
                <span>NET TOTAL:</span>
                <span>&#8377;{totalAmount.toLocaleString('en-IN')}</span>
              </div>

              {activeBill.CashAmount > 0 && (
                <div className="flex justify-between pt-0.5">
                  <span>Cash Paid:</span>
                  <span>&#8377;{Number(activeBill.CashAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {activeBill.UpiAmount > 0 && (
                <div className="flex justify-between">
                  <span>UPI Paid:</span>
                  <span>&#8377;{Number(activeBill.UpiAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {activeBill.CardAmount > 0 && (
                <div className="flex justify-between">
                  <span>Card Paid:</span>
                  <span>&#8377;{Number(activeBill.CardAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Customer Signature */}
            <div className="mt-3 text-[10px]">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-slate-500 mb-5">Customer Signature:</div>
                  <div className="border-b border-black w-28" />
                </div>
                <div className="text-right">
                  <div className="text-slate-500 mb-5">Authorised by:</div>
                  <div className="border-b border-black w-24" />
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Footer */}
            <div className="text-center text-[9px] text-slate-600 leading-tight space-y-0.5">
              <div>* Goods once sold can be exchanged within 7 days.</div>
              <div>* Must bring this original bill with price tags intact.</div>
              <div className="font-bold text-black mt-1">*** THANK YOU! VISIT COBB AGAIN ***</div>
            </div>

            <div className="w-full flex justify-between mt-3 overflow-hidden text-[8px] text-slate-400 select-none">
              ▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼▲▼
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
