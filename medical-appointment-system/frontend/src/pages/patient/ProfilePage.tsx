import { User, Mail, Phone, MapPin, Camera, Shield, ChevronRight, Save, Calendar, Clock, Activity, HeartPulse, Ruler, Weight, Droplets, Info, Bell, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { PatientProfileResponse } from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAvatarStore } from '../../stores/avatarStore';
import { localizeNotification } from '../../utils/notificationText';

type TabType = 'profile' | 'security' | 'medical' | 'notifications';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const { setAvatarUrl: setGlobalAvatarUrl } = useAvatarStore();
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', newEmail: '' });
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  const loadData = async () => {
    try {
      const profileData = await patientApi.getProfile();
      setProfile(profileData);
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

  const changePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('Новый пароль и подтверждение не совпадают');
      return;
    }
    try {
      await patientApi.changePassword({ currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword });
      toast.success('Пароль успешно изменен');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '', newEmail: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarUrlInput.trim()) {
      toast.error('Введите URL фотографии');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const updatedProfile = await patientApi.uploadAvatar(avatarUrlInput.trim());
      setProfile(updatedProfile);
      setGlobalAvatarUrl(updatedProfile.avatarUrl || '');
      setAvatarUrlInput('');
      toast.success('Фотография профиля обновлена');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления фотографии');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 pb-20 animate-fade-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">Профиль пользователя</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Profile Card */}
          <div className="lg:col-span-4 space-y-8">
            <div className="premium-card p-10 flex flex-col items-center text-center bg-white border-2 border-brand-soft shadow-premium">
              <div className="relative group mb-8">
                <div className="w-40 h-40 rounded-[2.5rem] bg-brand-secondary text-white flex items-center justify-center border-2 border-brand-soft shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                  {profile?.avatarUrl ? (
                      <img
                          src={profile.avatarUrl}
                          alt="Аватар"
                          className="w-full h-full object-cover"
                      />
                  ) : (
                      <User size={80} />
                  )}
                </div>
                <div className="absolute -bottom-16 left-0 right-0 flex gap-2">
                  <input
                      type="text"
                      placeholder="URL фото..."
                      value={avatarUrlInput}
                      onChange={(e) => setAvatarUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border-2 border-brand-soft rounded-xl focus:outline-none focus:border-brand-primary"
                  />
                  <button
                      onClick={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="px-3 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-colors"
                  >
                    <Camera size={18} className={isUploadingAvatar ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <h2 className="text-3xl font-black text-brand-secondary mb-2 mt-16">{profile?.fullName || user?.fullName || 'Имя пользователя'}</h2>
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
                  <span className="text-brand-primary font-black uppercase tracking-widest text-[10px]">Дата рождения</span>
                  <span className="text-brand-secondary font-black text-sm flex items-center space-x-2">
                  <Calendar size={14} className="text-brand-primary" />
                  <span>{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('ru-RU') : 'Не указана'}</span>
                </span>
                </div>
              </div>
            </div>

            <div className="premium-card p-4 space-y-2 bg-white border-2 border-brand-soft shadow-premium">
              <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl font-black shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
                      activeTab === 'profile'
                          ? 'bg-brand-primary text-white shadow-brand-primary/20'
                          : 'bg-brand-soft/40 text-brand-secondary border-2 border-brand-soft'
                  }`}>
                <div className="flex items-center space-x-4">
                  <User size={22} />
                  <span>Личные данные</span>
                </div>
                <ChevronRight size={20} />
              </button>
              <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl font-black transition-all border-2 ${
                      activeTab === 'security'
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                  }`}>
                <div className="flex items-center space-x-4">
                  <Shield size={22} />
                  <span>Безопасность</span>
                </div>
                <ChevronRight size={20} />
              </button>
              <button
                  onClick={() => setActiveTab('medical')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl font-black transition-all border-2 ${
                      activeTab === 'medical'
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                  }`}>
                <div className="flex items-center space-x-4">
                  <HeartPulse size={22} />
                  <span>Медкарта</span>
                </div>
                <ChevronRight size={20} />
              </button>
              <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl font-black transition-all border-2 ${
                      activeTab === 'notifications'
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                  }`}>
                <div className="flex items-center space-x-4">
                  <Bell size={22} />
                  <span>Уведомления</span>
                </div>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="lg:col-span-8">
            <div className="premium-card p-10 md:p-12 h-full bg-white border-2 border-brand-soft shadow-premium">
              {activeTab === 'profile' && (
                  <>
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
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Дата рождения</label>
                          <div className="relative group">
                            <Calendar className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                            <input
                                type="date"
                                value={profile?.dateOfBirth || ''}
                                onChange={(e) => setProfile((prev) => (prev ? { ...prev, dateOfBirth: e.target.value } : prev))}
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

                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Контакт для экстренной связи</label>
                          <div className="relative group">
                            <Phone className="absolute left-5 top-1/2 transform -translate-y-1/2 text-brand-primary group-focus-within:text-brand-secondary transition-colors" size={22} />
                            <input
                                type="tel"
                                value={profile?.emergencyContact || ''}
                                onChange={(e) => setProfile((prev) => (prev ? { ...prev, emergencyContact: e.target.value } : prev))}
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
                            <span>Последнее обновление: Сегодня в {new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span>
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
                  </>
              )}

              {activeTab === 'security' && (
                  <>
                    <h3 className="text-2xl font-black text-brand-secondary mb-10 flex items-center">
                      <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
                      Безопасность
                    </h3>

                    <div className="space-y-8">
                      <div className="p-6 bg-brand-soft/20 rounded-2xl border-2 border-brand-soft">
                        <h4 className="text-lg font-black text-brand-secondary mb-4">Изменение пароля</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <input
                              type="password"
                              placeholder="Текущий пароль"
                              value={securityForm.currentPassword}
                              onChange={(e) => setSecurityForm((s) => ({ ...s, currentPassword: e.target.value }))}
                              className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                          />
                          <input
                              type="password"
                              placeholder="Новый пароль"
                              value={securityForm.newPassword}
                              onChange={(e) => setSecurityForm((s) => ({ ...s, newPassword: e.target.value }))}
                              className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                          />
                          <input
                              type="password"
                              placeholder="Подтвердите пароль"
                              value={securityForm.confirmPassword}
                              onChange={(e) => setSecurityForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                              className="w-full rounded-xl border-2 border-brand-soft px-4 py-3 font-bold text-brand-secondary"
                          />
                        </div>
                        <button onClick={changePassword} className="mt-4 px-6 py-3 rounded-xl bg-brand-secondary text-white font-black text-sm uppercase tracking-widest hover:bg-brand-primary transition-colors">
                          Изменить пароль
                        </button>
                      </div>
                    </div>
                  </>
              )}

              {activeTab === 'medical' && (
                  <>
                    <h3 className="text-2xl font-black text-brand-secondary mb-10 flex items-center">
                      <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
                      Медкарта
                    </h3>

                    {/* ИМТ Блок */}
                    <BMIBlock profile={profile} />

                    <form className="space-y-8 mt-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <User size={16} /> Пол
                          </label>
                          <select
                              value={profile?.gender || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, gender: e.target.value } : prev))}
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                          >
                            <option value="">Не указан</option>
                            <option value="MALE">Мужской</option>
                            <option value="FEMALE">Женский</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <Droplets size={16} /> Группа крови
                          </label>
                          <select
                              value={profile?.bloodType || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, bloodType: e.target.value } : prev))}
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                          >
                            <option value="">Не указана</option>
                            <option value="O(I) Rh+">O(I) Rh+</option>
                            <option value="O(I) Rh-">O(I) Rh-</option>
                            <option value="A(II) Rh+">A(II) Rh+</option>
                            <option value="A(II) Rh-">A(II) Rh-</option>
                            <option value="B(III) Rh+">B(III) Rh+</option>
                            <option value="B(III) Rh-">B(III) Rh-</option>
                            <option value="AB(IV) Rh+">AB(IV) Rh+</option>
                            <option value="AB(IV) Rh-">AB(IV) Rh-</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <Ruler size={16} /> Рост (см)
                          </label>
                          <input
                              type="number"
                              value={profile?.heightCm || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, heightCm: parseInt(e.target.value) || null } : prev))}
                              placeholder="175"
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <Weight size={16} /> Вес (кг)
                          </label>
                          <input
                              type="number"
                              value={profile?.weightKg || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, weightKg: parseInt(e.target.value) || null } : prev))}
                              placeholder="70"
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                          />
                        </div>

                        <div className="space-y-3 md:col-span-2">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={16} /> Хронические заболевания
                          </label>
                          <textarea
                              value={profile?.chronicDiseases || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, chronicDiseases: e.target.value } : prev))}
                              placeholder="Укажите хронические заболевания, если есть"
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary min-h-24"
                          />
                        </div>

                        <div className="space-y-3 md:col-span-2">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest flex items-center gap-2">
                            <HeartPulse size={16} /> Аллергии
                          </label>
                          <textarea
                              value={profile?.allergies || ''}
                              onChange={(e) => setProfile((prev) => (prev ? { ...prev, allergies: e.target.value } : prev))}
                              placeholder="Укажите аллергии, если есть"
                              className="w-full px-4 py-3 rounded-xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary min-h-24"
                          />
                        </div>
                      </div>

                      <div className="pt-6 border-t-2 border-brand-soft">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={saveProfile}
                            className="w-full sm:w-auto px-12 py-5 rounded-[1.5rem] bg-brand-primary text-white font-black text-lg shadow-2xl shadow-brand-primary/30 hover:bg-brand-secondary hover:-translate-y-1 active:scale-95 transition-all duration-500 flex items-center justify-center space-x-4 group disabled:opacity-60"
                        >
                          <Save size={22} />
                          <span>Сохранить медкарту</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </form>

                  </>
              )}

              {activeTab === 'notifications' && <NotificationsTab />}
            </div>
          </div>
        </div>
      </div>
  );
};

