import React from "react";
import { Sliders, HelpCircle, RotateCcw } from "lucide-react";
import { OllamaParams } from "../types";

interface ParameterSettingsProps {
  parameters: OllamaParams;
  onChange: (params: OllamaParams) => void;
}

const defaultParams: OllamaParams = {
  temperature: 0.7,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_predict: 2048,
  seed: 42,
};

export default function ParameterSettings({ parameters, onChange }: ParameterSettingsProps) {
  const updateParam = (key: keyof OllamaParams, value: number) => {
    onChange({
      ...parameters,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({ ...defaultParams });
  };

  return (
    <div id="parameter-settings-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sliders size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Parameters Tuning</h2>
            <p className="text-xs text-slate-400">Optimize response output properties</p>
          </div>
        </div>

        <button
          id="reset-params-btn"
          onClick={handleReset}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50/50 transition-all cursor-pointer"
        >
          <RotateCcw size={12} />
          Reset Defaults
        </button>
      </div>

      <div className="space-y-4">
        {/* Temperature */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Temperature
              <div className="group relative text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle size={12} />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg shadow-md z-10 font-normal leading-relaxed">
                  Controls randomness. Higher values mean more creative but less predictable outputs. Default is 0.7.
                </div>
              </div>
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">{parameters.temperature.toFixed(2)}</span>
          </div>
          <input
            id="temp-slider"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={parameters.temperature}
            onChange={(e) => updateParam("temperature", parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Deterministic (0.0)</span>
            <span>Creative (1.5)</span>
          </div>
        </div>

        {/* Top P */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Top P (Nucleus)
              <div className="group relative text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle size={12} />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg shadow-md z-10 font-normal leading-relaxed">
                  Limits cumulative probability pool. Lower values narrow vocabulary choice, making content more focused. Default is 0.9.
                </div>
              </div>
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">{parameters.top_p.toFixed(2)}</span>
          </div>
          <input
            id="top-p-slider"
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={parameters.top_p}
            onChange={(e) => updateParam("top_p", parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Focused (0.1)</span>
            <span>Diverse (1.0)</span>
          </div>
        </div>

        {/* Repeat Penalty */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Repeat Penalty
              <div className="group relative text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle size={12} />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg shadow-md z-10 font-normal leading-relaxed">
                  Discourages the model from repeating previous lines or tokens. Default is 1.1.
                </div>
              </div>
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">{parameters.repeat_penalty.toFixed(2)}</span>
          </div>
          <input
            id="repeat-penalty-slider"
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={parameters.repeat_penalty}
            onChange={(e) => updateParam("repeat_penalty", parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Permissive (0.5)</span>
            <span>Strict Penalty (2.0)</span>
          </div>
        </div>

        {/* Num Predict */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Max Response Tokens
              <div className="group relative text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle size={12} />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg shadow-md z-10 font-normal leading-relaxed">
                  Maximum number of tokens to predict/generate. -1 is infinite. Default is 2048.
                </div>
              </div>
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">{parameters.num_predict}</span>
          </div>
          <input
            id="num-predict-slider"
            type="range"
            min="128"
            max="8192"
            step="128"
            value={parameters.num_predict}
            onChange={(e) => updateParam("num_predict", parseInt(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Short (128)</span>
            <span>Long (8192)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
