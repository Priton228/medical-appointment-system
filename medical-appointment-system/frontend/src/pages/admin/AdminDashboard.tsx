import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Calendar, Plus, Save, Trash2, Users, UserCog, Ban, CheckCircle2, Search, X, Star, MessageSquare, FileText, User, ChevronLeft, ChevronRight, RefreshCw, Clock, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import type { AdminDashboardResponse, AppointmentResponse, DoctorResponse, SlotResponse, SpecializationResponse, SymptomResponse, UserResponse, ReviewResponse, PatientResponse, MedicalRecordResponse, RescheduleRequestResponse, StatisticsResponse } from '../../services/api';
import AdminMessagesSection from './AdminMessagesSection';
import AdminSystemSection from './AdminSystemSection';
import AdminProfileSection from './AdminProfileSection';

const emptyDoctorForm = {
  fullName: '',
  email: '',
  phone: '',
  description: '',
  experienceYears: 0,
  education: '',
  specializationId: null as number | null,
};
const formatTime = (value: string) => value.slice(0, 5);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU');
const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const statusConfig: Record<AppointmentResponse['status'], { label: string; lightClass: string; darkClass: string }> = {
  SCHEDULED: { label: 'Запланирован', lightClass: 'bg-transparent border border-blue-500 text-blue-600', darkClass: 'dark:bg-blue-900/30 dark:text-blue-300' },
  CONFIRMED: { label: 'Подтверждён', lightClass: 'bg-transparent border border-emerald-500 text-emerald-600', darkClass: 'dark:bg-emerald-900/30 dark:text-emerald-300' },
  COMPLETED: { label: 'Завершён', lightClass: 'bg-transparent border border-green-500 text-green-600', darkClass: 'dark:bg-green-900/30 dark:text-green-300' },
  CANCELLED: { label: 'Отменён', lightClass: 'bg-transparent border border-red-500 text-red-600', darkClass: 'dark:bg-red-900/30 dark:text-red-300' },
  MISSED: { label: 'Пропущен', lightClass: 'bg-transparent border border-gray-500 text-gray-600', darkClass: 'dark:bg-gray-800/50 dark:text-gray-300' },
  RESCHEDULED: { label: 'Перенесён', lightClass: 'bg-transparent border border-amber-500 text-amber-600', darkClass: 'dark:bg-amber-900/30 dark:text-amber-300' },
};

