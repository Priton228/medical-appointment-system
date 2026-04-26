import { Routes, Route, NavLink } from 'react-router-dom';
import { Calendar, HeartPulse, User, Home, Stethoscope, ChevronRight } from 'lucide-react';
import SymptomsPage from './SymptomsPage';
import DoctorsPage from './DoctorsPage';
import AppointmentsPage from './AppointmentsPage';
import ProfilePage from './ProfilePage';
import PatientHome from './PatientHome';

const PatientDashboard = () => {
  const menuItems = [
    { to: '/patient', icon: Home, label: 'Главная', end: true },
    { to: '/patient/symptoms', icon: Stethoscope, label: 'Подобрать врача' },
    { to: '/patient/doctors', icon: HeartPulse, label: 'Все врачи' },
    { to: '/patient/appointments', icon: Calendar, label: 'Мои записи' },
    { to: '/patient/profile', icon: User, label: 'Профиль' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-90px)] gap-8">
      {/* Sidebar Nav */}
      <aside className="fixed left-6 top-[110px] bottom-6 w-72 hidden xl:block">
        <div className="bg-white h-full rounded-[2.5rem] p-6 border-2 border-brand-soft flex flex-col shadow-premium">
          <div className="mb-10 px-4">
            <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Навигация</p>
          </div>
          
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group
                  ${isActive 
                    ? 'bg-brand-secondary text-white shadow-lg' 
                    : 'text-brand-secondary hover:bg-brand-soft hover:text-brand-secondary'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-4">
                      <item.icon size={22} className={isActive ? 'text-white' : 'text-brand-primary group-hover:text-brand-secondary'} />
                      <span className="font-black text-sm">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className={`transition-transform duration-300 ${isActive ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-6 bg-brand-soft/40 rounded-3xl border-2 border-brand-soft">
            <p className="text-xs font-black text-brand-secondary mb-2">Нужна помощь?</p>
            <p className="text-[10px] text-brand-secondary font-bold leading-relaxed mb-4">Наша служба поддержки работает 24/7 для вашего здоровья.</p>
            <a
              href="mailto:support@medical-system.local?subject=Поддержка%20пациента"
              className="block w-full py-3 bg-brand-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all border border-brand-soft/20 text-center"
            >
              Написать в поддержку
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 xl:ml-80">
        <Routes>
          <Route index element={<PatientHome />} />
          <Route path="symptoms" element={<SymptomsPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </div>
  );
};

export default PatientDashboard;