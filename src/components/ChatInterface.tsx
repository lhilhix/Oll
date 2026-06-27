import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Clock,
  Settings,
  X,
  FileCode,
  Copy,
  Check,
  Zap,
  RotateCcw,
  Plus,
  Trash2,
  Cpu,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Conversation, Message } from "../types";
import { parseReasoningContent, formatDuration } from "../utils/ollama";
import Markdown from "react-markdown";

interface ChatInterfaceProps {
  activeConversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onUpdateSystemPrompt: (prompt: string) => void;
  isStreaming: boolean;
  onClearHistory: () => void;
  onNewConversation: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onShowModelDetails?: (modelName: string) => void;
}

export default function ChatInterface({
  activeConversation,
  onSendMessage,
  onUpdateSystemPrompt,
  isStreaming,
  onClearHistory,
  onNewConversation,
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onShowModelDetails,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showThreadsSidebar, setShowThreadsSidebar] = useState<boolean>(() => {
    const saved = localStorage.getItem("show_threads_sidebar");
    return saved !== null ? saved === "true" : true;
  });

  const handleToggleThreadsSidebar = () => {
    setShowThreadsSidebar((prev) => {
      const nextValue = !prev;
      localStorage.setItem("show_threads_sidebar", String(nextValue));
      return nextValue;
    });
  };
  const [systemPromptInput, setSystemPromptInput] = useState(activeConversation?.systemPrompt || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync internal state with active conversation
  useEffect(() => {
    if (activeConversation) {
      setSystemPromptInput(activeConversation.systemPrompt);
    }
  }, [activeConversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages?.length, activeConversation?.messages?.map(m => m.content).join("")]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleCopyCode = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(blockId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateSystem = () => {
    onUpdateSystemPrompt(systemPromptInput);
    setShowSystemSettings(false);
  };

  // Helper to parse block elements (handles triple-backticks code blocks beautifully)
  const renderMessageContent = (message: Message) => {
    const isAssistant = message.role === "assistant";
    const { reasoning, content } = isAssistant
      ? parseReasoningContent(message.content)
      : { reasoning: "", content: message.content };

    return (
      <div className="space-y-3.5">
        {/* Reasoning section (collapsible for DeepSeek R1 outputs) */}
        {reasoning && (
          <div className="p-3.5 bg-cyan-50/40 border border-cyan-100/50 rounded-xl text-xs space-y-1.5 font-sans animate-fade-in select-text">
            <details open className="group">
              <summary className="flex items-center gap-1.5 font-bold text-cyan-800 uppercase tracking-wider text-[10px] cursor-pointer list-none select-none">
                <span className="transition-transform group-open:rotate-90">▶</span>
                <Sparkles size={11} className="text-cyan-600 animate-pulse" />
                Thinking Process
              </summary>
              <p className="mt-2 text-cyan-700/90 whitespace-pre-wrap leading-relaxed border-l border-cyan-200/60 pl-3.5 italic font-mono text-[11px]">
                {reasoning}
              </p>
            </details>
          </div>
        )}

        {/* Regular response content with markdown rendering for assistant, or formatted text for user */}
        <div className={`text-sm leading-relaxed font-sans select-text ${isAssistant ? "text-slate-800" : "text-white whitespace-pre-wrap"}`}>
          {isAssistant ? (
            <div className="markdown-body">
              <Markdown
                components={{
                  // Headings
                  h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-900 mt-4.5 mb-2 tracking-tight first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-800 mt-4 mb-1.5 first:mt-0">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-800 mt-3.5 mb-1 first:mt-0">{children}</h4>,
                  
                  // Paragraphs
                  p: ({ children }) => <p className="mb-3 last:mb-0 text-slate-800 leading-relaxed">{children}</p>,
                  
                  // Lists
                  ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-slate-800">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-slate-800">{children}</ol>,
                  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                  
                  // Code Blocks & Inline Code
                  code: (props: any) => {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !className;
                    const hasNewline = String(children).includes("\n");
                    const isCodeBlock = !isInline || hasNewline;

                    if (isCodeBlock) {
                      const language = match ? match[1] : "code";
                      const codeText = String(children).replace(/\n$/, "");
                      const blockId = `${message.id}-code-${Math.random().toString(36).substring(2, 9)}`;

                      return (
                        <div className="my-3.5 rounded-xl border border-slate-200/80 bg-slate-900 overflow-hidden shadow-sm font-mono text-xs max-w-full">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-b border-slate-700/40 text-slate-400 select-none">
                            <span className="flex items-center gap-1.5 font-semibold text-[10px] text-indigo-400 uppercase tracking-wider">
                              <FileCode size={13} />
                              {language}
                            </span>
                            <button
                              onClick={() => handleCopyCode(codeText, blockId)}
                              className="hover:text-white hover:bg-slate-700/60 p-1.5 rounded transition-all cursor-pointer"
                              title="Copy code snippet"
                            >
                              {copiedId === blockId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-slate-100 leading-normal select-text whitespace-pre">
                            <code className={className}>{codeText}</code>
                          </pre>
                        </div>
                      );
                    }

                    // Inline code
                    return (
                      <code className="px-1.5 py-0.5 mx-0.5 bg-slate-100 font-mono text-[12px] text-indigo-600 rounded border border-slate-200/60 break-words">
                        {children}
                      </code>
                    );
                  },
                  
                  // Pre (to remove default margins/overflow since our code component handles it)
                  pre: ({ children }) => <div className="max-w-full overflow-hidden">{children}</div>,
                  
                  // Tables
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto border border-slate-200/80 rounded-xl shadow-sm max-w-full">
                      <table className="min-w-full divide-y divide-slate-200 border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-50/75">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
                  tr: ({ children }) => <tr className="hover:bg-slate-50/40 transition-colors">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 text-xs text-slate-600 border-b border-slate-100/60">
                      {children}
                    </td>
                  ),
                  
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-400 pl-4 py-1.5 italic text-slate-600 my-4 bg-slate-50/50 rounded-r-lg pr-4">
                      {children}
                    </blockquote>
                  ),
                  
                  // Links
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors"
                    >
                      {children}
                    </a>
                  ),
                  
                  // Horizontal rules
                  hr: () => <hr className="my-5 border-t border-slate-200/80" />,
                  
                  // Bold
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                }}
              >
                {content}
              </Markdown>
            </div>
          ) : (
            renderStyledText(content, message.id)
          )}
        </div>

        {/* Inference Stats Banner */}
        {isAssistant && message.eval_count && (
          <div className="flex flex-wrap gap-2.5 pt-2.5 border-t border-slate-100/60 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1 bg-slate-50/50 px-2 py-0.5 rounded border border-slate-100">
              <Cpu size={10} />
              Tokens generated: {message.eval_count}
            </span>
            {message.eval_duration && message.eval_count && (
              <span className="flex items-center gap-1 bg-slate-50/50 px-2 py-0.5 rounded border border-slate-100">
                <Zap size={10} className="text-amber-500" />
                Speed: {Math.round((message.eval_count / (message.eval_duration / 1_000_000_000)) * 10) / 10} tok/s
              </span>
            )}
            {message.total_duration && (
              <span className="flex items-center gap-1 bg-slate-50/50 px-2 py-0.5 rounded border border-slate-100">
                <Clock size={10} />
                Total: {formatDuration(message.total_duration)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Crude parser to output custom code blocks or simple markdown
  const renderStyledText = (text: string, msgId: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).split("\n");
        const language = lines[0]?.trim() || "code";
        const code = lines.slice(1).join("\n");
        const blockId = `${msgId}-code-${index}`;

        return (
          <div key={blockId} className="my-3 rounded-xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm font-mono text-xs max-w-full">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/40 text-slate-400 select-none">
              <span className="flex items-center gap-1.5 font-semibold text-[10px] text-indigo-400 uppercase tracking-wider">
                <FileCode size={13} />
                {language}
              </span>
              <button
                id={`copy-btn-${blockId}`}
                onClick={() => handleCopyCode(code, blockId)}
                className="hover:text-white hover:bg-slate-700/60 p-1.5 rounded transition-all cursor-pointer"
                title="Copy code snippet"
              >
                {copiedId === blockId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-100 leading-normal select-text whitespace-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format basic highlights like `inline code`
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <React.Fragment key={index}>
          {inlineParts.map((subPart, subIndex) => {
            if (subPart.startsWith("`") && subPart.endsWith("`")) {
              return (
                <code key={subIndex} className="px-1.5 py-0.5 mx-0.5 bg-slate-100 font-mono text-[12px] text-indigo-600 rounded border border-slate-200/60">
                  {subPart.slice(1, -1)}
                </code>
              );
            }
            return subPart;
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div id="chat-component" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[680px]">
      {/* Header */}
      <div className="px-6 py-4.5 bg-white border-b border-slate-100 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <button
            id="toggle-threads-sidebar-btn"
            onClick={handleToggleThreadsSidebar}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showThreadsSidebar
                ? "bg-indigo-50/50 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            title={showThreadsSidebar ? "Hide threads sidebar" : "Show threads sidebar"}
          >
            {showThreadsSidebar ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>

          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles size={20} className={isStreaming ? "animate-pulse text-indigo-600" : ""} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {activeConversation ? activeConversation.title : "Remote AI Chat"}
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Active Model:</span>
              {activeConversation ? (
                <button
                  id="model-details-toggle"
                  onClick={() => onShowModelDetails?.(activeConversation.model)}
                  className="font-mono text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 px-1.5 py-0.5 rounded border border-indigo-100/30 flex items-center gap-1 transition-all cursor-pointer group"
                  title="Click to inspect model parameters, architecture, and Modelfile"
                >
                  {activeConversation.model}
                  <Info size={11} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ) : (
                <span className="font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  Select a model first
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Settings/System prompt toggle */}
          <button
            id="system-prompt-toggle"
            onClick={() => setShowSystemSettings(!showSystemSettings)}
            disabled={!activeConversation}
            className={`p-2 rounded-xl border border-slate-100 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer ${
              showSystemSettings ? "bg-indigo-50/50 text-indigo-600 border-indigo-100" : "text-slate-400"
            }`}
            title="Configure System Prompt"
          >
            <Settings size={16} />
          </button>

          {/* Clear History */}
          <button
            id="clear-chat-history-btn"
            onClick={onClearHistory}
            disabled={!activeConversation || activeConversation.messages.length === 0}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 rounded-xl border border-slate-100 transition-all cursor-pointer disabled:opacity-40"
            title="Clear current thread"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main chat window layout (sidebar inside chat for session listing + messages) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sessions list */}
        {showThreadsSidebar && (
          <div className="w-56 border-r border-slate-100 flex flex-col bg-slate-50/40 shrink-0 select-none animate-fade-in">
            <div className="p-3 border-b border-slate-100/60">
              <button
                id="new-chat-session-btn"
                onClick={onNewConversation}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 border border-indigo-100/30 transition-all cursor-pointer"
              >
                <Plus size={14} />
                New Thread
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-6">No threads yet</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center justify-between p-2 rounded-lg transition-all ${
                      activeConversation?.id === conv.id
                        ? "bg-white border border-slate-100 text-indigo-600 font-semibold"
                        : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-700"
                    }`}
                  >
                    <button
                      id={`select-session-${conv.id}`}
                      onClick={() => onSelectConversation(conv.id)}
                      className="flex-1 text-left text-xs truncate mr-4 pr-1 cursor-pointer"
                    >
                      {conv.title}
                    </button>
                    <button
                      id={`delete-session-${conv.id}`}
                      onClick={() => onDeleteConversation(conv.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-1 rounded hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conversation Box */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-slate-50/20">
          {/* Overlay settings panel */}
          {showSystemSettings && activeConversation && (
            <div className="absolute inset-x-0 top-0 bg-white border-b border-slate-200/60 p-4.5 z-20 space-y-3.5 shadow-md animate-fade-in select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure System Prompt</span>
                <button
                  onClick={() => setShowSystemSettings(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <textarea
                id="system-prompt-textarea"
                rows={3}
                value={systemPromptInput}
                onChange={(e) => setSystemPromptInput(e.target.value)}
                placeholder="Act as a helpful, expert AI programming assistant..."
                className="w-full p-2.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
              ></textarea>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSystemPromptInput("");
                    onUpdateSystemPrompt("");
                    setShowSystemSettings(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Clear Prompt
                </button>
                <button
                  id="save-system-prompt-btn"
                  onClick={handleUpdateSystem}
                  className="px-3.5 py-1.5 text-xs bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm cursor-pointer"
                >
                  Apply & Save
                </button>
              </div>
            </div>
          )}

          {/* Messages Pane */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!activeConversation ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 select-none">
                <Bot size={40} className="text-slate-300 animate-pulse" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-700 text-sm">Welcome to Ollama Cloud Client</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Connect a remote endpoint and select an installed model to start a chat session.
                  </p>
                </div>
              </div>
            ) : activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 select-none">
                <Bot size={36} className="text-indigo-400" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-700 text-sm">Thread Started</h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Using <span className="font-mono text-indigo-600">{activeConversation.model}</span>. Send a prompt to trigger completion.
                  </p>
                </div>
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 max-w-full ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    {/* User / Bot Avatar */}
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100/60 text-indigo-600 flex items-center justify-center shrink-0 self-start select-none">
                        <Bot size={16} />
                      </div>
                    )}

                    {/* Chat Bubble Container */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3.5 border ${
                        isAssistant
                          ? "bg-white text-slate-800 border-slate-100/80 shadow-sm"
                          : "bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/5"
                      }`}
                    >
                      {renderMessageContent(msg)}
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 text-slate-600 flex items-center justify-center shrink-0 self-start select-none">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt input Form */}
          <div className="p-4 bg-white border-t border-slate-100 select-none">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                id="chat-prompt-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!activeConversation || isStreaming}
                placeholder={
                  !activeConversation
                    ? "Select model first..."
                    : isStreaming
                    ? "Streaming Ollama response..."
                    : `Prompt ${activeConversation.model}...`
                }
                className="flex-1 px-4 py-3 text-sm bg-slate-50/50 text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
              />
              <button
                id="send-prompt-btn"
                type="submit"
                disabled={!activeConversation || isStreaming || !input.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shadow-sm cursor-pointer transition-all shrink-0"
              >
                <Send size={18} />
              </button>
            </form>
            {activeConversation && activeConversation.systemPrompt && (
              <div className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1 font-medium pl-1">
                <Settings size={10} /> Active custom system rules are applied to this conversation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
