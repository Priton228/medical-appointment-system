import { Calendar, Clock, User, FileText, Plus, Search, X, Star, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { AppointmentResponse, ReviewResponse } from '../../services/api';

const formatTime = (value: string) => value.slice(0, 5);

const statusConfig: Record<AppointmentResponse['status'], { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Запланировано', color: 'text-blue-600', bg: 'bg-blue-100' },
  CONFIRMED: { label: 'Подтверждено', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  RESCHEDULED: { label: 'Перенесено', color: 'text-amber-600', bg: 'bg-amber-100' },
  COMPLETED: { label: 'Завершено', color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { label: 'Отменено', color: 'text-red-600', bg: 'bg-red-100' },
  MISSED: { label: 'Пропущено', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const StarRating = ({ rating, onRatingChange, readonly = false }: { rating: number; onRatingChange?: (r: number) => void; readonly?: boolean }) => {
  return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <button
                key={star}
                type="button"
                onClick={() => !readonly && onRatingChange?.(star)}
                className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform focus:outline-none border-0 bg-transparent p-0 shadow-none appearance-none m-0`}
                disabled={readonly}
            >
              <Star
                  size={24}
                  strokeWidth={0}
                  className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
              />
            </button>
        ))}
      </div>
  );
};

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentResponse['status'] | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [reviews, setReviews] = useState<Record<number, ReviewResponse | null>>({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadAppointments = async () => {
    try {
      const data = await patientApi.getAppointments();
      setAppointments(data);
      // Load reviews for completed appointments
      const completed = data.filter(a => a.status === 'COMPLETED');
      const reviewsMap: Record<number, ReviewResponse | null> = {};
      await Promise.all(
          completed.map(async (apt) => {
            try {
              const review = await patientApi.getReviewByAppointment(apt.id);
              reviewsMap[apt.id] = review;
            } catch {
              reviewsMap[apt.id] = null;
            }
          })
      );
      setReviews(reviewsMap);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить записи';
      toast.error(message || 'Не удалось загрузить записи');
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch = searchQuery === '' ||
          apt.doctorName?.toLowerCase()?.includes(searchQuery?.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
      const matchesDate = dateFilter === '' || apt.date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  const cancelAppointment = async (appointmentId: number) => {
    try {
      await patientApi.cancelAppointment(appointmentId);
      toast.success('Запись отменена');
      void loadAppointments();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка отмены';
      toast.error(message || 'Ошибка отмены');
    }
  };

  const canPatientCancel = (a: AppointmentResponse) => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(a.status);

  const openReviewModal = (appointment: AppointmentResponse) => {
    setSelectedAppointment(appointment);
    const existingReview = reviews[appointment.id];
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedAppointment(null);
    setRating(5);
    setComment('');
  };

  const openDetailsModal = (appointment: AppointmentResponse) => {
    setSelectedAppointment(appointment);
    setDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const submitReview = async () => {
    if (!selectedAppointment) return;
    setSubmittingReview(true);
    try {
      const review = await patientApi.createReview({
        appointmentId: selectedAppointment.id,
        rating,
        comment,
      });
      setReviews(prev => ({ ...prev, [selectedAppointment.id]: review }));
      toast.success('Отзыв сохранён!');
      closeReviewModal();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка сохранения отзыва';
      toast.error(message || 'Ошибка сохранения отзыва');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
      <>
        <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
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

          {/* Filters */}
          <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-brand-soft">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-primary" />
                <input
                    type="text"
                    placeholder="Поиск по врачу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                />
              </div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AppointmentResponse['status'] | 'ALL')}
                  className="px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary outline-none font-bold text-brand-secondary"
              >
                <option value="ALL">Все статусы</option>
                <option value="SCHEDULED">Запланировано</option>
                <option value="CONFIRMED">Подтверждено</option>
                <option value="RESCHEDULED">Перенесено</option>
                <option value="COMPLETED">Завершено</option>
                <option value="CANCELLED">Отменено</option>
                <option value="MISSED">Пропущено</option>
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

          <div className="grid grid-cols-1 gap-6">
            {filteredAppointments.map((appointment) => {
              const status = statusConfig[appointment.status];
              return (
                  <div key={appointment.id} className="premium-card p-8 flex flex-col gap-6 border-2 border-brand-soft bg-white">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center text-brand-secondary border-2 border-brand-soft shrink-0">
                          <User size={32} />
                        </div>
                        <div>
                      <span className={`inline-block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider mb-2 ${status.bg} ${status.color}`}>
                        {status.label}
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
                          {(appointment.reportedSymptoms?.length ?? 0) > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-brand-primary">Симптомы при записи</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {appointment.reportedSymptoms!.map((s) => (
                                      <span
                                          key={s.id}
                                          className="rounded-xl border-2 border-brand-soft bg-brand-soft/30 px-3 py-1 text-xs font-black text-brand-secondary dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100"
                                      >
                                        {s.name}
                                      </span>
                                  ))}
                                </div>
                              </div>
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
                        {appointment.status === 'COMPLETED' && !reviews[appointment.id] && (
                            <button
                                type="button"
                                onClick={() => openReviewModal(appointment)}
                                className="px-6 py-3 rounded-2xl bg-brand-primary text-white font-black text-sm hover:bg-brand-secondary flex items-center gap-2"
                            >
                              <MessageSquare size={16} />
                              Оставить отзыв
                            </button>
                        )}
                        {appointment.status === 'COMPLETED' && (appointment.diagnosis || appointment.doctorNotes || appointment.treatmentRecommendations) && (
                            <button
                                type="button"
                                onClick={() => openDetailsModal(appointment)}
                                className="px-6 py-3 rounded-2xl bg-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/80 flex items-center gap-2"
                            >
                              <FileText size={16} />
                              Детали
                            </button>
                        )}
                      </div>
                    </div>

                    {reviews[appointment.id] && (
                        <div className="rounded-2xl border-2 border-yellow-500/30 bg-transparent p-5">
                          <p className="text-xs font-black text-brand-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            Ваш отзыв
                          </p>
                          <div className="flex items-center gap-1 mb-2">
                            <StarRating rating={reviews[appointment.id]!.rating} readonly />
                          </div>
                          {reviews[appointment.id]!.comment && (
                              <p className="text-sm font-bold text-brand-secondary mt-2">{reviews[appointment.id]!.comment}</p>
                          )}
                        </div>
                    )}

                    {['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status) && (
                        <p className="text-xs font-bold text-brand-primary">
                          Перенос на другое время выполняет врач или администратор. При необходимости свяжитесь с клиникой или отмените запись и создайте новую.
                        </p>
                    )}
                  </div>
              );
            })}
          </div>
        </div>

        {/* Review Modal */}
        {reviewModalOpen && selectedAppointment && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeReviewModal} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-black text-brand-secondary mb-4">
                  {reviews[selectedAppointment.id] ? 'Изменить отзыв' : 'Оставить отзыв'}
                </h3>
                <p className="text-sm text-brand-primary mb-4">
                  Приём: {selectedAppointment.doctorName} — {selectedAppointment.date}
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-black text-brand-primary uppercase mb-2">Оценка</label>
                  <StarRating rating={rating} onRatingChange={setRating} />
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-black text-brand-primary uppercase mb-2">Комментарий</label>
                  <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Расскажите о вашем опыте..."
                      className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-24 resize-none"
                      maxLength={500}
                  />
                  <p className="text-xs text-brand-primary mt-1">{comment.length}/500</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                      type="button"
                      onClick={closeReviewModal}
                      className="px-4 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/20"
                  >
                    Отмена
                  </button>
                  <button
                      type="button"
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-sm hover:bg-brand-secondary disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingReview ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Details Modal */}
        {detailsModalOpen && selectedAppointment && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeDetailsModal} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-lg w-full shadow-2xl">
                <h3 className="text-xl font-black text-brand-secondary mb-4">Детали приёма</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-black text-brand-primary uppercase">Врач</p>
                    <p className="font-bold text-brand-secondary">{selectedAppointment.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-brand-primary uppercase">Дата и время</p>
                    <p className="font-bold text-brand-secondary">{selectedAppointment.date} {formatTime(selectedAppointment.startTime)} — {formatTime(selectedAppointment.endTime)}</p>
                  </div>

                  {selectedAppointment.diagnosis && (
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase mb-2">Диагноз</p>
                        <p className="font-bold text-brand-secondary">{selectedAppointment.diagnosis}</p>
                      </div>
                  )}

                  {selectedAppointment.doctorNotes && (
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase mb-2">Заметки врача</p>
                        <p className="font-bold text-brand-secondary">{selectedAppointment.doctorNotes}</p>
                      </div>
                  )}

                  {selectedAppointment.treatmentRecommendations && (
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase mb-2">Рекомендации по лечению</p>
                        <p className="font-bold text-brand-secondary">{selectedAppointment.treatmentRecommendations}</p>
                      </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                      type="button"
                      onClick={closeDetailsModal}
                      className="px-4 py-2 rounded-xl bg-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/80"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
        )}
      </>
  );
};

export default AppointmentsPage;
