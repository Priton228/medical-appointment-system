import { useEffect, useState } from 'react';
import { Activity, Calendar, Clock, ChevronRight, User, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorApi } from '../../services/api';
import type { AppointmentResponse, DoctorDashboardResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const statusConfig: Record<AppointmentResponse['status'], { label: string; color: string }> = {
  SCHEDULED: { label: 'Запланирован', color: 'text-blue-600' },
  CONFIRMED: { label: 'Подтверждён', color: 'text-emerald-600' },
  RESCHEDULED: { label: 'Перенесён', color: 'text-amber-600' },
  COMPLETED: { label: 'Завершён', color: 'text-green-600' },
  CANCELLED: { label: 'Отменён', color: 'text-red-600' },
  MISSED: { label: 'Пропущен', color: 'text-gray-600' },
};

const DoctorHome = () => {
  const [dashboard, setDashboard] = useState<DoctorDashboardResponse | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboardData, appointmentsData] = await Promise.all([
        doctorApi.getDashboard(),
        doctorApi.getTodayAppointments(),
      ]);
      setDashboard(dashboardData);
      setTodayAppointments(appointmentsData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );
  }

  const stats = [
    { label: 'Мой рейтинг', value: dashboard?.rating ? dashboard.rating.toFixed(1) : '0.0', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', suffix: `(${dashboard?.totalRatings ?? 0} оценок)` },
    { label: 'Всего приёмов', value: dashboard?.totalAppointments ?? 0, icon: Calendar, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
    { label: 'Завершено', value: dashboard?.completedAppointments ?? 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Свободные слоты', value: dashboard?.activeSlots ?? 0, icon: Clock, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
  ];

  return (
      <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-secondary to-brand-primary rounded-3xl p-8 text-white shadow-xl mb-8">
          <h1 className="text-3xl font-black mb-2">Добро пожаловать, доктор!</h1>
          <p className="text-white/80 font-bold">Управляйте своими приёмами и расписанием</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-6 border-2 border-brand-soft">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon size={24} />
                </div>
                <p className="text-2xl font-black text-brand-secondary">{stat.value}</p>
                <p className="text-xs font-black text-brand-primary uppercase tracking-wider">{stat.label}</p>
                {'suffix' in stat && <p className="text-[10px] text-brand-primary font-bold mt-1">{stat.suffix}</p>}
              </div>
          ))}
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-2xl border-2 border-brand-soft p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-brand-secondary flex items-center gap-2">
              <Calendar size={20} className="text-brand-primary" />
              Приёмы сегодня
            </h2>
            <span className="text-sm font-bold text-brand-primary">{todayAppointments.length} записей</span>
          </div>

          {todayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-brand-soft mb-4" />
                <p className="text-brand-secondary font-bold">Нет записей на сегодня</p>
              </div>
          ) : (
              <div className="space-y-4">
                {todayAppointments.map((apt) => {
                  const status = statusConfig[apt.status];
                  return (
                      <div key={apt.id} className="flex items-center gap-4 p-4 bg-brand-soft/20 rounded-xl">
                        <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center shrink-0">
                          <User size={24} className="text-brand-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-brand-secondary truncate">{apt.patientName || `Пациент #${apt.patientId}`}</p>
                          <p className="text-sm text-brand-primary">
                            {formatTime(apt.startTime)} — {formatTime(apt.endTime)}
                          </p>
                          {apt.symptomsDescription && (
                              <p className="text-xs text-brand-primary mt-1 truncate">{apt.symptomsDescription}</p>
                          )}
                        </div>
                        <span className={`text-xs font-black px-3 py-1 rounded-full bg-white ${status.color}`}>
                    {status.label}
                  </span>
                        <ChevronRight size={20} className="text-brand-primary shrink-0" />
                      </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>
  );
};

export default DoctorHome;
