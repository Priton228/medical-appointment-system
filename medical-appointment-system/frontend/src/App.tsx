import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import { useAuthStore } from './stores/authStore';
import Header from './components/layout/Header';
import './index.css';

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-brand-bg text-brand-secondary selection:bg-brand-primary/20 selection:text-brand-secondary">
        <Header />
        <main className="pt-[110px] pb-10 px-6 max-w-[1600px] mx-auto min-h-screen">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/patient" />} />
            
            <Route path="/patient/*" element={user?.role === 'PATIENT' ? <PatientDashboard /> : <Navigate to="/login" />} />
            <Route path="/doctor/*" element={user?.role === 'DOCTOR' ? <DoctorDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/*" element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/login" />} />
            
            <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;