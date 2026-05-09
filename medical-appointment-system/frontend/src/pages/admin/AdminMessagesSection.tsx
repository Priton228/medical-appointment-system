import { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Search, User as UserIcon, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, type ChatConversationResponse } from '../../services/api';
import ChatPanel from '../../components/chat/ChatPanel';

const formatTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const AdminMessagesSection = () => {
  const [conversations, setConversations] = useState<ChatConversationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatApi.getAdminConversations();
      setConversations(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Не удалось загрузить переписки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, 10000);
    return () => clearInterval(id);
  }, []);

  const filtered = conversations.filter((c) =>
    !search || c.partnerName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPartner = conversations.find((c) => c.partnerId === selectedPartnerId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Список переписок */}
      <section className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-brand-secondary dark:text-white">Переписки</h3>
          <button
            onClick={loadConversations}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-brand-soft/40 dark:bg-slate-700 hover:bg-brand-primary hover:text-white flex items-center justify-center transition-colors"
            title="Обновить"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-brand-primary' : 'text-brand-primary'} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 text-brand-secondary dark:text-white font-bold text-sm placeholder:text-brand-secondary/40"
          />
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.length === 0 && !loading ? (
            <div className="text-center py-12 text-brand-secondary/60 dark:text-gray-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-bold text-sm">
                {search ? 'Ничего не найдено' : 'Переписок пока нет'}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = conv.partnerId === selectedPartnerId;
              const Icon = conv.partnerRole === 'DOCTOR' ? Stethoscope : UserIcon;
              return (
                <button
                  key={conv.partnerId}
                  onClick={() => setSelectedPartnerId(conv.partnerId)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-brand-soft/20 dark:bg-slate-700/40 border-brand-soft dark:border-slate-600 hover:border-brand-primary text-brand-secondary dark:text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-white text-brand-primary' : 'bg-brand-secondary text-white'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-sm truncate">{conv.partnerName}</p>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-brand-secondary/60 dark:text-gray-400'}`}>
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-white/90' : 'text-brand-secondary/70 dark:text-gray-400'}`}>
                          {conv.lastMessage || 'Нет сообщений'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-white text-brand-primary' : 'bg-status-error text-white'
                          }`}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isSelected ? 'text-white/70' : 'text-brand-primary'}`}>
                        {conv.partnerRole === 'DOCTOR' ? 'Врач' : 'Пациент'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Чат */}
      <div className="lg:col-span-2 h-[700px]">
        {selectedPartnerId ? (
          <ChatPanel
            key={selectedPartnerId}
            open={true}
            onClose={() => {}}
            embedded
            partnerId={selectedPartnerId}
            partnerName={selectedPartner?.partnerName || 'Пользователь'}
            title={selectedPartner?.partnerName || 'Переписка'}
            subtitle={selectedPartner?.partnerRole === 'DOCTOR' ? 'Врач' : 'Пациент'}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-slate-600">
            <div className="text-center text-brand-secondary/60 dark:text-gray-400">
              <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
              <p className="font-black text-lg">Выберите переписку</p>
              <p className="text-sm font-bold mt-1">Слева отображаются все обращения пользователей</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessagesSection;
