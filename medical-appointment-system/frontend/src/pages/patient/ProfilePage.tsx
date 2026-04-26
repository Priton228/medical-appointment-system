import { User, Mail, Phone, MapPin, Camera, Shield, Bell, ChevronRight, Save, Calendar, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { MedicalRecordResponse, PatientProfileResponse } from '../../services/api';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [records, setRecords] = useState<MedicalRecordResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const loadData = async () => {
    try {
      const [profileData, recordsData] = await Promise.all([patientApi.getProfile(), patientApi.getMedicalRecords()]);
      setProfile(profileData);
      setRecords(recordsData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить профиль');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      await patientApi.updateProfile(profile);
      toast.success('Профиль обновлен');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const saveRecordNote = async (recordId: number, notes: string) => {
    try {
      await patientApi.updateMedicalRecord(recordId, { notes });
      toast.success('Заметка медкарты обновлена');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления медкарты');
    }
  };

  const changePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('Новый пароль и подтверждение не совпадают');
      return;
    }
    try {
      await patientApi.changePassword({ currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword });
      toast.success('Пароль успешно изменен');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 animate-fade-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">
            Профиль <span className="text-brand-primary">пользователя</span>
          </h1>
          <p className="text-brand-secondary mt-2 font-black uppercase tracking-widest text-[10px]">Персональные данные и настройки аккаунта</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className="premium-card p-10 flex flex-col items-center text-center bg-white border-2 border-brand-soft shadow-premium">
            <div className="relative group mb-8">
              <div className="w-40 h-40 rounded-[2.5rem] bg-brand-secondary text-white flex items-center justify-center border-2 border-brand-soft shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                <User size={80} />
              </div>
              <button className="absolute bottom-2 right-2 p-3.5 bg-brand-primary text-white rounded-2xl shadow-xl hover:bg-brand-secondary transition-all duration-300 border-2 border-white hover:rotate-12">
                <Camera size={20} />
              </button>
            </div>
            <h2 className="text-3xl font-black text-brand-secondary mb-2">{profile?.fullName || user?.fullName || 'Имя пользователя'}</h2>
            <p className="text-brand-primary font-black uppercase tracking-[0.2em] text-[10px] bg-brand-soft/40 px-4 py-1.5 rounded-full mb-8 border-2 border-brand-soft">Пациент системы</p>
            
            <div className="w-full pt-8 border-t-2 border-brand-soft space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-brand-primary font-black uppercase tracking-widest text-[10px]">Дата регистрации</span>
                <span className="text-brand-secondary font-black text-sm flex items-center space-x-2">
                  <Calendar size={14} className="text-brand-primary" />
                  <span>10.04.2026</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-primary font-black uppercase tracking-widest text-[10px]">ID аккаунта</span>
                <span className="text-brand-secondary font-black text-sm">#45920</span>
              </div>
            </div>
          </div>

          <div className="premium-card p-4 space-y-2 bg-white border-2 border-brand-soft shadow-premium">
            <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-brand-primary text-white font-black shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center space-x-4">
                <User size={22} />
                <span>Личные данные</span>
              </div>
              <ChevronRight size={20} />
            </button>
            <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-brand-soft/40 text-brand-secondary font-black transition-all group hover:bg-brand-primary hover:text-white border-2 border-brand-soft">
              <div className="flex items-center space-x-4">
                <Shield size={22} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">Безопасность</span>
              </div>
              <ChevronRight size={20} />
            </button>
            <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-brand-soft/40 text-brand-secondary font-black transition-all group hover:bg-brand-primary hover:text-white border-2 border-brand-soft">
              <div className="flex items-center space-x-4">
                <Bell size={22} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">Уведомления</span>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="lg:col-span-8">
          <div className="premium-card p-10 md:p-12 h-full bg-white border-2 border-brand-soft shadow-premium">
            <h3 className="text-2xl font-black text-brand-secondary mb-10 flex items-center">
              <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
              Редактировать профиль
            </h3>
            
            <form className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Полное имя</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                    <input
                      type="text"
                      value={profile?.fullName || ''}
                      onChange={(e) => setProfile((prev) => (prev ? { ...prev, fullName: e.target.value } : prev))}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all duration-500 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Email адрес</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                    <input
                      type="email"
                      value={profile?.email || ''}
                      onChange={(e) => setProfile((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all duration-500 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Номер телефона</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                    <input
                      type="tel"
                      value={profile?.phone || ''}
                      onChange={(e) => setProfile((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all duration-500 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Адрес проживания</label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                    <input
                      type="text"
                      value={profile?.address || ''}
                      onChange={(e) => setProfile((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all duration-500 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t-2 border-brand-soft flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center space-x-4 text-brand-primary">
                  <div className="w-2 h-2 rounded-full bg-status-success animate-pulse"></div>
                  <p className="text-xs font-bold italic flex items-center space-x-2">
                    <Clock size={14} />
                    <span>Последнее обновление: Сегодня в 03:54</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveProfile}
                  className="w-full sm:w-auto px-12 py-5 rounded-[1.5rem] bg-brand-primary text-white font-black text-lg shadow-2xl shadow-brand-primary/30 hover:bg-brand-secondary hover:-translate-y-1 active:scale-95 transition-all duration-500 flex items-center justify-center space-x-4 group disabled:opacity-60"
                >
                  <Save size={22} />
                  <span>Сохранить изменения</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>

            <div className="mt-10 pt-10 border-t-2 border-brand-soft">
              <h4 className="text-xl font-black text-brand-secondary mb-6">Медкарта</h4>
              <div className="space-y-4">
                {records.map((record) => (
                  <MedicalRecordCard key={record.id} record={record} onSave={saveRecordNote} />
                ))}
                {records.length === 0 && <p className="text-brand-primary font-bold">Записей медкарты пока нет.</p>}
              </div>
            </div>

            <div className="mt-10 pt-10 border-t-2 border-brand-soft">
              <h4 className="text-xl font-black text-brand-secondary mb-6">Безопасность</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="password"
                  placeholder="Текущий пароль"
                  value={securityForm.currentPassword}
                  onChange={(e) => setSecurityForm((s) => ({ ...s, currentPassword: e.target.value }))}
                  className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                />
                <input
                  type="password"
                  placeholder="Новый пароль"
                  value={securityForm.newPassword}
                  onChange={(e) => setSecurityForm((s) => ({ ...s, newPassword: e.target.value }))}
                  className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                />
                <input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                  className="rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                />
              </div>
              <button onClick={changePassword} className="mt-4 px-5 py-3 rounded-xl bg-brand-secondary text-white font-black text-xs uppercase tracking-widest">
                Изменить пароль
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

const MedicalRecordCard = ({
  record,
  onSave,
}: {
  record: MedicalRecordResponse;
  onSave: (recordId: number, notes: string) => Promise<void>;
}) => {
  const [notes, setNotes] = useState(record.notes || '');
  return (
    <div className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-5">
      <p className="font-black text-brand-secondary">{record.doctorName}</p>
      <p className="text-xs font-black uppercase tracking-widest text-brand-primary mt-1">{new Date(record.createdAt).toLocaleString()}</p>
      <p className="text-sm font-bold text-brand-secondary mt-2">Диагноз: {record.diagnosis || 'не указан'}</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full mt-3 rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary min-h-24"
      />
      <button onClick={() => onSave(record.id, notes)} className="mt-3 px-4 py-2 rounded-xl bg-brand-secondary text-white font-black text-xs">
        Сохранить заметку
      </button>
    </div>
  );
};
