import React from "react";
import { Server, Key, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Database } from "lucide-react";
import { ConnectionConfig } from "../types";

interface ConnectionSettingsProps {
  config: ConnectionConfig;
  hostInput: string;
  tokenInput: string;
  setHostInput: (host: string) => void;
  setTokenInput: (token: string) => void;
  onConnect: () => void;
  isConnecting: boolean;
  onDisconnect: () => void;
  hasServerDefaults: boolean;
  defaultHost: string;
}

export default function ConnectionSettings({
  config,
  hostInput,
  tokenInput,
  setHostInput,
  setTokenInput,
  onConnect,
  isConnecting,
  onDisconnect,
  hasServerDefaults,
  defaultHost,
}: ConnectionSettingsProps) {
  const handleQuickSelect = (url: string) => {
    setHostInput(url);
  };

  return (
    <div id="connection-settings-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
            <Server size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Connection Endpoint</h2>
            <p className="text-xs text-slate-400">Configure remote Ollama API connection</p>
          </div>
        </div>

        {/* Connection Badge Indicator */}
        <div>
          {config.isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 size={12} className="text-emerald-600" />
              Connected
            </span>
          ) : config.error ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              <AlertCircle size={12} className="text-rose-600" />
              Connection Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
              <WifiOff size={12} className="text-amber-600" />
              Offline / Pending
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Remote Host Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Remote Ollama Host URL</span>
            {hasServerDefaults && (
              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                <ShieldCheck size={10} /> Pre-configured fallback available
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="host-input-field"
              type="text"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              placeholder="e.g. http://12.34.56.78:11434 or https://api.ollama.cloud"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Server size={16} />
            </div>
          </div>
        </div>

        {/* Authorization Header Token */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Authorization Key / Bearer Token (Optional)</span>
            <span className="text-[10px] text-slate-400">For secured servers, Cloudflare Access, or RunPod</span>
          </label>
          <div className="relative">
            <input
              id="token-input-field"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Key size={16} />
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Quick Presets</span>
          <div className="flex flex-wrap gap-2">
            <button
              id="preset-local"
              onClick={() => handleQuickSelect("http://localhost:11434")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/60 hover:border-indigo-200 transition-all cursor-pointer"
            >
              Localhost (11434)
            </button>
            <button
              id="preset-ngrok"
              onClick={() => handleQuickSelect("https://my-ngrok-tunnel.ngrok-free.app")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/60 hover:border-indigo-200 transition-all cursor-pointer"
            >
              ngrok Tunnel
            </button>
            {hasServerDefaults && defaultHost && (
              <button
                id="preset-env"
                onClick={() => handleQuickSelect(defaultHost)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <Database size={11} />
                Server Default ({new URL(defaultHost).hostname})
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex gap-3">
          <button
            id="test-connection-btn"
            onClick={onConnect}
            disabled={isConnecting}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/10 cursor-pointer transition-all"
          >
            {isConnecting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Wifi size={16} />
            )}
            {isConnecting ? "Connecting..." : "Test & Connect"}
          </button>

          {config.isConnected && (
            <button
              id="disconnect-connection-btn"
              onClick={onDisconnect}
              className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-medium text-sm rounded-xl border border-slate-200/40 hover:border-rose-200 transition-all cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Connection Error Message Box */}
        {config.error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl space-y-1.5 text-xs animate-fade-in">
            <div className="flex items-start gap-2 font-medium">
              <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <span>Failed to reach remote Ollama endpoint:</span>
            </div>
            <p className="text-rose-600 pl-5 leading-relaxed font-mono whitespace-pre-wrap select-text">
              {config.error}
            </p>
            <div className="text-[10px] text-slate-400 pl-5 pt-1 border-t border-rose-100 mt-2">
              Tip: Ensure CORS is enabled on Ollama (`OLLAMA_ORIGINS="*"`) or that your node proxy is running correctly. If you're hosting behind an auth proxy, make sure your token is correct.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
