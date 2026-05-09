import { User, Camera, Save, Star, Shield, ChevronRight, Bell, Clock, Activity, HeartPulse, AlertCircle, X, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { doctorApi } from '../../services/api';
import type { PatientNotificationResponse } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useAvatarStore } from '../../stores/avatarStore';
import { localizeNotification } from '../../utils/notificationText';

interface DoctorProfile {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  specialization: string;
  description: string;
  experienceYears: number;
  education: string;
  rating: number;
  totalRatings: number;
}

type TabType = 'profile' | 'security' | 'notifications' | 'reviews';

const DoctorProfilePage = () => {
  const { user } = useAuthStore();
  const { setAvatarUrl: setGlobalAvatarUrl } = useAvatarStore();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const loadProfile = async () => {
    try {
      const data = await doctorApi.getProfile();
      setProfile(data as DoctorProfile);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить профиль');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      await doctorApi.updateProfile(profile);
      toast.success('Профиль обновлён');
      loadProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления');
    } finally {
      setIsSaving(false);
    }
  };

  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  const handleAvatarUpload = async () => {
    if (!avatarUrlInput.trim()) {
      toast.error('Введите URL фотографии');
      return;
    }

    try {
      setIsUploading(true);
      const updated = await doctorApi.uploadAvatar(avatarUrlInput.trim());
      setProfile(updated as DoctorProfile);
      setGlobalAvatarUrl(updated.avatarUrl || '');
      setAvatarUrlInput('');
      toast.success('Фото обновлено');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления фото');
    } finally {
      setIsUploading(false);
    }
  };

  const changePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('Новый пароль и подтверждение не совпадают');
      return;
    }
    try {
      await doctorApi.changePassword({ currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword });
      toast.success('Пароль успешно изменен');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  if (!profile) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );
  }

  return (
      <>
        <div className="max-w-7xl mx-auto px-4 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div>
              <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">
                Профиль <span className="text-brand-primary">врача</span>
              </h1>
              <p className="text-brand-secondary mt-2 font-black uppercase tracking-widest text-[10px]">Персональные данные и настройки аккаунта</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              {/* Profile Card */}
              <div className="premium-card p-10 flex flex-col items-center text-center bg-white border-2 border-brand-soft shadow-premium">
                <div className="relative group mb-8">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-brand-secondary text-white flex items-center justify-center border-2 border-brand-soft shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Аватар" className="w-full h-full object-cover" />
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
                        disabled={isUploading}
                        className="px-3 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-colors"
                    >
                      <Camera size={18} className={isUploading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-brand-secondary mb-2 mt-16">{profile?.fullName || user?.fullName || 'Врач'}</h2>
                <p className="text-brand-primary font-black uppercase tracking-[0.2em] text-[10px] bg-brand-soft/40 px-4 py-1.5 rounded-full mb-4 border-2 border-brand-soft">{profile?.specialization || 'Специалист'}</p>

                {/* Rating */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Star size={20} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-black text-brand-secondary">{profile?.rating?.toFixed(1) ?? 0}</span>
                  <span className="text-brand-primary text-sm">({profile?.totalRatings ?? 0} оценок)</span>
                </div>

                <div className="w-full pt-8 border-t-2 border-brand-soft space-y-5 mt-8">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-primary font-black uppercase tracking-widest text-[10px]">Стаж</span>
                    <span className="text-brand-secondary font-black text-sm">{profile?.experienceYears ?? 0} лет</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-primary font-black uppercase tracking-widest text-[10px]">Email</span>
                    <span className="text-brand-secondary font-black text-sm">{profile?.email}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="premium-card p-4 space-y-2 bg-white border-2 border-brand-soft shadow-premium">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl font-black shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
                        activeTab === 'profile' ? 'bg-brand-primary text-white shadow-brand-primary/20' : 'bg-brand-soft/40 text-brand-secondary border-2 border-brand-soft'
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
                        activeTab === 'security' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                    }`}>
                  <div className="flex items-center space-x-4">
                    <Shield size={22} />
                    <span>Безопасность</span>
                  </div>
                  <ChevronRight size={20} />
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl font-black transition-all border-2 ${
                        activeTab === 'notifications' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                    }`}>
                  <div className="flex items-center space-x-4">
                    <Bell size={22} />
                    <span>Уведомления</span>
                  </div>
                  <ChevronRight size={20} />
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl font-black transition-all border-2 ${
                        activeTab === 'reviews' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-soft/40 text-brand-secondary border-brand-soft hover:bg-brand-primary hover:text-white'
                    }`}>
                  <div className="flex items-center space-x-4">
                    <MessageSquare size={22} />
                    <span>Мои отзывы</span>
                  </div>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Main Content */}
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
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">ФИО</label>
                            <input
                                type="text"
                                value={profile.fullName}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Телефон</label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Специализация</label>
                            <input
                                type="text"
                                value={profile.specialization}
                                disabled
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-gray-100 border-2 border-brand-soft font-bold text-brand-secondary"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Стаж (лет)</label>
                            <input
                                type="number"
                                value={profile.experienceYears}
                                onChange={(e) => setProfile({ ...profile, experienceYears: parseInt(e.target.value) || 0 })}
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Образование</label>
                            <input
                                type="text"
                                value={profile.education}
                                onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                                className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-xs font-black text-brand-secondary ml-1 uppercase tracking-widest">Описание / О себе</label>
                          <textarea
                              value={profile.description}
                              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                              rows={4}
                              className="w-full px-6 py-5 rounded-[1.5rem] bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all font-bold text-brand-secondary resize-none"
                          />
                        </div>

                        <div className="pt-10 border-t-2 border-brand-soft flex flex-col sm:flex-row items-center justify-between gap-8">
                          <button
                              type="button"
                              disabled={isSaving}
                              onClick={saveProfile}
                              className="w-full sm:w-auto px-12 py-5 rounded-[1.5rem] bg-brand-primary text-white font-black text-lg shadow-2xl shadow-brand-primary/30 hover:bg-brand-secondary hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-4 group disabled:opacity-60"
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

                {activeTab === 'notifications' && <DoctorNotificationsTab />}
                {activeTab === 'reviews' && <DoctorReviewsTab />}
              </div>
            </div>
          </div>
        </div>
      </>
  );
};

const DoctorNotificationsTab = () => {
  const [notifications, setNotifications] = useState<PatientNotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailNotification, setDetailNotification] = useState<PatientNotificationResponse | null>(null);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await doctorApi.getNotifications();
      setNotifications(data);
    } catch {
      toast.error('Не удалось загрузить уведомления');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await doctorApi.setNotificationRead(id, true);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      toast.error('Ошибка обновления статуса');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await doctorApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error('Ошибка удаления уведомления');
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER': return <Clock size={20} className="text-blue-500" />;
      case 'APPOINTMENT_CONFIRMED': return <Activity size={20} className="text-green-500" />;
      case 'APPOINTMENT_CANCELLED': return <AlertCircle size={20} className="text-red-500" />;
      case 'APPOINTMENT_RESCHEDULED': return <Clock size={20} className="text-yellow-500" />;
      case 'APPOINTMENT_COMPLETED': return <HeartPulse size={20} className="text-purple-500" />;
      case 'REVIEW_RECEIVED': return <Star size={20} className="text-yellow-500" />;
      default: return <Bell size={20} className="text-brand-primary" />;
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
                        <div className="p-3 rounded-xl bg-white border-2 border-brand-soft">{getIconByType(notification.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-brand-secondary">{item.title}</h4>
                            {!item.isRead && <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-black">Новое</span>}
                          </div>
                          <p className="text-sm text-brand-primary font-bold">{item.message}</p>
                          <p className="text-xs text-brand-primary/60 mt-2">{new Date(notification.createdAt).toLocaleString('ru-RU')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {notification.type === 'REVIEW_RECEIVED' && (
                              <button
                                  type="button"
                                  onClick={() => setDetailNotification(notification)}
                                  className="rounded-xl border-2 border-brand-primary bg-brand-primary/10 px-3 py-2 text-xs font-black text-brand-secondary hover:bg-brand-primary hover:text-white dark:text-gray-100"
                              >
                                Подробнее
                              </button>
                          )}
                          {!item.isRead && (
                              <button
                                  type="button"
                                  onClick={() => markAsRead(item.id)}
                                  className="rounded-xl bg-brand-secondary px-3 py-2 text-xs font-black text-white transition-colors hover:bg-brand-primary"
                              >
                                Прочитано
                              </button>
                          )}
                          <button
                              type="button"
                              onClick={() => deleteNotification(item.id)}
                              className="rounded-xl border-2 border-status-error p-2 text-status-error transition-colors hover:bg-status-error/10"
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
        {detailNotification &&
            createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailNotification(null)} role="presentation" />
                  <div className="relative w-full max-w-md rounded-2xl border-2 border-brand-soft bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-xl font-black text-brand-secondary dark:text-gray-100">
                        {localizeNotification(detailNotification).title}
                      </h4>
                      <button
                          type="button"
                          onClick={() => setDetailNotification(null)}
                          className="rounded-xl border-2 border-brand-soft p-2 text-brand-secondary hover:bg-brand-soft/20 dark:border-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="rounded-xl border-2 border-brand-soft bg-brand-soft/10 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="whitespace-pre-wrap font-bold text-brand-secondary dark:text-gray-100">
                        {localizeNotification(detailNotification).message}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-brand-primary">
                      {new Date(detailNotification.createdAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>,
                document.body
            )}
      </>
  );
};

const DoctorReviewsTab = () => {
  const [reviews, setReviews] = useState<Array<{
    id: number;
    appointmentId: number;
    patientName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<typeof reviews[0] | null>(null);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const data = await doctorApi.getReviews();
      setReviews(data);
    } catch {
      toast.error('Не удалось загрузить отзывы');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  const renderStars = (rating: number) => {
    return (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
              <Star
                  key={star}
                  size={16}
                  strokeWidth={0}
                  className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
              />
          ))}
        </div>
    );
  };

  return (
      <>
        <h3 className="text-2xl font-black text-brand-secondary mb-6 flex items-center">
          <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
          Мои отзывы
        </h3>

        {/* Rating Summary */}
        <div className="rounded-2xl border-2 border-brand-soft bg-brand-soft/10 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-brand-secondary">{averageRating}</div>
              <div className="text-xs font-black text-brand-primary uppercase">Средний рейтинг</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star size={24} className="text-yellow-500 fill-yellow-500" />
                <span className="font-black text-brand-secondary text-lg">{reviews.length} отзывов</span>
              </div>
              <div className="text-sm text-brand-primary font-bold">
                На основе оценок пациентов
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
            <p className="text-brand-primary font-bold">Загрузка...</p>
        ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto text-brand-soft mb-4" />
              <p className="text-brand-secondary font-bold">Отзывов пока нет</p>
            </div>
        ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border-2 border-brand-soft bg-white dark:bg-gray-800 p-5 hover:border-brand-primary transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {renderStars(review.rating)}
                        </div>
                        <p className="font-black text-brand-secondary mb-1">{review.patientName}</p>
                        <p className="text-xs text-brand-primary font-bold">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <button
                          type="button"
                          onClick={() => setSelectedReview(review)}
                          className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-black text-white transition-colors hover:bg-brand-secondary"
                      >
                        Читать
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {selectedReview &&
            createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedReview(null)} role="presentation" />
                  <div className="relative w-full max-w-md rounded-2xl border-2 border-brand-soft bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-xl font-black text-brand-secondary dark:text-gray-100">Отзыв пациента</h4>
                      <button
                          type="button"
                          onClick={() => setSelectedReview(null)}
                          className="rounded-xl border-2 border-brand-soft p-2 text-brand-secondary hover:bg-brand-soft/20 dark:border-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mb-4">
                      <div className="mb-2 flex items-center gap-2">{renderStars(selectedReview.rating)}</div>
                      <p className="font-black text-brand-secondary dark:text-gray-100">{selectedReview.patientName}</p>
                      <p className="text-xs text-brand-primary">{new Date(selectedReview.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                    <div className="rounded-xl border-2 border-brand-soft bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="whitespace-pre-wrap font-bold text-brand-secondary dark:text-gray-100">
                        {selectedReview.comment || 'Комментарий не оставлен'}
                      </p>
                    </div>
                  </div>
                </div>,
                document.body
            )}
      </>
  );
};

export default DoctorProfilePage;
