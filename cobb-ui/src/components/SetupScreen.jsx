import React from 'react';

export default function SetupScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Setup Required</h1>
        <p className="text-slate-400">Please configure your environment to continue.</p>
      </div>
    </div>
  );
}
