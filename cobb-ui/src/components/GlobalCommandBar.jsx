import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Package, Users, Receipt, ArrowRight, X, UserCircle, Tag } from 'lucide-react';

export default function GlobalCommandBar({ isOpen, onClose, darkMode, globalCustomers = [], liveBills = [], inventory = [], setActiveTab }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const matches = [];

    // Search Customers
    if (globalCustomers && Array.isArray(globalCustomers)) {
      const customers = globalCustomers.filter(c => 
        (c.customerName && c.customerName.toLowerCase().includes(lowerQuery)) || 
        (c.phone && c.phone.includes(lowerQuery))
      ).slice(0, 3);
      
      customers.forEach(c => {
        matches.push({
          type: 'customer',
          title: c.customerName || 'Unknown Customer',
          sub: `+91 ${c.phone} • ${c.totalBills || 0} Bills`,
          icon: Users,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          action: () => {
             // You can add a specific action if needed
             if(setActiveTab) setActiveTab('vip');
             onClose();
          }
        });
      });
    }

    // Search Inventory
    if (inventory && Array.isArray(inventory)) {
      const items = inventory.filter(i => 
        (i.ArticleNo && i.ArticleNo.toLowerCase().includes(lowerQuery)) || 
        (i.ArticleName && i.ArticleName.toLowerCase().includes(lowerQuery)) ||
        (i.ItemName && i.ItemName.toLowerCase().includes(lowerQuery)) ||
        (i.Barcode && String(i.Barcode).toLowerCase().includes(lowerQuery))
      ).slice(0, 3);

      items.forEach(i => {
        matches.push({
          type: 'product',
          title: i.ArticleName || i.ItemName || i.ArticleNo || 'Unknown Item',
          sub: `Barcode: ${i.Barcode || 'N/A'} • MRP: ₹${i.MRP || 0} • Qty: ${i.Quantity || i.Qty || i.CurrentStock || 0}`,
          icon: Package,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          action: () => {
             if(setActiveTab) setActiveTab('deadstock');
             onClose();
          }
        });
      });
    }

    // Search Bills
    if (liveBills && Array.isArray(liveBills)) {
      const bills = liveBills.filter(b => 
        (b.id && b.id.toLowerCase().includes(lowerQuery)) ||
        (b.customerName && b.customerName.toLowerCase().includes(lowerQuery))
      ).slice(0, 3);

      bills.forEach(b => {
        matches.push({
          type: 'bill',
          title: `Bill ${b.id.substring(0,8)}...`,
          sub: `₹${b.totalAmount || 0} • ${b.customerName || 'Walk-in'}`,
          icon: Receipt,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          action: () => {
             if(setActiveTab) setActiveTab('dashboard');
             onClose();
          }
        });
      });
    }

    // Action fallback
    if (matches.length === 0) {
      matches.push({
        type: 'action',
        title: 'New Checkout',
        sub: 'Jump to POS billing',
        icon: ArrowRight,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        action: () => {
          if(setActiveTab) setActiveTab('dashboard');
          onClose();
        }
      });
    }

    return matches;
  }, [query, globalCustomers, liveBills, inventory, setActiveTab, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div 
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200 ${
          darkMode ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center px-4 py-4 border-b ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
          <Search className={`w-5 h-5 shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, bills, or articles..."
            className={`w-full bg-transparent border-none outline-none px-4 text-base placeholder-slate-500 font-medium ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          />
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`max-h-[60vh] overflow-y-auto p-2 ${darkMode ? 'bg-[#0a0c10]' : 'bg-slate-50/50'}`}>
          {query.length > 0 && (
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Search Results
            </div>
          )}
          
          <div className="space-y-1">
            {results.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
                    darkMode ? 'hover:bg-white/[0.06]' : 'hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200'
                  }`}
                  onClick={() => {
                    if(item.action) item.action();
                  }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800'}`}>
                      {item.title}
                    </p>
                    <p className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {item.sub}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.type}
                  </div>
                </button>
              );
            })}
          </div>

          {query.length === 0 && (
            <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${darkMode ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                <Search className="w-6 h-6" />
              </div>
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Welcome to Global Search
              </p>
              <p className={`text-xs mt-1 max-w-[250px] mx-auto ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                Quickly jump to any bill, find customer profiles, or access fast POS actions.
              </p>
            </div>
          )}
        </div>

        <div className={`px-4 py-3 border-t text-xs flex justify-between items-center ${darkMode ? 'border-white/10 bg-[#0f1115] text-slate-500' : 'border-slate-100 bg-white text-slate-400'}`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>↑</kbd><kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>Enter</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
