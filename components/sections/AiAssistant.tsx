/**
 * @file AiAssistant.tsx
 * @description Provides an interactive AI-powered chat interface for patients. 
 * Connects to the Gemini API to answer queries about dermatology, 
 * treatments (PRP, Yellow Peels), and clinic schedules.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Phone, ShieldCheck, HelpCircle, X } from 'lucide-react';
import { siteConfig } from '@/config/site';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant({ onClose, isSidebar }: { onClose?: () => void, isSidebar?: boolean }) {
  // State to hold the conversation history
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am Dr. Prateek Tiwari's AI Skin & Cosmetology Assistant at Skin Hub Clinic, Ujjain. 🩺

How can I help you today? You can ask me questions about active acne, scalp PRP therapies, chemical yellow peels, or timing schedules at our office!`
    }
  ]);
  
  // State for the current input value
  const [input, setInput] = useState('');
  
  // State to indicate if a response is being fetched
  const [loading, setLoading] = useState(false);
  
  // Ref for auto-scrolling to the bottom of the chat
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect: triggers whenever messages or loading state changes
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /**
   * Handles sending the user message and fetching AI response from local API route
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Call the internal Next.js API route that proxies to Gemini
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMsg,
        }),
      });

      if (!res.ok) throw new Error('API server busy');
      const data = await res.json();

      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having a brief connectivity hurdle. Please ensure your GEMINI_API_KEY is configured in Settings. Or simply dial Dr. Prateek Tiwari's desk directly at +91 98270 42111!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mx-auto bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${isSidebar ? 'w-full h-full rounded-none border-none' : 'max-w-md rounded-3xl h-[700px]'}`}>
      
      {/* Chat header containing branding and close button */}
      <div className="bg-teal-600 text-white p-5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-lg font-black leading-none flex items-center">
              Skin Hub Smart Advisor
              <Sparkles className="w-3.5 h-3.5 ml-1.5 text-yellow-300 animate-pulse" />
            </h2>
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-teal-100 mt-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
              Dr. Prateek Tiwari AI
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all group"
            title="Close Assistant"
          >
            <X className="w-5 h-5 text-white group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Medical disclaimer belt to ensure patient awareness */}
      <div className="bg-orange-50 border-b border-orange-100 p-2.5 px-4 flex items-start space-x-2 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
        <p className="text-[10px] font-sans font-bold text-orange-700 flex-1">
          <span className="uppercase">General Guidance Only:</span> AI does not constitute real medical diagnosis. Always book a clinic slot for precise skin analysis.
        </p>
      </div>

      {/* Main chat history area with scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F9FBFC] select-text">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
               {m.role === 'assistant' && (
                 <span className="text-[9px] font-black text-teal-600 mb-1 ml-1 uppercase tracking-widest">Digital Advisor</span>
               )}
               <div
                className={`p-4 rounded-2xl shadow-sm text-sm font-sans font-medium leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                }`}
              >
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
              <span className="text-[8px] text-gray-400 mt-1 px-1 font-bold">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Quick action query chips shown on initial load */}
        {messages.length === 1 && (
          <div className="space-y-4 py-4">
             <div className="flex flex-col space-y-2">
              <span className="font-sans text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2 px-1">
                💡 Recommended Questions
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Best routine for Active Acne?",
                  "What are benefits of PRP Therapy?",
                  "Laser hair removal cost?",
                  "Yellow Peel procedure details",
                  "Clinic timings in Ujjain"
                ].map((queryText) => (
                  <button
                    key={queryText}
                    type="button"
                    onClick={() => setInput(queryText)}
                    className="text-left px-3 py-1.5 bg-white border border-teal-100 hover:border-teal-500 hover:bg-teal-50 text-teal-700 rounded-full font-sans text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {queryText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator shown during API fetch */}
        {loading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
               <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="p-3 bg-white border border-gray-100 rounded-2xl animate-pulse">
               <span className="text-[10px] text-gray-400 font-bold italic">Advisor is thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Chat input field and send button */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
        <form
          onSubmit={handleSend}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about active acne, PRP, hair loss..."
            className="w-full pl-4 pr-14 py-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm font-sans font-semibold focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="font-sans text-[9px] text-gray-500 font-bold mt-3 text-center uppercase tracking-widest opacity-60">
          Skin Hub Clinical Knowledge Base
        </p>
      </div>

    </div>
  );
}

