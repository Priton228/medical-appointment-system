import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, User, Bell, Menu, X, Moon, Sun, Stethoscope, Search } from 'lucide-react';
import { useState } from 'react';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!isAuthenticated) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card rounded-2xl px-6 h-18 flex items-center justify-between border-brand-soft">
          <Link to={`/${user?.role.toLowerCase()}`} className="flex items-center space-x-3 group">
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
          <div className="hidden lg:flex items-center bg-brand-soft/20 px-4 py-2 rounded-xl border-2 border-brand-soft max-w-md w-full mx-12 shadow-sm focus-within:shadow-md transition-shadow">
            <Search size={18} className="text-brand-secondary" />
            <input 
              type="text" 
              placeholder="Поиск врачей, записей или клиник..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 placeholder:text-brand-secondary/50 font-bold text-brand-secondary"
            />
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl hover:bg-brand-soft transition-all duration-300 border-2 border-transparent hover:border-brand-soft shadow-sm"
            >
              {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-brand-secondary" />}
            </button>

            <button className="p-2.5 rounded-xl hover:bg-brand-soft transition-all duration-300 relative border-2 border-transparent hover:border-brand-soft shadow-sm group">
              <Bell size={20} className="text-brand-secondary group-hover:text-brand-primary transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-accent rounded-full ring-2 ring-white"></span>
            </button>

            <div className="h-8 w-px bg-brand-soft mx-2"></div>

            <Link to={`/${user?.role.toLowerCase()}`} className="flex items-center space-x-3 pl-2 pr-1 py-1 rounded-xl hover:bg-brand-soft transition-all duration-300 border-2 border-transparent hover:border-brand-soft group shadow-sm">
              <div className="flex flex-col text-right">
                <span className="text-sm font-black text-brand-secondary leading-none">{user?.fullName}</span>
                <span className="text-[10px] font-black text-brand-primary uppercase mt-1">Личный кабинет</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-secondary text-white flex items-center justify-center border-2 border-brand-soft group-hover:scale-105 transition-transform">
                <User size={20} />
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
                  <p className="font-black text-brand-secondary dark:text-white">{user?.fullName}</p>
                  <p className="text-xs font-bold text-brand-primary/60 uppercase">{user?.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={toggleDarkMode} className="flex flex-col items-center justify-center p-4 rounded-2xl soft-bg border border-brand-primary/10 space-y-2">
                  {darkMode ? <Sun className="text-amber-500" /> : <Moon className="text-brand-primary" />}
                  <span className="text-xs font-bold">{darkMode ? 'Светлая' : 'Темная'}</span>
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
