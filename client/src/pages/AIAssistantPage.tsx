import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { formatRupees, getConditionBadge } from '../utils/formatters.js';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Search, 
  Columns, 
  Zap, 
  HelpCircle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  items?: any[];
  comparison?: {
    headers: string[];
    rows: any[];
  };
  consentRequest?: {
    consentToken: string;
    listingId: string;
    itemTitle: string;
    currentPriceRupees: number;
    maxAuthorizedRupees: number;
    durationExpiresAt: string;
    terms: string;
  };
}

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial',
      sender: 'ASSISTANT',
      text: `Hello ${user ? user.name.split(' ')[0] : 'there'}! I am your **CampusBid AI Assistant**.

I am connected directly to genuine active campus listings. Ask me anything like:
- *"Find me a cycle under ₹2,000"*
- *"Compare calculators available for sale"*
- *"Find textbooks in good condition"*
- *"Help me set up automatic bidding"*`,
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeConsent, setActiveConsent] = useState<any | null>(null);
  const [consentExecuting, setConsentExecuting] = useState<boolean>(false);

  const suggestedPrompts = [
    'Find me a cycle under ₹2,000',
    'Compare calculators available',
    'Find textbooks in good condition',
    'Help me set up automatic bidding',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'USER',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        intent: 'SEARCH' | 'COMPARE' | 'SETUP_AUTO_BID' | 'HELP';
        engine: string;
        items?: any[];
        comparison?: any;
        consentRequest?: any;
      }>('/ai/query', { prompt: text.trim() });

      if (res.success) {
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'ASSISTANT',
          text: res.message,
          items: res.items,
          comparison: res.comparison,
          consentRequest: res.consentRequest,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (res.consentRequest) {
          setActiveConsent(res.consentRequest);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to get AI response.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmConsent = async () => {
    if (!activeConsent) return;
    setConsentExecuting(true);

    try {
      const res = await api.post<{ success: boolean; message: string; listingId: string }>(
        '/ai/consent/execute',
        { consentToken: activeConsent.consentToken }
      );

      if (res.success) {
        showToast(res.message, 'success');
        setActiveConsent(null);
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'ASSISTANT',
            text: `✅ **Automatic Proxy Bidding Confirmed and Activated!** 

Your maximum authorization of ₹${activeConsent.maxAuthorizedRupees} is locked in. The engine will place the minimum increment needed to keep you ahead. You can revoke it anytime in your dashboard.`,
          },
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to activate auto-bid.', 'error');
    } finally {
      setConsentExecuting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col h-[calc(100vh-10rem)] min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-100">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Campus AI Marketplace Assistant
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Live Data Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Zero fake data. Genuine marketplace queries, attribute comparisons, and guided proxy bidding.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-3xl p-5 shadow-xs space-y-3 ${
                msg.sender === 'USER'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="text-xs leading-relaxed whitespace-pre-line font-medium">
                {msg.text}
              </div>

              {/* Render Matching Items Grid */}
              {msg.items && msg.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {msg.items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/auctions/${item.id}`}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl transition flex items-center gap-3 group text-left"
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                        {item.photos && item.photos[0] ? (
                          <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Condition: <strong>{item.condition.replace(/_/g, ' ')}</strong>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          ₹{item.currentPriceRupees}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Render Structured Comparison Table */}
              {msg.comparison && (
                <div className="overflow-x-auto pt-2 border-t border-slate-100">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {msg.comparison.headers.map((h, i) => (
                          <th key={i} className="py-2 px-2.5 font-bold text-slate-900 truncate max-w-[150px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {msg.comparison.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-50/60' : ''}>
                          <td className="py-2 px-2.5 font-bold text-slate-800">{row.label}</td>
                          {row.values.map((v: string, cIdx: number) => (
                            <td key={cIdx} className="py-2 px-2.5 font-medium">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Render Explicit Auto-Bid Consent Card */}
              {msg.consentRequest && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-3 mt-3">
                  <div className="flex items-center gap-2 font-bold text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Mandatory Student Authorization Required</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1 text-slate-700">
                    <div><strong>Target Item:</strong> {msg.consentRequest.itemTitle}</div>
                    <div><strong>Current Price:</strong> ₹{msg.consentRequest.currentPriceRupees}</div>
                    <div><strong>Authorized Ceiling:</strong> <span className="text-emerald-700 font-extrabold text-sm">₹{msg.consentRequest.maxAuthorizedRupees}</span></div>
                    <div className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      {msg.consentRequest.terms}
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmConsent}
                    disabled={consentExecuting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{consentExecuting ? 'Activating...' : `Confirm & Authorize Auto-Bid (₹${msg.consentRequest.maxAuthorizedRupees})`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2 text-xs text-slate-500 shadow-sm animate-pulse">
              <Bot className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>Querying genuine campus marketplace database...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="pt-2 pb-3 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 shrink-0">Try:</span>
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-3 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 whitespace-nowrap transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI: 'Find a cycle under ₹2000' or 'Compare calculators'..."
          className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition text-slate-800"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
