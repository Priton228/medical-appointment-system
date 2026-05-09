import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import toast from 'react-hot-toast';
import AuthCat from '../../components/auth/AuthCat';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const user = await login(data.email, data.password);
      toast.success('Добро пожаловать!');
      navigate(`/${user.role?.toLowerCase() || ''}`);
    } catch (error: any) {
      // Toast is already shown by authStore; do not duplicate
      console.error('Login failed:', error);
    }
  };

  return (
      <div className="min-h-[calc(100vh-90px)] flex items-center justify-center p-6 -mt-10 bg-brand-bg">
        <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-[2.5rem] shadow-premium overflow-hidden border-2 border-brand-soft animate-fade-up">

          {/* Left Side: Cat */}
          <div className="lg:w-1/2 bg-brand-secondary p-8 text-white relative overflow-hidden hidden lg:flex flex-col items-center justify-center border-r-2 border-white/10">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 hover:bg-white/20 transition-all z-20"
                title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-white" />}
            </button>

            <div className="relative z-10 flex items-center justify-center h-full">
              <AuthCat
                  isEmailField={focusedField === 'email'}
                  isPasswordField={focusedField === 'password'}
                  isDarkMode={isDarkMode}
              />
            </div>

            {/* Abstract Decorations */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-brand-accent/20 rounded-full blur-[80px]"></div>
          </div>

          {/* Right Side: Login Form */}
          <div className="lg:w-1/2 p-12 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-brand-secondary mb-3 tracking-tight">Вход в систему</h2>
              <p className="text-brand-secondary font-black uppercase tracking-widest text-[10px] opacity-70">Введите ваши данные для доступа</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Email адрес</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                      type="email"
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                      {...register('email')}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                  />
                </div>
                {errors.email && (
                    <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest">Пароль</label>
                  <Link to="/forgot-password" className="text-[10px] font-black text-brand-secondary uppercase tracking-wider hover:underline opacity-70 hover:opacity-100">
                    Забыли пароль?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                      {...register('password')}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                  />
                </div>
                {errors.password && (
                    <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.password.message}</p>
                )}
              </div>

              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-brand-secondary text-white font-black text-lg shadow-xl hover:bg-brand-secondary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 group mt-8"
              >
                {isLoading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                      <span>Войти в аккаунт</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-brand-secondary font-bold text-sm">
                У вас еще нет аккаунта?{' '}
                <Link to="/register" className="text-brand-secondary hover:underline font-black uppercase tracking-wider border-b-2 border-brand-soft pb-0.5">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default LoginPage;
