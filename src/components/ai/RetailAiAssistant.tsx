import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  TrendingUp, 
  Hourglass, 
  Boxes, 
  ShoppingBag, 
  ChevronDown, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import type { Product, ProductBatch, SaleTransaction, ShopSettings, ActiveTab } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  askRetailAi, 
  buildStoreSnapshot, 
  type ChatMessage 
} from '../../services/aiService';

interface RetailAiAssistantProps {
  products: Product[];
  batches: ProductBatch[];
  sales: SaleTransaction[];
  settings: ShopSettings;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenPos: () => void;
}

export const RetailAiAssistant: React.FC<RetailAiAssistantProps> = ({
  products,
  batches,
  sales,
  settings,
  onNavigateTab,
  onOpenPos,
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when opened if thread is empty
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = language === 'hi'
        ? `नमस्ते! मैं आपका **Retail AI Copilot** हूँ।\n\nआप मुझसे आज की बिक्री, मुनाफे, जल्द एक्सपायर होने वाले सामान या कम स्टॉक के बारे में पूछ सकते हैं। नीचे दिए गए विकल्पों में से चुनें या अपना सवाल टाइप करें!`
        : `Hello! I am your **Retail AI Copilot** for **${settings.shopName || 'your store'}**.\n\nAsk me anything about today's sales, profit margins, near-expiry batches, or low inventory. Tap a question below or type your own!`;

      setMessages([
        {
          id: 'welcome_1',
          role: 'assistant',
          content: welcomeText,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [language, settings.shopName]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const snapshot = buildStoreSnapshot(products, batches, sales, settings);
      const history = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      
      const { text, actionTag } = await askRetailAi(
        textToSend,
        history,
        snapshot,
        language
      );

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
        actionTag,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          content: language === 'hi' 
            ? 'क्षमा करें, उत्तर तैयार करने में समस्या आई। कृपया पुनः प्रयास करें।'
            : 'Sorry, I encountered an issue preparing the response. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleActionClick = (actionTag: string) => {
    if (actionTag === 'pos') {
      onOpenPos();
      setIsOpen(false);
    } else if (['products', 'expiry', 'inventory', 'analytics'].includes(actionTag)) {
      onNavigateTab(actionTag as ActiveTab);
      setIsOpen(false);
    }
  };

  const suggestedQuestions = language === 'hi' ? [
    '📊 आज दुकान में कितनी बिक्री और मुनाफा हुआ?',
    '⏳ कौन-कौन से सामान अगले 7 दिनों में एक्सपायर होंगे?',
    '📦 किस सामान का स्टॉक खत्म होने वाला है?',
    '💡 दुकान का मुनाफा बढ़ाने के लिए कोई सुझाव?',
  ] : [
    "📊 How much did we sell today and what's the net profit?",
    "⏳ Which items are expiring within the next 7 days?",
    "📦 Which products are low on stock and need reordering?",
    "💡 How can I improve my store's profit margin this week?",
  ];

  const getActionLabel = (tag: string) => {
    switch (tag) {
      case 'expiry':
        return { label: language === 'hi' ? 'एक्सपायरी नियंत्रण खोलें' : 'View Expiry Control', icon: Hourglass, color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/60 dark:border-orange-800' };
      case 'inventory':
        return { label: language === 'hi' ? 'कम स्टॉक देखें' : 'View Low Stock List', icon: Boxes, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800' };
      case 'analytics':
        return { label: language === 'hi' ? 'मुनाफा और बिक्री चार्ट देखें' : 'View Sales & Profit Charts', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800' };
      case 'pos':
        return { label: language === 'hi' ? 'गल्ला / बिल काउंटर खोलें' : 'Open Billing Counter (Space)', icon: ShoppingBag, color: 'text-brand-600 bg-brand-50 border-brand-200 dark:bg-brand-950/60 dark:border-brand-800' };
      default:
        return { label: 'Open Screen', icon: ArrowRight, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. FLOATING ACTION TRIGGER BUTTON (BOTTOM-RIGHT)         */}
      {/* ======================================================== */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 max-md:bottom-20 max-md:right-4 z-40 p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2 group active:scale-95 border-2 border-white dark:border-slate-800 cursor-pointer"
          title="Ask Retail AI Copilot (Live Store Intelligence)"
        >
          <div className="relative">
            <Bot className="w-5 h-5 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
          </div>
          <span className="hidden sm:inline font-bold text-xs tracking-tight">
            Ask Retail AI
          </span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold hidden lg:inline">
            Copilot
          </span>
        </button>
      )}

      {/* ======================================================== */}
      {/* 2. SLIDE-UP FLOATING CHAT WINDOW                         */}
      {/* ======================================================== */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 max-md:bottom-16 max-md:right-2 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 transition-all">
          
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-white shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm tracking-tight leading-none">
                    Retail AI Copilot
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/80 text-white">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-white/80 mt-0.5 truncate max-w-[200px]">
                  {settings.shopName || 'Store Manager'} • OpenRouter Free
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Embedded Interactive Action Button (if AI suggested a navigation) */}
                {msg.actionTag && (
                  <div className="mt-1.5">
                    {(() => {
                      const action = getActionLabel(msg.actionTag);
                      const Icon = action.icon;
                      return (
                        <button
                          onClick={() => handleActionClick(msg.actionTag!)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer ${action.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </button>
                      );
                    })()}
                  </div>
                )}

                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {/* Thinking / Typing Animation */}
            {isThinking && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                <span className="text-xs font-medium">Analyzing live store data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Question Chips */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={`sugg_${idx}`}
                disabled={isThinking}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 text-[11px] whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={language === 'hi' ? 'दुकान, बिक्री या स्टॉक के बारे में पूछें...' : 'Ask about sales, stock, expiries...'}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
