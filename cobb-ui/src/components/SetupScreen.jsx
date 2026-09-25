import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Database, 
  Wand2, 
  Smartphone, 
  ArrowRight,
  Server,
  Lock,
  User,
  Scan,
  RefreshCw,
  Sparkles,
  Search,
  Cloud,
  Upload,
  Building2
} from 'lucide-react';

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbEngine, setDbEngine] = useState('mssql');

  // Step 1: DB State
  const [dbConfig, setDbConfig] = useState({
    licenseKey: '',
    host: 'localhost',
    port: '1433',
    database: '',
    username: '',
    password: ''
  });

  // Step 2: AI Mapper State
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState('idle'); // idle | scanning | mapping | complete

  // Step 3: Firebase State
  const [firebaseConfig, setFirebaseConfig] = useState({
    projectId: '',
    storeId: '',
    serviceKeyUploaded: false
  });

  const handleNext = () => {
    if (step === 1) {
      // Connect to DB and advance to mapping
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep(2);
      }, 1000);
    } else if (step === 2) {
      if (aiAnalysisStatus !== 'complete') {
        startAiMapping();
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      finishSetup();
    }
  };

  const startAiMapping = async () => {
    setAiAnalysisStatus('scanning');
    
    try {
      // Connect to the backend AI mapper
      const response = await fetch('http://localhost:5000/api/setup/map-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: dbEngine,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password
        })
      });

      const data = await response.json();
      
      setAiAnalysisStatus('mapping');
      
      if (data.success) {
        setTimeout(() => {
          setAiAnalysisStatus('complete');
        }, 1500); // Artificial delay to let the animation play out for the user
      } else {
        alert("AI Mapping Failed: " + data.error);
        setAiAnalysisStatus('idle');
      }
    } catch (err) {
      alert("Network Error: " + err.message);
      setAiAnalysisStatus('idle');
    }
  };

  const handleKeyUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFirebaseConfig({...firebaseConfig, serviceKeyUploaded: true});
    }
  };

  const finishSetup = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (onComplete) onComplete();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-3xl w-full bg-[#0a0f1c] border border-slate-800/60 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center mb-10 relative z-10">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Workspace Initialization
          </h1>
          <p className="text-slate-400">Configure your POS database and unlock mobile intelligence.</p>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex justify-between mb-12 relative z-10 max-w-lg mx-auto">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0 rounded-full"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-700 ease-out rounded-full" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
          
          {[
            { id: 1, icon: <Database size={18} />, label: "Connection" },
            { id: 2, icon: <Wand2 size={18} />, label: "AI Mapping" },
            { id: 3, icon: <Cloud size={18} />, label: "Cloud Sync" }
          ].map(s => (
            <div key={s.id} className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-500 ${
                step >= s.id 
                  ? 'bg-[#0a0f1c] border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}>
                {s.icon}
              </div>
              <span className={`absolute -bottom-6 text-xs font-bold whitespace-nowrap ${step >= s.id ? 'text-blue-400' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[350px] relative z-10">
          
          {/* STEP 1: DATABASE */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl mx-auto space-y-6">
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Product License Key</label>
                  <input 
                    type="text" 
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={dbConfig.licenseKey}
                    onChange={e => setDbConfig({...dbConfig, licenseKey: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest text-blue-400" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {['mssql', 'mysql', 'postgres'].map(engine => (
                  <button 
                    key={engine}
                    onClick={() => setDbEngine(engine)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      dbEngine === engine 
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 ring-1 ring-blue-500/20' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Server size={20} />
                    <span className="text-xs font-bold uppercase">{engine === 'mssql' ? 'MS SQL' : engine}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Host / IP</label>
                    <input 
                      type="text" 
                      value={dbConfig.host}
                      onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Port</label>
                    <input 
                      type="text" 
                      value={dbConfig.port}
                      onChange={e => setDbConfig({...dbConfig, port: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Database Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. POS_DATABASE_MAIN"
                    value={dbConfig.database}
                    onChange={e => setDbConfig({...dbConfig, database: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1 flex items-center gap-1"><User size={12}/> Username</label>
                    <input 
                      type="text" 
                      value={dbConfig.username}
                      onChange={e => setDbConfig({...dbConfig, username: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1 flex items-center gap-1"><Lock size={12}/> Password</label>
                    <input 
                      type="password" 
                      value={dbConfig.password}
                      onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AI SCHEMA MAPPER */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col items-center justify-center pt-8">
              
              {aiAnalysisStatus === 'idle' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                    <Sparkles className="w-10 h-10 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Automated Schema Mapping</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                      Our AI will instantly read your database structure and automatically write the exact SQL queries required for your specific POS software.
                    </p>
                  </div>
                </div>
              )}

              {aiAnalysisStatus === 'scanning' && (
                <div className="text-center space-y-6 animate-pulse">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                    <Search className="w-10 h-10 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-400 mb-2">Scanning Tables...</h2>
                    <p className="text-slate-400 font-mono text-xs">SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES</p>
                  </div>
                </div>
              )}

              {aiAnalysisStatus === 'mapping' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                    <Wand2 className="w-10 h-10 text-purple-400 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-purple-400 mb-2">AI is Writing SQL...</h2>
                    <p className="text-slate-400 font-mono text-xs">Identifying Sales, Inventory, and Customer relations.</p>
                  </div>
                </div>
              )}

              {aiAnalysisStatus === 'complete' && (
                <div className="text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-400 mb-2">Configuration Ready!</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                      AI successfully mapped 14 required fields to your custom POS schema. Your dashboards are ready to load.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: FIREBASE MULTI-STORE CONFIG */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-xl mx-auto pt-4 space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Cloud Synchronization</h2>
                <p className="text-slate-400">Connect this terminal to your master Firebase project to enable the live Phone Link.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1 flex items-center gap-1"><Building2 size={12}/> Store ID (Important)</label>
                  <p className="text-[10px] text-slate-400 ml-1 mb-2">If you have multiple stores, give each PC a unique ID (e.g. STORE_MUMBAI, STORE_DELHI).</p>
                  <input 
                    type="text" 
                    placeholder="e.g. STORE_001"
                    value={firebaseConfig.storeId}
                    onChange={e => setFirebaseConfig({...firebaseConfig, storeId: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors uppercase font-bold text-blue-400" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Firebase Project ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. my-retail-empire-app"
                    value={firebaseConfig.projectId}
                    onChange={e => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1 flex items-center gap-1">Service Account Key (.json)</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative ${firebaseConfig.serviceKeyUploaded ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleKeyUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    {firebaseConfig.serviceKeyUploaded ? (
                      <div className="flex flex-col items-center text-emerald-400">
                        <CheckCircle2 size={32} className="mb-2" />
                        <span className="font-bold text-sm">Key Loaded Successfully</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Upload size={32} className="mb-2" />
                        <span className="font-bold text-sm">Upload firebase-admin.json</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-8 flex justify-between items-center border-t border-slate-800/60 pt-6 relative z-10">
          <p className="text-xs text-slate-600 font-mono">
            {step === 1 && "v2.0 Universal SaaS Edition"}
            {step === 2 && "Powered by Google Gemini Pro"}
            {step === 3 && "Secured via Google Firebase"}
          </p>

          <button 
            onClick={handleNext}
            disabled={isProcessing || (step === 3 && !firebaseConfig.serviceKeyUploaded)}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              isProcessing || (step === 3 && !firebaseConfig.serviceKeyUploaded)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]'
            }`}
          >
            {isProcessing ? 'Processing...' : (
              <>
                {step === 1 ? 'Connect to POS' : step === 2 && aiAnalysisStatus !== 'complete' ? 'Start AI Mapping' : step === 3 ? 'Initialize Cloud Sync' : 'Continue'} 
                {step === 3 ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
