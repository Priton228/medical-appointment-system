import { useAuthStore } from '../../stores/authStore';
import { Calendar, Stethoscope, Bell, Clock, User, ArrowRight, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi, type PatientDashboardResponse } from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';
import { localizeNotification } from '../../utils/notificationText';

const formatTime = (value: string) => value.slice(0, 5);

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Запланировано', color: 'text-blue-600', bg: 'bg-blue-100' },
  CONFIRMED: { label: 'Подтверждено', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  RESCHEDULED: { label: 'Перенесено', color: 'text-amber-600', bg: 'bg-amber-100' },
  COMPLETED: { label: 'Завершено', color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { label: 'Отменено', color: 'text-red-600', bg: 'bg-red-100' },
  MISSED: { label: 'Пропущено', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const PatientHome = () => {
  const user = useAuthStore((state) => state.user);
  const { notifications, unreadCount, loadNotifications, markAsRead, deleteNotification } = useNotificationStore();
  const [dashboard, setDashboard] = useState<PatientDashboardResponse | null>(null);

  const loadData = async () => {
    try {
      const [dashboardData] = await Promise.all([patientApi.getDashboard(), loadNotifications()]);
      setDashboard(dashboardData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить данные пациента');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statistics = useMemo(
    () => [
      { label: 'Всего записей', value: dashboard?.totalAppointments ?? 0, icon: Activity, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
      { label: 'Активные', value: dashboard?.activeAppointments ?? 0, icon: ShieldCheck, color: 'text-status-success', bg: 'bg-status-success/10' },
      { label: 'Записей в медкарте', value: dashboard?.medicalRecords ?? 0, icon: HeartPulse, color: 'text-status-error', bg: 'bg-status-error/10' },
    ],
    [dashboard]
  );


  const upcoming = dashboard?.upcomingAppointments ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up bg-brand-bg">
      <header className="rounded-3xl bg-white border-2 border-brand-soft p-8 mb-8 shadow-sm">
        <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2">Личный кабинет</p>
        <h1 className="text-3xl md:text-4xl font-black text-brand-secondary tracking-tight">
          Здравствуйте, {user?.fullName?.split(' ')[1] || user?.fullName?.split(' ')[0] || 'пациент'}
        </h1>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            to="/patient/doctors"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-secondary text-white font-black text-sm hover:opacity-95 transition-opacity"
          >
            Запись к врачу
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/patient/symptoms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-brand-soft bg-white text-brand-secondary font-black text-sm hover:bg-brand-soft/30 transition-colors"
          >
            <Stethoscope size={18} />
            Подобрать по симптомам
          </Link>
          <Link to="/patient/appointments" className="inline-flex items-center px-6 py-3 rounded-2xl border-2 border-brand-soft font-black text-sm text-brand-secondary">
            Мои записи
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statistics.map((stat, i) => (
          <div key={i} className="premium-card p-5 flex items-center gap-4 bg-white border-2 border-brand-soft">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-brand-soft`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-brand-secondary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="premium-card p-6 bg-white border-2 border-brand-soft">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-black text-brand-secondary">Ближайшие записи</h2>
              <Link to="/patient/appointments" className="text-xs font-black text-brand-primary uppercase tracking-wider hover:underline">
                Все записи
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm font-bold text-brand-primary">Нет активных записей. Выберите врача и время на странице «Запись к врачу».</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand-soft bg-brand-soft/10 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-brand-soft flex items-center justify-center text-brand-secondary shrink-0">
                        <User size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-brand-secondary truncate">{a.doctorName}</p>
                        <p className="text-xs font-bold text-brand-primary flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} /> {a.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> {formatTime(a.startTime)}
                          </span>
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const status = statusConfig[a.status] || { label: a.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                      return (
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${status.bg} ${status.color} shrink-0`}>
                          {status.label}
                        </span>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="premium-card p-6 bg-white border-2 border-brand-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-black text-brand-secondary">
                <Bell size={20} className="text-brand-primary" />
                Уведомления
              </div>
              <span className="text-[10px] font-black text-brand-primary">{unreadCount} новых</span>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm font-bold text-brand-primary">Пока пусто.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-auto">
                {notifications.slice(0, 5).map((notification) => {
                  const item = localizeNotification(notification);
                  return (
                  <li key={item.id} className="text-sm border-b border-brand-soft pb-3 last:border-0">
                    <p className="font-black text-brand-secondary">{item.title}</p>
                    <p className="text-xs font-bold text-brand-primary mt-1">{item.message}</p>
                    <div className="flex gap-2 mt-2">
                      {!item.isRead && (
                        <button type="button" onClick={() => markAsRead(item.id)} className="text-[10px] font-black uppercase text-brand-secondary hover:underline">
                          Прочитано
                        </button>
                      )}
                      <button type="button" onClick={() => deleteNotification(item.id)} className="text-[10px] font-black uppercase text-status-error hover:underline">
                        Удалить
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PatientHome;
