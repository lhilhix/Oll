import React, { useState, useEffect } from "react";
import { Server, Terminal, MessageSquare, Zap, Github, ShieldAlert, Cpu } from "lucide-react";
import ConnectionSettings from "./components/ConnectionSettings";
import ModelManager from "./components/ModelManager";
import ParameterSettings from "./components/ParameterSettings";
import ChatInterface from "./components/ChatInterface";
import ModelDetailsModal from "./components/ModelDetailsModal";
import { ConnectionConfig, OllamaModel, Conversation, Message, OllamaParams, PullStatus } from "./types";
import { readOllamaStream } from "./utils/ollama";

const DEFAULT_PARAMS: OllamaParams = {
  temperature: 0.7,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_predict: 2048,
  seed: 42,
};

const isLocalHost = (host: string): boolean => {
  if (!host) return false;
  const lower = host.toLowerCase().trim();
  return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("[::1]");
};

export default function App() {
  // Connection Configuration
  const [connection, setConnection] = useState<ConnectionConfig>({
    host: localStorage.getItem("ollama_host") || "",
    token: localStorage.getItem("ollama_token") || "",
    isConnected: false,
    isChecking: false,
    error: null,
    modelsCount: 0,
  });

  const [hostInput, setHostInput] = useState(connection.host);
  const [tokenInput, setTokenInput] = useState(connection.token);

  // Server defaults check
  const [hasServerDefaults, setHasServerDefaults] = useState(false);
  const [defaultHost, setDefaultHost] = useState("");

  // Models State
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem("ollama_selected_model") || "");
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // Pulling Model State
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<PullStatus | null>(null);

  // Conversations State
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem("ollama_conversations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
      } catch (e) {
        console.error("Failed to parse saved conversations:", e);
      }
    }
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    localStorage.getItem("ollama_active_conversation_id")
  );

  const [isStreaming, setIsStreaming] = useState(false);

  // Model Details Inspector Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalModelName, setDetailsModalModelName] = useState("");

  const handleShowModelDetails = (modelName: string) => {
    setDetailsModalModelName(modelName);
    setDetailsModalOpen(true);
  };

  // Initial Configuration Checks & Automatic connection attempt
  useEffect(() => {
    fetch("/api/ollama/config")
      .then((res) => res.json())
      .then((data) => {
        setHasServerDefaults(data.hasDefaultHost);
        setDefaultHost(data.defaultHost);
        
        // If there is a default server host and no host input, autofill it
        if (data.hasDefaultHost && !hostInput) {
          setHostInput(data.defaultHost);
        }
      })
      .catch((err) => console.error("Error fetching defaults config:", err));
  }, []);

  // Try automatically connecting on load if configuration is present
  useEffect(() => {
    const defaultHostToTest = hostInput || defaultHost;
    if (defaultHostToTest) {
      testAndConnect(defaultHostToTest, tokenInput, true);
    }
  }, [defaultHost]);

  // Persist Conversations
  useEffect(() => {
    localStorage.setItem("ollama_conversations", JSON.stringify(conversations));
  }, [conversations]);

  // Persist Active Conversation selection
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem("ollama_active_conversation_id", activeConversationId);
    } else {
      localStorage.removeItem("ollama_active_conversation_id");
    }
  }, [activeConversationId]);

  // Persist selected model
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("ollama_selected_model", selectedModel);
    } else {
      localStorage.removeItem("ollama_selected_model");
    }
  }, [selectedModel]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Connection Handler
  const testAndConnect = async (hostUrl: string, tokenVal: string, isAutoCheck = false) => {
    const url = hostUrl.trim() || defaultHost || "http://localhost:11434";
    setConnection((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      let success = false;
      let modelsCount = 0;
      let errorMsg = "";

      if (isLocalHost(url)) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(`${url}/api/tags`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            success = true;
            modelsCount = data.models?.length || 0;
          } else {
            errorMsg = `Local Ollama returned error status ${response.status}`;
          }
        } catch (localErr: any) {
          if (localErr.name === "AbortError") {
            errorMsg = "Local connection timed out (is Ollama running?)";
          } else {
            errorMsg = "Local CORS or connection error. Make sure Ollama is running and OLLAMA_ORIGINS='*' is configured.";
          }
        }
      } else {
        const response = await fetch("/api/ollama/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": url,
            "x-ollama-token": tokenVal,
          },
        });

        const data = await response.json();
        success = data.success;
        modelsCount = data.modelsCount;
        errorMsg = data.message;
      }

      if (success) {
        setConnection({
          host: url,
          token: tokenVal,
          isConnected: true,
          isChecking: false,
          error: null,
          modelsCount: modelsCount,
        });

        localStorage.setItem("ollama_host", url);
        localStorage.setItem("ollama_token", tokenVal);

        // Fetch models list
        fetchModelsList(url, tokenVal);
      } else {
        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          isChecking: false,
          error: isAutoCheck ? null : (errorMsg || "Endpoint responded with error status"),
        }));
      }
    } catch (err: any) {
      if (!isAutoCheck) {
        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          isChecking: false,
          error: err.message || "Failed to make HTTP handshake requests",
        }));
      } else {
        setConnection((prev) => ({ ...prev, isChecking: false }));
      }
    }
  };

  const handleDisconnect = () => {
    setConnection({
      host: "",
      token: "",
      isConnected: false,
      isChecking: false,
      error: null,
      modelsCount: 0,
    });
    setModels([]);
    localStorage.removeItem("ollama_host");
    localStorage.removeItem("ollama_token");
  };

  // Fetch Models
  const fetchModelsList = async (hostUrl = connection.host, tokenVal = connection.token) => {
    setIsRefreshingModels(true);
    try {
      let data;
      if (isLocalHost(hostUrl)) {
        const response = await fetch(`${hostUrl}/api/tags`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Could not fetch models from local Ollama");
        data = await response.json();
      } else {
        const response = await fetch("/api/ollama/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": hostUrl,
            "x-ollama-token": tokenVal,
          },
        });
        if (!response.ok) throw new Error("Could not fetch models");
        data = await response.json();
      }

      const loadedModels: OllamaModel[] = data.models || [];
      setModels(loadedModels);

      // If there is a pre-selected model but it's not in the list, choose the first available model
      if (loadedModels.length > 0) {
        const stillExists = loadedModels.some((m) => m.name === selectedModel);
        if (!stillExists) {
          setSelectedModel(loadedModels[0].name);
        }
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Pull model downloader with NDJSON live-streaming support
  const handlePullModel = async (modelName: string) => {
    setIsPulling(true);
    setPullStatus({ status: "Preparing to pull model...", error: undefined });

    try {
      let response;
      if (isLocalHost(connection.host)) {
        response = await fetch(`${connection.host}/api/pull`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: modelName, stream: true }),
        });
      } else {
        response = await fetch("/api/ollama/pull", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": connection.host,
            "x-ollama-token": connection.token,
          },
          body: JSON.stringify({ name: modelName, stream: true }),
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Remote pull failed");
      }

      await readOllamaStream(response, (chunk) => {
        setPullStatus({
          status: chunk.status,
          digest: chunk.digest,
          total: chunk.total,
          completed: chunk.completed,
          error: chunk.error,
        });
      });

      // After a successful pull, refresh the models list
      fetchModelsList();
      setIsPulling(false);
      setPullStatus(null);
    } catch (err: any) {
      console.error("Error pulling model:", err);
      setPullStatus({
        status: "Pull failed",
        error: err.message || "Unknown error occurred while downloading model.",
      });
      setIsPulling(false);
    }
  };

  // Delete Model
  const handleDeleteModel = async (modelName: string) => {
    try {
      let response;
      if (isLocalHost(connection.host)) {
        response = await fetch(`${connection.host}/api/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: modelName }),
        });
      } else {
        response = await fetch("/api/ollama/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": connection.host,
            "x-ollama-token": connection.token,
          },
          body: JSON.stringify({ name: modelName }),
        });
      }

      if (!response.ok) throw new Error("Failed to delete model");

      // Refresh list
      fetchModelsList();
      if (selectedModel === modelName) {
        setSelectedModel("");
      }
    } catch (err: any) {
      alert(`Error deleting model: ${err.message || "Check connection parameters"}`);
    }
  };

  // Conversation Helpers
  const handleNewConversation = () => {
    if (!selectedModel) {
      alert("Please select a model from the Model Manager first before starting a thread!");
      return;
    }

    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: `Chat with ${selectedModel.split(":")[0]}`,
      model: selectedModel,
      messages: [],
      systemPrompt: "",
      createdAt: new Date(),
      parameters: { ...DEFAULT_PARAMS },
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const handleUpdateSystemPrompt = (prompt: string) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, systemPrompt: prompt } : c))
    );
  };

  const handleUpdateParams = (params: OllamaParams) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, parameters: params } : c))
    );
  };

  const handleClearHistory = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, messages: [] } : c))
    );
  };

  // Sending a message (Streaming chat completions)
  const handleSendMessage = async (content: string) => {
    if (!activeConversation || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Update state to include user message & initial blank assistant message
    const updatedMessages = [...activeConversation.messages, userMessage];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: [...updatedMessages, assistantMessage],
              // Automatically rename the thread on the first user message
              title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? "..." : "") : c.title,
            }
          : c
      )
    );

    setIsStreaming(true);

    try {
      // Build options
      const options: Record<string, any> = {
        temperature: activeConversation.parameters?.temperature,
        top_p: activeConversation.parameters?.top_p,
        repeat_penalty: activeConversation.parameters?.repeat_penalty,
        seed: activeConversation.parameters?.seed,
      };
      if (activeConversation.parameters?.num_predict !== -1) {
        options.num_predict = activeConversation.parameters?.num_predict;
      }

      // Map prompt payload to Ollama format
      const ollamaMessages = [];

      // Prepend system prompt if configured
      if (activeConversation.systemPrompt) {
        ollamaMessages.push({
          role: "system",
          content: activeConversation.systemPrompt,
        });
      }

      // Add actual messages
      updatedMessages.forEach((m) => {
        ollamaMessages.push({
          role: m.role,
          content: m.content,
        });
      });

      let response;
      if (isLocalHost(connection.host)) {
        response = await fetch(`${connection.host}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: activeConversation.model,
            messages: ollamaMessages,
            options,
            stream: true,
          }),
        });
      } else {
        response = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-host": connection.host,
            "x-ollama-token": connection.token,
          },
          body: JSON.stringify({
            model: activeConversation.model,
            messages: ollamaMessages,
            options,
            stream: true,
          }),
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Error calling Ollama chat endpoint");
      }

      let accumulatedText = "";

      await readOllamaStream(
        response,
        (chunk) => {
          if (chunk.message?.content) {
            accumulatedText += chunk.message.content;

            // Stream state updates
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === activeConversation.id) {
                  return {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: accumulatedText } : m
                    ),
                  };
                }
                return c;
              })
            );
          }
        },
        (stats) => {
          // Stream completed, merge evaluation statistics
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === activeConversation.id) {
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessageId ? { ...m, ...stats } : m
                  ),
                };
              }
              return c;
            })
          );
        }
      );
    } catch (err: any) {
      console.error("Inference stream failed:", err);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content:
                        m.content +
                        `\n\n*(Handshake Connection Interrupted: ${err.message || "Failed to reach remote model host"})*`,
                    }
                  : m
              ),
            };
          }
          return c;
        })
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans select-none antialiased">
      {/* Global Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <Terminal size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight">Ollama Cloud Client</h1>
              <p className="text-[11px] font-medium text-slate-400">Interact with remote & self-hosted AI models</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            {connection.isConnected ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Proxy Active: {new URL(connection.host).hostname}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl border border-slate-200/50">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left Control Column (Grid Span 4) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          {/* Connection configuration */}
          <ConnectionSettings
            config={connection}
            hostInput={hostInput}
            tokenInput={tokenInput}
            setHostInput={setHostInput}
            setTokenInput={setTokenInput}
            onConnect={() => testAndConnect(hostInput, tokenInput)}
            isConnecting={connection.isChecking}
            onDisconnect={handleDisconnect}
            hasServerDefaults={hasServerDefaults}
            defaultHost={defaultHost}
          />

          {/* Model downloader & managers */}
          <ModelManager
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onRefresh={() => fetchModelsList()}
            isRefreshing={isRefreshingModels}
            onPullModel={handlePullModel}
            onDeleteModel={handleDeleteModel}
            pullStatus={pullStatus}
            isPulling={isPulling}
            onShowModelDetails={handleShowModelDetails}
          />

          {/* Parameters sliders */}
          {activeConversation && (
            <ParameterSettings
              parameters={activeConversation.parameters || DEFAULT_PARAMS}
              onChange={handleUpdateParams}
            />
          )}
        </div>

        {/* Right Chat Column (Grid Span 8) */}
        <div className="lg:col-span-8 flex flex-col">
          <ChatInterface
            activeConversation={activeConversation}
            onSendMessage={handleSendMessage}
            onUpdateSystemPrompt={handleUpdateSystemPrompt}
            isStreaming={isStreaming}
            onClearHistory={handleClearHistory}
            onNewConversation={handleNewConversation}
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onShowModelDetails={handleShowModelDetails}
          />
        </div>
      </main>

      {/* Model Details Inspector Modal */}
      <ModelDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        modelName={detailsModalModelName}
        connection={connection}
      />

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-5 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <Cpu size={14} className="text-slate-300" />
            <span>Ollama Cloud Client Framework</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Configure CORS with <code className="font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">OLLAMA_ORIGINS="*"</code> for secure tunnel access.
          </span>
        </div>
      </footer>
    </div>
  );
}
