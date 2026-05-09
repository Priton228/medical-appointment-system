import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus, Check, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorApi } from '../../services/api';
import type { SlotResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const groupSlotsByDate = (slots: SlotResponse[]) =>
  slots.reduce<Record<string, SlotResponse[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

const DoctorSchedulePage = () => {
  const [slots, setSlots] = useState<SlotResponse[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeForm, setTimeForm] = useState({ startTime: '', endTime: '' });
  const [viewDate, setViewDate] = useState(new Date());

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const loadSlots = async () => {
    try {
      const data = await doctorApi.getSlots();
      setSlots(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить расписание');
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const grouped = groupSlotsByDate(slots);
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

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

  const handleDateClick = (date: string) => {
    if (isAdding) {
      setSelectedDate(date);
      setTimeForm({ startTime: '', endTime: '' });
    }
  };

  const saveSlot = async () => {
    if (!selectedDate || !timeForm.startTime || !timeForm.endTime) {
      toast.error('Заполните время');
      return;
    }
    try {
      await doctorApi.createSlot({
        date: selectedDate,
        startTime: timeForm.startTime,
        endTime: timeForm.endTime,
      });
      toast.success('Слот создан');
      setSelectedDate(null);
      setTimeForm({ startTime: '', endTime: '' });
      setIsAdding(false);
      loadSlots();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const deleteSlot = async (slotId: number) => {
    if (!confirm('Удалить этот слот?')) return;
    try {
      await doctorApi.deleteSlot(slotId);
      toast.success('Слот удалён');
      loadSlots();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка удаления');
    }
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setSelectedDate(null);
    setTimeForm({ startTime: '', endTime: '' });
  };

  const activeDate = selectedDate || (dates.length > 0 ? dates[0] : null);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-brand-secondary mb-2">Моё расписание</h1>
          <p className="text-brand-primary font-bold">Управление слотами для записи пациентов</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary transition-all"
          >
            <Plus size={20} />
            Добавить слот
          </button>
        )}
      </div>

      {isAdding && !selectedDate && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 mb-6">
          <p className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <CalendarIcon size={18} />
            Выберите дату на календаре ниже
          </p>
        </div>
      )}

      {isAdding && selectedDate && (
        <div className="bg-white rounded-2xl p-6 border-2 border-brand-soft mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-brand-primary" size={24} />
            <h3 className="text-lg font-black text-brand-secondary">
              Добавить слот на {new Date(selectedDate).toLocaleDateString('ru-RU')}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-black text-brand-primary mb-2">Время начала</label>
              <input
                type="time"
                value={timeForm.startTime}
                onChange={(e) => setTimeForm({ ...timeForm, startTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-brand-primary mb-2">Время окончания</label>
              <input
                type="time"
                value={timeForm.endTime}
                onChange={(e) => setTimeForm({ ...timeForm, endTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveSlot}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary flex items-center gap-2"
            >
              <Check size={18} /> Создать слот
            </button>
            <button
              onClick={cancelAdd}
              className="px-6 py-3 bg-brand-soft text-brand-secondary rounded-xl font-black hover:bg-brand-soft/80"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border-2 border-brand-soft p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Grid */}
          <div className="rounded-2xl border-2 border-brand-soft p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-brand-secondary">
                {isAdding && !selectedDate ? 'Выберите дату' : 'Дни приема'}
              </p>
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
                const isActive = activeDate === cell.value && !isAdding;
                const isSelectedForAdd = isAdding && selectedDate === cell.value;
                const canSelectForAdd = isAdding && cell.value && !cell.isWeekend;
                const canViewSlots = !isAdding && cell.value && hasSlots;
                
                return (
                  <button
                    key={`${cell.value || 'empty'}-${index}`}
                    onClick={() => {
                      if (!cell.value) return;
                      if (canSelectForAdd) {
                        handleDateClick(cell.value);
                      } else if (canViewSlots) {
                        setSelectedDate(cell.value);
                      }
                    }}
                    disabled={!cell.value || (!canSelectForAdd && !canViewSlots)}
                    className={`h-10 rounded-xl text-xs font-black border transition-all ${
                      !cell.value
                        ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                        : isSelectedForAdd
                          ? 'bg-brand-secondary text-white border-brand-secondary dark:bg-white dark:text-cyan-500 dark:border-white'
                          : canSelectForAdd
                            ? 'bg-brand-soft/20 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white cursor-pointer'
                            : canViewSlots
                              ? isActive
                                ? 'bg-brand-secondary text-white border-brand-secondary dark:bg-white dark:text-cyan-500 dark:border-white'
                                : cell.isWeekend
                                  ? 'bg-status-error/10 text-status-error border-status-error/30'
                                  : 'bg-brand-soft/20 text-brand-secondary border-brand-soft hover:bg-brand-soft/40'
                              : 'border-brand-soft bg-white text-brand-primary/30 cursor-not-allowed'
                    }`}
                  >
                    {cell.day || ''}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Time Slots */}
          <div className="rounded-2xl border-2 border-brand-soft p-4">
            <p className="font-black text-brand-secondary mb-4">Время приема {selectedDate ? `(${selectedDate})` : ''}</p>
            <div className="flex flex-wrap gap-2">
              {(selectedDate && grouped[selectedDate] ? grouped[selectedDate] : []).map((slot) => (
                <span key={slot.id} className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${slot.isBooked ? 'bg-status-error/10 text-status-error border-status-error/30' : 'bg-status-success/10 text-status-success border-status-success/30'}`}>
                  {formatTime(slot.startTime)}
                  {!slot.isBooked && !isAdding && (
                    <button 
                      onClick={() => deleteSlot(slot.id)}
                      className="hover:text-red-500 transition-colors"
                      title="Удалить слот"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {selectedDate && (!grouped[selectedDate] || grouped[selectedDate].length === 0) && (
              <p className="font-bold text-brand-primary">На выбранную дату слотов нет.</p>
            )}
            {!selectedDate && <p className="font-bold text-brand-primary">Выберите дату для просмотра слотов.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedulePage;
