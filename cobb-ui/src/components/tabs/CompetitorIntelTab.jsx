import React from 'react';
import { Target, Sparkles } from 'lucide-react';

const CompetitorIntelTab = (props) => {
  const {
    handleCompUpload,
    compImageUrl,
    compIntelResult,
    isAnalyzingComp,
    compError,
    darkMode
  } = props;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen space-y-8 animate-in fade-in duration-500 ${darkMode ? 'bg-[#0f1115] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* COMPETITOR INTEL PAGE */}
      <div className={`border-b pb-5 ${darkMode ? 'border-[#232e47]' : 'border-slate-200'}`}>
        <h3 className={`text-2xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          <Target className="w-6 h-6 mr-3 text-red-600" /> Competitor Promotion Counter-Intelligence
        </h3>
        <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Upload a photo or screenshot of a competitor's offer, and AI will generate a counter-strategy to protect margins.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Upload Competitor Ad</h4>
            <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-colors cursor-pointer relative ${
              darkMode ? 'border-[#232e47] bg-[#121829] hover:bg-[#232e47]/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
            }`}>
              <input type="file" accept="image/*" onChange={(e) => handleCompUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Target className={`w-10 h-10 mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <span className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Upload Flyer / Screenshot</span>
            </div>
            {compImageUrl && (
              <div className={`rounded-xl overflow-hidden border mt-4 ${darkMode ? 'border-[#232e47]' : 'border-slate-200'}`}>
                <img src={compImageUrl} alt="Competitor Intel" className="w-full h-48 object-cover" />
              </div>
            )}
          </div>
        </div>

        <div>
          {isAnalyzingComp ? (
            <div className={`p-12 rounded-3xl border shadow-sm flex flex-col justify-center items-center text-center min-h-[300px] ${
              darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'
            }`}>
              <Target className="w-10 h-10 animate-ping text-red-500 mb-4" />
              <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Extracting Offer Logic...</h4>
            </div>
          ) : compIntelResult ? (
            <div className={`p-6 rounded-3xl border shadow-sm space-y-6 animate-in slide-in-from-bottom duration-300 ${
              darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-100'}`}>
                <span className="text-[10px] text-red-500 uppercase font-black">Detected Competitor Offer</span>
                <p className={`font-bold mt-1 ${darkMode ? 'text-red-100' : 'text-slate-800'}`}>{compIntelResult.detectedCompetitorOffer}</p>
              </div>
              
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-100'}`}>
                <span className="text-[10px] text-emerald-500 uppercase font-black flex items-center"><Sparkles className="w-3 h-3 mr-1" /> Cobb Counter-Strategy</span>
                <p className={`font-black mt-1 text-lg ${darkMode ? 'text-emerald-100' : 'text-slate-800'}`}>{compIntelResult.cobbCounterStrategy}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`block text-[10px] uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Margin Impact</span>
                  <span className="text-sm font-bold text-emerald-500">{compIntelResult.marginImpact}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`block text-[10px] uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Execution Difficulty</span>
                  <span className="text-sm font-bold text-amber-500">{compIntelResult.executionDifficulty}</span>
                </div>
              </div>
            </div>
          ) : compError ? (
            <div className={`p-6 rounded-3xl ${darkMode ? 'bg-red-950/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-600'}`}>{compError}</div>
          ) : (
            <div className={`border border-dashed rounded-3xl p-12 flex flex-col justify-center items-center text-center min-h-[300px] ${
              darkMode ? 'bg-[#121829]/50 border-[#232e47] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <Target className={`w-12 h-12 mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className="font-bold">Awaiting Target Image</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitorIntelTab;
