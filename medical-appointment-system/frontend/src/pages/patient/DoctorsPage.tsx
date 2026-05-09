import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
                                   onBookSlot,
                                 }: {
  slots: SlotResponse[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onBookSlot: (slotId: number, slotTime: string) => void;
}) => {
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const grouped = groupSlotsByDate(slots);
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  
  const [viewDate, setViewDate] = useState(() => {
    const firstAvailableDate = dates[0];
    const initialView = firstAvailableDate ? new Date(`${firstAvailableDate}T00:00:00`) : new Date();
    return new Date(initialView.getFullYear(), initialView.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const cells: Array<{ value: string | null; day: number | null; isWeekend: boolean }> = [];
  for (let i = 0; i < mondayOffset; i += 1) {
    cells.push({ value: null, day: null, isWeekend: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthValue = String(month + 1).padStart(2, '0');
    const dayValue = String(day).padStart(2, '0');
    const value = `${year}-${monthValue}-${dayValue}`;
    const jsDay = new Date(`${value}T00:00:00`).getDay();
    cells.push({ value, day, isWeekend: jsDay === 0 || jsDay === 6 });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ value: null, day: null, isWeekend: false });
  }

  const activeDate = selectedDate || (dates.length > 0 ? dates[0] : null);

  return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Grid */}
          <div className="rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-brand-secondary dark:text-gray-100">Дни приема</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="px-3 py-1 rounded-xl border-2 border-brand-soft dark:border-gray-600 text-brand-secondary dark:text-gray-200 font-black hover:bg-brand-soft/30 dark:hover:bg-gray-700/40 transition-colors">&lt;</button>
                <span className="font-black text-sm text-brand-secondary dark:text-gray-100">{months[month]} {year}</span>
                <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="px-3 py-1 rounded-xl border-2 border-brand-soft dark:border-gray-600 text-brand-secondary dark:text-gray-200 font-black hover:bg-brand-soft/30 dark:hover:bg-gray-700/40 transition-colors">&gt;</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekdays.map((weekday, index) => (
                  <div key={weekday} className={`text-center text-[10px] font-black uppercase tracking-wider ${index > 4 ? 'text-status-error line-through' : 'text-brand-primary dark:text-gray-300'}`}>
                    {weekday}
                  </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell, index) => {
                const hasSlots = cell.value ? Boolean(grouped[cell.value]) : false;
                const isActive = activeDate === cell.value;
                
                return (
                    <button
                        key={`${cell.value || 'empty'}-${index}`}
                        onClick={() => {
                          if (!cell.value) return;
                          if (hasSlots) {
                            onSelectDate(cell.value);
                          }
                        }}
                        disabled={!cell.value || !hasSlots}
                        className={`h-10 rounded-xl text-xs font-black border transition-all ${
                            !cell.value
                                ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                                : isActive
                                    ? 'bg-brand-secondary text-white border-brand-secondary dark:bg-white dark:text-cyan-500 dark:border-white'
                                    : hasSlots
                                        ? cell.isWeekend
                                            ? 'bg-status-error/10 text-status-error border-status-error/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50'
                                            : 'bg-brand-soft/20 text-brand-secondary border-brand-soft hover:bg-brand-soft/40 dark:bg-gray-700/40 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700/60'
                                        : 'border-brand-soft bg-white text-brand-primary/30 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                        }`}
                    >
                      {cell.day || ''}
                    </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-4">
            <p className="font-black text-brand-secondary dark:text-gray-100 mb-4">Время приема {selectedDate ? `(${selectedDate})` : ''}</p>
            <div className="flex flex-wrap gap-2">
              {(selectedDate && grouped[selectedDate] ? grouped[selectedDate] : []).map((slot) => (
                  <button
                      key={slot.id}
                      type="button"
                      onClick={() => !slot.isBooked && onBookSlot(slot.id, formatTime(slot.startTime))}
                      disabled={slot.isBooked}
                      className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${slot.isBooked ? 'bg-status-error/10 text-status-error border-status-error/30 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50 cursor-not-allowed' : 'bg-status-success/10 text-status-success border-status-success/30 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 hover:bg-status-success/20 dark:hover:bg-green-900/40 cursor-pointer'}`}
                  >
                    {formatTime(slot.startTime)}
                  </button>
              ))}
            </div>
            {selectedDate && (!grouped[selectedDate] || grouped[selectedDate].length === 0) && (
                <p className="font-bold text-brand-primary dark:text-gray-300">На выбранную дату слотов нет.</p>
            )}
            {!selectedDate && <p className="font-bold text-brand-primary dark:text-gray-300">Выберите дату для просмотра слотов.</p>}
          </div>
        </div>
      </div>
  );
};

const DoctorsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [doctorSlots, setDoctorSlots] = useState<SlotResponse[]>([]);
  const [symptomIdsFromMatching, setSymptomIdsFromMatching] = useState<number[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');

  useLayoutEffect(() => {
    const st = location.state as { doctorId?: number; symptomIds?: number[] } | undefined;
    if (!st || typeof st.doctorId !== 'number') return;
    setSelectedDoctorId(st.doctorId);
    setSelectedDate('');
    setSymptomIdsFromMatching(Array.isArray(st.symptomIds) ? st.symptomIds : []);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const loadDoctors = async () => {
    try {
      setDoctors(await patientApi.getDoctors({ search, minRating: minRating || undefined }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить врачей');
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [search, minRating]);

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

  const openConfirmModal = (slotId: number, slotTime: string) => {
    setSelectedSlotId(slotId);
    setSelectedSlotTime(slotTime);
    setConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setSelectedSlotId(null);
    setSelectedSlotTime('');
  };

  const bookSlot = async () => {
    if (!selectedSlotId) return;
    try {
      await patientApi.bookAppointment({
        slotId: selectedSlotId,
        symptomIds: symptomIdsFromMatching.length > 0 ? symptomIdsFromMatching : undefined,
      });
      toast.success('Вы успешно записаны к врачу');
      setSymptomIdsFromMatching([]);
      closeConfirmModal();
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">Наши специалисты</h1>
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
            <div className="bg-white px-4 py-3 rounded-2xl border-2 border-brand-soft flex items-center gap-3">
              <span className="text-xs font-black text-brand-primary whitespace-nowrap">Рейтинг от {minRating.toFixed(1)}</span>
              <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-32 accent-brand-secondary cursor-pointer"
              />
            </div>
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
                    <p className="text-xs font-bold text-brand-primary mt-1">{doctor.description || 'Врач'}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-black text-brand-secondary">
                      {doctor.specializationName && (
                          <span className="bg-brand-soft/30 px-2 py-1 rounded-lg">{doctor.specializationName}</span>
                      )}
                      <span className="bg-brand-soft/30 px-2 py-1 rounded-lg">{doctor.experienceYears ?? 0} лет</span>
                      <span className="bg-brand-soft/30 px-2 py-1 rounded-lg">★ {doctor.rating?.toFixed(1) ?? 0}</span>
                    </div>
                  </button>
              ))}
            </div>
          </section>

          <section className="lg:col-span-2">
            {!selectedDoctorId ? (
                <div className="bg-white rounded-2xl border-2 border-brand-soft p-6">
                  <h3 className="text-2xl font-black text-brand-secondary mb-6">Календарь слотов врача</h3>
                  <p className="font-bold text-brand-primary">Выберите врача слева.</p>
                </div>
            ) : (
                <div className="space-y-4">
                  {symptomIdsFromMatching.length > 0 && (
                      <p className="rounded-2xl border-2 border-brand-primary/40 bg-brand-primary/5 px-4 py-3 text-sm font-black text-brand-secondary dark:text-gray-100">
                        Симптомы, указанные при подборе врача, будут сохранены в записи после выбора свободного слота.
                      </p>
                  )}
                  <PatientScheduleCalendar slots={doctorSlots} selectedDate={selectedDate} onSelectDate={setSelectedDate} onBookSlot={openConfirmModal} />
                </div>
            )}
          </section>
        </div>

        {/* Confirmation Modal */}
        {confirmModalOpen && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" aria-label="Закрыть форму" onClick={closeConfirmModal} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black text-brand-secondary dark:text-gray-100">Подтверждение записи</h4>
                  <button type="button" onClick={closeConfirmModal} className="p-2 rounded-xl hover:bg-brand-soft/30 dark:hover:bg-gray-700">
                    <X size={20} className="text-brand-secondary dark:text-gray-300" />
                  </button>
                </div>
                <p className="text-brand-secondary dark:text-gray-300 mb-6">
                  Вы хотите записаться на приём на <span className="font-black">{selectedSlotTime}</span>?
                </p>
                <div className="flex gap-3">
                  <button
                      type="button"
                      onClick={bookSlot}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-secondary text-white font-black text-sm hover:bg-brand-secondary/90"
                  >
                    Записаться
                  </button>
                  <button
                      type="button"
                      onClick={closeConfirmModal}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-sm dark:border-gray-600 dark:text-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>,
            document.body
        )}
      </div>
  );
};

export default DoctorsPage;
