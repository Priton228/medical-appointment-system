import { useState } from 'react';
import { Search, ChevronRight, User, Clock, Star, Calendar, AlertTriangle, CheckCircle2, ArrowLeft, Sparkles, Activity } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { patientApi } from '../../services/api';
import type { SymptomRecommendationResponse, SymptomResponse } from '../../services/api';

const SymptomsPage = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [symptomsList, setSymptomsList] = useState<SymptomResponse[]>([]);
  const [recommendation, setRecommendation] = useState<SymptomRecommendationResponse | null>(null);

  useEffect(() => {
    const loadSymptoms = async () => {
      try {
        setSymptomsList(await patientApi.getSymptoms());
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Не удалось загрузить симптомы');
      }
    };
    loadSymptoms();
  }, []);

  const filteredSymptoms = symptomsList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSymptom = (id: number) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) return;
    setIsLoading(true);
    try {
      const rec = await patientApi.getRecommendations(selectedSymptoms);
      setRecommendation(rec);
      setShowResults(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось подобрать врачей');
    } finally {
      setIsLoading(false);
    }
  };

  const hasUrgentSymptoms = selectedSymptoms.some(id => 
    symptomsList.find(s => s.id === id)?.isUrgent
  );

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-brand-secondary tracking-tight leading-tight">Умный подбор врача</h1>
          <p className="text-brand-secondary mt-2 font-black uppercase tracking-widest text-[10px]">Искусственный интеллект поможет вам с выбором</p>
        </div>
        {showResults && (
          <button
            onClick={() => setShowResults(false)}
            className="flex items-center space-x-2 text-brand-secondary font-black hover:bg-brand-soft px-6 py-3 rounded-2xl transition-all border-2 border-brand-soft"
          >
            <ArrowLeft size={20} />
            <span>Изменить симптомы</span>
          </button>
        )}
      </div>

      {!showResults ? (
        <div className="space-y-8">
          {hasUrgentSymptoms && (
            <div className="bg-status-error text-white border-4 border-status-error/30 rounded-[2rem] p-8 flex items-start space-x-6 animate-pulse shadow-xl">
              <div className="p-4 bg-white text-status-error rounded-2xl shadow-lg">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-white font-black text-xl mb-1">Обнаружены критические симптомы</h3>
                <p className="text-white font-bold text-sm leading-relaxed">
                  Ваше состояние требует приоритетного внимания. После выбора врача вам будут предложены ближайшие окна для записи вне очереди.
                </p>
              </div>
            </div>
          )}

          <div className="premium-card p-10 relative overflow-hidden bg-white border-2 border-brand-soft shadow-premium">
            <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
              <Sparkles size={200} className="text-brand-primary" />
            </div>

            <div className="mb-10 relative z-10">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-secondary group-focus-within:text-brand-primary transition-colors" size={28} />
                <input
                  type="text"
                  placeholder="Опишите, что вас беспокоит..."
                  className="w-full pl-18 pr-6 py-6 rounded-3xl bg-brand-soft/20 border-2 border-brand-soft focus:border-brand-primary focus:bg-white outline-none transition-all duration-300 font-black text-xl text-brand-secondary shadow-inner placeholder:text-brand-secondary/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12 relative z-10">
              {filteredSymptoms.map(symptom => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`group relative p-6 rounded-[1.5rem] text-left transition-all duration-500 border-2 overflow-hidden ${
                    selectedSymptoms.includes(symptom.id)
                      ? 'bg-brand-secondary border-brand-secondary shadow-xl -translate-y-1'
                      : 'bg-white border-brand-soft hover:border-brand-primary hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      selectedSymptoms.includes(symptom.id) ? 'text-white/70' : 'text-brand-primary'
                    }`}>
                      {symptom.isUrgent ? 'Критический' : 'Базовый'}
                    </span>
                    {selectedSymptoms.includes(symptom.id) ? (
                      <CheckCircle2 size={20} className="text-white animate-scale-in" />
                    ) : symptom.isUrgent && (
                      <AlertTriangle size={16} className="text-status-error" />
                    )}
                  </div>
                  <p className={`font-black text-lg transition-colors ${
                    selectedSymptoms.includes(symptom.id) ? 'text-white' : 'text-brand-secondary'
                  }`}>
                    {symptom.name}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 p-8 bg-brand-secondary rounded-[2rem] text-white shadow-2xl">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center font-black text-3xl text-brand-accent border border-white/20">
                  {selectedSymptoms.length}
                </div>
                <div>
                  <p className="text-brand-accent font-black uppercase tracking-widest text-[10px]">Выбрано симптомов</p>
                  <p className="text-white text-sm font-bold">Чем больше данных, тем точнее подбор</p>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={selectedSymptoms.length === 0 || isLoading}
                className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-brand-primary text-white font-black text-xl shadow-2xl hover:bg-white hover:text-brand-primary transition-all duration-500 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-4 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Анализируем...</span>
                  </>
                ) : (
                  <>
                    <span>Найти специалиста</span>
                    <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-up">
          <div className="premium-card p-10 bg-white border-2 border-brand-soft shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.05]">
              <Activity size={240} className="text-brand-primary" />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-12 mb-12">
              <div className="max-w-2xl">
                <div className="inline-flex items-center space-x-2 bg-brand-soft/40 border border-brand-soft px-4 py-2 rounded-full mb-6">
                      <Sparkles size={16} className="text-brand-secondary" />
                  <span className="text-xs font-black uppercase tracking-widest text-brand-secondary">Рекомендация AI</span>
                </div>
                <h2 className="text-5xl font-black text-brand-secondary mb-6 leading-tight">{recommendation?.recommendedSpecialization || 'Подходящие специалисты'}</h2>
                <p className="text-brand-secondary text-lg font-black leading-relaxed italic border-l-4 border-brand-primary pl-6 bg-brand-soft/10 py-4 rounded-r-2xl">
                  "Подбор выполнен по выбранным симптомам из базы данных."
                </p>
              </div>
              <div className="lg:text-right p-10 bg-brand-soft/20 rounded-[3rem] border-2 border-brand-soft shadow-inner min-w-[240px]">
                <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] mb-2">Точность подбора</p>
                <span className="text-7xl font-black text-brand-primary">DB</span>
              </div>
            </div>

            <div className="border-t-2 border-brand-soft pt-12">
              <h3 className="text-2xl font-black text-brand-secondary mb-8 flex items-center">
                <div className="w-3 h-10 bg-brand-primary rounded-full mr-4 shadow-lg shadow-brand-primary/30"></div>
                Рекомендованные врачи
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {(recommendation?.doctors || []).map(doctor => (
                  <div key={doctor.id} className="group flex flex-col md:flex-row items-center justify-between p-8 rounded-[2.5rem] bg-brand-soft/10 hover:bg-white border-2 border-transparent hover:border-brand-soft hover:shadow-2xl transition-all duration-500">
                    <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8 text-center md:text-left mb-8 md:mb-0">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-3xl bg-white text-brand-primary flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500 border-2 border-brand-soft">
                          <User size={48} />
                        </div>
                        <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-2xl shadow-lg border border-brand-soft flex items-center space-x-1">
                          <Star size={16} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-black text-brand-secondary">{doctor.rating}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-brand-secondary group-hover:text-brand-primary transition-colors">{doctor.fullName}</h4>
                        <p className="text-brand-primary font-black uppercase tracking-widest text-[10px] mt-1">{doctor.description || 'Врач'}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
                          <div className="flex items-center text-sm font-black text-brand-secondary">
                            <Clock size={18} className="mr-2 text-brand-primary" />
                            {doctor.experienceYears ?? 0} лет практики
                          </div>
                          <div className="flex items-center text-sm font-black text-brand-secondary">
                            <Calendar size={18} className="mr-2 text-brand-primary" />
                            Рейтинг {doctor.rating ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Выберите слот на странице "Все врачи"')} className="w-full md:w-auto px-10 py-5 rounded-2xl bg-brand-primary text-white font-black text-lg shadow-xl shadow-brand-primary/20 hover:bg-brand-secondary hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 uppercase tracking-widest text-xs">
                      <Calendar size={22} />
                      <span>Записаться</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomsPage;
