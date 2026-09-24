import React, { useState } from 'react';
import { Sparkles, Layers, Percent, Plus, Tag, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import ThreeLayerLayout from '../ThreeLayerLayout';

export default function CampaignBuilderTab(props) {
  const {
    activeTab,
    bundles, isLoadingBundles, fetchBundles, darkMode
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBundle, setSelectedBundle] = useState(null);

  // If there are bundles but no selection, auto-select the first one
  React.useEffect(() => {
    if (bundles && bundles.length > 0 && !selectedBundle) {
      setSelectedBundle(bundles[0]);
    }
  }, [bundles, selectedBundle]);

  const filteredBundles = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bundles || [];
    return (bundles || []).filter(b => 
      b.name?.toLowerCase().includes(q) || 
      b.description?.toLowerCase().includes(q)
    );
  }, [bundles, searchQuery]);

  // SMART BUNDLES LAYER 2
  const renderMasterItem = (bundle, active) => {
    const idx = bundles.indexOf(bundle) + 1;
    return (
      <div className="flex items-start justify-between w-full gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${darkMode ? 'bg-amber-900/20 text-amber-500 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
          #{idx}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {bundle.name || `Smart Bundle #${idx}`}
          </h4>
          <p className={`text-[11px] mt-0.5 line-clamp-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {bundle.description || `${bundle.items?.length || 2} items combined for clearance.`}
          </p>
        </div>
        <div className="text-right flex flex-col items-end shrink-0">
          <span className="font-black text-emerald-500 text-sm">
            ₹{bundle.bundlePrice || bundle.price || 1999}
          </span>
          {bundle.discountPct && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              -{bundle.discountPct}% OFF
            </span>
          )}
        </div>
      </div>
    );
  };

  // SMART BUNDLES LAYER 3
  const renderDetail = (bundle) => {
    const idx = bundles.indexOf(bundle) + 1;
    return (
      <>
        <div className={`p-6 lg:p-8 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Generated Match
              </span>
              <h3 className={`text-2xl lg:text-3xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {bundle.name || `Bundle #${idx}`}
              </h3>
              <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {bundle.description || "Automatically grouped slow-moving items with high-demand products."}
              </p>
            </div>
            <button className="px-5 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg">
              <Send className="w-4 h-4" /> Push to POS
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-amber-700/60'}`}>Bundle Price</div>
              <div className="text-4xl font-black text-amber-500">₹{bundle.bundlePrice || bundle.price || 1999}</div>
              {bundle.originalPrice && (
                <div className={`text-sm font-bold line-through mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  ₹{bundle.originalPrice}
                </div>
              )}
            </div>

            {bundle.discountPct && (
              <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-emerald-700/60'}`}>Total Savings</div>
                <div className="text-4xl font-black text-emerald-500">{bundle.discountPct}%</div>
                <div className={`text-sm font-bold mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Off Original Price</div>
              </div>
            )}
          </div>

          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <Layers className="w-4 h-4" /> Included Articles
            </h4>
            
            <div className={`rounded-2xl border overflow-hidden divide-y shadow-sm ${darkMode ? 'border-[#232e47] bg-[#1a2333] divide-[#232e47]' : 'border-slate-200 bg-white divide-slate-100'}`}>
              {bundle.items && bundle.items.length > 0 ? (
                bundle.items.map((item, i) => (
                  <div key={i} className={`p-4 flex justify-between items-center ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.isSlow ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {item.isSlow ? <AlertTriangle className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</p>
                        <p className={`text-xs font-bold uppercase mt-0.5 ${item.isSlow ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {item.isSlow ? 'Dead Stock' : 'Top Mover'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-8 text-center text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Details not available for this bundle.
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Only render if activeTab is smart_bundles (Campaigns part is unused in new layout)
  if (activeTab === 'smart_bundles') {
    return (
      <ThreeLayerLayout
        darkMode={darkMode}
        title="Smart Bundling"
        icon={Percent}
        iconColorClass="bg-amber-500 shadow-amber-500/30"
        items={filteredBundles}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search bundles..."
        headerAction={
          <button 
            onClick={fetchBundles} 
            disabled={isLoadingBundles}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-[#1a2333] hover:bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm'}`}
            title="Generate New Bundles"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingBundles ? "animate-spin text-amber-500" : ""}`} />
          </button>
        }
        renderMasterItem={renderMasterItem}
        onItemClick={setSelectedBundle}
        selectedItem={selectedBundle}
        renderDetail={renderDetail}
        emptyMasterText={isLoadingBundles ? "Analyzing inventory matrix..." : "No active bundles."}
        emptyDetailTitle="Select a Bundle"
        emptyDetailText="Choose a bundle from the list to view its contents and push it to the POS."
        emptyDetailIcon={Layers}
      />
    );
  }

  // Fallback for empty
  return null;
}
