import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, Plus, Minus, Send, MapPin, X, ShoppingCart, Tag, Star, ChevronRight } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DigitalCatalog() {
  const [storeId, setStoreId] = useState('DEMO_STORE_001');
  const [storeName, setStoreName] = useState('Cobb Pundri');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('store') || 'DEMO_STORE_001';
    setStoreId(sid);
    
    const stores = {
      'DEMO_STORE_001': 'Cobb Pundri',
      'STORE_002': 'Cobb Kaithal',
      'STORE_003': 'Cobb Karnal',
      'STORE_004': 'Cobb Kurukshetra'
    };
    setStoreName(stores[sid] || 'Cobb Exclusive Store');

    const fetchInventory = async () => {
      setLoading(true);
      if (!db) { setLoading(false); return; }
      try {
        const docRef = doc(db, 'stores', sid, 'data', 'inventory');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const invData = snap.data();
          const items = Array.isArray(invData.items) ? invData.items : [];
          const inStock = items.filter(item => Number(item.Qty) > 0);
          setInventory(inStock);
        }
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.Category || 'Other').filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [inventory]);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const q = searchQuery.toLowerCase();
      const desc = (item.ItemName || item.Description || '').toLowerCase();
      const matchSearch = desc.includes(q);
      const matchCat = activeCategory === 'All' || (item.Category || 'Other') === activeCategory;
      return matchSearch && matchCat;
    });
  }, [inventory, searchQuery, activeCategory]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.Barcode];
      const newQty = existing ? existing.cartQty + 1 : 1;
      if (newQty > Number(item.Qty)) return prev;
      return { ...prev, [item.Barcode]: { ...item, cartQty: newQty } };
    });
  };

  const removeFromCart = (barcode) => {
    setCart(prev => {
      const existing = prev[barcode];
      if (!existing) return prev;
      const newQty = existing.cartQty - 1;
      const nextCart = { ...prev };
      if (newQty <= 0) delete nextCart[barcode];
      else nextCart[barcode] = { ...existing, cartQty: newQty };
      return nextCart;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, item) => acc + (Number(item.MRP || 0) * item.cartQty), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.cartQty, 0);

  const generateWhatsAppOrder = () => {
    if (cartItems.length === 0) return;
    let text = `✨ *PREMIUM ORDER for ${storeName}* ✨\n\n`;
    text += `Hello, I would like to place an order from your digital boutique:\n\n`;
    
    cartItems.forEach((item, index) => {
      text += `*${index + 1}. ${item.ItemName || item.Description}*\n`;
      text += `   Size: ${item.Size || 'Standard'} | Qty: ${item.cartQty}\n`;
      text += `   Price: ₹${item.MRP}\n\n`;
    });
    
    text += `*Total Value:* ₹${cartTotal.toLocaleString('en-IN')}\n\n`;
    text += `Please confirm availability and share payment details. Thank you!`;
    
    const phone = '919876543210'; 
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-slate-200 pb-24 selection:bg-amber-500/30">
      
      {/* Luxury Navbar */}
      <div className="bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-tight uppercase">
              COBB Italy
            </h1>
            <div className="flex items-center gap-1.5 text-amber-500/60 text-xs md:text-sm mt-0.5 font-medium uppercase tracking-widest">
              <MapPin className="w-3 h-3" />
              <span>{storeName}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 md:p-3 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-full transition-all border border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)] hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
          >
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 text-[10px] md:text-xs font-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a] shadow-lg">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Star className="w-3 h-3" /> New Arrivals
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
            Elevate Your <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 italic font-serif">Wardrobe</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-lg max-w-xl mx-auto mb-10 font-light">
            Discover the latest Italian-inspired menswear collection exclusively at {storeName}. 
          </p>
          
          <div className="relative w-full max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-400 w-5 h-5 md:w-6 md:h-6" />
              <input 
                type="text" 
                placeholder="Search premium shirts, jeans, blazers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-4 md:py-5 rounded-2xl bg-[#111] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-medium transition-all text-sm md:text-base shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        
        {/* Categories (Desktop only for now, simple scroll for mobile) */}
        {!loading && categories.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-4 custom-scrollbar hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                  activeCategory === cat 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-amber-500/60">
            <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
            <p className="font-bold uppercase tracking-widest text-xs">Curating Collection...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-32 text-slate-500">
            <p className="font-bold text-xl text-white mb-2">No items found</p>
            <p className="text-sm">Try searching for something else or browse another category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {filteredItems.map(item => {
              const inCart = cart[item.Barcode]?.cartQty || 0;
              return (
                <div key={item.Barcode} className="group bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-amber-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(251,191,36,0.15)] flex flex-col">
                  
                  {/* Image Area */}
                  <div className="aspect-[3/4] bg-gradient-to-tr from-[#1a1a1a] to-[#222] relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
                      <span className="text-white font-black text-4xl -rotate-45 tracking-tighter">COBB</span>
                    </div>
                    {/* Tags */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-widest rounded-md text-amber-400 border border-amber-500/20">
                        Size: {item.Size || 'STD'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Details Area */}
                  <div className="p-4 md:p-5 flex flex-col flex-1 bg-gradient-to-b from-transparent to-black/40">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-white text-sm md:text-base leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {item.ItemName || item.Description}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500 mb-4 line-clamp-1">{item.Category || 'Premium Essential'}</div>
                    
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Price</span>
                        <span className="font-bold text-white text-lg tracking-tight">₹{Number(item.MRP).toLocaleString('en-IN')}</span>
                      </div>
                      
                      {inCart > 0 ? (
                        <div className="flex items-center gap-3 bg-amber-500/10 rounded-full p-1 border border-amber-500/20">
                          <button onClick={() => removeFromCart(item.Barcode)} className="w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black text-amber-400 transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-bold w-3 text-center text-amber-400">{inCart}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black text-amber-400 transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="w-10 h-10 rounded-full bg-white/5 hover:bg-amber-500 flex items-center justify-center text-slate-300 hover:text-slate-900 border border-white/10 hover:border-amber-500 transition-all group/btn"
                        >
                          <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Checkout Button */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-2xl blur-lg opacity-40 animate-pulse" />
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 px-6 py-4 rounded-2xl shadow-2xl border border-amber-300 flex items-center justify-between transition-all transform hover:scale-[1.03] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/10 backdrop-blur flex items-center justify-center font-black text-sm border border-black/5">
                {totalItems}
              </div>
              <span className="font-black text-lg tracking-tight uppercase">Review Order</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tighter">₹{cartTotal.toLocaleString('en-IN')}</span>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </div>
          </button>
        </div>
      )}

      {/* Side Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-wide uppercase">
                <ShoppingBag className="w-5 h-5 text-amber-500" /> Shopping Bag
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                    <ShoppingBag className="w-10 h-10 opacity-30 text-amber-500" />
                  </div>
                  <p className="font-medium text-lg text-slate-300 mb-1">Your bag is empty</p>
                  <p className="text-sm font-light">Explore our premium collection.</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-bold tracking-wider uppercase text-xs rounded-full border border-white/10 transition-all">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <div key={item.Barcode} className="bg-[#111] p-4 rounded-2xl border border-white/5 flex gap-4 group hover:border-amber-500/20 transition-colors">
                      <div className="w-20 h-24 bg-[#1a1a1a] rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-white/5">
                         <span className="text-white/10 font-black text-xs transform -rotate-45">COBB</span>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h4 className="font-medium text-sm text-slate-200 leading-snug mb-1">{item.ItemName || item.Description}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-auto">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase tracking-wider">Size: {item.Size}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-amber-400 tracking-tight">₹{item.MRP}</span>
                          <div className="flex items-center gap-3 bg-black/40 rounded-full p-1 border border-white/5">
                            <button onClick={() => removeFromCart(item.Barcode)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs font-bold w-3 text-center text-white">{item.cartQty}</span>
                            <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="bg-[#111] p-6 border-t border-white/5 relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                <div className="flex justify-between mb-3 text-slate-400 text-sm">
                  <span>Subtotal</span>
                  <span className="text-slate-300">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between mb-6 text-white text-xl font-black tracking-tight">
                  <span>Total</span>
                  <span className="text-amber-400">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                
                <button 
                  onClick={generateWhatsAppOrder}
                  className="w-full bg-[#128C7E] hover:bg-[#075E54] text-white px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(18,140,126,0.3)] flex items-center justify-center gap-3 transition-all transform active:scale-95 group"
                >
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <span className="font-bold text-sm tracking-widest uppercase">Order on WhatsApp</span>
                </button>
                <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-4">
                  Secure Checkout Process
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
