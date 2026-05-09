import { useEffect, useRef, useState } from 'react';
import { Send, X, MessageSquare, RefreshCw, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, type ChatMessageResponse } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  /** Если задан, чат загружается через админский endpoint для разговора с этим userId */
  partnerId?: number;
  /** Имя собеседника (для отображения) */
  partnerName?: string;
  /** Заголовок-подпись (например "Поддержка") */
  title?: string;
  /** Подзаголовок */
  subtitle?: string;
  /** Если true - встроенный режим (без модалки и фона) */
  embedded?: boolean;
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const ChatPanel = ({
  open,
  onClose,
  partnerId,
  partnerName = 'Поддержка',
  title = 'Поддержка',
  subtitle = 'Связь с администратором',
  embedded = false,
}: ChatPanelProps) => {
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = partnerId !== undefined
        ? await chatApi.getAdminConversationWithUser(partnerId)
        : await chatApi.getMyMessages();
      setMessages(data);
      // Помечаем как прочитанные
      try {
        await chatApi.markRead(partnerId);
      } catch { /* ignore */ }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Не удалось загрузить переписку');
    } finally {
      setLoading(false);
    }
  };

  // Clear messages when partnerId changes to prevent showing wrong conversation
  useEffect(() => {
    setMessages([]);
  }, [partnerId]);

  useEffect(() => {
    if (open) {
      loadMessages();
      // Polling каждые 8 секунд пока открыт
      const id = setInterval(loadMessages, 8000);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerId]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (!embedded && open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, embedded, onClose]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      const newMsg = await chatApi.sendMessage(text, partnerId);
      setMessages((prev) => [...prev, newMsg]);
      setInput('');
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  const content = (
    <div className={`flex flex-col bg-white dark:bg-gray-800 ${embedded ? 'rounded-2xl border-2 border-brand-soft dark:border-slate-600 shadow-premium h-full' : 'rounded-2xl shadow-2xl border-2 border-brand-soft dark:border-slate-600 w-full max-w-2xl h-[80vh] max-h-[700px]'} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-brand-secondary text-white border-b-2 border-brand-soft dark:border-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Headphones size={20} className="text-white" />
          </div>
          <div>
            <p className="font-black text-base leading-tight">{title}</p>
            <p className="text-xs font-bold opacity-80">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMessages}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Обновить"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {!embedded && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500 flex items-center justify-center transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-brand-soft/10 dark:bg-slate-900/30 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={28} className="text-brand-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-brand-secondary/60 dark:text-gray-400">
            <MessageSquare size={48} className="mb-3 opacity-40" />
            <p className="font-bold text-sm">Сообщений пока нет</p>
            <p className="text-xs font-bold mt-1">
              {partnerId !== undefined
                ? 'Напишите первое сообщение пользователю'
                : 'Напишите администратору о вашем вопросе'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUser?.id === msg.senderId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMine
                      ? 'bg-brand-primary text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-700 text-brand-secondary dark:text-white border border-brand-soft dark:border-slate-600 rounded-bl-sm'
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-1">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="text-sm font-bold whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <p className={`text-[10px] font-bold mt-1 ${isMine ? 'text-white/70' : 'text-brand-secondary/60 dark:text-gray-400'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-2 border-brand-soft dark:border-slate-600 p-3 bg-white dark:bg-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Сообщение для ${partnerName}...`}
            rows={1}
            className="flex-1 resize-none px-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 text-brand-secondary dark:text-white font-bold text-sm placeholder:text-brand-secondary/40 dark:placeholder:text-gray-400 focus:outline-none focus:border-brand-primary max-h-32"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-12 h-12 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Отправить (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] font-bold text-brand-secondary/50 dark:text-gray-400 mt-2 px-1">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        {content}
      </div>
    </div>
  );
};

export default ChatPanel;
