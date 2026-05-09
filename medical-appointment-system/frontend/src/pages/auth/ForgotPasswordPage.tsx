import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Sun, Moon, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import AuthCat from '../../components/auth/AuthCat';

type Step = 'email' | 'code' | 'password';

const ForgotPasswordPage = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Введите корректный email');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success('Код отправлен на ваш email');
      setStep('code');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.verifyCode(email, code);
      toast.success('Код подтверждён');
      setStep('password');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, code, newPassword, confirmPassword);
      toast.success('Пароль успешно изменён! Войдите с новым паролем.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-[calc(100vh-90px)] flex items-center justify-center p-6 -mt-10 bg-brand-bg">
        <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-[2.5rem] shadow-premium overflow-hidden border-2 border-brand-soft animate-fade-up">

          {/* Left Side: Cat */}
          <div className="lg:w-1/2 bg-brand-secondary p-8 text-white relative overflow-hidden hidden lg:flex flex-col items-center justify-center border-r-2 border-white/10">
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
                  isPasswordField={focusedField === 'password' || focusedField === 'newPassword'}
                  isDarkMode={isDarkMode}
              />
            </div>

            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-brand-accent/20 rounded-full blur-[80px]"></div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:w-1/2 p-12 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-brand-secondary mb-3 tracking-tight">
                {step === 'email' && 'Восстановление пароля'}
                {step === 'code' && 'Введите код'}
                {step === 'password' && 'Новый пароль'}
              </h2>
              <p className="text-brand-secondary font-black uppercase tracking-widest text-[10px] opacity-70">
                {step === 'email' && 'Укажите email для получения кода'}
                {step === 'code' && 'Мы отправили 6-значный код на ' + email}
                {step === 'password' && 'Придумайте новый пароль'}
              </p>
            </div>

            {/* Step 1: Email */}
            {step === 'email' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Email адрес</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                      <input
                          type="email"
                          placeholder="name@example.com"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                      />
                    </div>
                  </div>

                  <button
                      type="button"
                      onClick={sendCode}
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl bg-brand-secondary text-white font-black text-lg shadow-xl hover:bg-brand-secondary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 group mt-8"
                  >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                          <span>Отправить код</span>
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                  </button>
                </div>
            )}

            {/* Step 2: Code */}
            {step === 'code' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Код из письма</label>
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                      <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40 tracking-[0.5em] text-center"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onFocus={() => setFocusedField('code')}
                          onBlur={() => setFocusedField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                      />
                    </div>
                  </div>

                  <button
                      type="button"
                      onClick={verifyCode}
                      disabled={isLoading || code.length !== 6}
                      className="w-full py-4 rounded-2xl bg-brand-secondary text-white font-black text-lg shadow-xl hover:bg-brand-secondary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 group mt-8 disabled:opacity-50"
                  >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                          <span>Подтвердить код</span>
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                  </button>

                  <button
                      type="button"
                      onClick={sendCode}
                      disabled={isLoading}
                      className="w-full text-center text-sm font-black text-brand-secondary hover:underline opacity-70 hover:opacity-100"
                  >
                    Отправить код повторно
                  </button>
                </div>
            )}

            {/* Step 3: New Password */}
            {step === 'password' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Новый пароль</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                      <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={() => setFocusedField('newPassword')}
                          onBlur={() => setFocusedField(null)}
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 hover:opacity-100 transition-opacity"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Подтвердите пароль</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                      <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('confirmPassword')}
                          onBlur={() => setFocusedField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && resetPassword()}
                      />
                    </div>
                  </div>

                  <button
                      type="button"
                      onClick={resetPassword}
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl bg-brand-secondary text-white font-black text-lg shadow-xl hover:bg-brand-secondary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 group mt-8"
                  >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                          <span>Сохранить пароль</span>
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                  </button>
                </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-brand-secondary font-bold text-sm">
                Вспомнили пароль?{' '}
                <Link to="/login" className="text-brand-secondary hover:underline font-black uppercase tracking-wider border-b-2 border-brand-soft pb-0.5">
                  Войти
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default ForgotPasswordPage;
