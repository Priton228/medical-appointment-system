import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Save, Shield, Trash2, Users, UserCog, Ban, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import type { AdminDashboardResponse, AppointmentResponse, DoctorResponse, SlotResponse, SpecializationResponse, SymptomResponse, UserResponse } from '../../services/api';

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

const AdminDashboard = () => {
   const [tab, setTab] = useState<'doctors' | 'users' | 'symptoms' | 'schedule' | 'appointments'>('doctors');
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
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', phone: '', role: 'PATIENT' as 'PATIENT' | 'DOCTOR' | 'ADMIN' });
  const [isLoading, setIsLoading] = useState(true);
  const [adminAppointments, setAdminAppointments] = useState<AppointmentResponse[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [completeFor, setCompleteFor] = useState<AppointmentResponse | null>(null);
  const [completeForm, setCompleteForm] = useState({ doctorNotes: '', diagnosis: '', treatmentRecommendations: '' });
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentResponse | null>(null);
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState<number | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotResponse[]>([]);

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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить данные администратора');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAdminAppointments = async () => {
    setLoadingAppointments(true);
    try {
      setAdminAppointments(await adminApi.getAppointments());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить записи');
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (tab === 'appointments') loadAdminAppointments();
  }, [tab]);

  useEffect(() => {
    if (!rescheduleDoctorId) {
      setRescheduleSlots([]);
      return;
    }
    adminApi.getDoctorSchedule(rescheduleDoctorId).then(setRescheduleSlots).catch(() => setRescheduleSlots([]));
  }, [rescheduleDoctorId]);

  const patchAdminAppointment = async (id: number, payload: Parameters<typeof adminApi.updateAppointmentStatus>[1]) => {
    try {
      await adminApi.updateAppointmentStatus(id, payload);
      toast.success('Сохранено');
      loadAdminAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка');
    }
  };

  const submitAdminComplete = async () => {
    if (!completeFor) return;
    await patchAdminAppointment(completeFor.id, {
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
      loadAdminAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось перенести');
    }
  };

  const stats = useMemo(
    () => [
      { label: 'Всего пользователей', value: dashboard?.totalUsers ?? 0, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
      { label: 'Всего записей', value: dashboard?.totalAppointments ?? 0, icon: Calendar, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
      { label: 'Активных врачей', value: dashboard?.totalDoctors ?? 0, icon: Shield, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
      { label: 'Пациентов', value: dashboard?.totalPatients ?? 0, icon: Users, color: 'text-status-success', bg: 'bg-status-success/10' },
    ],
    [dashboard]
  );

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
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения врача');
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
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось удалить врача');
    }
  };

  const startEditUser = (user: UserResponse) => {
    setEditingUserId(user.id);
    setUserForm({ fullName: user.fullName, email: user.email, phone: user.phone, role: user.role });
  };

  const saveUser = async () => {
    if (!editingUserId) return;
    try {
      await adminApi.updateUser(editingUserId, userForm);
      toast.success('Пользователь обновлен');
      setEditingUserId(null);
      setUserForm({ fullName: '', email: '', phone: '', role: 'PATIENT' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления пользователя');
    }
  };

  const toggleUserBlock = async (user: UserResponse) => {
    try {
      await adminApi.setUserBlocked(user.id, !user.isBlocked);
      toast.success(user.isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка изменения блокировки');
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
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения симптома');
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
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка удаления симптома');
    }
  };

  const loadSchedule = async (doctorId: number) => {
    try {
      setSelectedScheduleDoctorId(doctorId);
      setDoctorSchedule(await adminApi.getDoctorSchedule(doctorId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить расписание');
    }
  };

  useEffect(() => {
    if (!selectedScheduleDoctorId) return;
    const timer = setInterval(() => {
      loadSchedule(selectedScheduleDoctorId);
    }, 10000);
    return () => clearInterval(timer);
  }, [selectedScheduleDoctorId]);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up bg-brand-bg">
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
          <div key={i} className="premium-card p-6 bg-white border-2 border-brand-soft">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm mb-4`}>
              <stat.icon size={28} />
            </div>
            <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-brand-secondary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'doctors', label: 'Врачи' },
          { id: 'users', label: 'Пользователи' },
          { id: 'symptoms', label: 'Симптомы' },
          { id: 'schedule', label: 'Расписание врачей' },
          { id: 'appointments', label: 'Записи пациентов' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 ${
              tab === item.id ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white text-brand-secondary border-brand-soft'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'doctors' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
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
          <button onClick={saveDoctor} className="mt-5 flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-secondary text-white font-black">
            {editingDoctorId ? <Save size={18} /> : <Plus size={18} />}
            {editingDoctorId ? 'Обновить врача' : 'Добавить врача'}
          </button>
        </section>

        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Список врачей из БД</h3>
          {isLoading ? (
            <p className="text-brand-primary font-bold">Загрузка...</p>
          ) : doctors.length === 0 ? (
            <p className="text-brand-primary font-bold">Список врачей пуст.</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/20 p-4">
                  <p className="font-black text-brand-secondary">{doctor.fullName}</p>
                  <p className="text-xs font-black text-brand-primary uppercase tracking-wider">{doctor.email}</p>
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

      {tab === 'users' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Редактирование пользователя</h3>
          {editingUserId ? (
            <div className="space-y-3">
              <input value={userForm.fullName} onChange={(e) => setUserForm((s) => ({ ...s, fullName: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="ФИО" />
              <input value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Email" />
              <input value={userForm.phone} onChange={(e) => setUserForm((s) => ({ ...s, phone: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Телефон" />
              <select value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value as 'PATIENT' | 'DOCTOR' | 'ADMIN' }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary">
                <option value="PATIENT">PATIENT</option>
                <option value="DOCTOR">DOCTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button onClick={saveUser} className="px-5 py-3 rounded-xl bg-brand-secondary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Save size={16} /> Сохранить
              </button>
            </div>
          ) : <p className="font-bold text-brand-primary">Выберите пользователя справа для редактирования.</p>}
        </section>
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Все пользователи</h3>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {users.map((user) => (
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
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Добавить / изменить симптом</h3>
          <div className="space-y-3">
            <input value={symptomForm.name} onChange={(e) => setSymptomForm((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary" placeholder="Название симптома" />
            <textarea value={symptomForm.description} onChange={(e) => setSymptomForm((s) => ({ ...s, description: e.target.value }))} className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-24" placeholder="Описание" />
            <label className="inline-flex items-center gap-2 font-bold text-brand-secondary">
              <input type="checkbox" checked={symptomForm.isUrgent} onChange={(e) => setSymptomForm((s) => ({ ...s, isUrgent: e.target.checked }))} />
              Критический симптом
            </label>
            <button onClick={saveSymptom} className="px-5 py-3 rounded-xl bg-brand-secondary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              {editingSymptomId ? <Save size={16} /> : <Plus size={16} />} {editingSymptomId ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </section>
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Список симптомов</h3>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {symptoms.map((symptom) => (
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

      {tab === 'schedule' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="premium-card p-8 bg-white border-2 border-brand-soft lg:col-span-1">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Выберите врача</h3>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {doctors.map((doctor) => (
              <button key={doctor.id} onClick={() => loadSchedule(doctor.id)} className={`w-full text-left rounded-2xl border-2 p-4 ${selectedScheduleDoctorId === doctor.id ? 'border-brand-secondary bg-brand-soft/40' : 'border-brand-soft bg-white'}`}>
                <p className="font-black text-brand-secondary">{doctor.fullName}</p>
                <p className="text-xs font-bold text-brand-primary mt-1">{doctor.description || 'Врач'}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="premium-card p-8 bg-white border-2 border-brand-soft lg:col-span-2">
          <h3 className="text-2xl font-black text-brand-secondary mb-6">Календарь слотов врача</h3>
          {!selectedScheduleDoctorId ? (
            <p className="font-bold text-brand-primary">Выберите врача слева.</p>
          ) : (
            <div className="space-y-4">
              <DoctorScheduleCalendar slots={doctorSchedule} />
              {doctorSchedule.length === 0 && <p className="font-bold text-brand-primary">У выбранного врача пока нет слотов.</p>}
            </div>
          )}
        </section>
      </div>}

      {tab === 'appointments' && (
        <section className="premium-card p-8 bg-white border-2 border-brand-soft">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-black text-brand-secondary">Все записи</h3>
            <button type="button" onClick={() => loadAdminAppointments()} className="px-4 py-2 rounded-xl border-2 border-brand-soft font-black text-xs uppercase">
              Обновить
            </button>
          </div>
          {loadingAppointments ? (
            <p className="font-bold text-brand-primary">Загрузка...</p>
          ) : adminAppointments.length === 0 ? (
            <p className="font-bold text-brand-primary">Записей нет.</p>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-auto pr-1">
              {adminAppointments.map((app) => {
                const canAct = !['COMPLETED', 'CANCELLED'].includes(app.status);
                return (
                  <div key={app.id} className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-5">
                    <p className="font-black text-brand-secondary">
                      {app.patientName} → {app.doctorName}
                    </p>
                    <p className="text-xs font-black text-brand-primary uppercase tracking-wider mt-1">
                      {app.date} {formatTime(app.startTime)} — {formatTime(app.endTime)} · {app.status}
                    </p>
                    {app.symptomsDescription && <p className="text-xs font-bold mt-2">Жалобы: {app.symptomsDescription}</p>}
                    {app.status === 'COMPLETED' && (app.diagnosis || app.doctorNotes || app.treatmentRecommendations) && (
                      <div className="mt-3 text-xs font-bold text-brand-secondary space-y-1 border-t border-brand-soft pt-3">
                        {app.doctorNotes && <p>Показания: {app.doctorNotes}</p>}
                        {app.diagnosis && <p>Диагноз: {app.diagnosis}</p>}
                        {app.treatmentRecommendations && <p>Рекомендации: {app.treatmentRecommendations}</p>}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canAct && (app.status === 'SCHEDULED' || app.status === 'RESCHEDULED') && (
                        <button type="button" onClick={() => patchAdminAppointment(app.id, { status: 'CONFIRMED' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-white border-brand-soft">
                          Подтвердить
                        </button>
                      )}
                      {canAct && (
                        <button type="button" onClick={() => patchAdminAppointment(app.id, { status: 'MISSED' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-white border-brand-soft">
                          Пропущен
                        </button>
                      )}
                      {canAct && (
                        <button type="button" onClick={() => patchAdminAppointment(app.id, { status: 'CANCELLED', cancelReason: 'Отменено администратором' })} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-status-error text-status-error">
                          Отменить
                        </button>
                      )}
                      {canAct && (
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleFor(app);
                            setRescheduleDoctorId(app.doctorId);
                          }}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-brand-primary/10 text-brand-secondary border-brand-primary/30"
                        >
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
                          Завершить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {completeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border-2 border-brand-soft p-6 max-w-lg w-full shadow-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border-2 border-brand-soft p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
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

const DoctorScheduleCalendar = ({ slots }: { slots: SlotResponse[] }) => {
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const grouped = groupSlotsByDate(slots);
  const dates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const firstAvailableDate = dates[0];
  const initialView = firstAvailableDate ? new Date(`${firstAvailableDate}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));

  const selectedDateExists = selectedDate ? Boolean(grouped[selectedDate]) : false;
  const activeDate = selectedDateExists ? selectedDate : firstAvailableDate || null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const dateInViewMonth = (date: string) => {
    const [y, m] = date.split('-').map(Number);
    return y === year && m - 1 === month;
  };

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
            const isActive = activeDate === cell.value;
            return (
              <button
                key={`${cell.value || 'empty'}-${index}`}
                onClick={() => cell.value && hasSlots && setSelectedDate(cell.value)}
                disabled={!cell.value || !hasSlots}
                className={`h-10 rounded-xl text-xs font-black border transition-all ${
                  !cell.value
                    ? 'border-brand-soft/40 bg-brand-soft/10 text-transparent cursor-default'
                    : !hasSlots
                      ? 'border-brand-soft bg-white text-brand-primary/40 cursor-not-allowed'
                      : isActive
                        ? 'bg-brand-secondary text-white border-brand-secondary'
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

        {dates.length > 0 && !dateInViewMonth(dates[0]) && (
          <p className="mt-3 text-xs font-bold text-brand-primary">Выбрана дата из другого месяца, используйте стрелки для перехода.</p>
        )}
      </div>
      <div className="rounded-2xl border-2 border-brand-soft p-4">
        <p className="font-black text-brand-secondary mb-4">Время приема {activeDate ? `(${activeDate})` : ''}</p>
        <div className="flex flex-wrap gap-2">
          {(activeDate ? grouped[activeDate] : []).map((slot) => (
            <span key={slot.id} className={`px-3 py-2 rounded-xl text-xs font-black border ${slot.isBooked ? 'bg-status-error/10 text-status-error border-status-error/30' : 'bg-status-success/10 text-status-success border-status-success/30'}`}>
              {formatTime(slot.startTime)}
            </span>
          ))}
        </div>
        {activeDate && (grouped[activeDate] || []).length === 0 && (
          <p className="font-bold text-brand-primary">На выбранную дату слотов нет.</p>
        )}
        {!activeDate && <p className="font-bold text-brand-primary">Для выбранного врача нет доступных дат.</p>}
      </div>
    </div>
  );
};