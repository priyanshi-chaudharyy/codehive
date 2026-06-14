import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Settings, X, Trash2, AlertTriangle, Zap } from 'lucide-react';

const STORAGE_KEY = 'codehive_gemini_key';
const MODEL_KEY = 'codehive_gemini_model';

const DEFAULT_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
];

/**
 * AI Code Assistant Chat Panel.
 * Uses the user's own Gemini API key (BYOK). All requests go directly
 * from the browser to the Gemini API — our server never touches the key.
 */
const AIChatPanel = ({ isVisible, onClose, getCode, language, activeFileName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(MODEL_KEY) || 'gemini-2.0-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(selectedModel);
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch available models for this specific API key
  const fetchAvailableModels = async (keyToTest) => {
    if (!keyToTest) return;
    try {
      setIsFetchingModels(true);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const models = data.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => {
          const id = m.name.replace('models/', '');
          return { id, name: m.displayName || id };
        });
      
      if (models.length > 0) {
        setAvailableModels(models);
        // Auto-select first model if current isn't in list
        if (!models.find(m => m.id === modelInput)) {
          setModelInput(models[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      // Fallback to default models silently
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save API key and Model
  const handleSaveSettings = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setApiKey(trimmed);
    }
    localStorage.setItem(MODEL_KEY, modelInput);
    setSelectedModel(modelInput);
    setShowSettings(false);
    setKeyInput('');
  };

  const handleRemoveKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setKeyInput('');
  };

  // ── Call Gemini API ────────────────────────────────────────
  const callGemini = useCallback(async (userMessage, contextCode = '', isErrorExplain = false) => {
    if (!apiKey) return;

    const systemPrompt = isErrorExplain
      ? `You are CodeHive AI — a helpful coding assistant embedded in a collaborative cloud IDE. 
The user is asking you to explain a terminal error. Analyze the error output and:
1. Explain what went wrong in simple terms
2. Identify the root cause
3. Suggest exact commands or code fixes to resolve it
Be concise. Use markdown formatting with code blocks.`
      : `You are CodeHive AI — a helpful coding assistant embedded in a collaborative cloud IDE.
The user is currently editing a file named "${activeFileName || 'unknown'}" written in ${language || 'javascript'}.
Help them with their coding questions. Be concise and use markdown formatting with code blocks.
If they ask about their code, refer to the code context provided below.`;

    const codeContext = contextCode
      ? `\n\n--- Current Code Context ---\n\`\`\`${language || 'javascript'}\n${contextCode.slice(0, 8000)}\n\`\`\``
      : '';

    // Build conversation history for context
    const conversationParts = messages.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    conversationParts.push({
      role: 'user',
      parts: [{ text: `[System Context: ${systemPrompt}]\n\nUser Request: ${userMessage}${codeContext}` }],
    });

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: conversationParts,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
      return aiText;
    } catch (err) {
      throw err;
    }
  }, [apiKey, messages, language, activeFileName, selectedModel]);

  // ── Send message ───────────────────────────────────────────
  const handleSend = async (overrideText = null, isErrorExplain = false) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;

    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const userMsg = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const code = getCode ? getCode() : '';
      const aiResponse = await callGemini(text, code, isErrorExplain);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: aiResponse,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        text: `❌ ${err.message}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose the send method for external callers (like "Explain Error")
  useEffect(() => {
    window.__codehiveAISend = (text, isError) => handleSend(text, isError);
    return () => { delete window.__codehiveAISend; };
  });

  const handleClearChat = () => setMessages([]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-surface-900/60 w-full animate-slide-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-surface-200">AI Assistant</h3>
          <span className="badge bg-violet-500/20 text-violet-300 text-[10px]">{availableModels.find(m => m.id === selectedModel)?.name || 'Gemini'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowSettings(!showSettings); setKeyInput(apiKey); setModelInput(selectedModel); if (apiKey && !showSettings) fetchAvailableModels(apiKey); }}
            className={`p-1 rounded text-surface-500 hover:text-surface-200 transition-colors ${apiKey ? 'text-emerald-400' : 'text-amber-400'}`}
            title={apiKey ? 'API Key Set ✓' : 'Set API Key'}
          >
            <Settings size={14} />
          </button>
          <button onClick={handleClearChat} className="p-1 rounded text-surface-500 hover:text-surface-200 transition-colors" title="Clear Chat">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1 rounded text-surface-500 hover:text-surface-200 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-surface-800/50 border-b border-surface-700/50 animate-slide-down">
          <p className="text-xs text-surface-400 mb-2">
            Paste your <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Google Gemini API key</a> below. It stays in your browser only.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIza..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-surface-600 text-xs text-white placeholder-surface-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex items-center justify-between mb-2 mt-3">
            <p className="text-xs text-surface-400">Select Model:</p>
            <button 
              onClick={(e) => { e.preventDefault(); fetchAvailableModels(keyInput || apiKey); }}
              disabled={isFetchingModels || (!keyInput && !apiKey)}
              className="text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
            >
              {isFetchingModels ? 'Fetching...' : 'Fetch available models'}
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-surface-600 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          
          <button onClick={handleSaveSettings} className="w-full px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
            Save Settings
          </button>
          
          {apiKey && (
            <button onClick={handleRemoveKey} className="mt-2 text-[11px] text-red-400 hover:text-red-300">
              Remove saved key
            </button>
          )}
        </div>
      )}

      {/* No API key warning */}
      {!apiKey && !showSettings && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-amber-300 font-medium">API Key Required</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Click the ⚙️ icon above to add your free <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Gemini API key</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles size={32} className="text-violet-400/40 mb-3" />
            <p className="text-sm text-surface-400 font-medium">CodeHive AI</p>
            <p className="text-xs text-surface-500 mt-1">
              Ask me anything about your code. I can see the file you're editing!
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {['Explain this code', 'Find bugs', 'Optimize this', 'Add comments'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-surface-800 text-surface-400 hover:text-violet-300 hover:bg-violet-500/10 border border-surface-700 hover:border-violet-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600/20 text-violet-100 border border-violet-500/20'
                    : msg.role === 'error'
                    ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                    : 'bg-surface-800/60 text-surface-200 border border-surface-700/50'
                }`}
              >
                {msg.role === 'ai' ? (
                  <div className="ai-markdown">
                    <AIMarkdown text={msg.text} />
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap break-words text-xs">{msg.text}</span>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-surface-400">
                <Zap size={12} className="animate-pulse text-violet-400" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-surface-800/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKey ? 'Ask AI about your code...' : 'Set API key first ↑'}
            disabled={!apiKey}
            className="flex-1 px-3 py-2 rounded-lg bg-surface-800/80 border border-surface-700 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !apiKey}
            className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-200"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Simple markdown renderer for AI responses.
 * Handles code blocks, inline code, bold, and line breaks.
 */
const AIMarkdown = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <div className="text-xs space-y-1.5">
      {parts.map((part, i) => {
        // Code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3);
          const firstNewline = lines.indexOf('\n');
          const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : '';
          const code = firstNewline > 0 ? lines.slice(firstNewline + 1) : lines;
          return (
            <div key={i} className="relative group">
              {lang && (
                <div className="text-[10px] text-surface-500 px-3 pt-2 bg-[#0d1117] rounded-t-lg border border-b-0 border-surface-700">
                  {lang}
                </div>
              )}
              <pre className={`bg-[#0d1117] border border-surface-700 ${lang ? 'rounded-b-lg' : 'rounded-lg'} px-3 py-2 overflow-x-auto`}>
                <code className="text-[11px] text-emerald-300 font-mono">{code.trim()}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="absolute top-2 right-2 text-[10px] text-surface-500 hover:text-white bg-surface-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Copy
              </button>
            </div>
          );
        }
        // Inline code
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="bg-surface-700/50 text-violet-300 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
        }
        // Bold
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-surface-100">{part.slice(2, -2)}</strong>;
        }
        // Regular text
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </div>
  );
};

export default AIChatPanel;
