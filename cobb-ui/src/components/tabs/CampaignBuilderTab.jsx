import React from 'react';
import { Megaphone, Sparkles, Send, RefreshCw, Layers, Percent, Plus } from 'lucide-react';

const CampaignBuilderTab = (props) => {
  const {
    activeTab,
    bundles, isLoadingBundles, fetchBundles,
    campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, isGeneratingCampaign, handleGenerateCampaign
  } = props;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      

      {/* 2. SMART BUNDLES PAGE */}
      {activeTab === 'smart_bundles' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-5 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Percent className="w-7 h-7 text-amber-500" /> AI Smart Bundling
              </h3>
              <p className="text-sm text-slate-500 mt-2">Automatically group slow-moving items with high-demand products to clear dead stock efficiently.</p>
            </div>
            <button onClick={fetchBundles} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800">
               <Sparkles size={16} className={isLoadingBundles ? "animate-spin" : ""} /> Generate Bundles
            </button>
          </div>
          
          {isLoadingBundles ? (
             <div className="py-20 flex flex-col items-center justify-center text-slate-400">
               <RefreshCw className="w-8 h-8 animate-spin mb-4 text-amber-400" />
               <p className="font-bold">Analyzing inventory matrix...</p>
             </div>
          ) : bundles?.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(bundles || []).map((bundle, idx) => (
                 <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><Layers size={100} /></div>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 inline-block">Bundle #{idx+1}</span>
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-black text-slate-800 pr-2">{bundle.name || "Autumn Promo Set"}</h4>
                      {bundle.discountPct && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg">-{bundle.discountPct}%</span>}
                    </div>
                    <div className="mt-3 mb-1 space-y-1.5 min-h-[48px]">
                      {bundle.items && bundle.items.length > 0 ? (
                        bundle.items.map((item, i) => (
                          <p key={i} className="text-[11px] text-slate-600 leading-tight">
                            <span className={item.isSlow ? "text-rose-500 font-black mr-1" : "text-emerald-500 font-black mr-1"}>•</span>
                            <span className={item.isSlow ? "font-semibold" : ""}>{item.name}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{bundle.description || "Pairing deadstock Denim with Top Mover T-Shirts."}</p>
                      )}
                    </div>
                    <div className="mt-5 bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                       <div>
                         <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Combo Price</p>
                         <p className="text-xl font-black text-slate-800 flex items-baseline gap-1.5">
                           ₹{bundle.bundlePrice || bundle.price || "1999"}
                           {bundle.originalPrice && <span className="text-[10px] text-slate-400 line-through">₹{bundle.originalPrice}</span>}
                         </p>
                       </div>
                       <button className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 shadow-md shadow-amber-500/20"><Plus size={20}/></button>
                    </div>
                 </div>
               ))}
             </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center max-w-2xl mx-auto mt-8">
              <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h4 className="text-xl font-black text-slate-800 mb-2">No Active Bundles</h4>
              <p className="text-slate-500">Click the button above to let AI analyze your dead stock and create highly profitable bundles.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. CAMPAIGNS PAGE */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-5">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-indigo-500" /> AI Campaign Builder
            </h3>
            <p className="text-sm text-slate-500 mt-2">Generate highly personalized WhatsApp and SMS marketing campaigns based on customer segmentation.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h4 className="font-bold text-slate-800 mb-6">Campaign Details</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Event</label>
                  <input type="text" value={campaignEvent || ''} onChange={e => setCampaignEvent?.(e.target.value)} placeholder="e.g. Diwali Mega Sale, Winter Clearance" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Audience</label>
                  <select value={campaignAudience || ''} onChange={e => setCampaignAudience?.(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="VIP">VIP Customers (High LTV)</option>
                    <option value="DORMANT">Dormant Customers (No visits in 90 days)</option>
                    <option value="ALL">All Opt-in Customers</option>
                  </select>
                </div>
                <button onClick={handleGenerateCampaign} disabled={isGeneratingCampaign || !campaignEvent} className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                  {isGeneratingCampaign ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGeneratingCampaign ? 'Generating Copy...' : 'Generate Marketing Copy'}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center justify-between">Generated Draft <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-1 rounded tracking-widest">AI Powered</span></h4>
              
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-6 relative">
                {!campaignDraft ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                     <Megaphone className="w-12 h-12 mb-4 opacity-20" />
                     <p className="font-medium">Draft will appear here...</p>
                   </div>
                ) : (
                   <div className="whitespace-pre-wrap text-slate-700 text-sm">{campaignDraft}</div>
                )}
              </div>
              
              <button disabled={!campaignDraft} className="w-full mt-4 bg-slate-900 text-white p-4 rounded-xl font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
                <Send className="w-5 h-5" /> Send to Broadcast Queue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CampaignBuilderTab;