const NotificationsTab = () => {
  const { notifications, isLoading, loadNotifications, markAsRead, deleteNotification } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const getIconByType = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
        return <Clock size={20} className="text-blue-500" />;
      case 'APPOINTMENT_CONFIRMED':
        return <Activity size={20} className="text-green-500" />;
      case 'APPOINTMENT_CANCELLED':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'APPOINTMENT_RESCHEDULED':
        return <Calendar size={20} className="text-yellow-500" />;
      case 'APPOINTMENT_COMPLETED':
        return <HeartPulse size={20} className="text-purple-500" />;
      default:
        return <Bell size={20} className="text-brand-primary" />;
    }
  };

  return (
      <>
        <h3 className="text-2xl font-black text-brand-secondary mb-10 flex items-center">
          <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
          Уведомления
        </h3>

        {isLoading ? (
            <p className="text-brand-primary font-bold">Загрузка...</p>
        ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-brand-soft mb-4" />
              <p className="text-brand-secondary font-bold">Уведомлений пока нет</p>
            </div>
        ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const item = localizeNotification(notification);
                return (
                    <div
                        key={item.id}
                        className={`rounded-2xl border-2 p-5 transition-all ${
                            item.isRead ? 'border-brand-soft bg-white' : 'border-brand-primary bg-brand-soft/10'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-white border-2 border-brand-soft">
                          {getIconByType(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-brand-secondary">{item.title}</h4>
                            {!item.isRead && (
                                <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-black">Новое</span>
                            )}
                          </div>
                          <p className="text-sm text-brand-primary font-bold">{item.message}</p>
                          <p className="text-xs text-brand-primary/60 mt-2">{new Date(notification.createdAt).toLocaleString('ru-RU')}</p>
                        </div>
                        <div className="flex gap-2">
                          {!item.isRead && (
                              <button
                                  onClick={() => markAsRead(item.id)}
                                  className="px-3 py-2 rounded-xl bg-brand-secondary text-white text-xs font-black hover:bg-brand-primary transition-colors"
                              >
                                Прочитано
                              </button>
                          )}
                          <button
                              onClick={() => deleteNotification(item.id)}
                              className="p-2 rounded-xl border-2 border-status-error text-status-error hover:bg-status-error/10 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
        )}
      </>
  );
};

export default ProfilePage;

const BMIBlock = ({ profile }: { profile: PatientProfileResponse | null }) => {
  const calculateBMI = () => {
    if (!profile?.heightCm || !profile?.weightKg) return null;
    const heightM = profile.heightCm / 100;
    const bmi = profile.weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
  };

  const getAge = () => {
    if (!profile?.dateOfBirth) return null;
    const birthDate = new Date(profile.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const bmi = calculateBMI();
  const age = getAge();
  const idealWeightMin = profile?.heightCm ? Math.round(18.5 * Math.pow(profile.heightCm / 100, 2)) : 0;
  const idealWeightMax = profile?.heightCm ? Math.round(24.9 * Math.pow(profile.heightCm / 100, 2)) : 0;

  const underWeightDiff = profile?.weightKg && idealWeightMin ? idealWeightMin - profile.weightKg : 0;
  const overWeightDiff = profile?.weightKg && idealWeightMax ? profile.weightKg - idealWeightMax : 0;

  if (!bmi) {
    return (
        <div className="bg-brand-soft/30 rounded-2xl p-6 border-2 border-brand-soft">
          <div className="flex items-center gap-3 text-brand-primary">
            <Info size={24} />
            <p className="font-bold">Укажите рост и вес для расчета ИМТ</p>
          </div>
        </div>
    );
  }

  const getBMICategory = (bmi: number, underDiff: number, overDiff: number) => {
    if (bmi < 18.5) {
      const severe = underDiff > 10;
      return {
        label: 'Недостаточный вес',
        color: severe ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300',
        bg: severe ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
        border: severe ? 'border-red-300 dark:border-red-700' : 'border-blue-300 dark:border-blue-700',
        textColor: severe ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300',
        recColor: severe ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'
      };
    }
    if (bmi < 25) return {
      label: 'Нормальный вес',
      color: 'text-green-600 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-700',
      textColor: 'text-green-700 dark:text-green-300',
      recColor: 'text-green-700 dark:text-green-300'
    };
    if (bmi < 30) {
      const severe = overDiff > 10;
      return {
        label: 'Избыточный вес',
        color: severe ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300',
        bg: severe ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
        border: severe ? 'border-red-300 dark:border-red-700' : 'border-blue-300 dark:border-blue-700',
        textColor: severe ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300',
        recColor: severe ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'
      };
    }
    return {
      label: 'Ожирение',
      color: 'text-red-600 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-300 dark:border-red-700',
      textColor: 'text-red-700 dark:text-red-300',
      recColor: 'text-red-700 dark:text-red-300'
    };
  };

  const category = getBMICategory(bmi, underWeightDiff, overWeightDiff);

  return (
      <div className={`rounded-2xl p-6 border-2 ${category.border} ${category.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-brand-primary mb-2">Индекс массы тела (ИМТ)</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-brand-secondary">{bmi}</span>
              <span className={`text-lg font-black ${category.color}`}>{category.label}</span>
            </div>
            {age && <p className="text-sm text-brand-primary mt-1">Возраст: {age} лет</p>}
          </div>

          <div className="flex-1 max-w-md">
            <div className={`rounded-xl p-4 border-2 ${category.border} ${category.bg} shadow-sm`}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className={category.color} />
                <div>
                  <p className={`font-bold ${category.textColor}`}>Рекомендации:</p>
                  <p className={`text-sm mt-1 ${category.textColor}`}>
                    При вашем росте {profile?.heightCm} см идеальный вес: <span className="font-black">{idealWeightMin}-{idealWeightMax} кг</span>
                  </p>
                  {bmi < 18.5 && underWeightDiff <= 10 && (
                      <p className={`text-sm mt-2 font-medium ${category.recColor}`}>Ваш вес немного ниже нормы. Рекомендуется легкое увеличение калорийности питания.</p>
                  )}
                  {bmi < 18.5 && underWeightDiff > 10 && (
                      <p className={`text-sm mt-2 font-medium ${category.recColor}`}>Рекомендуется консультация диетолога для набора веса.</p>
                  )}
                  {(bmi >= 25 && bmi < 30) && (
                      <p className={`text-sm mt-2 font-medium ${category.recColor}`}>Рекомендуется консультация врача-диетолога или эндокринолога.</p>
                  )}
                  {bmi >= 30 && (
                      <p className={`text-sm mt-2 font-medium ${category.recColor}`}>Рекомендуется срочная консультация эндокринолога.</p>
                  )}
                  {bmi >= 18.5 && bmi < 25 && (
                      <p className={`text-sm mt-2 font-medium ${category.recColor}`}>Отличный показатель! Продолжайте вести здоровый образ жизни.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

