import { useEffect, useState } from 'react';
import { Search, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorApi } from '../../services/api';
import type { AppointmentResponse } from '../../services/api';

interface PatientDetail {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  avatarUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
}

interface MedicalRecord {
  id: number;
  date: string;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  createdAt: string;
  symptomsDescription?: string | null;
  reportedSymptoms?: { id: number; name: string }[];
}

interface PatientWithHistory {
  patient: PatientDetail;
  appointments: AppointmentResponse[];
  records: MedicalRecord[];
}

const DoctorPatientsPage = () => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<PatientDetail[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithHistory | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'appointments' | 'records'>('info');
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);

  const loadPatients = async () => {
    try {
      const data = await doctorApi.getMyPatients();
      setPatients(data as PatientDetail[]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить пациентов');
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatientHistory = async (patientId: number) => {
    try {
      const [patientData, appointments, records] = await Promise.all([
        doctorApi.getPatientById(patientId),
        doctorApi.getPatientAppointments(patientId),
        doctorApi.getPatientMedicalRecords(patientId)
      ]);
      setSelectedPatient({ patient: patientData as PatientDetail, appointments, records: records as unknown as MedicalRecord[] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить историю пациента');
    }
  };

  const filteredPatients = patients.filter(p =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU');
  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

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

  // Patient Modal Component
  const PatientModal = () => {
    if (!selectedPatient || !showPatientModal) return null;
    const { patient, appointments, records } = selectedPatient;
    const age = calculateAge(patient.birthDate);

    // Сортируем приёмы от давнего к недавнему
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Сортируем записи медкарты от давних к недавним
    const sortedRecords = [...records].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop с размытием */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => {
            setShowPatientModal(false);
            setSelectedRecordIndex(null);
          }} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-brand-soft dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-soft dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-black text-brand-secondary">Карта пациента</h2>
              <button
                  onClick={() => {
                    setShowPatientModal(false);
                    setSelectedRecordIndex(null);
                  }}
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
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-soft bg-brand-secondary dark:border-slate-600">
                    {patient.avatarUrl ? (
                        <img src={patient.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <User size={48} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-secondary">{patient.fullName}</h3>
                    <p className="text-brand-primary font-bold mt-1">
                      {patient.birthDate && `${formatDate(patient.birthDate)} (${age} лет)`}
                    </p>
                    <p className="text-sm text-brand-primary mt-1">{patient.email}</p>
                    {patient.phone && <p className="text-sm text-brand-primary">{patient.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-brand-soft dark:border-gray-700">
                <button
                    onClick={() => { setActiveTab('info'); setSelectedRecordIndex(null); }}
                    className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${activeTab === 'info' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                >
                  Основная информация
                </button>
                <button
                    onClick={() => { setActiveTab('appointments'); setSelectedRecordIndex(null); }}
                    className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${activeTab === 'appointments' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                >
                  Приёмы ({sortedAppointments.length})
                </button>
                <button
                    onClick={() => { setActiveTab('records'); setSelectedRecordIndex(records.length > 0 ? 0 : null); }}
                    className={`w-1/3 py-3 px-2 font-black text-sm transition-colors ${activeTab === 'records' ? 'bg-brand-secondary text-white' : 'text-brand-secondary dark:text-gray-200 hover:bg-brand-soft/30 dark:hover:bg-gray-700/40'}`}
                >
                  Медкарта ({sortedRecords.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'info' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase">Рост</p>
                        <p className="text-xl font-black text-brand-secondary">{patient.heightCm ? `${patient.heightCm} см` : '—'}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase">Вес</p>
                        <p className="text-xl font-black text-brand-secondary">{patient.weightKg ? `${patient.weightKg} кг` : '—'}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase">Группа крови</p>
                        <p className="text-xl font-black text-brand-secondary">{patient.bloodType || '—'}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs font-black text-brand-primary uppercase">ИМТ</p>
                        {patient.heightCm && patient.weightKg ? (
                            <p className="text-xl font-black text-brand-secondary">
                              {(patient.weightKg / ((patient.heightCm / 100) ** 2)).toFixed(1)}
                            </p>
                        ) : (
                            <p className="text-xl font-black text-brand-secondary">—</p>
                        )}
                      </div>
                      {patient.allergies && (
                          <div className="col-span-2 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                            <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase">Аллергии</p>
                            <p className="text-brand-secondary font-bold mt-1">{patient.allergies}</p>
                          </div>
                      )}
                      {patient.chronicConditions && (
                          <div className="col-span-2 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                            <p className="text-xs font-black text-yellow-700 dark:text-yellow-400 uppercase">Хронические заболевания</p>
                            <p className="text-brand-secondary font-bold mt-1">{patient.chronicConditions}</p>
                          </div>
                      )}
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-3">
                      {sortedAppointments.length === 0 ? (
                          <p className="text-brand-primary font-bold text-center py-8">Приёмов пока нет</p>
                      ) : (
                          sortedAppointments.map((apt) => (
                              <div key={apt.id} className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                  <p className="font-black text-brand-secondary">{formatDate(apt.date)} {formatTime(apt.startTime)}</p>
                                  <span
                                      className={`rounded-lg px-3 py-1 text-xs font-black ${
                                          apt.status === 'COMPLETED'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                              : apt.status === 'CANCELLED'
                                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                  : apt.status === 'CONFIRMED'
                                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                      : apt.status === 'SCHEDULED'
                                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                          : apt.status === 'RESCHEDULED'
                                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                              : apt.status === 'MISSED'
                                                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
                                                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                      }`}
                                  >
                            {apt.status === 'COMPLETED' ? 'Завершён' :
                                apt.status === 'CANCELLED' ? 'Отменён' :
                                    apt.status === 'CONFIRMED' ? 'Подтверждён' :
                                        apt.status === 'SCHEDULED' ? 'Запланирован' :
                                            apt.status === 'RESCHEDULED' ? 'Перенесён' :
                                                apt.status === 'MISSED' ? 'Пропущен' : apt.status}
                          </span>
                                </div>
                                {(apt.reportedSymptoms?.length ?? 0) > 0 && (
                                    <div className="mt-2">
                                      <p className="text-[10px] font-black uppercase text-brand-primary">Симптомы при записи</p>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {apt.reportedSymptoms!.map((s) => (
                                            <span key={s.id} className="rounded-lg border border-brand-soft bg-brand-soft/30 px-2 py-0.5 text-xs font-bold dark:border-slate-600 dark:bg-slate-700">
                                              {s.name}
                                            </span>
                                        ))}
                                      </div>
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

                {activeTab === 'records' && (
                    <div>
                      {sortedRecords.length === 0 ? (
                          <p className="text-brand-primary font-bold text-center py-8">Записей в медкарте пока нет</p>
                      ) : selectedRecordIndex === null ? (
                          <div className="space-y-3">
                            {sortedRecords.map((record, idx) => (
                                <button
                                    key={record.id}
                                    onClick={() => setSelectedRecordIndex(idx)}
                                    className="w-full bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-4 text-left hover:bg-brand-soft/30 transition-colors"
                                >
                                  <p className="font-black text-brand-secondary">{formatDate(record.date)}</p>
                                  {record.diagnosis && <p className="text-sm text-brand-primary mt-1">{record.diagnosis}</p>}
                                </button>
                            ))}
                          </div>
                      ) : (
                          <div>
                            <button
                                onClick={() => setSelectedRecordIndex(null)}
                                className="mb-4 flex items-center gap-2 text-brand-primary hover:text-brand-secondary font-black"
                            >
                              <ChevronLeft size={20} /> Назад к списку
                            </button>
                            <div className="bg-white dark:bg-gray-800/50 border-2 border-brand-soft dark:border-gray-700 rounded-xl p-6">
                              <p className="text-sm font-black text-brand-primary mb-4">{formatDate(sortedRecords[selectedRecordIndex].date)}</p>
                              {sortedRecords[selectedRecordIndex].diagnosis && (
                                  <div className="mb-4">
                                    <p className="text-xs font-black text-brand-primary uppercase">Диагноз</p>
                                    <p className="text-brand-secondary font-bold">{sortedRecords[selectedRecordIndex].diagnosis}</p>
                                  </div>
                              )}
                              {sortedRecords[selectedRecordIndex].treatment && (
                                  <div className="mb-4">
                                    <p className="text-xs font-black text-brand-primary uppercase">Лечение / Рекомендации</p>
                                    <p className="text-brand-secondary font-bold">{sortedRecords[selectedRecordIndex].treatment}</p>
                                  </div>
                              )}
                              {sortedRecords[selectedRecordIndex].notes && (
                                  <div>
                                    <p className="text-xs font-black text-brand-primary uppercase">Заметки</p>
                                    <p className="text-brand-secondary font-bold">{sortedRecords[selectedRecordIndex].notes}</p>
                                  </div>
                              )}
                              {(sortedRecords[selectedRecordIndex].reportedSymptoms?.length ?? 0) > 0 && (
                                  <div className="mb-4">
                                    <p className="text-xs font-black text-brand-primary uppercase">Симптомы при записи</p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {sortedRecords[selectedRecordIndex].reportedSymptoms!.map((s) => (
                                          <span key={s.id} className="rounded-lg border border-brand-soft bg-brand-soft/30 px-2 py-0.5 text-xs font-bold dark:border-slate-600 dark:bg-slate-700">
                                            {s.name}
                                          </span>
                                      ))}
                                    </div>
                                  </div>
                              )}
                            </div>
                            {/* Navigation Arrows */}
                            <div className="flex justify-between mt-4">
                              <button
                                  onClick={() => setSelectedRecordIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
                                  disabled={selectedRecordIndex === 0}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-soft text-brand-secondary font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-soft/80"
                              >
                                <ChevronLeft size={20} /> Предыдущая запись
                              </button>
                              <button
                                  onClick={() => setSelectedRecordIndex(prev => prev !== null && prev < sortedRecords.length - 1 ? prev + 1 : prev)}
                                  disabled={selectedRecordIndex === sortedRecords.length - 1}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-secondary text-white font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-primary"
                              >
                                Следующая запись <ChevronRight size={20} />
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
    );
  };

  return (
      <>
        <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-brand-secondary mb-2">Мои пациенты</h1>
              <p className="text-brand-primary font-bold">История приёмов и медицинские карты</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border-2 border-brand-soft">
              <Search size={20} className="text-brand-primary" />
              <input
                  type="text"
                  placeholder="Поиск по ФИО или email..."
                  className="bg-transparent border-none focus:ring-0 text-sm w-64 placeholder:text-brand-secondary/40 font-bold text-brand-secondary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
                <button
                    key={patient.id}
                    onClick={() => {
                      loadPatientHistory(patient.id);
                      setShowPatientModal(true);
                    }}
                    className="bg-white rounded-2xl border-2 border-brand-soft p-5 text-left hover:border-brand-secondary transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-brand-soft bg-brand-soft dark:border-slate-600">
                      {patient.avatarUrl ? (
                          <img src={patient.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                          <User size={24} className="text-brand-secondary" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-brand-secondary">{patient.fullName}</p>
                      <p className="text-xs font-bold text-brand-primary mt-1">{patient.email}</p>
                      {patient.phone && (
                          <p className="text-xs text-brand-primary mt-1">{patient.phone}</p>
                      )}
                    </div>
                  </div>
                </button>
            ))}
          </div>

          {filteredPatients.length === 0 && (
              <p className="text-center text-brand-primary font-bold mt-8">Пациенты не найдены</p>
          )}
        </div>
        <PatientModal />
      </>
  );
};

export default DoctorPatientsPage;
