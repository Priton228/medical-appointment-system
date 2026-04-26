import { Calendar, Clock, User, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { AppointmentResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const statusLabel = (status: AppointmentResponse['status']) => {
  const map: Record<AppointmentResponse['status'], string> = {
    SCHEDULED: 'Запланировано',
    CONFIRMED: 'Подтверждено',
    RESCHEDULED: 'Перенесено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    MISSED: 'Пропущено',
  };
  return map[status];
};

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);

  const loadAppointments = async () => {
    try {
      setAppointments(await patientApi.getAppointments());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить записи');
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const cancelAppointment = async (appointmentId: number) => {
    try {
      await patientApi.cancelAppointment(appointmentId);
      toast.success('Запись отменена');
      loadAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отмены');
    }
  };

  const canPatientCancel = (a: AppointmentResponse) => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(a.status);

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div>
          <h1 className="text-4xl font-black text-brand-secondary tracking-tight">Мои записи</h1>
          <p className="text-brand-primary mt-2 font-bold uppercase tracking-widest text-[10px]">История и детали приёмов</p>
        </div>
        <Link
          to="/patient/doctors"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black shadow-lg hover:bg-brand-secondary transition-all"
        >
          <Plus size={20} />
          Новая запись
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="premium-card p-8 flex flex-col gap-6 border-2 border-brand-soft bg-white">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center text-brand-secondary border-2 border-brand-soft shrink-0">
                  <User size={32} />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-brand-soft text-brand-secondary mb-2">
                    {statusLabel(appointment.status)}
                  </span>
                  <h3 className="text-2xl font-black text-brand-secondary">{appointment.doctorName}</h3>
                  <p className="text-xs font-black text-brand-primary uppercase tracking-widest mt-1">Врач</p>
                  <div className="flex flex-wrap gap-4 mt-4 text-sm font-black text-brand-secondary">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={16} className="text-brand-primary" />
                      {appointment.date}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock size={16} className="text-brand-primary" />
                      {formatTime(appointment.startTime)} — {formatTime(appointment.endTime)}
                    </span>
                  </div>
                  {appointment.symptomsDescription && (
                    <p className="mt-3 text-sm font-bold text-brand-primary">Ваши жалобы при записи: {appointment.symptomsDescription}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {canPatientCancel(appointment) && (
                  <button
                    type="button"
                    onClick={() => cancelAppointment(appointment.id)}
                    className="px-6 py-3 rounded-2xl border-2 border-status-error text-status-error font-black text-sm hover:bg-status-error/5"
                  >
                    Отменить запись
                  </button>
                )}
              </div>
            </div>

            {appointment.status === 'COMPLETED' && (appointment.diagnosis || appointment.doctorNotes || appointment.treatmentRecommendations) && (
              <div className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-5">
                <p className="text-xs font-black text-brand-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={14} />
                  Итог приёма (от врача)
                </p>
                {appointment.doctorNotes && (
                  <p className="text-sm font-bold text-brand-secondary mb-2">
                    <span className="text-brand-primary">Показания: </span>
                    {appointment.doctorNotes}
                  </p>
                )}
                {appointment.diagnosis && (
                  <p className="text-sm font-bold text-brand-secondary mb-2">
                    <span className="text-brand-primary">Диагноз: </span>
                    {appointment.diagnosis}
                  </p>
                )}
                {appointment.treatmentRecommendations && (
                  <p className="text-sm font-bold text-brand-secondary">
                    <span className="text-brand-primary">Рекомендации: </span>
                    {appointment.treatmentRecommendations}
                  </p>
                )}
              </div>
            )}

            {['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status) && (
              <p className="text-xs font-bold text-brand-primary">
                Перенос на другое время выполняет врач или администратор. При необходимости свяжитесь с клиникой или отмените запись и создайте новую.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentsPage;
