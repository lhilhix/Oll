import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Cpu,
  FileCode,
  Sliders,
  Terminal,
  Shield,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Hash,
  Database,
  Layers,
  Sparkles
} from "lucide-react";
import { ConnectionConfig } from "../types";

const isLocalHost = (host: string): boolean => {
  if (!host) return false;
  const lower = host.toLowerCase().trim();
  return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("[::1]");
};

interface ModelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  connection: ConnectionConfig;
}

interface ShowMetadata {
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  license?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[] | null;
    parameter_size?: string;
    quantization_level?: string;
  };
  model_info?: Record<string, any>;
}

export default function ModelDetailsModal({
  isOpen,
  onClose,
  modelName,
  connection,
}: ModelDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ShowMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "modelfile" | "parameters" | "architecture">("overview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && modelName) {
      fetchModelDetails();
    }
  }, [isOpen, modelName, connection.host]);

  const fetchModelDetails = async () => {
    setLoading(true);
    setError(null);
    setMetadata(null);

    try {
      let response;
      if (isLocalHost(connection.host)) {
        response = await fetch(`${connection.host}/api/show`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: modelName }),
        });
      } else {
        response = await fetch("/api/ollama/show", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": connection.host,
            "x-ollama-token": connection.token,
          },
          body: JSON.stringify({ name: modelName }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to retrieve detailed metadata for this model.");
      }

      const data = await response.json();
      setMetadata(data);
    } catch (err: any) {
      console.error("Failed to load model details:", err);
      setError(err.message || "Could not retrieve model details from the host server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Humanize model_info keys for display
  const cleanKey = (key: string) => {
    return key
      .replace(/^(general|llama|clip|gemma|phi3|deepseek)\./, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Safely extract context length from model_info
  const getContextLength = () => {
    if (!metadata?.model_info) return null;
    const keys = Object.keys(metadata.model_info);
    const contextKey = keys.find((k) => k.includes("context_length"));
    return contextKey ? metadata.model_info[contextKey] : null;
  };

  // Safely extract embedding length
  const getEmbeddingLength = () => {
    if (!metadata?.model_info) return null;
    const keys = Object.keys(metadata.model_info);
    const embKey = keys.find((k) => k.includes("embedding_length"));
    return embKey ? metadata.model_info[embKey] : null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Cpu size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Model Inspector</h3>
                  <p className="text-xs text-slate-400 font-mono">{modelName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner Tabs Navigation */}
            {!loading && !error && metadata && (
              <div className="flex px-6 border-b border-slate-100 bg-white gap-2 text-xs font-semibold select-none scrollbar-none overflow-x-auto">
                {(
                  [
                    { id: "overview", label: "Overview", icon: Database },
                    { id: "architecture", label: "Architecture", icon: Layers },
                    { id: "modelfile", label: "Modelfile", icon: FileCode },
                    { id: "parameters", label: "Config & params", icon: Sliders },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all cursor-pointer ${
                        isActive
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-white">
              {loading && (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw size={32} className="mx-auto text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Fetching detailed parameters from remote node...</p>
                </div>
              )}

              {error && (
                <div className="py-8 px-4 text-center space-y-4">
                  <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
                    <Shield size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800">Retrieval Failed</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
                  </div>
                  <button
                    onClick={fetchModelDetails}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-all cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Retry Connection
                  </button>
                </div>
              )}

              {!loading && !error && metadata && (
                <div className="space-y-6">
                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Grid Stats cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Family</span>
                          <span className="text-sm font-semibold text-slate-700 capitalize flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-500" />
                            {metadata.details?.family || "Generic Neural"}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Quantization</span>
                          <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50/30 px-1.5 py-0.5 rounded border border-indigo-100/20 inline-block">
                            {metadata.details?.quantization_level || "Unknown Q4"}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Parameters Size</span>
                          <span className="text-sm font-semibold text-slate-700">
                            {metadata.details?.parameter_size || "N/A"}
                          </span>
                        </div>
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Format</span>
                          <span className="text-sm font-mono font-medium text-slate-700">
                            {metadata.details?.format || "gguf"}
                          </span>
                        </div>
                      </div>

                      {/* Key highlights (context, template, etc) */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model Summary</h4>
                        <div className="divide-y divide-slate-100/80 border border-slate-100 rounded-xl overflow-hidden text-xs">
                          {getContextLength() && (
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/40">
                              <span className="text-slate-400 font-medium">Context Window Token Limit:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {getContextLength()?.toLocaleString()} tokens
                              </span>
                            </div>
                          )}
                          {getEmbeddingLength() && (
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/40">
                              <span className="text-slate-400 font-medium">Embedding Dimension Size:</span>
                              <span className="font-mono text-slate-700">{getEmbeddingLength()}</span>
                            </div>
                          )}
                          {metadata.details?.parent_model && (
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/40">
                              <span className="text-slate-400 font-medium">Parent Architecture Model:</span>
                              <span className="font-mono text-slate-700">{metadata.details.parent_model}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* License Card */}
                      {metadata.license && (
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Statement</h4>
                          <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl max-h-[120px] overflow-y-auto">
                            <pre className="font-sans text-[11px] text-emerald-800 leading-relaxed whitespace-pre-wrap select-text">
                              {metadata.license}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Architecture Tab */}
                  {activeTab === "architecture" && (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Neural Core Architecture</h4>
                      {metadata.model_info && Object.keys(metadata.model_info).length > 0 ? (
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto divide-y divide-slate-100/60 shadow-sm/5">
                          {Object.entries(metadata.model_info)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([key, val]) => (
                              <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 text-[11px] hover:bg-slate-50/40 transition-all gap-1 sm:gap-4 select-text">
                                <span className="text-slate-400 font-mono font-medium truncate shrink-0 max-w-full sm:max-w-[280px]" title={key}>
                                  {cleanKey(key)}
                                </span>
                                <span className="font-mono text-slate-800 bg-slate-50/70 border border-slate-200/40 px-1.5 py-0.5 rounded text-right break-all">
                                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                          No low-level architecture layers reported by host.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modelfile Tab */}
                  {activeTab === "modelfile" && (
                    <div className="space-y-3.5 animate-fade-in flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ollama ModelFile Structure</span>
                        <button
                          onClick={() => handleCopyText(metadata.modelfile)}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check size={12} className="text-emerald-500" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy ModelFile
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative border border-slate-200/80 bg-slate-900 rounded-xl overflow-hidden shadow-sm flex-1">
                        <pre className="p-4 overflow-auto max-h-[380px] font-mono text-[11px] text-slate-100 leading-relaxed whitespace-pre select-text">
                          {metadata.modelfile || "# No ModelFile definition available."}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Parameters & System Tab */}
                  {activeTab === "parameters" && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Parameters Section */}
                      {metadata.parameters && (
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Default Inference Variables</h4>
                          <div className="border border-slate-200/80 bg-slate-900 rounded-xl overflow-hidden shadow-sm">
                            <pre className="p-3.5 overflow-x-auto max-h-[160px] font-mono text-[11px] text-slate-200 leading-relaxed whitespace-pre select-text">
                              {metadata.parameters}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Template section */}
                      {metadata.template && (
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Wrapper Template</h4>
                          <div className="border border-slate-200/80 bg-slate-50 rounded-xl overflow-hidden">
                            <pre className="p-3.5 overflow-x-auto max-h-[180px] font-mono text-[11px] text-slate-600 leading-relaxed whitespace-pre select-text">
                              {metadata.template}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 select-none">
              <span className="flex items-center gap-1">
                <Hash size={11} className="text-indigo-400" />
                Digest: {metadata?.details?.parent_model || metadata?.details?.family || "Standard"}
              </span>
              <span>Loaded via Cloud Proxy</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
