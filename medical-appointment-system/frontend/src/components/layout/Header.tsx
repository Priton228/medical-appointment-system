import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAvatarStore } from '../../stores/avatarStore';
import { localizeNotification } from '../../utils/notificationText';
import { LogOut, User, Bell, Menu, X, Moon, Sun, Stethoscope, Search, Check, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, chatUnreadCount, loadNotifications, loadChatUnreadCount, markAsRead, deleteNotification } = useNotificationStore();
  const { avatarUrl, loadAvatar } = useAvatarStore();

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'PATIENT' || user?.role === 'DOCTOR' || user?.role === 'ADMIN')) {
      loadNotifications();
      loadChatUnreadCount();
      loadAvatar(user.role);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'PATIENT' && user?.role !== 'DOCTOR' && user?.role !== 'ADMIN')) return;
    const interval = setInterval(() => {
      loadNotifications();
      loadChatUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);




  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="glass-card rounded-2xl px-6 h-18 flex items-center justify-between border-brand-soft">
            <Link to={`/${user?.role?.toLowerCase() || ''}`} className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-all duration-500">
                <Stethoscope size={22} />
              </div>
              <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-brand-secondary leading-none">
                MED<span className="text-brand-primary">CORE</span>
              </span>
                <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] leading-none mt-1 opacity-60">
                Health System
              </span>
              </div>
            </Link>

            {/* Desktop Navigation Extras */}
            <div className="hidden lg:flex items-center bg-brand-soft/30 px-4 py-2 rounded-xl border-2 border-brand-soft max-w-xl w-full ml-12 mr-6">
              <Search size={18} className="text-brand-secondary" />
              <input
                  type="text"
                  placeholder="Поиск врачей, записей или клиник..."
                  className="bg-transparent border-0 outline-0 focus:outline-none focus:ring-0 shadow-none ring-0 focus:ring-0 text-sm w-full ml-3 placeholder:text-brand-secondary/50 font-bold text-brand-secondary"
              />
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl hover:bg-brand-soft transition-all duration-300 border-2 border-transparent hover:border-brand-soft"
              >
                {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-brand-primary" />}
              </button>

              <div className="relative">
                <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2.5 rounded-xl hover:bg-brand-soft transition-all duration-300 relative border-2 border-transparent hover:border-brand-soft group"
                >
                  <Bell size={20} className="text-brand-secondary group-hover:text-brand-primary transition-colors" />
                  {(unreadCount + chatUnreadCount) > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-accent rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-black text-white">
                        {unreadCount + chatUnreadCount}
                      </span>
                  )}
                </button>

                {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border-2 border-brand-soft z-50 overflow-hidden">
                      <div className="p-4 border-b border-brand-soft flex items-center justify-between">
                        <h3 className="font-black text-brand-secondary">Уведомления</h3>
                        <span className="text-xs font-bold text-brand-primary">{unreadCount + chatUnreadCount} новых</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="p-4 text-sm text-brand-secondary text-center">Нет уведомлений</p>
                        ) : (
                            notifications.slice(0, 5).map((notification) => {
                              const item = localizeNotification(notification);
                              return (
                                  <div key={item.id} className={`p-4 border-b border-brand-soft hover:bg-brand-soft/20 ${!item.isRead ? 'bg-brand-soft/10' : ''}`}>
                                    <p className="font-bold text-sm text-brand-secondary">{item.title}</p>
                                    <p className="text-xs text-brand-primary mt-1">{item.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                                    <div className="flex gap-2 mt-2">
                                      {!item.isRead && (
                                          <button onClick={() => markAsRead(item.id)} className="text-[10px] font-black text-brand-primary hover:underline flex items-center gap-1">
                                            <Check size={12} /> Прочитано
                                          </button>
                                      )}
                                      <button onClick={() => deleteNotification(item.id)} className="text-[10px] font-black text-status-error hover:underline flex items-center gap-1">
                                        <Trash2 size={12} /> Удалить
                                      </button>
                                    </div>
                                  </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                )}
              </div>

              <div className="h-8 w-px bg-brand-soft mx-2"></div>

              <Link to={`/${user?.role.toLowerCase()}/profile`} className="flex items-center space-x-3 pl-2 pr-1 py-1 rounded-xl hover:bg-brand-soft transition-all duration-300 border-2 border-transparent hover:border-brand-soft group">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-black text-brand-secondary leading-none">{user?.fullName}</span>
                  <span className="text-[10px] font-black text-brand-primary uppercase mt-1">Личный кабинет</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-secondary text-white flex items-center justify-center border-2 border-brand-soft group-hover:scale-105 transition-transform overflow-hidden">
                  {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                      <User size={20} />
                  )}
                </div>
              </Link>

              <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-brand-secondary hover:text-brand-accent hover:bg-brand-accent/10 transition-all duration-300"
                  title="Выйти"
              >
                <LogOut size={20} />
              </button>
            </div>

            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl bg-brand-soft/20 text-brand-secondary"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
              <div className="md:hidden mt-4 animate-fade-up">
                <div className="glass-card rounded-2xl p-6 border-brand-primary/10">
                  <div className="flex items-center space-x-4 mb-8 p-4 soft-bg rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-white text-brand-primary flex items-center justify-center shadow-sm">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-black text-brand-secondary">{user?.fullName}</p>
                      <p className="text-xs font-bold text-brand-primary/60 uppercase">{user?.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={toggleTheme} className="flex flex-col items-center justify-center p-4 rounded-2xl soft-bg border border-brand-primary/10 space-y-2">
                      {isDarkMode ? <Sun className="text-amber-500" /> : <Moon className="text-brand-primary" />}
                      <span className="text-xs font-bold">{isDarkMode ? 'Светлая' : 'Темная'}</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl soft-bg border border-brand-primary/10 space-y-2 text-brand-primary/60">
                      <Bell className="text-brand-primary" />
                      <span className="text-xs font-bold">Уведомления</span>
                    </button>
                  </div>

                  <button
                      onClick={handleLogout}
                      className="w-full mt-6 py-4 rounded-2xl bg-status-error text-white font-black shadow-lg shadow-status-error/20 flex items-center justify-center space-x-2"
                  >
                    <LogOut size={20} />
                    <span>Выйти из системы</span>
                  </button>
                </div>
              </div>
          )}
        </div>
      </header>
  );
};

export default Header;
