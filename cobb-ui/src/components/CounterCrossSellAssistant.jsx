import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Plus,
  Check,
  Percent,
  Copy,
  CheckCircle2,
  MessageCircle,
  Tag,
  ArrowRight,
  TrendingUp,
  Shirt,
  Scissors,
  Layers,
  Search,
  Zap,
  Info
} from 'lucide-react';

const PRESET_CATEGORIES = [
  { id: 'shirt', label: 'Formal Shirt', icon: '👔', defaultMrp: 1999, sampleName: 'Slim Fit Royal White Formal Shirt' },
  { id: 'jeans', label: 'Casual Denim', icon: '👖', defaultMrp: 2499, sampleName: 'Mid-Rise Stretch Dark Blue Jeans' },
  { id: 'blazer', label: 'Blazer / Suit', icon: '🧥', defaultMrp: 4999, sampleName: 'Tailored Fit Navy Textured Blazer' },
  { id: 'chino', label: 'Chino / Trouser', icon: '🩳', defaultMrp: 2199, sampleName: 'Italian Khaki Flat-Front Chinos' },
  { id: 'polo', label: 'Polo T-Shirt', icon: '👕', defaultMrp: 1499, sampleName: 'Supima Cotton Striped Polo' },
  { id: 'jacket', label: 'Winter Jacket', icon: '❄️', defaultMrp: 3999, sampleName: 'Quilted Lightweight Bomber Jacket' }
];

const COMPLEMENTARY_RULES = {
  shirt: [
    { title: 'Italian Stretch Chinos (Beige/Khaki)', category: 'Trousers', mrp: 2199, stock: 14, sizes: '30, 32, 34, 36', tag: 'Smart Casual Look' },
    { title: 'Full-Grain Leather Formal Belt', category: 'Accessories', mrp: 799, stock: 22, sizes: 'Free Size', tag: 'Essential Add-on' },
    { title: 'Tailored Two-Button Navy Blazer', category: 'Blazers', mrp: 4999, stock: 6, sizes: '38, 40, 42', tag: 'Complete Suiting' }
  ],
  jeans: [
    { title: 'Casual Washed Denim Overshirt', category: 'Shirts', mrp: 1999, stock: 11, sizes: 'M, L, XL', tag: 'Double Denim Trend' },
    { title: 'Pima Crew Neck Base Tee (White)', category: 'T-Shirts', mrp: 999, stock: 28, sizes: 'S, M, L, XL', tag: 'Essential Layer' },
    { title: 'Textured Casual Canvas Belt', category: 'Accessories', mrp: 699, stock: 15, sizes: 'Free Size', tag: 'Quick Add-on' }
  ],
  blazer: [
    { title: 'Crisp Egyptian Cotton White Shirt', category: 'Shirts', mrp: 2299, stock: 16, sizes: '39, 40, 42, 44', tag: 'Core Formal Fit' },
    { title: 'Super-Fine Wool Blend Trousers', category: 'Trousers', mrp: 2499, stock: 9, sizes: '32, 34, 36', tag: 'Matching Trousers' },
    { title: 'Silk Printed Pocket Square & Lapel Pin', category: 'Accessories', mrp: 799, stock: 19, sizes: 'Free Size', tag: 'Finishing Touch' }
  ],
  chino: [
    { title: 'Linen Blend Casual Mandarin Shirt', category: 'Shirts', mrp: 1899, stock: 12, sizes: 'M, L, XL', tag: 'Weekend Style' },
    { title: 'Braided Tan Casual Belt', category: 'Accessories', mrp: 799, stock: 17, sizes: 'Free Size', tag: 'Waist Styling' },
    { title: 'Casual Unstructured Summer Blazer', category: 'Blazers', mrp: 3999, stock: 7, sizes: '40, 42', tag: 'Smart Casual' }
  ],
  polo: [
    { title: 'Clean Rinse Indigo Slim Jeans', category: 'Jeans', mrp: 2299, stock: 15, sizes: '30, 32, 34', tag: 'Timeless Combo' },
    { title: 'Cotton Chino Shorts (Navy/Beige)', category: 'Bottoms', mrp: 1299, stock: 10, sizes: '32, 34', tag: 'Summer Pairing' },
    { title: 'Cobb Embroidered Cap & No-Show Socks', category: 'Accessories', mrp: 699, stock: 24, sizes: 'Free Size', tag: 'Impulse Buy' }
  ],
  jacket: [
    { title: 'Heavyweight Ribbed Cotton Crewneck', category: 'Knitwear', mrp: 1799, stock: 13, sizes: 'M, L, XL', tag: 'Warm Layering' },
    { title: 'Rugged Rugged Dark Wash Heavy Denim', category: 'Jeans', mrp: 2699, stock: 8, sizes: '32, 34, 36', tag: 'Winter Staple' },
    { title: 'Merino Wool Muffler / Scarf', category: 'Accessories', mrp: 899, stock: 14, sizes: 'Free Size', tag: 'Cold Add-on' }
  ]
};