// Statistics Section Component
const StatisticsSection = () => {
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getStatistics();
      setStats(data);
    } catch (err) {
      setError('Не удалось загрузить статистику');
      toast.error('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
    // Устанавливаем даты по умолчанию (последний месяц)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastMonth.toISOString().split('T')[0]);
  }, []);

  const exportToPDF = () => {
    if (!stats) return;

    // Функция транслитерации
    const translit = (text: string): string => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        'і': 'i', 'І': 'I', 'ў': 'w', 'Ў': 'W', 'є': 'ye', 'Є': 'Ye', 'ґ': 'g', 'Ґ': 'G'
      };
      return text.split('').map(c => map[c] || c).join('');
    };

    try {
      setExporting(true);
      toast.loading('Generaciya PDF...');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      let y = 10;

      // Заголовок
      pdf.setFontSize(18);
      pdf.setTextColor(44, 62, 80);
      pdf.text(translit('Отчет по статистике medicinskogo centra'), pdfWidth / 2, y, { align: 'center' });
      y += 10;

      // Период
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      const periodText = `${translit('Period')}: ${startDate ? new Date(startDate).toLocaleDateString('ru-RU') : translit('vse vremya')} - ${endDate ? new Date(endDate).toLocaleDateString('ru-RU') : translit('segodnya')}`;
      pdf.text(translit(periodText), pdfWidth / 2, y, { align: 'center' });
      y += 15;

      // Основные показатели
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text(translit('Osnovnye pokazateli'), 10, y);
      y += 8;

      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      const kpis = stats.kpis;
      pdf.text(`${translit('Vsego zapisей')}: ${kpis.totalAppointments}`, 10, y); y += 6;
      pdf.text(`${translit('Pacientov')}: ${kpis.totalPatients}`, 10, y); y += 6;
      pdf.text(`${translit('Sredniy reyting')}: ${kpis.averageRating.toFixed(1)}`, 10, y); y += 6;
      pdf.text(`${translit('Zapisey na segodnya')}: ${kpis.todayAppointments}`, 10, y); y += 6;
      pdf.text(`${translit('Svobodnyh slotov')}: ${kpis.freeSlotsToday}`, 10, y); y += 12;

      // Статусы записей
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text(translit('Raspredelenie po statusam'), 10, y);
      y += 8;

      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      stats.statusDistribution.forEach(status => {
        pdf.text(`${translit(status.status)}: ${status.count} (${status.percent}%)`, 10, y);
        y += 6;
      });
      y += 6;

      // Статистика по специализациям
      if (stats.specializations.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.text(translit('Specializacii'), 10, y);
        y += 8;

        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        stats.specializations.forEach(spec => {
          pdf.text(`${translit(spec.name)}: ${spec.count} ${translit('zapisey')}`, 10, y);
          y += 6;
        });
        y += 6;
      }

      // Топ врачей
      if (stats.topDoctors.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.text(translit('Top vrachey'), 10, y);
        y += 8;

        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        stats.topDoctors.slice(0, 5).forEach((doctor, index) => {
          pdf.text(`${index + 1}. ${translit(doctor.name)} - ${translit('reyting')}: ${doctor.rating.toFixed(1)}, ${translit('priemov')}: ${doctor.appointments}`, 10, y);
          y += 6;
        });
      }

      pdf.output('dataurlnewwindow');

      toast.dismiss();
      toast.success(translit('PDF otkryt v novoy vkladke'));
    } catch (err) {
      toast.dismiss();
      toast.error('Oshibka pri sozdanii PDF');
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={40} className="text-brand-primary animate-spin" />
          <p className="text-brand-secondary font-bold">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500 font-bold">{error || 'Ошибка загрузки'}</p>
          <button
            onClick={loadStatistics}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black hover:bg-brand-secondary transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const { kpis, monthlyAppointments, statusDistribution, weeklyTrend, specializations, topDoctors } = stats;

  const maxBarValue = Math.max(...monthlyAppointments.map(m => m.completed + m.cancelled + m.scheduled), 1);
  const maxSpecCount = Math.max(...specializations.map(s => s.count), 1);
  const maxAppointments = Math.max(...topDoctors.map(d => d.appointments), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-secondary dark:text-gray-100 mb-2">Статистика и отчёты</h2>
          <p className="text-brand-primary font-bold dark:text-gray-300">Аналитика работы медицинского центра</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border-2 border-brand-soft dark:border-slate-600">
            <Calendar size={16} className="text-brand-primary" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm font-bold text-brand-secondary dark:text-gray-200 bg-transparent border-none outline-none w-32"
              placeholder="Начальная дата"
            />
            <span className="text-brand-primary">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm font-bold text-brand-secondary dark:text-gray-200 bg-transparent border-none outline-none w-32"
              placeholder="Конечная дата"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadStatistics}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-sm hover:bg-brand-secondary transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} /> Обновить
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting || !stats}
              className="px-4 py-2 rounded-xl bg-brand-soft text-brand-secondary font-black text-sm hover:bg-brand-soft/80 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} /> {exporting ? 'Создание...' : 'Экспорт PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Content for PDF export */}
      <div ref={reportRef} className="space-y-6">
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Appointments Bar Chart */}
        <div className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100">Записи по месяцам</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> Завершены</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Запланированы</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400"></span> Отменены</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-3">
            {monthlyAppointments.map((month, idx) => {
              const total = month.completed + month.cancelled + month.scheduled;
              const maxVal = Math.max(maxBarValue, 1);
              // Calculate percentages relative to the max value
              const totalPercent = Math.max((total / maxVal) * 100, total > 0 ? 15 : 5);
              const completedPercent = total > 0 ? (month.completed / total) * 100 : 0;
              const scheduledPercent = total > 0 ? (month.scheduled / total) * 100 : 0;
              const cancelledPercent = total > 0 ? (month.cancelled / total) * 100 : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex flex-col-reverse rounded-t-lg overflow-hidden" style={{ height: `${totalPercent}%` }}>
                    {month.completed > 0 && (
                      <div
                        className="w-full bg-emerald-500 transition-all duration-500 hover:opacity-80"
                        style={{ height: `${completedPercent}%` }}
                        title={`Завершены: ${month.completed}`}
                      />
                    )}
                    {month.scheduled > 0 && (
                      <div
                        className="w-full bg-blue-500 transition-all duration-500 hover:opacity-80"
                        style={{ height: `${scheduledPercent}%` }}
                        title={`Запланированы: ${month.scheduled}`}
                      />
                    )}
                    {month.cancelled > 0 && (
                      <div
                        className="w-full bg-red-400 transition-all duration-500 hover:opacity-80"
                        style={{ height: `${cancelledPercent}%` }}
                        title={`Отменены: ${month.cancelled}`}
                      />
                    )}
                  </div>
                  <span className="text-xs font-bold text-brand-primary dark:text-gray-400 mt-1">{month.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 rounded-2xl">
          <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100 mb-6">Распределение по статусам</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {statusDistribution.map((item, idx) => {
                  const prevPercent = statusDistribution.slice(0, idx).reduce((sum, s) => sum + s.percent, 0);
                  // Map Tailwind classes to hex colors
                  const colorMap: Record<string, string> = {
                    'bg-emerald-500': '#10b981',
                    'bg-blue-500': '#3b82f6',
                    'bg-red-500': '#ef4444',
                  };
                  const strokeColor = colorMap[item.color] || '#3b82f6';
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="20"
                      strokeDasharray={`${item.percent * 2.51} ${100 * 2.51}`}
                      strokeDashoffset={`-${prevPercent * 2.51}`}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-brand-secondary dark:text-gray-100">{kpis.totalAppointments.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {statusDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${item.color} ${item.darkColor}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-brand-secondary dark:text-gray-200">{item.status}</span>
                      <span className="font-black text-brand-secondary dark:text-gray-100">{item.count}</span>
                    </div>
                    <div className="h-2 bg-brand-soft/30 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full ${item.color} ${item.darkColor} rounded-full transition-all duration-1000`} style={{ width: `${item.percent}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-primary dark:text-gray-400">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Bar Chart */}
        <div className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 rounded-2xl lg:col-span-2">
          <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100 mb-6">Недельный тренд записей</h3>
          <div className="h-48 flex items-end justify-between gap-4">
            {weeklyTrend.map((value, idx) => {
              const max = Math.max(...weeklyTrend, 1);
              const rawPercent = (value / max) * 100;
              // Minimum 12% for visibility when there is data, 3% for zero values
              const height = value === 0 ? 3 : Math.max(rawPercent, 12);
              const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[50px] bg-gradient-to-t from-brand-primary to-brand-secondary rounded-t-lg transition-all duration-500 hover:from-brand-secondary hover:to-brand-primary relative group"
                    style={{ height: `${height}%`, minHeight: value === 0 ? '4px' : '20px' }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-black text-brand-secondary dark:text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-gray-700 px-2 py-0.5 rounded shadow-sm">{value}</span>
                  </div>
                  <span className="text-xs font-bold text-brand-primary dark:text-gray-400">{days[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specializations Stats */}
        <div className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 rounded-2xl">
          <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100 mb-6">По специализациям</h3>
          <div className="space-y-4">
            {specializations.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${spec.color}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-brand-secondary dark:text-gray-200">{spec.name}</span>
                    <span className="text-sm font-black text-brand-secondary dark:text-gray-100">{spec.count}</span>
                  </div>
                  <div className="h-2 bg-brand-soft/20 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${spec.color} rounded-full transition-all duration-1000`} style={{ width: `${(spec.count / maxSpecCount) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Doctors Table */}
      <div className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 rounded-2xl">
        <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100 mb-6">Топ врачей по активности</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-brand-soft dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-black text-brand-primary uppercase dark:text-gray-400">Врач</th>
                <th className="text-center py-3 px-4 text-xs font-black text-brand-primary uppercase dark:text-gray-400">Рейтинг</th>
                <th className="text-center py-3 px-4 text-xs font-black text-brand-primary uppercase dark:text-gray-400">Приёмов</th>
                <th className="text-right py-3 px-4 text-xs font-black text-brand-primary uppercase dark:text-gray-400">Эффективность</th>
              </tr>
            </thead>
            <tbody>
              {topDoctors.map((doc, idx) => (
                <tr key={idx} className="border-b border-brand-soft/50 dark:border-gray-700/50 hover:bg-brand-soft/10 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black">
                        {doc.name.charAt(0)}
                      </div>
                      <span className="font-bold text-brand-secondary dark:text-gray-200">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      <span className="font-black text-brand-secondary dark:text-gray-100">{doc.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold text-brand-secondary dark:text-gray-100">{doc.appointments}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-brand-soft/30 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(doc.appointments / maxAppointments) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-brand-primary dark:text-gray-400">{Math.round((doc.appointments / maxAppointments) * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [tab, setTab] = useState<'doctors' | 'patients' | 'users' | 'symptoms' | 'schedule' | 'appointments' | 'specializations' | 'rescheduleRequests' | 'statistics' | 'messages' | 'system' | 'profile'>('doctors');

  // Search and filter states
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorMinRating, setDoctorMinRating] = useState(0);
  const [patientSearch, setPatientSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'PATIENT' | 'DOCTOR' | 'ADMIN'>('ALL');
  const [userBlockedFilter, setUserBlockedFilter] = useState<'ALL' | 'BLOCKED' | 'ACTIVE'>('ALL');
  const [specializationSearch, setSpecializationSearch] = useState('');
  const [symptomSearch, setSymptomSearch] = useState('');
  const [symptomUrgentFilter, setSymptomUrgentFilter] = useState<'ALL' | 'URGENT' | 'NON_URGENT'>('ALL');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleMinRating, setScheduleMinRating] = useState(0);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>('');
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationResponse[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomResponse[]>([]);
  const [doctorSchedule, setDoctorSchedule] = useState<SlotResponse[]>([]);
  const [selectedScheduleDoctorId, setSelectedScheduleDoctorId] = useState<number | null>(null);
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm);
  const [symptomForm, setSymptomForm] = useState({ name: '', description: '', isUrgent: false });
  const [editingSymptomId, setEditingSymptomId] = useState<number | null>(null);
  const [specializationForm, setSpecializationForm] = useState({ name: '', description: '', symptoms: [] as { symptomId: number; weight: number }[] });
  const [editingSpecializationId, setEditingSpecializationId] = useState<number | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', phone: '', role: 'PATIENT' as 'PATIENT' | 'DOCTOR' | 'ADMIN', avatarUrl: '' });
  const [userAvatarInput, setUserAvatarInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adminAppointments, setAdminAppointments] = useState<AppointmentResponse[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentReviews, setAppointmentReviews] = useState<Record<number, ReviewResponse>>({});
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [completeFor, setCompleteFor] = useState<AppointmentResponse | null>(null);
  const [completeForm, setCompleteForm] = useState({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentResponse | null>(null);
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState<number | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotResponse[]>([]);
  const [patients, setPatients] = useState<PatientResponse[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null);
  const [selectedPatientAppointments, setSelectedPatientAppointments] = useState<AppointmentResponse[]>([]);
  const [selectedPatientRecords, setSelectedPatientRecords] = useState<MedicalRecordResponse[]>([]);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientActiveTab, setPatientActiveTab] = useState<'info' | 'appointments' | 'records'>('info');
  const [selectedPatientRecordIndex, setSelectedPatientRecordIndex] = useState<number | null>(null);
  // Reschedule request states
  const [rescheduleRequests, setRescheduleRequests] = useState<RescheduleRequestResponse[]>([]);
  const [loadingRescheduleRequests, setLoadingRescheduleRequests] = useState(false);
  const [rescheduleRequestFilter, setRescheduleRequestFilter] = useState<'all' | 'pending'>('pending');
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  // Admin slot management states
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '', endTime: '', isBlocked: false });
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [scheduleContextDate, setScheduleContextDate] = useState<string>('');
  const [scheduleIsAdding, setScheduleIsAdding] = useState(false);
  const [scheduleSelectedDateForAdd, setScheduleSelectedDateForAdd] = useState<string | null>(null);
  const [rescheduleSearch, setRescheduleSearch] = useState('');
  const [rescheduleStatusFilter, setRescheduleStatusFilter] = useState<'ALL' | RescheduleRequestResponse['status']>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboardData, doctorsData, usersData, symptomsData, specializationsData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getDoctors(),
        adminApi.getUsers(),
        adminApi.getSymptoms(),
        adminApi.getSpecializations(),
      ]);
      setDashboard(dashboardData);
      setDoctors(doctorsData);
      setUsers(usersData);
      setSymptoms(symptomsData);
      setSpecializations(specializationsData);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить данные администратора';
      toast.error(message || 'Не удалось загрузить данные администратора');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const loadAdminAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const appointments = await adminApi.getAppointments();
      setAdminAppointments(appointments);

      // Load reviews for completed appointments
      const reviewsMap: Record<number, ReviewResponse> = {};
      const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
      await Promise.all(
          completedAppointments.map(async (app) => {
            try {
              const review = await adminApi.getReviewByAppointment(app.id);
              if (review) {
                reviewsMap[app.id] = review;
              }
            } catch {
              // Ignore errors for appointments without reviews
            }
          })
      );
      setAppointmentReviews(reviewsMap);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить записи';
      toast.error(message || 'Не удалось загрузить записи');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const data = await adminApi.getPatients();
      setPatients(data);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить пациентов';
      toast.error(message || 'Не удалось загрузить пациентов');
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadPatientDetails = async (patientId: number) => {
    try {
      const [patientData, appointments, records] = await Promise.all([
        adminApi.getPatientById(patientId),
        adminApi.getPatientAppointments(patientId),
        adminApi.getPatientMedicalRecords(patientId),
      ]);
      setSelectedPatient(patientData as unknown as PatientResponse);
      setSelectedPatientAppointments(appointments);
      setSelectedPatientRecords(records as unknown as MedicalRecordResponse[]);
      setPatientActiveTab('info');
      setShowPatientModal(true);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить данные пациента';
      toast.error(message || 'Не удалось загрузить данные пациента');
    }
  };

  useEffect(() => {
    if (tab === 'appointments') {
      void loadAdminAppointments();
    }
    if (tab === 'patients') {
      void loadPatients();
    }
    if (tab === 'rescheduleRequests') {
      void loadRescheduleRequests();
    }
  }, [tab]);

  useEffect(() => {
    if (!rescheduleDoctorId) {
      setRescheduleSlots([]);
      return;
    }
    const fetchSchedule = async () => {
      try {
        const data = await adminApi.getDoctorSchedule(rescheduleDoctorId);
        setRescheduleSlots(data);
      } catch {
        setRescheduleSlots([]);
      }
    };
    void fetchSchedule();
  }, [rescheduleDoctorId]);

  const patchAdminAppointment = async (id: number, payload: Parameters<typeof adminApi.updateAppointmentStatus>[1]) => {
    try {
      await adminApi.updateAppointmentStatus(id, payload);
      toast.success('Сохранено');
      void loadAdminAppointments();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          toast.error('Доступ запрещен. Проверьте права администратора или перезайдите в систему.');
        } else {
          toast.error(error.response?.data?.message || 'Ошибка сохранения');
        }
      } else {
        toast.error('Произошла непредвиденная ошибка');
      }
      console.error('Update status error:', error);
    }
  };

  const submitAdminComplete = async () => {
    if (!completeFor) return;
    void patchAdminAppointment(completeFor.id, {
      status: 'COMPLETED',
      doctorNotes: completeForm.doctorNotes || null,
      diagnosis: completeForm.diagnosis || null,
      treatmentRecommendations: completeForm.treatmentRecommendations || null,
    });
    setCompleteFor(null);
    setCompleteForm({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  };

  const applyAdminReschedule = async (newSlotId: number) => {
    if (!rescheduleFor) return;
    try {
      await adminApi.rescheduleAppointment(rescheduleFor.id, newSlotId);
      toast.success('Запись перенесена');
      setRescheduleFor(null);
      setRescheduleDoctorId(null);
      void loadAdminAppointments();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось перенести';
      toast.error(message || 'Не удалось перенести');
    }
  };

  const loadRescheduleRequests = async () => {
    setLoadingRescheduleRequests(true);
    try {
      const data = await adminApi.getRescheduleRequests('all');
      setRescheduleRequests(data);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить запросы';
      toast.error(message || 'Не удалось загрузить запросы');
    } finally {
      setLoadingRescheduleRequests(false);
    }
  };

  const approveRescheduleRequest = async (requestId: number) => {
    try {
      await adminApi.approveRescheduleRequest(requestId);
      toast.success('Запрос на перенос одобрен');
      void loadRescheduleRequests();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка одобрения';
      toast.error(message || 'Ошибка одобрения');
    }
  };

  const rejectRescheduleRequest = async (requestId: number) => {
    try {
      await adminApi.rejectRescheduleRequest(requestId, rejectComment || undefined);
      toast.success('Запрос на перенос отклонён');
      setRejectComment('');
      setRejectingRequestId(null);
      void loadRescheduleRequests();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка отклонения';
      toast.error(message || 'Ошибка отклонения');
    }
  };

  const saveSlot = async () => {
    if (!selectedScheduleDoctorId || !slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error('Заполните все поля слота');
      return;
    }
    try {
      if (editingSlotId) {
        await adminApi.updateDoctorSlot(editingSlotId, slotForm);
        toast.success('Слот обновлён');
      } else {
        await adminApi.createDoctorSlot(selectedScheduleDoctorId, slotForm);
        toast.success('Слот создан');
      }
      setSlotForm({ date: '', startTime: '', endTime: '', isBlocked: false });
      setEditingSlotId(null);
      setShowSlotForm(false);
      setScheduleIsAdding(false);
      setScheduleSelectedDateForAdd(null);
      if (selectedScheduleDoctorId) void loadSchedule(selectedScheduleDoctorId);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка сохранения слота';
      toast.error(message || 'Ошибка сохранения слота');
    }
  };

  const deleteSlot = async (slotId: number) => {
    if (!confirm('Удалить слот?')) return;
    try {
      await adminApi.deleteDoctorSlot(slotId);
      toast.success('Слот удалён');
      if (selectedScheduleDoctorId) void loadSchedule(selectedScheduleDoctorId);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка удаления слота';
      toast.error(message || 'Ошибка удаления слота');
    }
  };

  const avgRating = useMemo(() => {
    const ratedDoctors = doctors.filter(d => (d.rating ?? 0) > 0);
    if (ratedDoctors.length === 0) return 0;
    const sum = ratedDoctors.reduce((acc, d) => acc + (d.rating ?? 0), 0);
    return (sum / ratedDoctors.length).toFixed(1);
  }, [doctors]);

  const stats = useMemo(
      () => [
        { label: 'Всего пользователей', value: dashboard?.totalUsers ?? 0, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
        { label: 'Всего записей', value: dashboard?.totalAppointments ?? 0, icon: Calendar, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
        { label: 'Средний рейтинг', value: avgRating, icon: Star, color: 'text-amber-500', bg: 'bg-amber-100', suffix: '/5' },
        { label: 'Пациентов', value: dashboard?.totalPatients ?? 0, icon: Users, color: 'text-status-success', bg: 'bg-status-success/10' },
      ],
      [dashboard, avgRating]
  );

  // Filtered data
  const filteredDoctors = useMemo(() => {
    let filtered = doctors;
    if (doctorSearch.trim()) {
      const query = doctorSearch.toLowerCase();
      filtered = filtered.filter(d =>
          d.fullName?.toLowerCase()?.includes(query) ||
          d.email?.toLowerCase()?.includes(query) ||
          d.phone?.toLowerCase()?.includes(query) ||
          d.specializationName?.toLowerCase()?.includes(query)
      );
    }
    if (doctorMinRating > 0) {
      filtered = filtered.filter(d => (d.rating ?? 0) >= doctorMinRating);
    }
    return filtered;
  }, [doctors, doctorSearch, doctorMinRating]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const query = patientSearch.toLowerCase();
    return patients.filter(p =>
        p.fullName?.toLowerCase()?.includes(query) ||
        p.email?.toLowerCase()?.includes(query)
    );
  }, [patients, patientSearch]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (userSearch.trim()) {
      const query = userSearch.toLowerCase();
      filtered = filtered.filter(u =>
          u.fullName?.toLowerCase()?.includes(query) ||
          u.email?.toLowerCase()?.includes(query) ||
          u.phone?.toLowerCase()?.includes(query)
      );
    }
    if (userRoleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === userRoleFilter);
    }
    if (userBlockedFilter !== 'ALL') {
      filtered = filtered.filter(u => u.isBlocked === (userBlockedFilter === 'BLOCKED'));
    }
    return filtered;
  }, [users, userSearch, userRoleFilter, userBlockedFilter]);

  const filteredSpecializations = useMemo(() => {
    if (!specializationSearch.trim()) return specializations;
    const query = specializationSearch.toLowerCase();
    return specializations.filter(s =>
        s.name?.toLowerCase()?.includes(query) ||
        s.description?.toLowerCase()?.includes(query)
    );
  }, [specializations, specializationSearch]);

  const filteredSymptoms = useMemo(() => {
    let filtered = symptoms;
    if (symptomSearch.trim()) {
      const query = symptomSearch.toLowerCase();
      filtered = filtered.filter(s =>
          s.name?.toLowerCase()?.includes(query) ||
          s.description?.toLowerCase()?.includes(query)
      );
    }
    if (symptomUrgentFilter !== 'ALL') {
      filtered = filtered.filter(s => s.isUrgent === (symptomUrgentFilter === 'URGENT'));
    }
    return filtered;
  }, [symptoms, symptomSearch, symptomUrgentFilter]);

  const filteredAppointments = useMemo(() => {
    let filtered = adminAppointments;
    if (appointmentSearch.trim()) {
      const query = appointmentSearch.toLowerCase();
      filtered = filtered.filter(a =>
          a.patientName?.toLowerCase()?.includes(query) ||
          a.doctorName?.toLowerCase()?.includes(query) ||
          a.status?.toLowerCase()?.includes(query)
      );
    }
    if (appointmentStatusFilter) {
      filtered = filtered.filter(a => a.status === appointmentStatusFilter);
    }
    return filtered;
  }, [adminAppointments, appointmentSearch, appointmentStatusFilter]);

  const filteredScheduleDoctors = useMemo(() => {
    let filtered = doctors;
    if (scheduleSearch.trim()) {
      const query = scheduleSearch.toLowerCase();
      filtered = filtered.filter(d =>
          d.fullName?.toLowerCase()?.includes(query) ||
          d.specializationName?.toLowerCase()?.includes(query)
      );
    }
    if (scheduleMinRating > 0) {
      filtered = filtered.filter(d => (d.rating ?? 0) >= scheduleMinRating);
    }
    return filtered;
  }, [doctors, scheduleSearch, scheduleMinRating]);

  const sortedPatientRecordsForModal = useMemo(
      () =>
          [...selectedPatientRecords].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
      [selectedPatientRecords]
  );

  const filteredRescheduleRequests = useMemo(() => {
    let list = rescheduleRequests;
    if (rescheduleStatusFilter !== 'ALL') {
      list = list.filter((r) => r.status === rescheduleStatusFilter);
    }
    const q = rescheduleSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
          (r) =>
              r.patientName.toLowerCase().includes(q) ||
              r.doctorName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rescheduleRequests, rescheduleSearch, rescheduleStatusFilter]);


  const saveDoctor = async () => {
    if (!doctorForm.fullName || !doctorForm.email || !doctorForm.phone) {
      toast.error('Заполните ФИО, email и телефон');
      return;
    }
    try {
      if (editingDoctorId) {
        await adminApi.updateDoctor(editingDoctorId, doctorForm);
        toast.success('Врач обновлен');
      } else {
        await adminApi.createDoctor(doctorForm);
        toast.success('Врач добавлен');
      }
      setDoctorForm(emptyDoctorForm);
      setEditingDoctorId(null);
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка сохранения врача';
      toast.error(message || 'Ошибка сохранения врача');
    }
  };

  const startEditDoctor = (doctor: DoctorResponse) => {
    setEditingDoctorId(doctor.id);
    setDoctorForm({
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      specializationId: doctor.specializationId,
      description: doctor.description || '',
      experienceYears: doctor.experienceYears || 0,
      education: doctor.education || '',
    });
  };

  const removeDoctor = async (doctorId: number) => {
    try {
      await adminApi.deleteDoctor(doctorId);
      toast.success('Врач удален');
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось удалить врача';
      toast.error(message || 'Не удалось удалить врача');
    }
  };

  const startEditUser = (user: UserResponse) => {
    setEditingUserId(user.id);
    setUserForm({ fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl || '' });
    setUserAvatarInput(user.avatarUrl || '');
  };

  const saveUserAvatar = async () => {
    if (!editingUserId || !userAvatarInput.trim()) return;
    try {
      await adminApi.updateUserAvatar(editingUserId, userAvatarInput.trim());
      toast.success('Аватар обновлён');
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка обновления аватара';
      toast.error(message || 'Ошибка обновления аватара');
    }
  };

  const saveUser = async () => {
    if (!editingUserId) return;
    try {
      await adminApi.updateUser(editingUserId, userForm);
      toast.success('Пользователь обновлен');
      setEditingUserId(null);
      setUserForm({ fullName: '', email: '', phone: '', role: 'PATIENT' });
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка обновления пользователя';
      toast.error(message || 'Ошибка обновления пользователя');
    }
  };

  const toggleUserBlock = async (user: UserResponse) => {
    try {
      await adminApi.setUserBlocked(user.id, !user.isBlocked);
      toast.success(user.isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка изменения блокировки';
      toast.error(message || 'Ошибка изменения блокировки');
    }
  };

  const saveSymptom = async () => {
    if (!symptomForm.name.trim()) {
      toast.error('Введите название симптома');
      return;
    }
    try {
      if (editingSymptomId) {
        await adminApi.updateSymptom(editingSymptomId, symptomForm);
        toast.success('Симптом обновлен');
      } else {
        await adminApi.createSymptom(symptomForm);
        toast.success('Симптом добавлен');
      }
      setEditingSymptomId(null);
      setSymptomForm({ name: '', description: '', isUrgent: false });
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка сохранения симптома';
      toast.error(message || 'Ошибка сохранения симптома');
    }
  };

  const editSymptom = (symptom: SymptomResponse) => {
    setEditingSymptomId(symptom.id);
    setSymptomForm({ name: symptom.name, description: symptom.description || '', isUrgent: symptom.isUrgent });
  };

  const removeSymptom = async (symptomId: number) => {
    try {
      await adminApi.deleteSymptom(symptomId);
      toast.success('Симптом удален');
      void loadData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Ошибка удаления симптома';
      toast.error(message || 'Ошибка удаления симптома');
    }
  };

  const loadSpecializations = async () => {
    try {
      setSpecializations(await adminApi.getSpecializations());
    } catch {
      toast.error('Не удалось загрузить специализации');
    }
  };

  const loadSchedule = async (doctorId: number) => {
    try {
      setSelectedScheduleDoctorId(doctorId);
      setScheduleIsAdding(false);
      setScheduleSelectedDateForAdd(null);
      setScheduleContextDate('');
      setDoctorSchedule(await adminApi.getDoctorSchedule(doctorId));
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Не удалось загрузить расписание';
      toast.error(message || 'Не удалось загрузить расписание');
    }
  };

  useEffect(() => {
    if (!selectedScheduleDoctorId) return;
    const timer = setInterval(() => {
      loadSchedule(selectedScheduleDoctorId);
    }, 10000);
    return () => clearInterval(timer);
  }, [selectedScheduleDoctorId]);

  useEffect(() => {
    if (tab === 'specializations') {
      void loadSpecializations();
      void adminApi.getSymptoms().then(setSymptoms).catch(() => toast.error('Не удалось загрузить симптомы'));
    }
  }, [tab]);

  return (
      <div className="max-w-7xl mx-auto px-4 pb-20 pt-[110px] bg-brand-bg">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">
            Панель <span className="text-brand-primary">администратора</span>
          </h1>
          <p className="text-brand-primary mt-2 font-black uppercase tracking-widest text-[10px]">
            Управление данными пользователей, врачей и записей
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
              <div key={i} className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm mb-4`}>
                  <stat.icon size={28} />
                </div>
                <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-brand-secondary dark:text-gray-100">
                  {stat.value}{(stat as {suffix?: string}).suffix ? <span className="text-lg text-brand-primary dark:text-gray-400 ml-1">{(stat as {suffix?: string}).suffix}</span> : null}
                </p>
              </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'doctors', label: 'Врачи' },
            { id: 'patients', label: 'Пациенты' },
            { id: 'users', label: 'Пользователи' },
            { id: 'specializations', label: 'Специализации' },
            { id: 'symptoms', label: 'Симптомы' },
            { id: 'schedule', label: 'Расписание врачей' },
            { id: 'rescheduleRequests', label: 'Запросы на перенос' },
            { id: 'appointments', label: 'Записи пациентов' },
            { id: 'statistics', label: 'Статистика и отчёты' },
            { id: 'messages', label: 'Сообщения' },
            { id: 'system', label: 'Система' },
            { id: 'profile', label: 'Профиль' },
          ].map((item) => (
              <button
                  key={item.id}
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-colors ${
                      tab === item.id ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white dark:bg-gray-800 text-brand-secondary dark:text-gray-200 border-brand-soft dark:border-slate-600'
                  }`}
              >
                {item.label}
              </button>
          ))}
        </div>

        {tab === 'doctors' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Добавить / изменить врача</h3>
            <div className="space-y-3">
              <input placeholder="ФИО" value={doctorForm.fullName} onChange={(e) => setDoctorForm((s) => ({ ...s, fullName: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <input placeholder="Email" value={doctorForm.email} onChange={(e) => setDoctorForm((s) => ({ ...s, email: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <input placeholder="Телефон" value={doctorForm.phone} onChange={(e) => setDoctorForm((s) => ({ ...s, phone: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <select value={doctorForm.specializationId ?? ''} onChange={(e) => setDoctorForm((s) => ({ ...s, specializationId: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary">
                <option value="">Без специализации</option>
                {specializations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="Стаж (лет)" type="number" value={doctorForm.experienceYears} onChange={(e) => setDoctorForm((s) => ({ ...s, experienceYears: Number(e.target.value) }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <input placeholder="Образование" value={doctorForm.education} onChange={(e) => setDoctorForm((s) => ({ ...s, education: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <textarea placeholder="Описание" value={doctorForm.description} onChange={(e) => setDoctorForm((s) => ({ ...s, description: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-28" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveDoctor} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-secondary text-white font-black">
                {editingDoctorId ? <Save size={18} /> : <Plus size={18} />}
                {editingDoctorId ? 'Обновить врача' : 'Добавить врача'}
              </button>
              {editingDoctorId && (
                  <button
                      onClick={() => { setDoctorForm(emptyDoctorForm); setEditingDoctorId(null); }}
                      className="px-5 py-3 rounded-2xl border-2 border-brand-soft text-brand-secondary font-black"
                  >
                    Отмена
                  </button>
              )}
            </div>
          </section>

          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Список врачей из БД</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
              <input
                  type="text"
                  placeholder="Поиск по имени, email, телефону..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-brand-soft font-bold text-brand-secondary"
              />
              {doctorSearch && (
                  <button onClick={() => setDoctorSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                    <X size={18} />
                  </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-black text-brand-primary uppercase">Рейтинг от {doctorMinRating.toFixed(1)}</span>
              <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={doctorMinRating}
                  onChange={(e) => setDoctorMinRating(Number(e.target.value))}
                  className="flex-1 accent-brand-secondary"
              />
              <button onClick={() => setDoctorMinRating(0)} className="text-xs font-black text-brand-primary hover:text-brand-secondary">
                Сбросить
              </button>
            </div>
            {isLoading ? (
                <p className="text-brand-primary font-bold">Загрузка...</p>
            ) : filteredDoctors.length === 0 ? (
                <p className="text-brand-primary font-bold">{doctorSearch ? 'Врачи не найдены.' : 'Список врачей пуст.'}</p>
            ) : (
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {filteredDoctors.map((doctor) => (
                      <div key={doctor.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-black text-brand-secondary">{doctor.fullName}</p>
                            <p className="text-xs font-black text-brand-primary uppercase tracking-wider">{doctor.email}</p>
                          </div>
                          {doctor.totalRatings > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-black text-yellow-600 dark:text-yellow-300">{doctor.rating.toFixed(1)}</span>
                                <span className="text-[10px] text-yellow-500 dark:text-yellow-400">({doctor.totalRatings})</span>
                              </div>
                          )}
                        </div>
                        <p className="text-xs font-bold text-brand-secondary mt-1">{doctor.phone} {doctor.specializationName ? `• ${doctor.specializationName}` : ''}</p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => startEditDoctor(doctor)} className="px-3 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs">
                            Изменить
                          </button>
                          <button onClick={() => removeDoctor(doctor.id)} className="px-3 py-2 rounded-xl border-2 border-status-error text-status-error font-black text-xs flex items-center gap-1">
                            <Trash2 size={14} />
                            Удалить
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </section>
        </div>}

        {tab === 'patients' && (
            <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-black text-brand-secondary">Пациенты</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                  <input
                      type="text"
                      placeholder="Поиск по ФИО..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
                  />
                  {patientSearch && (
                      <button onClick={() => setPatientSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                        <X size={14} />
                      </button>
                  )}
                </div>
                <div className="text-sm font-bold text-brand-primary flex items-center">
                  Найдено: {filteredPatients.length} пациентов
                </div>
              </div>
              {loadingPatients ? (
                  <p className="font-bold text-brand-primary">Загрузка...</p>
              ) : filteredPatients.length === 0 ? (
                  <p className="font-bold text-brand-primary">{patientSearch ? 'Пациенты не найдены.' : 'Пациентов нет.'}</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPatients.map((patient) => (
                        <button
                            key={patient.id}
                            onClick={() => loadPatientDetails(patient.id)}
                            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-5 text-left hover:border-brand-secondary transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-brand-secondary flex items-center justify-center shrink-0 overflow-hidden">
                              {patient.avatarUrl ? (
                                  <img src={patient.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                  <Users size={24} className="text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-black text-brand-secondary">{patient.fullName}</p>
                              <p className="text-xs font-bold text-brand-primary mt-1">{patient.email}</p>
                              {patient.phone && <p className="text-xs text-brand-primary mt-1">{patient.phone}</p>}
                            </div>
                          </div>
                        </button>
                    ))}
                  </div>
              )}
            </section>
        )}

        {tab === 'users' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Редактирование пользователя</h3>
            {editingUserId ? (
                <div className="space-y-3">
                  {/* Аватар пользователя */}
                  <div className="flex items-center gap-4 mb-4 p-4 bg-brand-soft/20 rounded-xl">
                    <div className="w-16 h-16 rounded-xl bg-brand-secondary text-white flex items-center justify-center text-xl font-black border-2 border-brand-soft overflow-hidden">
                      {userForm.avatarUrl ? (
                        <img src={userForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        userForm.fullName?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-wider text-brand-secondary/60 mb-2">Ссылка на аватар</p>
                      <div className="flex gap-2">
                        <input
                          value={userAvatarInput}
                          onChange={(e) => setUserAvatarInput(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="flex-1 rounded-xl border-2 border-brand-soft px-3 py-2 font-bold text-brand-secondary text-sm"
                        />
                        <button
                          onClick={saveUserAvatar}
                          disabled={!userAvatarInput.trim()}
                          className="px-3 py-2 rounded-xl bg-brand-primary text-white font-black text-xs disabled:opacity-50"
                        >
                          Обновить
                        </button>
                      </div>
                    </div>
                  </div>
                  <input value={userForm.fullName} onChange={(e) => setUserForm((s) => ({ ...s, fullName: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="ФИО" />
                  <input value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Email" />
                  <input value={userForm.phone} onChange={(e) => setUserForm((s) => ({ ...s, phone: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Телефон" />
                  <select value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value as 'PATIENT' | 'DOCTOR' | 'ADMIN' }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary">
                    <option value="PATIENT">PATIENT</option>
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <div className="flex gap-3">
                    <button onClick={saveUser} className="px-5 py-3 rounded-xl bg-brand-secondary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <Save size={16} /> Сохранить
                    </button>
                    <button
                        onClick={() => { setUserForm({ fullName: '', email: '', phone: '', role: 'PATIENT', avatarUrl: '' }); setUserAvatarInput(''); setEditingUserId(null); }}
                        className="px-5 py-3 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs uppercase tracking-widest"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
            ) : <p className="font-bold text-brand-primary">Выберите пользователя справа для редактирования.</p>}
          </section>
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Все пользователи</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
              <input
                  type="text"
                  placeholder="Поиск по имени, email, роли..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-brand-soft font-bold text-brand-secondary"
              />
              {userSearch && (
                  <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                    <X size={18} />
                  </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
              >
                <option value="ALL">Все роли</option>
                <option value="PATIENT">Пациент</option>
                <option value="DOCTOR">Врач</option>
                <option value="ADMIN">Админ</option>
              </select>
              <select
                  value={userBlockedFilter}
                  onChange={(e) => setUserBlockedFilter(e.target.value as typeof userBlockedFilter)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
              >
                <option value="ALL">Все статусы</option>
                <option value="ACTIVE">Активные</option>
                <option value="BLOCKED">Заблокированные</option>
              </select>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4">
                    <p className="font-black text-brand-secondary">{user.fullName}</p>
                    <p className="text-xs font-black text-brand-primary uppercase tracking-wider">{user.email}</p>
                    <p className="text-xs font-bold text-brand-secondary mt-1">{user.role}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => startEditUser(user)} className="px-3 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs flex items-center gap-1">
                        <UserCog size={14} /> Изменить
                      </button>
                      <button onClick={() => toggleUserBlock(user)} className={`px-3 py-2 rounded-xl border-2 font-black text-xs flex items-center gap-1 ${user.isBlocked ? 'border-status-success text-status-success' : 'border-status-error text-status-error'}`}>
                        {user.isBlocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                        {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </section>
        </div>}

        {tab === 'symptoms' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Добавить / изменить симптом</h3>
            <div className="space-y-3">
              <input value={symptomForm.name} onChange={(e) => setSymptomForm((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Название симптома" />
              <textarea value={symptomForm.description} onChange={(e) => setSymptomForm((s) => ({ ...s, description: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-24" placeholder="Описание" />
              <label className="inline-flex items-center gap-2 font-bold text-brand-secondary">
                <input type="checkbox" checked={symptomForm.isUrgent} onChange={(e) => setSymptomForm((s) => ({ ...s, isUrgent: e.target.checked }))} />
                Критический симптом
              </label>
              <div className="flex gap-3">
                <button onClick={saveSymptom} className="px-5 py-3 rounded-xl bg-brand-secondary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  {editingSymptomId ? <Save size={16} /> : <Plus size={16} />} {editingSymptomId ? 'Сохранить' : 'Добавить'}
                </button>
                {editingSymptomId && (
                    <button
                        onClick={() => { setSymptomForm({ name: '', description: '', isUrgent: false }); setEditingSymptomId(null); }}
                        className="px-5 py-3 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs uppercase tracking-widest"
                    >
                      Отмена
                    </button>
                )}
              </div>
            </div>
          </section>
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Список симптомов</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
              <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-brand-soft font-bold text-brand-secondary"
              />
              {symptomSearch && (
                  <button onClick={() => setSymptomSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                    <X size={18} />
                  </button>
              )}
            </div>
            <div className="mb-4">
              <select
                  value={symptomUrgentFilter}
                  onChange={(e) => setSymptomUrgentFilter(e.target.value as typeof symptomUrgentFilter)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
              >
                <option value="ALL">Все симптомы</option>
                <option value="URGENT">Только критические</option>
                <option value="NON_URGENT">Только некритические</option>
              </select>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {filteredSymptoms.map((symptom) => (
                  <div key={symptom.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4">
                    <p className="font-black text-brand-secondary">{symptom.name}</p>
                    <p className="text-xs font-bold text-brand-primary mt-1">{symptom.description}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => editSymptom(symptom)} className="px-3 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs">Изменить</button>
                      <button onClick={() => removeSymptom(symptom.id)} className="px-3 py-2 rounded-xl border-2 border-status-error text-status-error font-black text-xs flex items-center gap-1"><Trash2 size={14} />Удалить</button>
                    </div>
                  </div>
              ))}
            </div>
          </section>
        </div>}

        {tab === 'specializations' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">{editingSpecializationId ? 'Изменить' : 'Добавить'} специализацию</h3>
            <div className="space-y-3">
              <input placeholder="Название" value={specializationForm.name} onChange={(e) => setSpecializationForm((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" />
              <textarea placeholder="Описание" value={specializationForm.description} onChange={(e) => setSpecializationForm((s) => ({ ...s, description: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-20" />
              <p className="text-sm font-black text-brand-primary uppercase tracking-wider">Связанные симптомы:</p>
              <div className="max-h-48 overflow-y-auto border-2 border-brand-soft rounded-xl p-3 space-y-2">
                {symptoms.map((symptom) => {
                  const existing = specializationForm.symptoms.find((s) => s.symptomId === symptom.id);
                  return (
                      <div key={symptom.id} className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={!!existing}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSpecializationForm((s) => ({ ...s, symptoms: [...s.symptoms, { symptomId: symptom.id, weight: 1 }] }));
                              } else {
                                setSpecializationForm((s) => ({ ...s, symptoms: s.symptoms.filter((x) => x.symptomId !== symptom.id) }));
                              }
                            }}
                            className="w-5 h-5 rounded border-2 border-brand-soft"
                        />
                        <span className="flex-1 font-bold text-brand-secondary">{symptom.name}</span>
                        {existing && (
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={existing.weight}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(10, Number(e.target.value)));
                                  setSpecializationForm((s) => ({
                                    ...s,
                                    symptoms: s.symptoms.map((x) => (x.symptomId === symptom.id ? { ...x, weight: val } : x)),
                                  }));
                                }}
                                className="w-20 rounded-xl border-2 border-brand-soft px-2 py-1 font-bold text-brand-secondary text-sm"
                            />
                        )}
                      </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                  onClick={async () => {
                    if (editingSpecializationId) {
                      await adminApi.updateSpecialization(editingSpecializationId, specializationForm);
                      toast.success('Специализация обновлена');
                    } else {
                      await adminApi.createSpecialization(specializationForm);
                      toast.success('Специализация создана');
                    }
                    setSpecializationForm({ name: '', description: '', symptoms: [] });
                    setEditingSpecializationId(null);
                    loadSpecializations();
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-secondary text-white font-black"
              >
                {editingSpecializationId ? <Save size={18} /> : <Plus size={18} />}
                {editingSpecializationId ? 'Обновить' : 'Добавить'}
              </button>
              {editingSpecializationId && (
                  <button
                      onClick={() => { setSpecializationForm({ name: '', description: '', symptoms: [] }); setEditingSpecializationId(null); }}
                      className="px-5 py-3 rounded-2xl border-2 border-brand-soft text-brand-secondary font-black"
                  >
                    Отмена
                  </button>
              )}
            </div>
          </section>

          <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
            <h3 className="text-2xl font-black text-brand-secondary mb-6">Список специализаций</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
              <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={specializationSearch}
                  onChange={(e) => setSpecializationSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-brand-soft font-bold text-brand-secondary"
              />
              {specializationSearch && (
                  <button onClick={() => setSpecializationSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                    <X size={18} />
                  </button>
              )}
            </div>
            {isLoading ? (
                <p className="text-brand-primary font-bold">Загрузка...</p>
            ) : filteredSpecializations.length === 0 ? (
                <p className="text-brand-primary font-bold">{specializationSearch ? 'Специализации не найдены.' : 'Нет специализаций.'}</p>
            ) : (
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {filteredSpecializations.map((spec) => (
                      <div key={spec.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4">
                        <p className="font-black text-brand-secondary">{spec.name}</p>
                        <p className="text-xs font-bold text-brand-primary mt-1">{spec.description || '—'}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                              onClick={async () => {
                                const detail = await adminApi.getSpecializationDetail(spec.id);
                                setSpecializationForm({
                                  name: detail.name,
                                  description: detail.description || '',
                                  symptoms: detail.symptoms.map((s) => ({ symptomId: s.symptomId, weight: s.weight })),
                                });
                                setEditingSpecializationId(spec.id);
                              }}
                              className="px-3 py-2 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-xs"
                          >
                            Изменить
                          </button>
                          <button
                              onClick={async () => {
                                if (!confirm('Удалить специализацию?')) return;
                                await adminApi.deleteSpecialization(spec.id);
                                toast.success('Удалено');
                                loadSpecializations();
                              }}
                              className="px-3 py-2 rounded-xl border-2 border-status-error text-status-error font-black text-xs flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Удалить
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </section>
        </div>}

        {tab === 'schedule' && (
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-brand-secondary mb-2">Расписание врачей</h1>
                <p className="text-brand-primary font-bold">Управление слотами для записи пациентов</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Doctors List */}
              <section className="premium-card p-6 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 lg:col-span-1">
                <h3 className="text-xl font-black text-brand-secondary dark:text-gray-100 mb-4">Выберите врача</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                  <input
                      type="text"
                      placeholder="Поиск врача..."
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 rounded-xl border-2 border-brand-soft dark:border-gray-600 font-bold text-sm text-brand-secondary dark:bg-gray-700 dark:text-gray-100"
                  />
                  {scheduleSearch && (
                      <button onClick={() => setScheduleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                        <X size={14} />
                      </button>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black text-brand-primary uppercase whitespace-nowrap">От {scheduleMinRating.toFixed(1)}</span>
                  <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={scheduleMinRating}
                      onChange={(e) => setScheduleMinRating(Number(e.target.value))}
                      className="flex-1 accent-brand-secondary cursor-pointer"
                  />
                  <button onClick={() => setScheduleMinRating(0)} className="text-xs font-black text-brand-primary hover:text-brand-secondary whitespace-nowrap">
                    Сбросить
                  </button>
                </div>
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {filteredScheduleDoctors.map((doctor) => (
                      <button 
                        key={doctor.id} 
                        onClick={() => {
                          loadSchedule(doctor.id);
                          setScheduleIsAdding(false);
                          setScheduleSelectedDateForAdd(null);
                        }} 
                        className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selectedScheduleDoctorId === doctor.id ? 'border-brand-secondary bg-brand-soft/40 dark:bg-brand-soft/20' : 'border-brand-soft bg-white dark:bg-gray-700 dark:border-gray-600 hover:bg-brand-soft/20'}`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-black text-brand-secondary dark:text-gray-100">{doctor.fullName}</p>
                          {doctor.totalRatings > 0 && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-black text-yellow-600 dark:text-yellow-400">{doctor.rating.toFixed(1)}</span>
                              </div>
                          )}
                        </div>
                        <p className="text-xs font-bold text-brand-primary mt-1 dark:text-gray-300">{doctor.specializationName || doctor.description || 'Врач'}</p>
                      </button>
                  ))}
                </div>
              </section>

              {/* Calendar Section */}
              <section className="lg:col-span-2">
                {!selectedScheduleDoctorId ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6">
                      <h3 className="text-2xl font-black text-brand-secondary dark:text-gray-100 mb-6">Календарь слотов врача</h3>
                      <p className="font-bold text-brand-primary dark:text-gray-300">Выберите врача слева.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                      {/* Add Slot Button */}
                      {!scheduleIsAdding && (
                          <div className="flex justify-end">
                            <button
                                onClick={() => {
                                  setScheduleIsAdding(true);
                                  setScheduleSelectedDateForAdd(null);
                                  setSlotForm({ date: '', startTime: '', endTime: '', isBlocked: false });
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary transition-all"
                            >
                              <Plus size={20} />
                              Добавить слот
                            </button>
                          </div>
                      )}

                      {/* Select Date Banner */}
                      {scheduleIsAdding && !scheduleSelectedDateForAdd && (
                          <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4">
                            <p className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                              <Calendar size={18} />
                              Выберите дату на календаре ниже
                            </p>
                          </div>
                      )}

                      {/* Slot Form */}
                      {scheduleIsAdding && scheduleSelectedDateForAdd && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-brand-soft dark:border-gray-700 animate-fade-up">
                            <div className="flex items-center gap-3 mb-4">
                              <Clock className="text-brand-primary" size={24} />
                              <h3 className="text-lg font-black text-brand-secondary dark:text-gray-100">
                                Добавить слот на {new Date(scheduleSelectedDateForAdd).toLocaleDateString('ru-RU')}
                              </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-black text-brand-primary mb-2 dark:text-gray-300">Время начала</label>
                                <input
                                    type="time"
                                    value={slotForm.startTime}
                                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value, date: scheduleSelectedDateForAdd })}
                                    className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-brand-primary outline-none font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-black text-brand-primary mb-2 dark:text-gray-300">Время окончания</label>
                                <input
                                    type="time"
                                    value={slotForm.endTime}
                                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-brand-primary outline-none font-bold"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button
                                  onClick={saveSlot}
                                  className="px-6 py-3 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary flex items-center gap-2"
                              >
                                <CheckCircle2 size={18} /> Создать слот
                              </button>
                              <button
                                  onClick={() => {
                                    setScheduleIsAdding(false);
                                    setScheduleSelectedDateForAdd(null);
                                    setSlotForm({ date: '', startTime: '', endTime: '', isBlocked: false });
                                  }}
                                  className="px-6 py-3 bg-brand-soft text-brand-secondary rounded-xl font-black hover:bg-brand-soft/80 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                      )}

                      <DoctorScheduleCalendar
                          slots={doctorSchedule}
                          selectedDate={scheduleContextDate}
                          onSelectDate={(date) => {
                            setScheduleContextDate(date);
                          }}
                          onDeleteSlot={deleteSlot}
                          isAdding={scheduleIsAdding}
                          selectedDateForAdd={scheduleSelectedDateForAdd}
                          onSelectDateForAdd={setScheduleSelectedDateForAdd}
                      />
                    </div>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === 'rescheduleRequests' && (
            <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-black text-brand-secondary">Запросы на перенос</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                  <input
                      type="text"
                      placeholder="Пациент или врач..."
                      value={rescheduleSearch}
                      onChange={(e) => setRescheduleSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
                  />
                </div>
                <select
                    value={rescheduleStatusFilter}
                    onChange={(e) => setRescheduleStatusFilter(e.target.value as typeof rescheduleStatusFilter)}
                    className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 font-black text-sm text-brand-secondary bg-white dark:bg-gray-800"
                >
                  <option value="ALL">Все статусы</option>
                  <option value="PENDING">Ожидает</option>
                  <option value="APPROVED">Одобрено</option>
                  <option value="REJECTED">Отклонено</option>
                </select>
              </div>

              {loadingRescheduleRequests ? (
                  <p className="font-bold text-brand-primary">Загрузка...</p>
              ) : filteredRescheduleRequests.length === 0 ? (
                  <p className="font-bold text-brand-primary">
                    {rescheduleRequests.length === 0 ? 'Нет запросов на перенос.' : 'Ничего не найдено по фильтрам.'}
                  </p>
              ) : (
                  <div className="space-y-4">
                    {filteredRescheduleRequests.map((req) => (
                        <div key={req.id} className="rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-5 bg-white dark:bg-gray-800/50">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                                    req.status === 'PENDING'
                                        ? 'bg-amber-100 text-amber-700'
                                        : req.status === 'APPROVED'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                }`}>
                                  {req.status === 'PENDING' ? 'Ожидает' : req.status === 'APPROVED' ? 'Одобрено' : 'Отклонено'}
                                </span>
                                <span className="text-xs text-brand-primary">
                                  {new Date(req.createdAt).toLocaleString('ru-RU')}
                                </span>
                              </div>
                              <p className="font-black text-brand-secondary">
                                {req.patientName} → {req.doctorName}
                              </p>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm font-bold text-brand-secondary">
                                <span className="inline-flex items-center gap-2">
                                  <Calendar size={14} className="text-brand-primary" />
                                  Сейчас: {req.currentDate} {formatTime(req.currentStartTime)}
                                </span>
                                <span className="inline-flex items-center gap-2 text-amber-600">
                                  <RefreshCw size={14} />
                                  На: {req.requestedDate} {formatTime(req.requestedStartTime)}
                                </span>
                              </div>
                              {req.adminComment && (
                                  <p className="mt-2 text-sm text-brand-primary">
                                    <span className="font-black">Комментарий администратора:</span> {req.adminComment}
                                  </p>
                              )}
                            </div>
                            {req.status === 'PENDING' && (
                                <div className="flex flex-wrap gap-2 shrink-0">
                                  <button
                                      onClick={() => approveRescheduleRequest(req.id)}
                                      className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm hover:bg-emerald-200 flex items-center gap-2"
                                  >
                                    <CheckCircle2 size={16} /> Одобрить
                                  </button>
                                  <button
                                      onClick={() => setRejectingRequestId(req.id)}
                                      className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-black text-sm hover:bg-red-200 flex items-center gap-2"
                                  >
                                    <X size={16} /> Отклонить
                                  </button>
                                </div>
                            )}
                          </div>

                          {rejectingRequestId === req.id && (
                              <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-900/20">
                                <label className="block text-xs font-black text-brand-primary uppercase mb-2">Причина отклонения</label>
                                <textarea
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    placeholder="Укажите причину..."
                                    className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-3 min-h-16"
                                />
                                <div className="flex gap-2">
                                  <button
                                      onClick={() => rejectRescheduleRequest(req.id)}
                                      className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-700"
                                  >
                                    Подтвердить отклонение
                                  </button>
                                  <button
                                      onClick={() => { setRejectingRequestId(null); setRejectComment(''); }}
                                      className="px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-sm"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                          )}
                        </div>
                    ))}
                  </div>
              )}
            </section>
        )}

        {tab === 'appointments' && (
            <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-black text-brand-secondary">Все записи</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                  <input
                      type="text"
                      placeholder="Поиск по пациенту, врачу..."
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
                  />
                  {appointmentSearch && (
                      <button onClick={() => setAppointmentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-secondary">
                        <X size={14} />
                      </button>
                  )}
                </div>
                <select
                    value={appointmentStatusFilter}
                    onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-brand-soft font-bold text-sm text-brand-secondary"
                >
                  <option value="">Все статусы</option>
                  <option value="SCHEDULED">Запланирован</option>
                  <option value="CONFIRMED">Подтверждён</option>
                  <option value="COMPLETED">Завершён</option>
                  <option value="CANCELLED">Отменён</option>
                  <option value="MISSED">Пропущен</option>
                  <option value="RESCHEDULED">Перенесён</option>
                </select>
                <div className="text-sm font-bold text-brand-primary flex items-center">
                  Найдено: {filteredAppointments.length} записей
                </div>
              </div>

              {loadingAppointments ? (
                  <p className="font-bold text-brand-primary">Загрузка...</p>
              ) : filteredAppointments.length === 0 ? (
                  <p className="font-bold text-brand-primary">{appointmentSearch || appointmentStatusFilter ? 'Записи не найдены.' : 'Записей нет.'}</p>
              ) : (
                  <div className="space-y-4 max-h-[640px] overflow-auto pr-1">
                    {filteredAppointments.map((app) => {
                      const review = appointmentReviews[app.id];
                      return (
                          <div key={app.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-5">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-black text-brand-secondary">
                                  {app.patientName} → {app.doctorName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs font-black text-brand-primary uppercase tracking-wider">
                                    {app.date} {formatTime(app.startTime)} — {formatTime(app.endTime)}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusConfig[app.status].lightClass} ${statusConfig[app.status].darkClass}`}>
                                  {statusConfig[app.status].label}
                                </span>
                                </div>
                                {app.reportedSymptoms && app.reportedSymptoms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {app.reportedSymptoms.map((s) => (
                                          <span key={s.id} className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-brand-soft/50 text-brand-secondary dark:bg-gray-700 dark:text-gray-200">
                                            {s.name}
                                          </span>
                                      ))}
                                    </div>
                                )}
                                {app.status === 'COMPLETED' && (app.diagnosis || app.doctorNotes || app.treatmentRecommendations) && (
                                    <button
                                        onClick={() => setSelectedAppointment(app)}
                                        className="mt-3 text-xs font-black text-brand-secondary flex items-center gap-1 underline decoration-dotted bg-transparent border-0 p-0 hover:text-brand-primary"
                                    >
                                      <FileText size={12} />
                                      Детали приёма
                                    </button>
                                )}
                              </div>

                              {/* Review Section - Right Side */}
                              {app.status === 'COMPLETED' ? (
                                  review ? (
                                      <div className="shrink-0 min-w-[140px]">
                                        <div className="flex items-center gap-1 mb-2">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                  key={star}
                                                  size={14}
                                                  strokeWidth={0}
                                                  className={star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
                                              />
                                          ))}
                                        </div>
                                        <button
                                            onClick={() => setSelectedReview(review)}
                                            className="text-xs font-black text-brand-secondary hover:text-brand-primary flex items-center gap-1 underline decoration-dotted bg-transparent border-0 p-0"
                                        >
                                          <MessageSquare size={12} />
                                          Читать отзыв
                                        </button>
                                      </div>
                                  ) : (
                                      <div className="text-center">
                                        <MessageSquare size={20} className="mx-auto text-brand-soft mb-1" />
                                        <p className="text-xs font-bold text-brand-primary">Отзыв не оставлен</p>
                                      </div>
                                  )
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                              <select
                                  value={app.status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as AppointmentResponse['status'];
                                    if (newStatus === 'CANCELLED') {
                                      patchAdminAppointment(app.id, { status: newStatus, cancelReason: 'Отменено администратором' });
                                    } else {
                                      patchAdminAppointment(app.id, { status: newStatus });
                                    }
                                  }}
                                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-white border-brand-soft focus:border-brand-primary outline-none cursor-pointer"
                              >
                                <option value="SCHEDULED">Запланировано</option>
                                <option value="CONFIRMED">Подтверждено</option>
                                <option value="COMPLETED">Завершено</option>
                                <option value="CANCELLED">Отменено</option>
                                <option value="MISSED">Пропущено</option>
                              </select>
                              <button
                                  type="button"
                                  onClick={() => {
                                    setRescheduleFor(app);
                                    setRescheduleDoctorId(app.doctorId);
                                  }}
                                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-brand-primary/10 text-brand-secondary border-brand-primary/30 hover:bg-brand-primary/20"
                              >
                                Перенести
                              </button>
                              <button
                                  type="button"
                                  onClick={() => {
                                    setCompleteFor(app);
                                    setCompleteForm({ doctorNotes: app.doctorNotes || '', diagnosis: app.diagnosis || '', treatmentRecommendations: app.treatmentRecommendations || '' });
                                  }}
                                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-status-success/10 text-status-success border-status-success/30 hover:bg-status-success/20"
                              >
                                Завершить с деталями
                              </button>
                            </div>
                          </div>
                      );
                    })}
                  </div>
              )}
            </section>
        )}

        {completeFor && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setCompleteFor(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-lg w-full shadow-2xl">
                <h4 className="text-lg font-black text-brand-secondary mb-4">Завершить: {completeFor.patientName}</h4>
                <label className="block text-xs font-black text-brand-primary uppercase mb-1">Показания</label>
                <textarea value={completeForm.doctorNotes} onChange={(e) => setCompleteForm((s) => ({ ...s, doctorNotes: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-3 min-h-20" />
                <label className="block text-xs font-black text-brand-primary uppercase mb-1">Диагноз</label>
                <textarea value={completeForm.diagnosis} onChange={(e) => setCompleteForm((s) => ({ ...s, diagnosis: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-3 min-h-16" />
                <label className="block text-xs font-black text-brand-primary uppercase mb-1">Рекомендации</label>
                <textarea value={completeForm.treatmentRecommendations} onChange={(e) => setCompleteForm((s) => ({ ...s, treatmentRecommendations: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 text-sm mb-4 min-h-20" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCompleteFor(null)} className="px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-xs">
                    Отмена
                  </button>
                  <button type="button" onClick={() => submitAdminComplete()} className="px-4 py-2 rounded-xl bg-brand-secondary text-white font-black text-xs">
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
        )}

        {rescheduleFor && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { setRescheduleFor(null); setRescheduleDoctorId(null); }} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <h4 className="text-lg font-black text-brand-secondary mb-2">Перенос</h4>
                <p className="text-xs font-bold text-brand-primary mb-3">{rescheduleFor.patientName}</p>
                <label className="text-xs font-black uppercase text-brand-primary mb-1">Врач (расписание)</label>
                <select
                    value={rescheduleDoctorId ?? ''}
                    onChange={(e) => setRescheduleDoctorId(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-xl border-2 border-brand-soft px-3 py-2 font-bold mb-4"
                >
                  {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                      </option>
                  ))}
                </select>
                <div className="flex-1 overflow-auto space-y-2">
                  {rescheduleSlots
                      .filter((s) => !s.isBooked && !s.isBlocked)
                      .map((s) => (
                          <button
                              key={s.id}
                              type="button"
                              onClick={() => applyAdminReschedule(s.id)}
                              className="w-full text-left rounded-xl border-2 border-brand-soft p-3 font-bold text-sm hover:bg-brand-soft/40"
                          >
                            {s.date} {formatTime(s.startTime)} — {formatTime(s.endTime)}
                          </button>
                      ))}
                </div>
                <button type="button" onClick={() => { setRescheduleFor(null); setRescheduleDoctorId(null); }} className="mt-4 px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-xs w-full">
                  Закрыть
                </button>
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

        {/* Appointment Details Modal */}
        {selectedAppointment && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop с размытием */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAppointment(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 p-6 max-w-lg w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-black text-brand-secondary">Детали приёма</h4>
                  <button
                      onClick={() => setSelectedAppointment(null)}
                      className="p-2 rounded-xl border-2 border-brand-soft text-brand-secondary hover:bg-brand-soft/20"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black text-brand-primary uppercase">Пациент / Врач</p>
                    <p className="font-bold text-brand-secondary">{selectedAppointment.patientName} → {selectedAppointment.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-brand-primary uppercase">Дата и время</p>
                    <p className="font-bold text-brand-secondary">{selectedAppointment.date} {formatTime(selectedAppointment.startTime)} — {formatTime(selectedAppointment.endTime)}</p>
                  </div>
                  {selectedAppointment.reportedSymptoms && selectedAppointment.reportedSymptoms.length > 0 && (
                      <div className="rounded-xl bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 p-3">
                        <p className="text-xs font-black text-brand-primary uppercase mb-1">Симптомы при записи</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedAppointment.reportedSymptoms.map((s) => (
                              <span key={s.id} className="px-2 py-0.5 rounded-lg text-xs font-black bg-brand-soft/50 text-brand-secondary dark:bg-gray-700 dark:text-gray-200">
                                {s.name}
                              </span>
                          ))}
                        </div>
                      </div>
                  )}
                  {selectedAppointment.diagnosis && (
                      <div className="rounded-xl bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 p-3">
                        <p className="text-xs font-black text-brand-primary uppercase mb-1">Диагноз</p>
                        <p className="text-brand-secondary font-bold">{selectedAppointment.diagnosis}</p>
                      </div>
                  )}
                  {selectedAppointment.doctorNotes && (
                      <div className="rounded-xl bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 p-3">
                        <p className="text-xs font-black text-brand-primary uppercase mb-1">Заметки врача</p>
                        <p className="text-brand-secondary font-bold">{selectedAppointment.doctorNotes}</p>
                      </div>
                  )}
                  {selectedAppointment.treatmentRecommendations && (
                      <div className="rounded-xl bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 p-3">
                        <p className="text-xs font-black text-brand-primary uppercase mb-1">Рекомендации</p>
                        <p className="text-brand-secondary font-bold">{selectedAppointment.treatmentRecommendations}</p>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Patient Medical Card Modal */}
        {showPatientModal && selectedPatient && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowPatientModal(false); setSelectedPatientRecordIndex(null); }} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl my-auto">
                {/* Modal Header */}
                <div className="p-6 border-b border-brand-soft dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-brand-secondary">Карта пациента</h2>
                  <button
                      onClick={() => { setShowPatientModal(false); setSelectedPatientRecordIndex(null); }}
                      className="p-2 rounded-xl hover:bg-brand-soft/30 transition-colors"
                  >
                    <X size={24} className="text-brand-secondary" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Patient Header Info */}
                  <div className="p-6 bg-white dark:bg-gray-800/50 border-b border-brand-soft dark:border-gray-700">
                    <div className="flex items-start gap-6">
                      <div className="w-24 h-24 rounded-2xl bg-brand-secondary flex items-center justify-center shrink-0 overflow-hidden border-2 border-brand-soft dark:border-gray-600">
                        {selectedPatient.avatarUrl ? (
                            <img src={selectedPatient.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User size={48} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-brand-secondary">{selectedPatient.fullName}</h3>
                        <p className="text-brand-primary font-bold mt-1">
                          {selectedPatient.birthDate && `${formatDate(selectedPatient.birthDate)} (${calculateAge(selectedPatient.birthDate)} лет)`}
                        </p>
                        <p className="text-sm text-brand-primary mt-1">{selectedPatient.email}</p>
                        {selectedPatient.phone && <p className="text-sm text-brand-primary">{selectedPatient.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex border-b border-brand-soft dark:border-gray-700">
                    <button
                        onClick={() => { setPatientActiveTab('info'); setSelectedPatientRecordIndex(null); }}
                        className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${patientActiveTab === 'info' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                    >
                      Основная информация
                    </button>
                    <button
                        onClick={() => { setPatientActiveTab('appointments'); setSelectedPatientRecordIndex(null); }}
                        className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${patientActiveTab === 'appointments' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                    >
                      Приёмы ({selectedPatientAppointments.length})
                    </button>
                    <button
                        onClick={() => { setPatientActiveTab('records'); setSelectedPatientRecordIndex(null); }}
                        className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${patientActiveTab === 'records' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                    >
                      Медкарта ({selectedPatientRecords.length})
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {patientActiveTab === 'info' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                            <p className="text-xs font-black text-brand-primary uppercase">Рост</p>
                            <p className="text-xl font-black text-brand-secondary">{selectedPatient.heightCm ? `${selectedPatient.heightCm} см` : '—'}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                            <p className="text-xs font-black text-brand-primary uppercase">Вес</p>
                            <p className="text-xl font-black text-brand-secondary">{selectedPatient.weightKg ? `${selectedPatient.weightKg} кг` : '—'}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                            <p className="text-xs font-black text-brand-primary uppercase">Группа крови</p>
                            <p className="text-xl font-black text-brand-secondary">{selectedPatient.bloodType || '—'}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                            <p className="text-xs font-black text-brand-primary uppercase">ИМТ</p>
                            {selectedPatient.heightCm && selectedPatient.weightKg ? (
                                <p className="text-xl font-black text-brand-secondary">
                                  {(selectedPatient.weightKg / ((selectedPatient.heightCm / 100) ** 2)).toFixed(1)}
                                </p>
                            ) : (
                                <p className="text-xl font-black text-brand-secondary">—</p>
                            )}
                          </div>
                          {selectedPatient.allergies && (
                              <div className="col-span-2 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                                <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase">Аллергии</p>
                                <p className="text-brand-secondary font-bold mt-1">{selectedPatient.allergies}</p>
                              </div>
                          )}
                          {selectedPatient.chronicConditions && (
                              <div className="col-span-2 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                                <p className="text-xs font-black text-yellow-700 dark:text-yellow-400 uppercase">Хронические заболевания</p>
                                <p className="text-brand-secondary font-bold mt-1">{selectedPatient.chronicConditions}</p>
                              </div>
                          )}
                        </div>
                    )}

                    {patientActiveTab === 'appointments' && (
                        <div className="space-y-3">
                          {selectedPatientAppointments.length === 0 ? (
                              <p className="text-brand-primary font-bold text-center py-8">Приёмов пока нет</p>
                          ) : (
                              [...selectedPatientAppointments].sort((a, b) =>
                                  new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
                              ).map((apt) => (
                                  <div key={apt.id} className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-black text-brand-secondary">{formatDate(apt.date)} {formatTime(apt.startTime)}</p>
                                      <span className={`px-3 py-1 rounded-lg text-xs font-black shrink-0 ${statusConfig[apt.status].lightClass} ${statusConfig[apt.status].darkClass}`}>
                                        {statusConfig[apt.status].label}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs font-bold text-brand-primary">{apt.doctorName}</p>
                                    {apt.reportedSymptoms && apt.reportedSymptoms.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {apt.reportedSymptoms.map((s) => (
                                              <span key={s.id} className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-brand-soft/40 text-brand-secondary dark:bg-gray-700 dark:text-gray-200">
                                                {s.name}
                                              </span>
                                          ))}
                                        </div>
                                    )}
                                    {apt.diagnosis && (
                                        <p className="mt-2 text-sm"><span className="font-black text-brand-primary">Диагноз:</span> <span className="text-brand-secondary">{apt.diagnosis}</span></p>
                                    )}
                                  </div>
                              ))
                          )}
                        </div>
                    )}

                    {patientActiveTab === 'records' && (
                        <div>
                          {selectedPatientRecords.length === 0 ? (
                              <p className="text-brand-primary font-bold text-center py-8">Записей в медкарте пока нет</p>
                          ) : selectedPatientRecordIndex === null ? (
                              <div className="space-y-3">
                                {sortedPatientRecordsForModal.map((record, idx) => (
                                    <button
                                        key={record.id}
                                        onClick={() => setSelectedPatientRecordIndex(idx)}
                                        className="w-full bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4 text-left hover:bg-brand-soft/30 transition-colors"
                                    >
                                      <p className="font-black text-brand-secondary">{formatDate(record.createdAt)}</p>
                                      {record.diagnosis && <p className="text-sm text-brand-primary mt-1">{record.diagnosis}</p>}
                                    </button>
                                ))}
                              </div>
                          ) : (
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                  <button
                                      type="button"
                                      onClick={() => setSelectedPatientRecordIndex(null)}
                                      className="flex items-center gap-2 text-brand-primary hover:text-brand-secondary font-black"
                                  >
                                    <ChevronLeft size={20} /> К списку
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={selectedPatientRecordIndex <= 0}
                                        onClick={() => setSelectedPatientRecordIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                                        className="p-2 rounded-xl border-2 border-brand-soft disabled:opacity-40 text-brand-secondary"
                                        aria-label="Предыдущая запись"
                                    >
                                      <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-xs font-black text-brand-primary tabular-nums">
                                      {selectedPatientRecordIndex + 1} / {sortedPatientRecordsForModal.length}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={selectedPatientRecordIndex >= sortedPatientRecordsForModal.length - 1}
                                        onClick={() =>
                                            setSelectedPatientRecordIndex((i) =>
                                                i !== null && i < sortedPatientRecordsForModal.length - 1 ? i + 1 : i
                                            )
                                        }
                                        className="p-2 rounded-xl border-2 border-brand-soft disabled:opacity-40 text-brand-secondary"
                                        aria-label="Следующая запись"
                                    >
                                      <ChevronRight size={20} />
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-6">
                                  {(() => {
                                    const rec = sortedPatientRecordsForModal[selectedPatientRecordIndex];
                                    if (!rec) return null;
                                    return (
                                        <>
                                          <p className="text-sm font-black text-brand-primary mb-4">{formatDate(rec.createdAt)}</p>
                                          {rec.reportedSymptoms && rec.reportedSymptoms.length > 0 && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase mb-2">Симптомы</p>
                                                <div className="flex flex-wrap gap-1">
                                                  {rec.reportedSymptoms.map((s) => (
                                                      <span
                                                          key={s.id}
                                                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-brand-soft/40 text-brand-secondary dark:bg-gray-700 dark:text-gray-200"
                                                      >
                                                        {s.name}
                                                      </span>
                                                  ))}
                                                </div>
                                              </div>
                                          )}
                                          {rec.diagnosis && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase">Диагноз</p>
                                                <p className="text-brand-secondary font-bold">{rec.diagnosis}</p>
                                              </div>
                                          )}
                                          {rec.treatment && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase">Лечение / Рекомендации</p>
                                                <p className="text-brand-secondary font-bold">{rec.treatment}</p>
                                              </div>
                                          )}
                                          {rec.notes && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase">Заметки</p>
                                                <p className="text-brand-secondary font-bold">{rec.notes}</p>
                                              </div>
                                          )}
                                          {rec.complaints && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase">Жалобы</p>
                                                <p className="text-brand-secondary font-bold">{rec.complaints}</p>
                                              </div>
                                          )}
                                          {rec.examinationResults && (
                                              <div className="mb-4">
                                                <p className="text-xs font-black text-brand-primary uppercase">Результаты обследования</p>
                                                <p className="text-brand-secondary font-bold">{rec.examinationResults}</p>
                                              </div>
                                          )}
                                        </>
                                    );
                                  })()}
                                </div>
                              </div>
                          )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

        {tab === 'statistics' && <StatisticsSection />}

        {tab === 'messages' && <AdminMessagesSection />}

        {tab === 'system' && <AdminSystemSection />}

        {tab === 'profile' && <AdminProfileSection />}

        {showSlotForm && (
            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
              <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => { setShowSlotForm(false); setEditingSlotId(null); }}
              />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black text-brand-secondary dark:text-gray-100">
                    {editingSlotId ? 'Редактировать слот' : 'Новый слот'}
                  </h4>
                  <button
                      type="button"
                      onClick={() => { setShowSlotForm(false); setEditingSlotId(null); }}
                      className="p-2 rounded-xl hover:bg-brand-soft/30"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <input
                      type="date"
                      value={slotForm.date}
                      onChange={(e) => setSlotForm((s) => ({ ...s, date: e.target.value }))}
                      className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 font-bold text-sm text-brand-secondary"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                        type="time"
                        value={slotForm.startTime}
                        onChange={(e) => setSlotForm((s) => ({ ...s, startTime: e.target.value }))}
                        className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 font-bold text-sm text-brand-secondary"
                    />
                    <input
                        type="time"
                        value={slotForm.endTime}
                        onChange={(e) => setSlotForm((s) => ({ ...s, endTime: e.target.value }))}
                        className="w-full rounded-xl border-2 border-brand-soft px-3 py-2 font-bold text-sm text-brand-secondary"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                      type="checkbox"
                      checked={slotForm.isBlocked}
                      onChange={(e) => setSlotForm((s) => ({ ...s, isBlocked: e.target.checked }))}
                      className="w-4 h-4"
                  />
                  <span className="text-sm font-bold text-brand-secondary">Заблокировать слот</span>
                </label>
                <div className="flex gap-2">
                  <button
                      type="button"
                      onClick={saveSlot}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-secondary text-white font-black text-sm hover:bg-brand-primary flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> {editingSlotId ? 'Сохранить' : 'Создать'}
                  </button>
                  <button
                      type="button"
                      onClick={() => { setShowSlotForm(false); setEditingSlotId(null); }}
                      className="px-4 py-3 rounded-xl border-2 border-brand-soft text-brand-secondary font-black text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default AdminDashboard;

const groupSlotsByDate = (slots: SlotResponse[]) =>
    slots.reduce<Record<string, SlotResponse[]>>((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});

const DoctorScheduleCalendar = ({
  slots,
  selectedDate,
  onSelectDate,
  onDeleteSlot,
  isAdding,
  selectedDateForAdd,
  onSelectDateForAdd,
}: {
  slots: SlotResponse[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onDeleteSlot?: (slotId: number) => void;
  isAdding?: boolean;
  selectedDateForAdd?: string | null;
  onSelectDateForAdd?: (date: string) => void;
}) => {
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const grouped = groupSlotsByDate(slots);
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  
  const [viewDate, setViewDate] = useState(() => {
    const firstAvailableDate = dates[0] || selectedDate;
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
              <p className="font-black text-brand-secondary dark:text-gray-100">
                {isAdding && !selectedDateForAdd ? 'Выберите дату' : 'Дни приема'}
              </p>
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
                const isSelectedForAdd = isAdding && selectedDateForAdd === cell.value;
                const canSelectForAdd = isAdding && cell.value && !cell.isWeekend;
                const canViewSlots = !isAdding && cell.value && hasSlots;
                
                return (
                    <button
                        key={`${cell.value || 'empty'}-${index}`}
                        onClick={() => {
                          if (!cell.value) return;
                          if (canSelectForAdd && onSelectDateForAdd) {
                            onSelectDateForAdd(cell.value);
                          } else if (canViewSlots) {
                            onSelectDate(cell.value);
                          }
                        }}
                        disabled={!cell.value || (!canSelectForAdd && !canViewSlots)}
                        className={`h-10 rounded-xl text-xs font-black border transition-all ${
                            !cell.value
                                ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                                : isSelectedForAdd
                                    ? 'bg-brand-secondary text-white border-brand-secondary dark:bg-white dark:text-cyan-500 dark:border-white'
                                    : canSelectForAdd
                                        ? 'bg-brand-soft/20 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white cursor-pointer dark:bg-gray-700/40 dark:text-gray-200 dark:border-gray-600'
                                        : canViewSlots
                                            ? isActive
                                                ? 'bg-brand-secondary text-white border-brand-secondary dark:bg-white dark:text-cyan-500 dark:border-white'
                                                : cell.isWeekend
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
            <p className="font-black text-brand-secondary dark:text-gray-100 mb-4">
              {isAdding && selectedDateForAdd 
                ? `Существующие слоты (${selectedDateForAdd})` 
                : `Время приема ${selectedDate ? `(${selectedDate})` : ''}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const dateToShow = isAdding && selectedDateForAdd ? selectedDateForAdd : selectedDate;
                return (dateToShow && grouped[dateToShow] ? grouped[dateToShow] : []).map((slot) => (
                  <span key={slot.id} className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${slot.isBooked ? 'bg-status-error/10 text-status-error border-status-error/30 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50' : 'bg-status-success/10 text-status-success border-status-success/30 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50'}`}>
                    {formatTime(slot.startTime)}
                    {!slot.isBooked && onDeleteSlot && !isAdding && (
                      <button 
                        onClick={() => onDeleteSlot(slot.id)}
                        className="hover:text-red-500 transition-colors ml-1"
                        title="Удалить слот"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ));
              })()}
            </div>
            {(() => {
              const dateToShow = isAdding && selectedDateForAdd ? selectedDateForAdd : selectedDate;
              if (dateToShow && (!grouped[dateToShow] || grouped[dateToShow].length === 0)) {
                return <p className="font-bold text-brand-primary dark:text-gray-300">На выбранную дату слотов нет.</p>;
              }
              if (!dateToShow) {
                return <p className="font-bold text-brand-primary dark:text-gray-300">{isAdding ? 'Выберите дату для просмотра слотов' : 'Выберите дату для просмотра слотов.'}</p>;
              }
              return null;
            })()}
          </div>
        </div>
      </div>
  );
};