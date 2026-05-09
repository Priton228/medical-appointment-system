import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Server, Database, Cpu, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type SystemStatusResponse } from '../../services/api';

const statusColors: Record<string, string> = {
  UP: 'bg-emerald-500',
  DEGRADED: 'bg-amber-500',
  DOWN: 'bg-red-500',
};

const statusText: Record<string, string> = {
  UP: 'Работает',
  DEGRADED: 'Деградация',
  DOWN: 'Недоступен',
};

const AdminSystemSection = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // Used to force re-render for ticking uptime
  const uptimeBaseMs = useRef<number>(0);
  const lastFetchTime = useRef<number>(Date.now());

  const loadStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await adminApi.getSystemStatus();
      setStatus(data);
      uptimeBaseMs.current = data.uptimeMs;
      lastFetchTime.current = Date.now();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Не удалось загрузить статус системы');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Full refresh every 30 seconds
    const fullRefreshId = setInterval(() => loadStatus(true), 30000);
    return () => clearInterval(fullRefreshId);
  }, []);

  // Ticking uptime - update every second
  useEffect(() => {
    const tickId = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

  // Memory refresh every 3 seconds (silent)
  useEffect(() => {
    const memoryId = setInterval(() => {
      loadStatus(true);
    }, 3000);
    return () => clearInterval(memoryId);
  }, []);

  const getCurrentUptimeMs = () => {
    const elapsed = Date.now() - lastFetchTime.current;
    return uptimeBaseMs.current + elapsed;
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const secs = seconds % 60;
    const mins = minutes % 60;
    const hrs = hours % 24;
    
    if (days > 0) return `${days}д ${hrs.toString().padStart(2, '0')}ч ${mins.toString().padStart(2, '0')}м ${secs.toString().padStart(2, '0')}с`;
    if (hours > 0) return `${hrs}ч ${mins.toString().padStart(2, '0')}м ${secs.toString().padStart(2, '0')}с`;
    return `${mins}м ${secs.toString().padStart(2, '0')}с`;
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw size={40} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общий статус */}
      <section className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-brand-secondary dark:text-white">Состояние системы</h3>
          <button
            onClick={() => loadStatus()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border-2 ${
              status.overallStatus === 'UP'
                ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
                : status.overallStatus === 'DEGRADED'
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Server size={20} className={`${
                  status.overallStatus === 'UP' ? 'text-emerald-600' : status.overallStatus === 'DEGRADED' ? 'text-amber-600' : 'text-red-600'
                }`} />
                <p className="text-xs font-black uppercase tracking-wider text-brand-secondary/60 dark:text-gray-400">Общий статус</p>
              </div>
              <p className={`text-xl font-black ${
                status.overallStatus === 'UP'
                  ? 'text-emerald-600'
                  : status.overallStatus === 'DEGRADED'
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}>
                {statusText[status.overallStatus] || status.overallStatus}
              </p>
            </div>

            <div className="p-4 rounded-2xl border-2 border-brand-soft bg-brand-soft/20 dark:bg-slate-700/40 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={20} className="text-brand-primary" />
                <p className="text-xs font-black uppercase tracking-wider text-brand-secondary/60 dark:text-gray-400">Uptime</p>
              </div>
              <p className="text-xl font-black text-brand-secondary dark:text-white font-mono" data-tick={tick}>
                {formatUptime(getCurrentUptimeMs())}
              </p>
            </div>

            <div className="p-4 rounded-2xl border-2 border-brand-soft bg-brand-soft/20 dark:bg-slate-700/40 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={20} className="text-brand-primary" />
                <p className="text-xs font-black uppercase tracking-wider text-brand-secondary/60 dark:text-gray-400">Java версия</p>
              </div>
              <p className="text-xl font-black text-brand-secondary dark:text-white">{status.jvm.javaVersion}</p>
            </div>

            <div className="p-4 rounded-2xl border-2 border-brand-soft bg-brand-soft/20 dark:bg-slate-700/40 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Database size={20} className="text-brand-primary" />
                <p className="text-xs font-black uppercase tracking-wider text-brand-secondary/60 dark:text-gray-400">Память</p>
              </div>
              <p className="text-xl font-black text-brand-secondary dark:text-white">
                {status.jvm.usedMemoryMb} / {status.jvm.maxMemoryMb} МБ
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Компоненты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
          <h4 className="text-lg font-black text-brand-secondary dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-brand-primary" />
            Компоненты
          </h4>
          <div className="space-y-3">
            {status?.components.map((comp) => (
              <div
                key={comp.name}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/10 dark:bg-slate-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[comp.status] || 'bg-gray-400'}`} />
                  <div>
                    <p className="font-black text-sm text-brand-secondary dark:text-white">{comp.name}</p>
                    <p className="text-xs font-bold text-brand-secondary/60 dark:text-gray-400">{comp.message}</p>
                  </div>
                </div>
                {comp.latencyMs !== null && (
                  <span className="text-xs font-black text-brand-primary">{comp.latencyMs}мс</span>
                )}
              </div>
            ))}
            {!status && <p className="text-sm text-brand-secondary/60">Нет данных</p>}
          </div>
        </section>

        {/* Последние события */}
        <section className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
          <h4 className="text-lg font-black text-brand-secondary dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-status-error" />
            Последние события
          </h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {status?.recentEvents.length ? (
              status.recentEvents.map((event, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border-2 ${
                    event.level === 'ERROR'
                      ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                      : event.level === 'WARN'
                      ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                      : 'border-brand-soft bg-brand-soft/10 dark:bg-slate-700/30 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      event.level === 'ERROR'
                        ? 'bg-red-500 text-white'
                        : event.level === 'WARN'
                        ? 'bg-amber-500 text-white'
                        : 'bg-brand-primary text-white'
                    }`}>
                      {event.level}
                    </span>
                    <span className="text-[10px] font-bold text-brand-secondary/60 dark:text-gray-400">
                      {new Date(event.time).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-brand-secondary dark:text-white">{event.component}</p>
                  <p className="text-sm font-bold text-brand-secondary/80 dark:text-gray-300 mt-1">{event.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-brand-secondary/60 dark:text-gray-400 text-center py-8">Нет зарегистрированных событий</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSystemSection;
