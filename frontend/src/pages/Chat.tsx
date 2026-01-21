import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, ThumbsUp, ThumbsDown, ArrowLeft, Loader2, Sparkles, Bot, User, FileText, X, CheckCircle, MessageSquareWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'finding_context' | 'generating' | 'done';
}

type ModalState = 
  | { type: 'CLOSED' }
  | { type: 'COMMENT_INPUT'; messageId: string }
  | { type: 'SUCCESS'; message: string };

export default function Chat() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState<ModalState>({ type: 'CLOSED' });
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { 
      id: aiMsgId, 
      role: 'assistant', 
      content: '', 
      status: 'finding_context' 
    }]);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg.content })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (done) break;

        const chunkValue = decoder.decode(value, { stream: true });
        const lines = chunkValue.split(/\r?\n/);
        
        for (const line of lines) {
          if (line.startsWith('event: status')) {
             // Status updates
          } else if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            
            if (dataStr === 'finding_context') {
               updateMessageStatus(aiMsgId, 'finding_context');
            } else if (dataStr === 'generating') {
               updateMessageStatus(aiMsgId, 'generating');
            } else if (dataStr === '[DONE]') {
               setIsLoading(false);
               updateMessageStatus(aiMsgId, 'done');
            } else {
              try {
                const { text } = JSON.parse(dataStr);
                if (text) appendToMessage(aiMsgId, text);
              } catch (e) {
                // Ignore incomplete
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      appendToMessage(aiMsgId, "\n\n**[Connection Error]**");
    } finally {
      setIsLoading(false);
      updateMessageStatus(aiMsgId, 'done');
    }
  };

  const updateMessageStatus = (id: string, status: any) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const appendToMessage = (id: string, text: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: m.content + text } : m));
  };

  const onFeedbackClick = (messageId: string, isPositive: boolean) => {
    if (isPositive) {
      
      submitFeedback(messageId, true, null);
    } else {
      setCommentText('');
      setModal({ type: 'COMMENT_INPUT', messageId });
    }
  };

  const submitFeedback = async (messageId: string, isPositive: boolean, comment: string | null) => {
    try {
      await api.post('/chat/feedback', { messageId, isPositive, comment });
      
      setModal({ type: 'SUCCESS', message: isPositive ? 'Glad you liked it!' : 'Thanks for helping us improve.' });
      
      setTimeout(() => {
        setModal(prev => prev.type === 'SUCCESS' ? { type: 'CLOSED' } : prev);
      }, 2500);

    } catch (error) {
      console.error("Error feedback", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
      
      {/* --- MODAL OVERLAYS --- */}
      {modal.type !== 'CLOSED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* MODAL: INPUT COMMENT */}
          {modal.type === 'COMMENT_INPUT' && (
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                  <MessageSquareWarning className="text-orange-500" size={24} />
                  What happened?
                </div>
                <button onClick={() => setModal({ type: 'CLOSED' })} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 text-sm mb-4">
                Your feedback helps us refine the AI context.
              </p>
              <textarea
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none h-24 mb-4"
                placeholder="E.g., The answer was inaccurate..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setModal({ type: 'CLOSED' })}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => submitFeedback(modal.messageId, false, commentText)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition"
                >
                  Send Feedback
                </button>
              </div>
            </div>
          )}

          {/* MODAL: SUCCESS */}
          {modal.type === 'SUCCESS' && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Feedback Received!</h3>
              <p className="text-slate-500">{modal.message}</p>
            </div>
          )}
        </div>
      )}


      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="p-2.5 hover:bg-gray-100 rounded-xl transition text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Smart Chat
                </h1>
                <p className="text-xs text-gray-500 font-medium">Powered by Gemini</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* EMPTY STATE */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Bot className="text-blue-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">How can I help you today?</h2>
              <p className="text-gray-500 max-w-md mb-8">
                I can analyze your documents, answer specific questions, and summarize complex information instantly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                <button 
                  onClick={() => setInput("Summarize the last uploaded document")}
                  className="p-4 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-left transition shadow-sm hover:shadow-md group"
                >
                  <span className="block font-semibold text-gray-700 group-hover:text-blue-600 mb-1">📄 Summarize document</span>
                  <span className="text-xs text-gray-400">Get key points quickly</span>
                </button>
                <button 
                  onClick={() => setInput("What are the risks mentioned in the document?")}
                  className="p-4 bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl text-left transition shadow-sm hover:shadow-md group"
                >
                  <span className="block font-semibold text-gray-700 group-hover:text-purple-600 mb-1">🛡 Risk Analysis</span>
                  <span className="text-xs text-gray-400">Detect potential issues</span>
                </button>
              </div>
            </div>
          )}

          {/* MESSAGES LIST */}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}
            >
              {/* Assistant Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                  <Bot className="text-white w-5 h-5" />
                </div>
              )}
              
              <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                
                {/* STATUS INDICATOR */}
                {msg.role === 'assistant' && msg.status !== 'done' && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mb-2 bg-blue-50 w-fit px-3 py-1 rounded-full animate-pulse">
                    {msg.status === 'finding_context' ? (
                      <>
                        <FileText size={12} />
                        <span>Consulting documents...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>Generating response...</span>
                      </>
                    )}
                  </div>
                )}

                {/* MESSAGE BUBBLE */}
                <div className={`p-5 shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-none' 
                    : 'bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none'
                }`}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    {msg.role === 'user' ? (
                       <p>{msg.content}</p>
                    ) : (
                       <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                    )}
                  </div>

                  {/* FEEDBACK BUTTONS (Connected to new Modals) */}
                  {msg.role === 'assistant' && msg.status === 'done' && msg.content && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100/50">
                      <button 
                        onClick={() => onFeedbackClick(msg.id, true)} 
                        className="group flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-green-600 transition p-1.5 hover:bg-green-50 rounded-lg"
                      >
                        <ThumbsUp size={14} className="group-hover:scale-110 transition-transform" />
                        <span>Helpful</span>
                      </button>
                      <button 
                        onClick={() => onFeedbackClick(msg.id, false)} 
                        className="group flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <ThumbsDown size={14} className="group-hover:scale-110 transition-transform" />
                        <span>Not helpful</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="text-gray-500 w-5 h-5" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 md:p-6 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 rounded-2xl py-4 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <Loader2 className="animate-spin text-blue-500" size={20} />
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
            AI can make mistakes. Please verify sensitive information.
          </p>
        </div>
      </div>
    </div>
  );
}