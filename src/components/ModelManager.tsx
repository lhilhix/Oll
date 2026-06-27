import React, { useState } from "react";
import { Database, Download, Trash2, Info, Search, RefreshCw, AlertCircle, Sparkles, Server } from "lucide-react";
import { OllamaModel, PullStatus } from "../types";
import { formatBytes } from "../utils/ollama";

interface ModelManagerProps {
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (name: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onPullModel: (modelName: string) => Promise<void>;
  onDeleteModel: (modelName: string) => Promise<void>;
  pullStatus: PullStatus | null;
  isPulling: boolean;
}

export default function ModelManager({
  models,
  selectedModel,
  onSelectModel,
  onRefresh,
  isRefreshing,
  onPullModel,
  onDeleteModel,
  pullStatus,
  isPulling,
}: ModelManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [selectedModelInfo, setSelectedModelInfo] = useState<OllamaModel | null>(null);

  const filteredModels = models.filter((model) =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) return;
    onPullModel(newModelName.trim()).then(() => {
      setNewModelName("");
    });
  };

  const calculateProgress = () => {
    if (!pullStatus || !pullStatus.total || !pullStatus.completed) return 0;
    return Math.round((pullStatus.completed / pullStatus.total) * 100);
  };

  return (
    <div id="model-manager-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Model Manager</h2>
            <p className="text-xs text-slate-400">View and pull Ollama models on remote server</p>
          </div>
        </div>

        <button
          id="refresh-models-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all cursor-pointer disabled:opacity-50"
          title="Refresh model list"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Pull / Download Model Section */}
      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100/80 space-y-3.5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Download size={13} />
          Pull / Download Model
        </h3>

        <form onSubmit={handlePullSubmit} className="flex gap-2">
          <input
            id="pull-model-input"
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            disabled={isPulling}
            placeholder="e.g. deepseek-r1:1.5b, llama3, qwen2.5-coder:1.5b"
            className="flex-1 px-3.5 py-2 text-sm bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <button
            id="pull-model-btn"
            type="submit"
            disabled={isPulling || !newModelName.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isPulling ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {isPulling ? "Pulling..." : "Pull"}
          </button>
        </form>

        {/* Pull Progress indicator */}
        {isPulling && pullStatus && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-indigo-600 animate-pulse">{pullStatus.status || "Downloading..."}</span>
              <span className="font-mono text-slate-500">
                {pullStatus.completed && pullStatus.total
                  ? `${formatBytes(pullStatus.completed)} / ${formatBytes(pullStatus.total)} (${calculateProgress()}%)`
                  : ""}
              </span>
            </div>
            {pullStatus.total && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {pullStatus?.error && (
          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <p className="line-clamp-2">{pullStatus.error}</p>
          </div>
        )}
      </div>

      {/* Model List Search */}
      <div className="space-y-3">
        <div className="relative">
          <input
            id="model-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search installed models..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Models Scrollable List */}
        <div className="max-h-[280px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100/60 pr-1">
          {filteredModels.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1.5">
              <Server size={24} className="mx-auto text-slate-300" />
              <p className="text-xs">No models found</p>
              <p className="text-[10px] text-slate-400/80">Connect to a host or pull a model to populate</p>
            </div>
          ) : (
            filteredModels.map((model) => {
              const isSelected = selectedModel === model.name;
              return (
                <div
                  key={model.name}
                  className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/50"
                  }`}
                >
                  <button
                    id={`select-model-${model.name.replace(/[:.]/g, "-")}`}
                    onClick={() => onSelectModel(model.name)}
                    className="flex-1 text-left min-w-0 space-y-0.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700 text-xs truncate block">{model.name}</span>
                      {model.name.includes("deepseek") && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-100 uppercase">
                          <Sparkles size={8} /> R1 / Reasoning
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-medium">
                      <span>{formatBytes(model.size)}</span>
                      <span>•</span>
                      <span>{model.details?.parameter_size || "unknown size"}</span>
                      <span>•</span>
                      <span className="font-mono">{model.details?.quantization_level || "Q4_K_M"}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* View Info */}
                    <button
                      id={`info-model-${model.name.replace(/[:.]/g, "-")}`}
                      onClick={() => setSelectedModelInfo(selectedModelInfo?.name === model.name ? null : model)}
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors cursor-pointer ${
                        selectedModelInfo?.name === model.name ? "bg-slate-100 text-indigo-600" : ""
                      }`}
                      title="View parameters"
                    >
                      <Info size={13} />
                    </button>

                    {/* Delete Model */}
                    <button
                      id={`delete-model-${model.name.replace(/[:.]/g, "-")}`}
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${model.name}?`)) {
                          onDeleteModel(model.name);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete model"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Model Parameter Specs overlay / section */}
      {selectedModelInfo && (
        <div className="p-4 bg-slate-50 border border-indigo-100/60 rounded-xl text-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
            <span className="font-semibold text-slate-700">Model Metadata: {selectedModelInfo.name}</span>
            <button
              onClick={() => setSelectedModelInfo(null)}
              className="text-[10px] text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Hide Details
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
            <div>
              <span className="text-slate-400 font-medium block">Family:</span>
              <span className="font-medium">{selectedModelInfo.details?.family || "Unknown"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Format:</span>
              <span className="font-mono">{selectedModelInfo.details?.format || "GGUF"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Parameter Size:</span>
              <span className="font-medium">{selectedModelInfo.details?.parameter_size || "Unknown"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Quantization:</span>
              <span className="font-mono">{selectedModelInfo.details?.quantization_level || "Unknown"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 font-medium block">Digest:</span>
              <span className="font-mono break-all text-[9px] bg-white p-1 rounded border border-slate-100 block">
                {selectedModelInfo.digest}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
