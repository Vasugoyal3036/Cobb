import React, { useState } from 'react';
import { Smartphone, Wifi, WifiOff, Copy, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

const PhoneLinkGenerator = ({ API_BASE }) => {
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const startTunnel = async () => {
    setIsStarting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/tunnel/start`, { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        setTunnelUrl(data.url);
      } else {
        setError(data.error || 'Failed to start tunnel');
      }
    } catch (err) {
      setError('Could not connect to backend. Is the server running?');
    }
    setIsStarting(false);
  };

  const stopTunnel = async () => {
    try {
      await fetch(`${API_BASE}/api/tunnel/stop`, { method: 'POST' });
      setTunnelUrl('');
    } catch (err) {
      // silently fail
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(tunnelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate a simple QR code using a public API (no dependency needed)
  const qrCodeUrl = tunnelUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tunnelUrl)}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500" /> Share to Phone
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Generate a secure link to access this dashboard from your phone
          </p>
        </div>
        {tunnelUrl ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Wifi className="w-3 h-3" /> Live
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <WifiOff className="w-3 h-3" /> Offline
          </span>
        )}
      </div>

      {!tunnelUrl ? (
        <button
          onClick={startTunnel}
          disabled={isStarting}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Generating Link...
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" /> Generate Phone Link
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-inner">
              <img src={qrCodeUrl} alt="Scan QR to open on phone" className="w-[180px] h-[180px]" />
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 font-medium">
            Scan this QR code with your phone camera
          </p>

          {/* URL Display */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <input
              type="text"
              readOnly
              value={tunnelUrl}
              className="flex-1 bg-transparent text-sm font-mono text-slate-700 outline-none truncate"
            />
            <button
              onClick={copyLink}
              className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 transition-colors"
            >
              {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={tunnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open in Browser
            </a>
            <button
              onClick={stopTunnel}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-red-200"
            >
              <WifiOff className="w-4 h-4" /> Stop Sharing
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center font-medium">{error}</p>
      )}
    </div>
  );
};

export default PhoneLinkGenerator;
