import { useEffect, useState } from 'react';
import { Save, Lock, User, Mail, Phone, Shield, RefreshCw, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type AdminProfileResponse, type UpdateAdminProfileRequest } from '../../services/api';

const AdminProfileSection = () => {
  const [profile, setProfile] = useState<AdminProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarInput, setAvatarInput] = useState('');

  const [form, setForm] = useState<UpdateAdminProfileRequest>({
    fullName: '',
    email: '',
    phone: '',
    username: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProfile();
      setProfile(data);
      setForm({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || '',
        username: data.username,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminApi.updateProfile(form);
      toast.success('Профиль обновлён');
      loadProfile();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarInput.trim()) return;
    try {
      await adminApi.uploadAvatar(avatarInput.trim());
      toast.success('Аватар обновлён');
      setAvatarInput('');
      loadProfile();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка загрузки аватара');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    try {
      await adminApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Пароль изменён');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw size={40} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Карточка профиля */}
      <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-brand-secondary text-white flex items-center justify-center text-4xl font-black border-4 border-brand-soft dark:border-slate-600 shadow-xl overflow-hidden">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.fullName?.[0]?.toUpperCase() || 'A'
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-md">
              <Shield size={18} className="text-white" />
            </div>
          </div>
          <h3 className="text-xl font-black text-brand-secondary dark:text-white">{profile?.fullName}</h3>
          <p className="text-sm font-bold text-brand-primary mt-1 uppercase tracking-wider">Администратор</p>
          <p className="text-xs font-bold text-brand-secondary/60 dark:text-gray-400 mt-1">
            {profile?.email}
          </p>
          <p className="text-xs font-bold text-brand-secondary/40 dark:text-gray-500 mt-4">
            Создан: {new Date(profile?.createdAt || '').toLocaleDateString('ru-RU')}
          </p>
        </div>

        {/* Загрузка аватара */}
        <div className="mt-8 pt-6 border-t-2 border-brand-soft dark:border-slate-600">
          <p className="text-sm font-black text-brand-secondary dark:text-white mb-3 flex items-center gap-2">
            <Camera size={16} className="text-brand-primary" />
            Ссылка на аватар
          </p>
          <input
            value={avatarInput}
            onChange={(e) => setAvatarInput(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-4 py-2 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 text-sm font-bold text-brand-secondary dark:text-white mb-3"
          />
          <button
            onClick={handleAvatarSave}
            disabled={!avatarInput.trim()}
            className="w-full py-2 bg-brand-primary text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            Обновить аватар
          </button>
        </div>
      </section>

      {/* Редактирование профиля */}
      <section className="premium-card p-8 bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 lg:col-span-2">
        <h3 className="text-2xl font-black text-brand-secondary dark:text-white mb-6 flex items-center gap-3">
          <User size={24} className="text-brand-primary" />
          Редактировать профиль
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-brand-secondary/70 dark:text-gray-400 mb-2">
              ФИО
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
              <input
                value={form.fullName}
                onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-brand-secondary/70 dark:text-gray-400 mb-2">
              Имя пользователя
            </label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
              <input
                value={form.username}
                onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-brand-secondary/70 dark:text-gray-400 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-brand-secondary/70 dark:text-gray-400 mb-2">
              Телефон
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
              <input
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Смена пароля */}
        <div className="mt-8 pt-8 border-t-2 border-brand-soft dark:border-slate-600">
          <h4 className="text-lg font-black text-brand-secondary dark:text-white mb-4 flex items-center gap-2">
            <Lock size={20} className="text-status-error" />
            Изменить пароль
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="password"
              placeholder="Текущий пароль"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))}
              className="px-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
            />
            <input
              type="password"
              placeholder="Новый пароль"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))}
              className="px-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
            />
            <input
              type="password"
              placeholder="Подтвердите пароль"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))}
              className="px-4 py-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700 font-bold text-brand-secondary dark:text-white"
            />
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleChangePassword}
              disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="flex items-center gap-2 px-6 py-3 bg-status-error text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Lock size={18} />
              Изменить пароль
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminProfileSection;