export default function CounterCrossSellAssistant({
  formatCurrency = (v) => `₹${(v || 0).toLocaleString('en-IN')}`,
  darkMode = false
}) {
  const [selectedCatId, setSelectedCatId] = useState('shirt');
  const [customItemName, setCustomItemName] = useState('');
  const [customMrp, setCustomMrp] = useState(1999);
  const [selectedOffer, setSelectedOffer] = useState('b3_70'); // 'b3_70' | 'b1g3'
  const [activeLang, setActiveLang] = useState('hinglish'); // 'hinglish' | 'english'
  const [selectedAddons, setSelectedAddons] = useState([0, 1]); // indices of recommendations selected
  const [copiedPitch, setCopiedPitch] = useState(false);

  const activeCategory = PRESET_CATEGORIES.find(c => c.id === selectedCatId) || PRESET_CATEGORIES[0];
  const recommendations = COMPLEMENTARY_RULES[selectedCatId] || COMPLEMENTARY_RULES.shirt;

  // Handle category switch
  const handleSelectCategory = (cat) => {
    setSelectedCatId(cat.id);
    setCustomItemName(cat.sampleName);
    setCustomMrp(cat.defaultMrp);
    setSelectedAddons([0, 1]); // select first 2 pairings by default to form a 3-piece bundle!
  };

  const toggleAddon = (idx) => {
    setSelectedAddons(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      } else {
        return [...prev, idx];
      }
    });
  };

  // Bundle pricing calculation
  const basePrice = parseInt(customMrp) || 0;
  const chosenAddons = selectedAddons.map(idx => recommendations[idx]).filter(Boolean);
  const addonsTotal = chosenAddons.reduce((sum, item) => sum + item.mrp, 0);
  const totalMrp = basePrice + addonsTotal;
  const totalItemsCount = 1 + chosenAddons.length;

  // Offer calculation
  let finalBill = totalMrp;
  let savings = 0;
  let offerLabel = 'Regular Price';

  if (selectedOffer === 'b3_70' && totalItemsCount >= 3) {
    finalBill = Math.round(totalMrp * 0.3); // 70% off
    savings = totalMrp - finalBill;
    offerLabel = 'Buy 3 @ 70% Off Total Bill';
  } else if (selectedOffer === 'b3_70' && totalItemsCount < 3) {
    // Show preview if they add 1 more
    finalBill = totalMrp;
    savings = 0;
    offerLabel = 'Need 3 items for 70% Off';
  } else if (selectedOffer === 'b1g3') {
    // Highest MRP is billed
    const allPrices = [basePrice, ...chosenAddons.map(a => a.mrp)];
    const highest = Math.max(...allPrices);
    finalBill = highest;
    savings = Math.max(0, totalMrp - finalBill);
    offerLabel = 'Buy 1 Get 3 (Pay Highest MRP)';
  }

  // Dynamic Sales Pitch Generation
  const pitchText = useMemo(() => {
    const itemName = customItemName || activeCategory.sampleName;
    const addonNames = chosenAddons.map(a => a.title.split('(')[0].trim()).join(' and ');

    if (activeLang === 'hinglish') {
      if (selectedOffer === 'b3_70' && totalItemsCount >= 3) {
        return `Sir, aapke ${itemName} ke saath matching ${addonNames} lene par store ka "Buy 3 @ 70% Off" lag raha hai! Total MRP ${formatCurrency(totalMrp)} hai par aapko sirf ${formatCurrency(finalBill)} dena hoga—flat ${formatCurrency(savings)} ka direct fayda mil raha hai!`;
      } else if (selectedOffer === 'b1g3') {
        return `Sir, aapke is article ke saath ye matching combo lene par "Buy 1 Get 3" scheme active hai! Sabse high MRP wala piece pay kijiye (${formatCurrency(finalBill)}), baki ke items free ho jayenge!`;
      } else {
        return `Sir, aapke ${itemName} ke saath ye matching combo perfect fit karega! In-store fitting room me try karke dekh lijiye.`;
      }
    } else {
      if (selectedOffer === 'b3_70' && totalItemsCount >= 3) {
        return `Sir, pairing your ${itemName} with our ${addonNames} unlocks our "Buy 3 @ 70% Off" offer! The entire ${formatCurrency(totalMrp)} look is yours for just ${formatCurrency(finalBill)}, saving you ${formatCurrency(savings)} instantly!`;
      } else if (selectedOffer === 'b1g3') {
        return `Sir, with this item you qualify for our "Buy 1 Get 3" scheme—you only pay for the highest item (${formatCurrency(finalBill)}) and take home all 3 pieces!`;
      } else {
        return `Sir, this matching ${addonNames} is tailored specifically for your ${itemName}. Would you like to try it in the fitting room?`;
      }
    }
  }, [activeLang, selectedOffer, customItemName, activeCategory, chosenAddons, totalMrp, finalBill, savings, totalItemsCount, formatCurrency]);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs p-4 sm:p-5 transition-all relative overflow-hidden group">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                Counter Cross-Sell & Upsell Assistant
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Zap className="w-2.5 h-2.5 fill-current" />
                Live Upsell
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Select customer's item &rarr; instantly get high-margin pairings, bundle offer math & salesman pitch
            </p>
          </div>
        </div>

        {/* Offer Scheme Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setSelectedOffer('b3_70')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              selectedOffer === 'b3_70'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Buy 3 @ 70% Off
          </button>
          <button
            type="button"
            onClick={() => setSelectedOffer('b1g3')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              selectedOffer === 'b1g3'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Buy 1 Get 3
          </button>
        </div>
      </div>

      {/* Category Pills Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
          Base Item:
        </span>
        {PRESET_CATEGORIES.map(cat => {
          const isSelected = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left = Base Item + Pairings | Right = Offer Math & Pitch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left Column: Customer Item & Recommended Pairings (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          
          {/* Base Article Input Bar */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base">{activeCategory.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Customer Is Buying:</div>
                <input
                  type="text"
                  value={customItemName || activeCategory.sampleName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Item Name / Description..."
                  className="w-full text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none p-0 focus:outline-none truncate"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400">MRP:</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={customMrp === 0 ? '' : customMrp}
                  onChange={(e) => setCustomMrp(parseInt(e.target.value) || 0)}
                  className="w-full py-1 pl-5 pr-2 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                  placeholder="1999"
                />
              </div>
            </div>
          </div>

          {/* In-Stock Complementary Pairings Header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Recommended In-Stock Pairings ({recommendations.length} available)
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              Check to include in bundle
            </span>
          </div>

          {/* Pairings List */}
          <div className="space-y-1.5">
            {recommendations.map((item, idx) => {
              const isChecked = selectedAddons.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleAddon(idx)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {item.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ {item.stock} in stock
                        </span>
                        <span>•</span>
                        <span>Sizes: {item.sizes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.mrp)}
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">MRP</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Offer Breakdown & Salesman Pitch (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-3.5 border border-slate-200/70 dark:border-slate-700/80">
          
          {/* Bundle Math Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-blue-500" />
                Bundle Deal Summary ({totalItemsCount} pieces)
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {selectedOffer === 'b3_70' ? 'Buy 3 @ 70%' : 'Buy 1 Get 3'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-700 space-y-1.5 shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total MRP:</span>
                <span className="font-mono font-bold line-through text-slate-400">
                  {formatCurrency(totalMrp)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">Final Bill to Pay:</span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(finalBill)}
                </span>
              </div>

              {savings > 0 && (
                <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    🎉 Customer Savings:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {formatCurrency(savings)} ({Math.round((savings / totalMrp) * 100)}% OFF)
                  </span>
                </div>
              )}
            </div>

            {totalItemsCount < 3 && selectedOffer === 'b3_70' && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5 text-center">
                ⚠️ Select 1 more item above to unlock the 70% discount!
              </p>
            )}
          </div>

          {/* Salesman Pitch Box */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Counter Pitch:
                </span>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveLang('hinglish')}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                      activeLang === 'hinglish' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Hinglish
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLang('english')}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                      activeLang === 'english' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyPitch}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPitch ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Pitch</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 italic leading-relaxed shadow-xs">
              "{pitchText}"
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
