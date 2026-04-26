import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Введите полное имя'),
  email: z.string().email('Некорректный email адрес'),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.fullName, data.email, data.phone, data.password, data.confirmPassword);
      toast.success('Регистрация успешна!');
      navigate('/login');
    } catch (error) {
      toast.error('Ошибка при регистрации');
    }
  };

  return (
    <div className="min-h-[calc(100vh-90px)] flex items-center justify-center p-6 -mt-10 bg-brand-bg">
      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white rounded-[2.5rem] shadow-premium overflow-hidden border-2 border-brand-soft animate-fade-up">
        
        {/* Left Side: Brand & Benefits */}
        <div className="lg:w-2/5 bg-brand-secondary p-12 text-white relative overflow-hidden hidden lg:flex flex-col justify-between border-r-2 border-white/10">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-8 shadow-lg">
              <Stethoscope size={24} className="text-brand-secondary" />
            </div>
            <h1 className="text-4xl font-black mb-6 leading-tight text-white">
              Начните путь к <br />
              <span className="text-brand-soft">здоровью сегодня.</span>
            </h1>
            <p className="text-white text-lg leading-relaxed mb-12 font-bold">
              Присоединяйтесь к тысячам пациентов, которые уже доверили нам заботу о своем благополучии.
            </p>

            <div className="space-y-6">
              {[
                'Запись к врачу в пару кликов',
                'Доступ к анализам 24/7',
                'Умная система симптомов',
                'Персональные рекомендации'
              ].map((benefit, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30">
                    <ShieldCheck size={14} />
                  </div>
                  <span className="text-sm font-black text-white">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-brand-accent/20 rounded-full blur-[80px]"></div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:w-3/5 p-12 md:p-16 bg-white">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-brand-secondary mb-3 tracking-tight">Создать аккаунт</h2>
            <p className="text-brand-secondary font-black uppercase tracking-widest text-[10px] opacity-70">Заполните форму для регистрации в системе</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Полное имя (ФИО)</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    {...registerField('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Email адрес</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    {...registerField('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Телефон</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-bold text-brand-secondary placeholder:text-brand-secondary/40"
                    {...registerField('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Пароль</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                    {...registerField('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-brand-secondary uppercase tracking-widest ml-1">Подтвердите пароль</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-secondary focus:bg-white outline-none transition-all duration-300 font-black text-brand-secondary placeholder:text-brand-secondary/40"
                    {...registerField('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-status-error text-[10px] font-black uppercase tracking-wider ml-1 animate-pulse">{errors.confirmPassword.message}</p>
                )}
              </div>
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
                  <span>Создать аккаунт</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-brand-secondary font-bold text-sm">
              Уже есть аккаунт?{' '}
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

export default RegisterPage;
