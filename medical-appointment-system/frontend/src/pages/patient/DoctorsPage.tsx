import { Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { DoctorResponse, SlotResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const groupSlotsByDate = (slots: SlotResponse[]) =>
  slots.reduce<Record<string, SlotResponse[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

const PatientScheduleCalendar = ({
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
  const grouped = groupSlotsByDate(slots.filter((slot) => !slot.isBooked));
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const firstAvailableDate = dates[0];
  const initialView = firstAvailableDate ? new Date(`${firstAvailableDate}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedDateExists = selectedDate ? Boolean(grouped[selectedDate]) : false;
  const activeDate = selectedDateExists ? selectedDate : firstAvailableDate || '';

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
          <p className="font-black text-brand-secondary flex items-center gap-2"><Calendar size={16} /> Дни приема</p>
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
            const isActive = activeDate === cell.value;
            return (
              <button
                key={`${cell.value || 'empty'}-${index}`}
                onClick={() => cell.value && hasSlots && onSelectDate(cell.value)}
                disabled={!cell.value || !hasSlots}
                className={`h-10 rounded-xl text-xs font-black border transition-all ${
                  !cell.value
                    ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                    : isActive
                      ? 'bg-brand-secondary text-white border-brand-secondary'
                      : isToday
                        ? 'border-amber-400 bg-amber-50 text-brand-secondary'
                        : !hasSlots
                          ? 'border-status-error/40 text-status-error/60 bg-status-error/5 cursor-not-allowed'
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
        <p className="font-black text-brand-secondary mb-4">Время приема {activeDate ? `(${activeDate})` : ''}</p>
        <div className="flex flex-wrap gap-2">
          {(activeDate ? grouped[activeDate] || [] : []).map((slot) => (
            <span key={slot.id} className="px-3 py-2 rounded-xl text-xs font-black border bg-status-success/10 text-status-success border-status-success/30">
              {formatTime(slot.startTime)}
            </span>
          ))}
        </div>
        {!activeDate && <p className="font-bold text-brand-primary">Для выбранного врача нет доступных дат.</p>}
      </div>
    </div>
  );
};

const DoctorsPage = () => {
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [doctorSlots, setDoctorSlots] = useState<SlotResponse[]>([]);

  const loadDoctors = async () => {
    try {
      setDoctors(await patientApi.getDoctors({ search, minRating: minRating || undefined }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить врачей');
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    const loadDoctorSlots = async () => {
      if (!selectedDoctorId) {
        setDoctorSlots([]);
        return;
      }
      try {
        const data = await patientApi.getDoctorSlots(selectedDoctorId);
        setDoctorSlots(data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Не удалось загрузить слоты');
      }
    };
    loadDoctorSlots();
  }, [selectedDoctorId]);

  const selectedDateSlots = useMemo(
    () => doctorSlots.filter((slot) => slot.date === selectedDate && !slot.isBooked),
    [doctorSlots, selectedDate]
  );

  const bookSlot = async (slotId: number) => {
    try {
      await patientApi.bookAppointment({ slotId });
      toast.success('Вы успешно записаны к врачу');
      if (selectedDoctorId) {
        const data = await patientApi.getDoctorSlots(selectedDoctorId);
        setDoctorSlots(data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка записи');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">
            Наши <span className="text-brand-primary">специалисты</span>
          </h1>
          <p className="text-brand-secondary mt-2 font-black uppercase tracking-widest text-[10px]">Профессиональная медицинская помощь для каждого</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center bg-white px-6 py-4 rounded-2xl border-2 border-brand-soft shadow-sm w-80">
            <input
              type="text"
              placeholder="Поиск по фамилии или специализации..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-brand-secondary/40 font-black text-brand-secondary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-white px-4 py-4 rounded-2xl border-2 border-brand-soft font-black text-brand-secondary"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value={0}>Любой рейтинг</option>
            <option value={4}>от 4.0</option>
            <option value={4.5}>от 4.5</option>
          </select>
          <button onClick={loadDoctors} className="px-6 py-4 rounded-2xl bg-brand-secondary text-white font-black">
            Поиск
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="premium-card p-8 bg-white border-2 border-brand-soft lg:col-span-1">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Выберите врача</h3>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => {
                  setSelectedDoctorId(doctor.id);
                  setSelectedDate('');
                }}
                className={`w-full text-left rounded-2xl border-2 p-4 ${selectedDoctorId === doctor.id ? 'border-brand-secondary bg-brand-soft/40' : 'border-brand-soft bg-white'}`}
              >
                <p className="font-black text-brand-secondary">{doctor.fullName}</p>
                <p className="text-xs font-bold text-brand-primary mt-1">{doctor.description || doctor.specializationName || 'Врач'}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="premium-card p-8 bg-white border-2 border-brand-soft lg:col-span-2">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Календарь слотов врача</h3>
          {!selectedDoctorId ? (
            <p className="font-bold text-brand-primary">Выберите врача слева.</p>
          ) : (
            <div className="space-y-4">
              <PatientScheduleCalendar slots={doctorSlots} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              {selectedDate && selectedDateSlots.length === 0 && <p className="font-bold text-brand-primary">На выбранную дату слотов нет.</p>}
            </div>
          )}
          {selectedDate && selectedDateSlots.length > 0 && (
            <div className="mt-4">
              <p className="font-black text-brand-secondary mb-3">Доступное время ({selectedDate})</p>
              <div className="flex flex-wrap gap-2">
                {selectedDateSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => bookSlot(slot.id)}
                    className="px-3 py-2 rounded-xl text-xs font-black border bg-status-success/10 text-status-success border-status-success/30 hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all"
                  >
                    {formatTime(slot.startTime)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DoctorsPage;
