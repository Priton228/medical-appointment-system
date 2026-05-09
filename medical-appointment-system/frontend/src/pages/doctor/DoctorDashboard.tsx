import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home, Calendar, Users, User, ChevronRight, UserCircle } from 'lucide-react';
import DoctorHome from './DoctorHome';
import DoctorAppointmentsPage from './DoctorAppointmentsPage';
import DoctorSchedulePage from './DoctorSchedulePage';
import DoctorProfilePage from './DoctorProfilePage';
import DoctorPatientsPage from './DoctorPatientsPage';
import ChatPanel from '../../components/chat/ChatPanel';

const DoctorDashboard = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const menuItems = [
    { to: '/doctor', icon: Home, label: 'Главная', end: true },
    { to: '/doctor/appointments', icon: Users, label: 'Приёмы' },
    { to: '/doctor/schedule', icon: Calendar, label: 'Расписание' },
    { to: '/doctor/patients', icon: UserCircle, label: 'Пациенты' },
    { to: '/doctor/profile', icon: User, label: 'Профиль' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Nav - 'Г'-образная структура */}
      <aside className="fixed left-4 top-[110px] bottom-6 w-72 hidden xl:block rounded-2xl bg-white dark:bg-gray-800 border-2 border-brand-soft dark:border-slate-600 shadow-premium">
        <div className="h-full p-6 flex flex-col">
          <div className="mb-10 px-4">
            <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Кабинет врача</p>
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

          <div className="mt-auto p-6 bg-brand-soft/40 dark:bg-slate-700/40 rounded-2xl border-2 border-brand-soft dark:border-slate-600">
            <p className="text-xs font-black text-brand-secondary mb-2">Нужна помощь?</p>
            <p className="text-[10px] text-brand-secondary font-bold leading-relaxed mb-4">Служба поддержки для медицинского персонала</p>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="block w-full py-3 bg-brand-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all border border-brand-soft/20 text-center"
            >
              Написать в поддержку
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 xl:ml-80 pt-[110px] px-4">
        <Routes>
          <Route index element={<DoctorHome />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="patients" element={<DoctorPatientsPage />} />
          <Route path="profile" element={<DoctorProfilePage />} />
        </Routes>
      </div>
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Поддержка"
        subtitle="Чат с администратором"
        partnerName="Администратор"
      />
    </div>
  );
};

export default DoctorDashboard;