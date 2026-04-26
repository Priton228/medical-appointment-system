import { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, Clock, Plus, Save, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { doctorApi } from '../../services/api';
import type { AppointmentResponse, DoctorDashboardResponse, SlotResponse } from '../../services/api';

const STATUS_LABELS: Record<AppointmentResponse['status'], string> = {
  SCHEDULED: 'Запланирован',
  CONFIRMED: 'Подтвержден',
  RESCHEDULED: 'Перенесён',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
  MISSED: 'Пропущен',
};
const formatTime = (value: string) => value.slice(0, 5);
const groupSlotsByDate = (allSlots: SlotResponse[]) =>
  allSlots.reduce<Record<string, SlotResponse[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DoctorDashboardResponse | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentResponse[]>([]);
  const [slots, setSlots] = useState<SlotResponse[]>([]);
  const [completeFor, setCompleteFor] = useState<AppointmentResponse | null>(null);
  const [completeForm, setCompleteForm] = useState({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentResponse | null>(null);
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '', endTime: '' });
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboardData, appointmentsData, allData, slotsData] = await Promise.all([
        doctorApi.getDashboard(),
        doctorApi.getTodayAppointments(),
        doctorApi.getAppointments(),
        doctorApi.getSlots(),
      ]);
      setDashboard(dashboardData);
      setAppointments(appointmentsData);
      setAllAppointments(allData);
      setSlots(slotsData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить данные врача');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statistics = useMemo(
    () => [
      { label: 'Пациентов сегодня', value: dashboard?.appointmentsToday ?? 0, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
      { label: 'Всего приемов', value: dashboard?.totalAppointments ?? 0, icon: Calendar, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
      { label: 'Завершенные приемы', value: dashboard?.completedAppointments ?? 0, icon: Activity, color: 'text-status-success', bg: 'bg-status-success/10' },
      { label: 'Свободные слоты', value: dashboard?.activeSlots ?? 0, icon: Clock, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
    ],
    [dashboard]
  );

  const saveSlot = async () => {
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error('Заполните дату и время слота');
      return;
    }

    try {
      if (editingSlotId) {
        await doctorApi.updateSlot(editingSlotId, slotForm);
        toast.success('Слот обновлен');
      } else {
        await doctorApi.createSlot(slotForm);
        toast.success('Слот добавлен');
      }
      setSlotForm({ date: '', startTime: '', endTime: '' });
      setEditingSlotId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения слота');
    }
  };

  const startEditSlot = (slot: SlotResponse) => {
    setEditingSlotId(slot.id);
    setSlotForm({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
    setSelectedDate(slot.date);
  };

  const removeSlot = async (slotId: number) => {
    try {
      await doctorApi.deleteSlot(slotId);
      toast.success('Слот удален');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось удалить слот');
    }
  };

  const patchAppointmentStatus = async (appointmentId: number, payload: Parameters<typeof doctorApi.updateAppointmentStatus>[1]) => {
    try {
      await doctorApi.updateAppointmentStatus(appointmentId, payload);
      toast.success('Статус обновлен');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось обновить статус');
    }
  };

  const submitComplete = async () => {
    if (!completeFor) return;
    await patchAppointmentStatus(completeFor.id, {
      status: 'COMPLETED',
      doctorNotes: completeForm.doctorNotes || null,
      diagnosis: completeForm.diagnosis || null,
      treatmentRecommendations: completeForm.treatmentRecommendations || null,
    });
    setCompleteFor(null);
    setCompleteForm({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  };

  const applyReschedule = async (newSlotId: number) => {
    if (!rescheduleFor) return;
    try {
      await doctorApi.rescheduleAppointment(rescheduleFor.id, newSlotId);
      toast.success('Запись перенесена');
      setRescheduleFor(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось перенести');
    }
  };

  const AppointmentActions = ({ app }: { app: AppointmentResponse }) => {
    const canAct = !['COMPLETED', 'CANCELLED'].includes(app.status);
    const freeSlots = slots.filter((s) => !s.isBooked && !s.isBlocked);
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {canAct && (app.status === 'SCHEDULED' || app.status === 'RESCHEDULED') && (
          <button type="button" onClick={() => patchAppointmentStatus(app.id, { status: 'CONFIRMED' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-white border-brand-soft">
            Подтвердить
          </button>
        )}
        {canAct && (
          <button type="button" onClick={() => patchAppointmentStatus(app.id, { status: 'MISSED' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-white border-brand-soft">
            Пропущен
          </button>
        )}
        {canAct && (
          <button type="button" onClick={() => patchAppointmentStatus(app.id, { status: 'CANCELLED', cancelReason: 'Отменено врачом' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-status-error text-status-error">
            Отменить
          </button>
        )}
        {canAct && freeSlots.length > 0 && (
          <button type="button" onClick={() => setRescheduleFor(app)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-brand-primary/10 text-brand-secondary border-brand-primary/30">
            Перенести
          </button>
        )}
        {canAct && (
          <button
            type="button"
            onClick={() => {
              setCompleteFor(app);
              setCompleteForm({ doctorNotes: app.doctorNotes || '', diagnosis: app.diagnosis || '', treatmentRecommendations: app.treatmentRecommendations || '' });
            }}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-status-success/10 text-status-success border-status-success/30"
          >
            Завершить приём
          </button>
        )}
        <span className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-brand-soft bg-brand-soft/30 text-brand-secondary">
          {STATUS_LABELS[app.status]}
        </span>
      </div>
    );
  };

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const selectedDateSlots = useMemo(
    () => (selectedDate ? (slotsByDate[selectedDate] || []) : []),
    [selectedDate, slotsByDate]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up bg-brand-bg">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">
          Рабочий стол <span className="text-brand-primary">врача</span>
        </h1>
        <p className="text-brand-primary mt-2 font-black uppercase tracking-widest text-[10px]">Добро пожаловать, {user?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statistics.map((stat, i) => (
          <div key={i} className="premium-card p-6 flex items-center space-x-5 bg-white border-2 border-brand-soft">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-md border border-brand-soft`}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-brand-secondary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Записи на сегодня</h3>
          {isLoading ? (
            <p className="text-brand-primary font-bold">Загрузка...</p>
          ) : appointments.length === 0 ? (
            <p className="text-brand-primary font-bold">На сегодня нет записей.</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((app) => (
                <div key={app.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-5">
                  <p className="font-black text-brand-secondary">{app.patientName}</p>
                  <p className="text-xs font-black text-brand-primary uppercase tracking-wider mt-1">
                    {app.date} {formatTime(app.startTime)} — {formatTime(app.endTime)}
                  </p>
                  {app.symptomsDescription && <p className="text-xs font-bold text-brand-secondary mt-2">Жалобы: {app.symptomsDescription}</p>}
                  <AppointmentActions app={app} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Управление слотами</h3>
          <DoctorScheduleCalendar
            slots={slots}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSlotForm((s) => ({ ...s, date }));
            }}
          />
          <p className="mt-4 mb-3 font-bold text-brand-primary">
            {selectedDate ? `Выбранный рабочий день: ${selectedDate}` : 'Выберите день в календаре'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input type="date" value={slotForm.date} onChange={(e) => {
              setSlotForm((s) => ({ ...s, date: e.target.value }));
              setSelectedDate(e.target.value);
            }} className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
            <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm((s) => ({ ...s, startTime: e.target.value }))} className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
            <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm((s) => ({ ...s, endTime: e.target.value }))} className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
          </div>
          <button onClick={saveSlot} className="mb-6 flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-secondary text-white font-black">
            {editingSlotId ? <Save size={18} /> : <Plus size={18} />}
            {editingSlotId ? 'Обновить слот' : 'Добавить слот'}
          </button>

          {isLoading ? (
            <p className="text-brand-primary font-bold">Загрузка...</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {(selectedDate ? selectedDateSlots : slots).map((slot) => (
                <div key={slot.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-black text-brand-secondary">{slot.date}</p>
                    <p className="text-xs font-black text-brand-primary uppercase tracking-wider">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditSlot(slot)} className="px-3 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs">
                      Изменить
                    </button>
                    <button onClick={() => removeSlot(slot.id)} className="px-3 py-2 rounded-xl border-2 border-status-error text-status-error font-black text-xs flex items-center gap-1">
                      <Trash2 size={14} />
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-10 premium-card p-8 bg-white border-2 border-brand-soft">
        <h3 className="text-2xl font-black text-brand-secondary mb-6">Все приёмы</h3>
        {isLoading ? (
          <p className="text-brand-primary font-bold">Загрузка...</p>
        ) : allAppointments.length === 0 ? (
          <p className="text-brand-primary font-bold">Записей пока нет.</p>
        ) : (
          <div className="space-y-4 max-h-[560px] overflow-auto pr-1">
            {allAppointments.map((app) => (
              <div key={app.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-black text-brand-secondary">{app.patientName}</p>
                    <p className="text-xs font-black text-brand-primary uppercase tracking-wider mt-1">
                      {app.date} {formatTime(app.startTime)} — {formatTime(app.endTime)}
                    </p>
                    {app.symptomsDescription && <p className="text-xs font-bold text-brand-secondary mt-2">Жалобы: {app.symptomsDescription}</p>}
                    {app.status === 'COMPLETED' && (app.diagnosis || app.doctorNotes || app.treatmentRecommendations) && (
                      <div className="mt-3 text-xs font-bold text-brand-secondary space-y-1 border-t border-brand-soft pt-3">
                        {app.doctorNotes && <p>Показания: {app.doctorNotes}</p>}
                        {app.diagnosis && <p>Диагноз: {app.diagnosis}</p>}
                        {app.treatmentRecommendations && <p>Рекомендации: {app.treatmentRecommendations}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <AppointmentActions app={app} />
              </div>
            ))}
          </div>
        )}
      </section>

      {completeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border-2 border-brand-soft p-6 max-w-lg w-full shadow-2xl">
            <h4 className="text-lg font-black text-brand-secondary mb-4">Завершить приём: {completeFor.patientName}</h4>
            <label className="block text-xs font-black text-brand-primary uppercase mb-1">Показания / объективный статус</label>
            <textarea value={completeForm.doctorNotes} onChange={(e) => setCompleteForm((s) => ({ ...s, doctorNotes: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-3 min-h-20" />
            <label className="block text-xs font-black text-brand-primary uppercase mb-1">Диагноз</label>
            <textarea value={completeForm.diagnosis} onChange={(e) => setCompleteForm((s) => ({ ...s, diagnosis: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-3 min-h-16" />
            <label className="block text-xs font-black text-brand-primary uppercase mb-1">Рекомендации к лечению</label>
            <textarea value={completeForm.treatmentRecommendations} onChange={(e) => setCompleteForm((s) => ({ ...s, treatmentRecommendations: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-4 min-h-20" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCompleteFor(null)} className="px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-xs">
                Отмена
              </button>
              <button type="button" onClick={() => submitComplete()} className="px-4 py-2 rounded-xl bg-brand-secondary text-white font-black text-xs">
                Сохранить и завершить
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border-2 border-brand-soft p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <h4 className="text-lg font-black text-brand-secondary mb-2">Перенос записи</h4>
            <p className="text-xs font-bold text-brand-primary mb-4">Пациент: {rescheduleFor.patientName}. Выберите свободный слот:</p>
            <div className="flex-1 overflow-auto space-y-2">
              {slots
                .filter((s) => !s.isBooked && !s.isBlocked)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applyReschedule(s.id)}
                    className="w-full text-left rounded-xl border-2 border-brand-soft p-3 font-bold text-sm hover:bg-brand-soft/40"
                  >
                    {s.date} {formatTime(s.startTime)} — {formatTime(s.endTime)}
                  </button>
                ))}
            </div>
            <button type="button" onClick={() => setRescheduleFor(null)} className="mt-4 px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-xs w-full">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

const DoctorScheduleCalendar = ({
  slots,
  selectedDate,
  onSelectDate,
}: {
  slots: SlotResponse[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) => {
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const grouped = groupSlotsByDate(slots);
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const firstAvailableDate = dates[0];
  const initialView = firstAvailableDate ? new Date(`${firstAvailableDate}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const cells: Array<{ value: string | null; day: number | null; isWeekend: boolean }> = [];
  for (let i = 0; i < mondayOffset; i += 1) cells.push({ value: null, day: null, isWeekend: false });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthValue = String(month + 1).padStart(2, '0');
    const dayValue = String(day).padStart(2, '0');
    const value = `${year}-${monthValue}-${dayValue}`;
    const jsDay = new Date(`${value}T00:00:00`).getDay();
    cells.push({ value, day, isWeekend: jsDay === 0 || jsDay === 6 });
  }
  while (cells.length % 7 !== 0) cells.push({ value: null, day: null, isWeekend: false });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border-2 border-brand-soft p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-brand-secondary">Дни приема</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="px-3 py-1 rounded-xl border-2 border-brand-soft text-brand-secondary font-black hover:bg-brand-soft/30 transition-colors">&lt;</button>
            <span className="font-black text-sm text-brand-secondary">{months[month]} {year}</span>
            <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="px-3 py-1 rounded-xl border-2 border-brand-soft text-brand-secondary font-black hover:bg-brand-soft/30 transition-colors">&gt;</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekdays.map((weekday, index) => (
            <div key={weekday} className={`text-center text-[10px] font-black uppercase tracking-wider ${index > 4 ? 'text-status-error line-through' : 'text-brand-primary'}`}>
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, index) => {
            const hasSlots = cell.value ? Boolean(grouped[cell.value]) : false;
            const isToday = cell.value === todayValue;
            const isActive = selectedDate === cell.value;
            return (
              <button
                key={`${cell.value || 'empty'}-${index}`}
                onClick={() => cell.value && onSelectDate(cell.value)}
                disabled={!cell.value}
                className={`h-10 rounded-xl text-xs font-black border transition-all ${
                  !cell.value
                    ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                    : isActive
                      ? 'bg-brand-secondary text-white border-brand-secondary'
                      : isToday
                        ? 'border-amber-400 bg-amber-50 text-brand-secondary'
                        : !hasSlots
                          ? 'border-brand-soft bg-white text-brand-primary/60'
                          : cell.isWeekend
                            ? 'bg-status-error/10 text-status-error border-status-error/30 hover:bg-status-error/20'
                            : 'bg-brand-soft/20 text-brand-secondary border-brand-soft hover:bg-brand-soft/40'
                }`}
              >
                {cell.day || ''}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border-2 border-brand-soft p-4">
        <p className="font-black text-brand-secondary mb-4">Время приема {selectedDate ? `(${selectedDate})` : ''}</p>
        <div className="flex flex-wrap gap-2">
          {(selectedDate ? grouped[selectedDate] || [] : []).map((slot) => (
            <span key={slot.id} className={`px-3 py-2 rounded-xl text-xs font-black border ${slot.isBooked ? 'bg-status-error/10 text-status-error border-status-error/30' : 'bg-status-success/10 text-status-success border-status-success/30'}`}>
              {formatTime(slot.startTime)}
            </span>
          ))}
        </div>
        {!selectedDate && <p className="font-bold text-brand-primary">Выберите день для назначения рабочего времени.</p>}
      </div>
    </div>
  );
};