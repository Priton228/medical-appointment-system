import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Calendar, Clock, User, FileText, Search, X, CheckCircle, XCircle, Star, MessageSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorApi } from '../../services/api';
import type { AppointmentResponse, ReviewResponse, SlotResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const groupSlotsByDate = (slots: SlotResponse[]) =>
    slots.reduce<Record<string, SlotResponse[]>>((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});

/** Календарь свободных слотов (как у пациента на странице врачей) */
const RescheduleSlotCalendar = ({
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
        <div className="rounded-2xl border-2 border-brand-soft dark:border-slate-600 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 font-black text-brand-secondary dark:text-gray-100">
              <Calendar size={16} /> Дни со свободными слотами
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="rounded-xl border-2 border-brand-soft px-3 py-1 font-black text-brand-secondary hover:bg-brand-soft/30 dark:border-slate-600 dark:text-gray-200">&lt;</button>
              <span className="text-sm font-black text-brand-secondary dark:text-gray-100">{months[month]} {year}</span>
              <button type="button" onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="rounded-xl border-2 border-brand-soft px-3 py-1 font-black text-brand-secondary hover:bg-brand-soft/30 dark:border-slate-600 dark:text-gray-200">&gt;</button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekdays.map((weekday, index) => (
                <div key={weekday} className={`text-center text-[10px] font-black uppercase tracking-wider ${index > 4 ? 'text-status-error line-through' : 'text-brand-primary'}`}>
                  {weekday}
                </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((cell, index) => {
              const daySlots = cell.value ? slots.filter((s) => s.date === cell.value) : [];
              const isToday = cell.value === todayValue;
              const isActive = activeDate === cell.value;
              return (
                  <button
                      key={`${cell.value || 'empty'}-${index}`}
                      type="button"
                      onClick={() => cell.value && daySlots.length > 0 && onSelectDate(cell.value)}
                      disabled={!cell.value || daySlots.length === 0}
                      className={`flex min-h-[2.5rem] flex-col items-center justify-center rounded-xl border text-xs font-black transition-all ${
                          !cell.value
                              ? 'cursor-default border-brand-soft/40 bg-brand-soft/10 text-transparent'
                              : isActive
                                  ? 'border-brand-secondary bg-brand-secondary text-white'
                                  : isToday
                                      ? 'border-amber-400 bg-amber-50 text-brand-secondary dark:bg-amber-900/30 dark:text-amber-100'
                                      : !daySlots.length
                                          ? 'cursor-not-allowed border-brand-soft/40 bg-brand-soft/5 text-brand-secondary/40'
                                          : 'border-brand-soft bg-brand-soft/20 text-brand-secondary hover:bg-brand-soft/40 dark:border-slate-600 dark:bg-slate-700/40 dark:text-gray-100'
                      }`}
                  >
                    <span>{cell.day || ''}</span>
                  </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-brand-soft dark:border-slate-600 p-4">
          <p className="mb-4 font-black text-brand-secondary dark:text-gray-100">
            Свободное время {activeDate ? `(${activeDate})` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {(activeDate ? grouped[activeDate] || [] : []).map((slot) => (
                <span
                    key={slot.id}
                    className="rounded-xl border-2 border-status-success/40 bg-status-success/10 px-3 py-2 text-xs font-black text-status-success dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  {formatTime(slot.startTime)}
                </span>
            ))}
          </div>
          {!activeDate && <p className="font-bold text-brand-primary">Нет доступных дат для переноса.</p>}
        </div>
      </div>
  );
};

const statusConfig: Record<AppointmentResponse['status'], { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Запланирован', color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  CONFIRMED: { label: 'Подтверждён', color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  RESCHEDULED: { label: 'Перенесён', color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  COMPLETED: { label: 'Завершён', color: 'text-green-600 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' },
  CANCELLED: { label: 'Отменён', color: 'text-red-600 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' },
  MISSED: { label: 'Пропущен', color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800/50' },
};

const DoctorAppointmentsPage = () => {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [reviews, setReviews] = useState<Record<number, ReviewResponse>>({});
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentResponse['status'] | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [completeForm, setCompleteForm] = useState({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentResponse | null>(null);
  const [doctorSlots, setDoctorSlots] = useState<SlotResponse[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [reschedulePickDate, setReschedulePickDate] = useState('');

  const loadAppointments = async () => {
    try {
      const data = await doctorApi.getAppointments();
      setAppointments(data);

      // Load reviews for completed appointments
      const reviewsMap: Record<number, ReviewResponse> = {};
      const completedAppointments = data.filter(a => a.status === 'COMPLETED');
      await Promise.all(
          completedAppointments.map(async (app) => {
            try {
              const allReviews = await doctorApi.getReviews();
              const review = allReviews.find(r => r.appointmentId === app.id);
              if (review) {
                reviewsMap[app.id] = review;
              }
            } catch {
              // Ignore errors
            }
          })
      );
      setReviews(reviewsMap);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить приёмы';
      toast.error(message || 'Не удалось загрузить приёмы');
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const patientName = apt.patientName || `Пациент #${apt.patientId}`;
      const matchesSearch = searchQuery === '' || patientName?.toLowerCase()?.includes(searchQuery?.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
      const matchesDate = dateFilter === '' || apt.date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  const updateStatus = async (id: number, status: AppointmentResponse['status']) => {
    try {
      await doctorApi.updateAppointmentStatus(id, status);
      toast.success('Статус обновлён');
      void loadAppointments();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка обновления статуса';
      toast.error(message || 'Ошибка обновления статуса');
    }
  };

  const completeAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      await doctorApi.completeAppointment(selectedAppointment.id, completeForm);
      toast.success('Приём завершён');
      setSelectedAppointment(null);
      setCompleteForm({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
      void loadAppointments();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка завершения приёма';
      toast.error(message || 'Ошибка завершения приёма');
    }
  };

  const canConfirm = (status: string) => status === 'SCHEDULED';
  const canComplete = (status: string) => ['SCHEDULED', 'CONFIRMED'].includes(status);
  const canCancel = (status: string) => ['SCHEDULED', 'CONFIRMED'].includes(status);

  const openReviewModal = (review: ReviewResponse) => {
    setSelectedReview(review);
  };

  const openAppointmentModal = (apt: AppointmentResponse, formData?: { doctorNotes?: string; diagnosis?: string; treatmentRecommendations?: string }) => {
    setSelectedAppointment(apt);
    if (formData) {
      setCompleteForm({
        doctorNotes: formData.doctorNotes || '',
        diagnosis: formData.diagnosis || '',
        treatmentRecommendations: formData.treatmentRecommendations || ''
      });
    } else {
      setCompleteForm({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
    }
  };

  const openRescheduleModal = async (apt: AppointmentResponse) => {
    setRescheduleAppointment(apt);
    setSelectedSlotId(null);
    setReschedulePickDate('');
    setRescheduleModalOpen(true);
    try {
      const slots = await doctorApi.getSlots();
      const currentSlotId = apt.slotId;
      const available = slots.filter(s => !s.isBooked && !s.isBlocked && s.id !== currentSlotId);
      setDoctorSlots(available);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить слоты';
      toast.error(message || 'Не удалось загрузить слоты');
    }
  };

  const closeRescheduleModal = () => {
    setRescheduleModalOpen(false);
    setRescheduleAppointment(null);
    setSelectedSlotId(null);
    setReschedulePickDate('');
    setDoctorSlots([]);
  };

  const submitRescheduleRequest = async () => {
    if (!rescheduleAppointment || !selectedSlotId) return;
    try {
      await doctorApi.createRescheduleRequest(rescheduleAppointment.id, selectedSlotId);
      toast.success('Запрос на перенос отправлен администратору');
      closeRescheduleModal();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка отправки запроса';
      toast.error(message || 'Ошибка отправки запроса');
    }
  };

  const canReschedule = (status: string) => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(status);

  return (
      <>
        <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-brand-secondary mb-2">Все приёмы</h1>
            <p className="text-brand-primary font-bold">Управление записями пациентов</p>
          </div>

          {/* Filters */}
          <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-brand-soft">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-primary" />
                <input
                    type="text"
                    placeholder="Поиск по пациенту..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold text-brand-secondary"
                />
              </div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AppointmentResponse['status'] | 'ALL')}
                  className="px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold text-brand-secondary"
              >
                <option value="ALL">Все статусы</option>
                <option value="SCHEDULED">Запланирован</option>
                <option value="CONFIRMED">Подтверждён</option>
                <option value="RESCHEDULED">Перенесён</option>
                <option value="COMPLETED">Завершён</option>
                <option value="CANCELLED">Отменён</option>
                <option value="MISSED">Пропущен</option>
              </select>
              <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold text-brand-secondary"
              />
              {(searchQuery || statusFilter !== 'ALL' || dateFilter) && (
                  <button
                      onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setDateFilter(''); }}
                      className="px-4 py-3 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/20 flex items-center gap-2"
                  >
                    <X size={16} /> Сбросить
                  </button>
              )}
            </div>
            <p className="mt-3 text-sm text-brand-primary">
              Найдено: {filteredAppointments.length} записей
            </p>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.map((apt) => {
              const status = statusConfig[apt.status];
              const patientName = apt.patientName || `Пациент #${apt.patientId}`;
              return (
                  <div key={apt.id} className="rounded-2xl border-2 border-brand-soft bg-white p-6 dark:border-slate-600 dark:bg-slate-800/80">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-soft flex items-center justify-center shrink-0">
                          <User size={28} className="text-brand-secondary" />
                        </div>
                        <div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase ${status.bg} ${status.color} mb-2`}>
                        {status.label}
                      </span>
                          <h3 className="text-lg font-black text-brand-secondary">{patientName}</h3>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm font-bold text-brand-secondary">
                        <span className="inline-flex items-center gap-2">
                          <Calendar size={16} className="text-brand-primary" />
                          {apt.date}
                        </span>
                            <span className="inline-flex items-center gap-2">
                          <Clock size={16} className="text-brand-primary" />
                              {formatTime(apt.startTime)} — {formatTime(apt.endTime)}
                        </span>
                          </div>
                          {(apt.reportedSymptoms?.length ?? 0) > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] font-black uppercase text-brand-primary">Симптомы при записи</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {apt.reportedSymptoms!.map((s) => (
                                      <span key={s.id} className="rounded-lg border border-brand-soft bg-brand-soft/30 px-2 py-0.5 text-xs font-bold text-brand-secondary dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100">
                                        {s.name}
                                      </span>
                                  ))}
                                </div>
                              </div>
                          )}
                        </div>
                      </div>

                      {/* Review Section for Completed Appointments */}
                      {apt.status === 'COMPLETED' && reviews[apt.id] && (
                          <div className="shrink-0 min-w-[140px]">
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                      key={star}
                                      size={14}
                                      strokeWidth={0}
                                      className={star <= reviews[apt.id]!.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
                                  />
                              ))}
                            </div>
                            <button
                                onClick={() => openReviewModal(reviews[apt.id]!)}
                                className="text-xs font-black text-brand-secondary hover:text-brand-primary flex items-center gap-1 underline decoration-dotted bg-transparent border-0 p-0"
                            >
                              <MessageSquare size={12} />
                              Читать отзыв
                            </button>
                          </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {canConfirm(apt.status) && (
                            <button
                                onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm hover:bg-emerald-200 flex items-center gap-2"
                            >
                              <CheckCircle size={16} /> Подтвердить
                            </button>
                        )}
                        {canComplete(apt.status) && (
                            <button
                                onClick={() => openAppointmentModal(apt)}
                                className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-sm hover:bg-brand-secondary flex items-center gap-2"
                            >
                              <FileText size={16} /> Завершить
                            </button>
                        )}
                        {canReschedule(apt.status) && (
                            <button
                                onClick={() => openRescheduleModal(apt)}
                                className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 font-black text-sm hover:bg-amber-200 flex items-center gap-2"
                            >
                              <RefreshCw size={16} /> Запросить перенос
                            </button>
                        )}
                        {canCancel(apt.status) && (
                            <button
                                onClick={() => updateStatus(apt.id, 'CANCELLED')}
                                className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-black text-sm hover:bg-red-200 flex items-center gap-2"
                            >
                              <XCircle size={16} /> Отменить
                            </button>
                        )}
                        {apt.status === 'COMPLETED' && (apt.diagnosis || apt.doctorNotes || apt.treatmentRecommendations) && (
                            <button
                                onClick={() => openAppointmentModal(apt, {
                                  doctorNotes: apt.doctorNotes || '',
                                  diagnosis: apt.diagnosis || '',
                                  treatmentRecommendations: apt.treatmentRecommendations || ''
                                })}
                                className="px-4 py-2 rounded-xl bg-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/80 flex items-center gap-2"
                            >
                              <FileText size={16} /> Детали
                            </button>
                        )}
                      </div>
                    </div>

                  </div>
              );
            })}
          </div>
        </div>

        {/* Complete Appointment Modal */}
        {selectedAppointment && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAppointment(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-black text-brand-secondary mb-4">
                  {selectedAppointment.status === 'COMPLETED' ? 'Детали приёма' : 'Завершить приём'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-brand-primary mb-2">Пациент</label>
                    <p className="text-brand-secondary font-bold">{selectedAppointment.patientName || `Пациент #${selectedAppointment.patientId}`}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-brand-primary mb-2">Диагноз</label>
                    <textarea
                        value={completeForm.diagnosis}
                        onChange={(e) => setCompleteForm({ ...completeForm, diagnosis: e.target.value })}
                        disabled={selectedAppointment.status === 'COMPLETED'}
                        className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none text-brand-secondary font-bold"
                        rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-brand-primary mb-2">Заметки врача</label>
                    <textarea
                        value={completeForm.doctorNotes}
                        onChange={(e) => setCompleteForm({ ...completeForm, doctorNotes: e.target.value })}
                        disabled={selectedAppointment.status === 'COMPLETED'}
                        className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none text-brand-secondary font-bold"
                        rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-brand-primary mb-2">Рекомендации по лечению</label>
                    <textarea
                        value={completeForm.treatmentRecommendations}
                        onChange={(e) => setCompleteForm({ ...completeForm, treatmentRecommendations: e.target.value })}
                        disabled={selectedAppointment.status === 'COMPLETED'}
                        className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none text-brand-secondary font-bold"
                        rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  {selectedAppointment.status !== 'COMPLETED' && (
                      <button
                          onClick={completeAppointment}
                          className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary"
                      >
                        Сохранить
                      </button>
                  )}
                  <button
                      onClick={() => setSelectedAppointment(null)}
                      className="flex-1 py-3 bg-brand-soft text-brand-secondary rounded-xl font-black hover:bg-brand-soft/80"
                  >
                    {selectedAppointment.status === 'COMPLETED' ? 'Закрыть' : 'Отмена'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Review Detail Modal */}
        {selectedReview && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedReview(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-black text-brand-secondary">Отзыв пациента</h4>
                  <button
                      onClick={() => setSelectedReview(null)}
                      className="p-2 rounded-xl border-2 border-brand-soft text-brand-secondary hover:bg-brand-soft/20"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={18}
                            strokeWidth={0}
                            className={star <= selectedReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
                        />
                    ))}
                  </div>
                  <p className="font-black text-brand-secondary">{selectedReview.patientName}</p>
                  <p className="text-xs text-brand-primary">
                    {new Date(selectedReview.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-brand-soft dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
                  <p className="text-brand-secondary font-bold whitespace-pre-wrap">
                    {selectedReview.comment || 'Комментарий не оставлен'}
                  </p>
                </div>
              </div>
            </div>
        )}

        {/* Reschedule Request Modal */}
        {rescheduleModalOpen && rescheduleAppointment && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={closeRescheduleModal} />
              <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border-2 border-brand-soft bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <h3 className="mb-4 text-xl font-black text-brand-secondary dark:text-gray-100">Запросить перенос приёма</h3>
                <p className="mb-4 text-sm text-brand-primary">
                  Пациент: <span className="font-bold text-brand-secondary dark:text-gray-100">{rescheduleAppointment.patientName}</span>
                  <br />
                  Текущая дата:{' '}
                  <span className="font-bold dark:text-gray-100">
                    {rescheduleAppointment.date} {formatTime(rescheduleAppointment.startTime)}
                  </span>
                </p>

                {doctorSlots.length === 0 ? (
                    <p className="text-sm text-brand-primary">Нет доступных слотов для переноса.</p>
                ) : (
                    <>
                      <RescheduleSlotCalendar
                          slots={doctorSlots}
                          selectedDate={reschedulePickDate}
                          onSelectDate={(d) => {
                            setReschedulePickDate(d);
                            setSelectedSlotId(null);
                          }}
                      />
                      {reschedulePickDate && (
                          <div className="mt-6">
                            <p className="mb-2 text-sm font-black text-brand-primary">Выберите время на {reschedulePickDate}</p>
                            <div className="flex flex-wrap gap-2">
                              {doctorSlots
                                  .filter((s) => s.date === reschedulePickDate)
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                  .map((slot) => (
                                      <button
                                          key={slot.id}
                                          type="button"
                                          onClick={() => setSelectedSlotId(slot.id)}
                                          className={`rounded-xl border-2 px-4 py-2 text-xs font-black transition-all ${
                                              selectedSlotId === slot.id
                                                  ? 'border-brand-primary bg-brand-primary text-white'
                                                  : 'border-brand-soft bg-brand-soft/20 text-brand-secondary hover:bg-brand-soft/40 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100'
                                          }`}
                                      >
                                        {formatTime(slot.startTime)}
                                      </button>
                                  ))}
                            </div>
                          </div>
                      )}
                    </>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                      type="button"
                      onClick={submitRescheduleRequest}
                      disabled={!selectedSlotId}
                      className="flex-1 rounded-xl bg-brand-primary py-3 font-black text-white hover:bg-brand-secondary disabled:opacity-50"
                  >
                    Отправить запрос
                  </button>
                  <button
                      type="button"
                      onClick={closeRescheduleModal}
                      className="flex-1 rounded-xl bg-brand-soft py-3 font-black text-brand-secondary hover:bg-brand-soft/80 dark:bg-slate-700 dark:text-gray-100"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>,
            document.body
        )}
      </>
  );
};

export default DoctorAppointmentsPage;
