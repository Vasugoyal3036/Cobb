import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, Plus, Minus, Send, MapPin, X, ShoppingCart } from 'lucide-react';
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

  useEffect(() => {
    // Parse URL params for store info
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('store') || 'DEMO_STORE_001';
    setStoreId(sid);
    
    // Map known stores
    const stores = {
      'DEMO_STORE_001': 'Cobb Pundri',
      'STORE_002': 'Cobb Kaithal',
      'STORE_003': 'Cobb Karnal',
      'STORE_004': 'Cobb Kurukshetra'
    };
    setStoreName(stores[sid] || 'Cobb Exclusive Store');

    const fetchInventory = async () => {
      setLoading(true);
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'stores', sid, 'data', 'inventory');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const invData = snap.data();
          const items = Array.isArray(invData.items) ? invData.items : [];
          // Filter out items with 0 qty
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

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const q = searchQuery.toLowerCase();
      const desc = (item.ItemName || item.Description || '').toLowerCase();
      return desc.includes(q);
    });
  }, [inventory, searchQuery]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.Barcode];
      const newQty = existing ? existing.cartQty + 1 : 1;
      // Prevent ordering more than stock
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
      if (newQty <= 0) {
        delete nextCart[barcode];
      } else {
        nextCart[barcode] = { ...existing, cartQty: newQty };
      }
      return nextCart;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, item) => acc + (Number(item.MRP || 0) * item.cartQty), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.cartQty, 0);

  const generateWhatsAppOrder = () => {
    if (cartItems.length === 0) return;
    
    let text = `🛍️ *NEW ORDER for ${storeName}* 🛍️\n\n`;
    text += `Hello, I would like to place an order for the following items available in your catalog:\n\n`;
    
    cartItems.forEach((item, index) => {
      text += `*${index + 1}. ${item.ItemName || item.Description}*\n`;
      text += `   Size: ${item.Size || 'Standard'} | Qty: ${item.cartQty}\n`;
      text += `   Barcode: ${item.Barcode}\n`;
      text += `   Price: ₹${item.MRP}\n\n`;
    });
    
    text += `*Total Value:* ₹${cartTotal.toLocaleString('en-IN')}\n\n`;
    text += `Please confirm availability and share payment details for home delivery/pickup. Thank you!`;
    
    // Fallback phone number, ideally from DB
    const phone = '919876543210'; 
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cobb Italy</h1>
            <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">{storeName}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Search */}
      <div className="bg-blue-600 px-4 py-8 mb-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white text-3xl font-black mb-2">Live Store Catalog</h2>
          <p className="text-blue-100 mb-6 font-medium">Order directly from our {storeName} branch via WhatsApp.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search shirts, jeans, blazers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-lg text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-4xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold">Loading live inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="font-bold text-lg">No items found.</p>
            <p className="text-sm">Try searching for something else.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => {
              const inCart = cart[item.Barcode]?.cartQty || 0;
              return (
                <div key={item.Barcode} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  {/* Placeholder for Product Image - Using a stylish gradient box for now */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 relative">
                    <span className="text-slate-400 font-black text-3xl opacity-20 transform -rotate-45">COBB</span>
                    <span className="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur text-[10px] font-bold rounded text-slate-700">
                      Size: {item.Size || 'STD'}
                    </span>
                  </div>
                  
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">{item.ItemName || item.Description}</h3>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="font-black text-slate-900">₹{item.MRP}</span>
                      
                      {inCart > 0 ? (
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <button onClick={() => removeFromCart(item.Barcode)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-blue-600">-</button>
                          <span className="text-xs font-bold w-4 text-center">{inCart}</span>
                          <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-blue-600">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-lg transition-colors"
                        >
                          Add
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

      {/* Floating View Cart Button */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between hover:bg-black transition-all transform hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                {totalItems}
              </div>
              <span className="font-bold text-lg">View Cart</span>
            </div>
            <span className="font-black text-lg">₹{cartTotal.toLocaleString('en-IN')}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-black flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" /> My Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold text-lg">Your cart is empty</p>
                  <p className="text-sm mt-1">Add items from the catalog.</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-6 px-6 py-2 bg-white text-blue-600 font-bold rounded-xl border border-blue-100 shadow-sm">
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <div key={item.Barcode} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                      <div className="w-20 h-24 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                         <span className="text-slate-300 font-black text-xs transform -rotate-45">COBB</span>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h4 className="font-bold text-sm text-slate-800 leading-tight mb-1">{item.ItemName || item.Description}</h4>
                        <span className="text-xs text-slate-500 font-medium mb-auto">Size: {item.Size}</span>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-black">₹{item.MRP}</span>
                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-100">
                            <button onClick={() => removeFromCart(item.Barcode)} className="w-7 h-7 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-blue-600"><Minus className="w-3 h-3" /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.cartQty}</span>
                            <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-blue-600"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="bg-white p-6 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between mb-2 text-slate-500 text-sm font-medium">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between mb-6 text-slate-900 text-lg font-black">
                  <span>Total Amount</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                
                <button 
                  onClick={generateWhatsAppOrder}
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-4 rounded-2xl shadow-xl shadow-[#25D366]/20 flex items-center justify-center gap-3 transition-colors"
                >
                  <Send className="w-5 h-5" />
                  <span className="font-bold text-lg tracking-wide">Checkout via WhatsApp</span>
                </button>
                <p className="text-center text-xs text-slate-400 font-medium mt-4">
                  Payment is collected securely by the store via UPI/Cash upon delivery or pickup.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
