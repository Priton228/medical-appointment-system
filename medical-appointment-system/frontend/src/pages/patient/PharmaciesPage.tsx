import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw, X, Phone, Clock, Globe, Search } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

// Типы
interface UserLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
  ip: string;
}

interface Pharmacy {
  id: number;
  lat: number;
  lon: number;
  name: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  website?: string;
  brand?: string;
}

// Динамическая загрузка Leaflet с CDN
const loadLeaflet = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }

    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error('Не удалось загрузить Leaflet'));
    document.head.appendChild(script);
  });
};

const PharmaciesPage = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const focusPharmacyRef = useRef<(p: Pharmacy) => void>(() => {});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [searchRadius, setSearchRadius] = useState(2000); // в метрах
  const [refreshing, setRefreshing] = useState(false);

  // Получение геолокации по IP
  const fetchUserLocation = async (): Promise<UserLocation> => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Ошибка геолокации');
      const data = await response.json();
      if (!data.latitude || !data.longitude) {
        throw new Error('Не удалось определить координаты');
      }
      return {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || 'Неизвестно',
        country: data.country_name || '',
        ip: data.ip || ''
      };
    } catch (e) {
      // Резервный сервис
      const response = await fetch('https://ipwho.is/');
      const data = await response.json();
      if (!data.success) throw new Error('Не удалось определить местоположение');
      return {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || 'Неизвестно',
        country: data.country || '',
        ip: data.ip || ''
      };
    }
  };

  // Локализация часов работы OSM (Mo-Fr 09:00-18:00 → Пн-Пт 09:00-18:00)
  const localizeOpeningHours = (hours: string): string => {
    if (!hours) return hours;
    const dayMap: Record<string, string> = {
      'Mo': 'Пн', 'Tu': 'Вт', 'We': 'Ср', 'Th': 'Чт',
      'Fr': 'Пт', 'Sa': 'Сб', 'Su': 'Вс',
      'PH': 'Праздники', 'SH': 'Каникулы'
    };
    let result = hours;
    // Замена дней недели (в порядке убывания длины)
    Object.entries(dayMap).forEach(([en, ru]) => {
      result = result.replace(new RegExp(`\\b${en}\\b`, 'g'), ru);
    });
    // Специальные значения
    result = result.replace(/\b24\/7\b/g, 'Круглосуточно');
    result = result.replace(/\boff\b/gi, 'выходной');
    result = result.replace(/\bclosed\b/gi, 'закрыто');
    return result;
  };

  // Формирование адреса из OSM тегов
  const buildAddress = (tags: any): string | undefined => {
    if (tags['addr:full']) return tags['addr:full'];
    const street = tags['addr:street'] || tags['addr:place'];
    const house = tags['addr:housenumber'];
    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'];
    const parts: string[] = [];
    if (street) {
      parts.push(house ? `${street}, ${house}` : street);
    } else if (house) {
      parts.push(house);
    }
    if (city && !parts.some(p => p.includes(city))) parts.push(city);
    if (parts.length > 0) return parts.join(', ');
    return undefined;
  };

  // Поиск аптек через Overpass API с fallback на зеркала
  const fetchPharmacies = async (lat: number, lon: number, radius: number): Promise<Pharmacy[]> => {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="pharmacy"](around:${radius},${lat},${lon});
        way["amenity"="pharmacy"](around:${radius},${lat},${lon});
        relation["amenity"="pharmacy"](around:${radius},${lat},${lon});
      );
      out center tags;
    `;

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://overpass.private.coffee/api/interpreter'
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: query
        });
        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status} (${endpoint})`);
          continue;
        }
        const data = await response.json();
        return (data.elements || []).map((el: any): Pharmacy => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          const tags = el.tags || {};
          return {
            id: el.id,
            lat: elLat,
            lon: elLon,
            name: tags.name || tags['name:ru'] || tags.brand || 'Аптека',
            address: buildAddress(tags),
            phone: tags.phone || tags['contact:phone'] || undefined,
            openingHours: tags.opening_hours ? localizeOpeningHours(tags.opening_hours) : undefined,
            website: tags.website || tags['contact:website'] || undefined,
            brand: tags.brand || tags['brand:ru'] || undefined
          };
        }).filter((p: Pharmacy) => p.lat && p.lon);
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    throw lastError || new Error('Ошибка загрузки аптек');
  };

  // Создание иконки для маркера аптеки
  const createPharmacyIcon = (L: any) => {
    return L.divIcon({
      className: 'custom-pharmacy-marker',
      html: `
        <div style="
          width: 36px; height: 36px;
          background: #10b981;
          border: 3px solid white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          color: white;
          font-weight: bold;
          font-size: 18px;
        ">+</div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  const createUserIcon = (L: any) => {
    return L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          width: 24px; height: 24px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Инициализация карты
  const initializeMap = async () => {
    try {
      setLoading(true);
      setError(null);

      const L = await loadLeaflet();
      const location = await fetchUserLocation();
      setUserLocation(location);

      if (!mapRef.current) return;

      // Создаём карту
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current, {
        center: [location.lat, location.lon],
        zoom: 14,
        zoomControl: true
      });
      mapInstanceRef.current = map;

      // Добавляем тайлы (с учётом темы)
      const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      // Маркер пользователя
      userMarkerRef.current = L.marker([location.lat, location.lon], {
        icon: createUserIcon(L)
      }).addTo(map).bindPopup(`<b>Ваше местоположение</b><br>${location.city}`);

      // Слой для маркеров аптек
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Загружаем аптеки
      await loadPharmacies(location.lat, location.lon, searchRadius, L);

      setLoading(false);
    } catch (e: any) {
      console.error('Map init error:', e);
      setError(e.message || 'Ошибка загрузки карты');
      setLoading(false);
    }
  };

  // Загрузка аптек на карту
  const loadPharmacies = async (lat: number, lon: number, radius: number, L?: any) => {
    try {
      setRefreshing(true);
      const leaflet = L || (window as any).L;
      const pharmacyList = await fetchPharmacies(lat, lon, radius);
      setPharmacies(pharmacyList);

      // Очищаем старые маркеры
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      // Добавляем новые
      const icon = createPharmacyIcon(leaflet);
      pharmacyList.forEach(pharmacy => {
        const marker = leaflet.marker([pharmacy.lat, pharmacy.lon], { icon });
        marker.on('click', () => focusPharmacyRef.current(pharmacy));
        marker.bindTooltip(pharmacy.name, { direction: 'top', offset: [0, -10] });
        markersLayerRef.current.addLayer(marker);
      });

      setRefreshing(false);
    } catch (e: any) {
      console.error('Pharmacies error:', e);
      setError('Не удалось загрузить аптеки');
      setRefreshing(false);
    }
  };

  // Обновление при изменении темы
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      const L = (window as any).L;
      if (!L) return;
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }
  }, [isDarkMode]);

  // Инициализация
  useEffect(() => {
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обработчик закрытия модалки по Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPharmacy(null);
    };
    if (selectedPharmacy) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [selectedPharmacy]);

  const handleRefresh = async () => {
    if (!userLocation) return;
    await loadPharmacies(userLocation.lat, userLocation.lon, searchRadius);
  };

  const handleRadiusChange = async (newRadius: number) => {
    setSearchRadius(newRadius);
    if (userLocation) {
      await loadPharmacies(userLocation.lat, userLocation.lon, newRadius);
    }
  };

  // Reverse geocoding через Nominatim для аптек без адреса
  const reverseGeocode = async (lat: number, lon: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=ru`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) return undefined;
      const data = await response.json();
      const addr = data.address || {};
      const street = addr.road || addr.pedestrian || addr.footway || addr.path;
      const house = addr.house_number;
      const city = addr.city || addr.town || addr.village || addr.suburb;
      const parts: string[] = [];
      if (street) {
        parts.push(house ? `${street}, ${house}` : street);
      } else if (house) {
        parts.push(house);
      }
      if (city && !parts.some(p => p.includes(city))) parts.push(city);
      return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(',');
    } catch {
      return undefined;
    }
  };

  const focusPharmacy = async (pharmacy: Pharmacy) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pharmacy.lat, pharmacy.lon], 17, { duration: 1 });
    }
    setSelectedPharmacy(pharmacy);

    // Если адрес не указан - пытаемся подгрузить через reverse geocoding
    if (!pharmacy.address) {
      const resolvedAddress = await reverseGeocode(pharmacy.lat, pharmacy.lon);
      if (resolvedAddress) {
        const updated = { ...pharmacy, address: resolvedAddress };
        setPharmacies(prev => prev.map(p => p.id === pharmacy.id ? updated : p));
        setSelectedPharmacy(prev => prev && prev.id === pharmacy.id ? updated : prev);
      }
    }
  };

  // Синхронизация focusPharmacy с ref для использования внутри обработчиков маркеров
  useEffect(() => {
    focusPharmacyRef.current = focusPharmacy;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-slate-600 p-6 shadow-premium">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <MapPin size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-secondary dark:text-white">Аптеки рядом</h1>
              <p className="text-sm text-brand-secondary/70 dark:text-gray-400 font-bold">
                {userLocation
                  ? `${userLocation.city}${userLocation.country ? ', ' + userLocation.country : ''} (IP: ${userLocation.ip})`
                  : 'Определяем ваше местоположение...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={searchRadius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              disabled={loading || refreshing}
              className="px-4 py-2 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-white dark:bg-gray-700 text-brand-secondary dark:text-white font-bold text-sm focus:outline-none focus:border-brand-primary disabled:opacity-50"
            >
              <option value={1000}>1 км</option>
              <option value={2000}>2 км</option>
              <option value={5000}>5 км</option>
              <option value={10000}>10 км</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing || !userLocation}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300 font-bold text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Карта */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-slate-600 shadow-premium overflow-hidden">
            <div className="relative" style={{ height: '600px' }}>
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-gray-800/90">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw size={40} className="text-brand-primary animate-spin" />
                    <p className="text-brand-secondary dark:text-white font-black">Загрузка карты...</p>
                  </div>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
            </div>
          </div>
        </div>

        {/* Список аптек */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-slate-600 shadow-premium p-4 flex flex-col" style={{ maxHeight: '600px' }}>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="font-black text-brand-secondary dark:text-white">
              Найдено: {pharmacies.length}
            </h2>
            <Search size={18} className="text-brand-primary" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {pharmacies.length === 0 && !loading ? (
              <div className="text-center py-12 text-brand-secondary/60 dark:text-gray-400 font-bold text-sm">
                Аптеки не найдены в выбранном радиусе
              </div>
            ) : (
              pharmacies.map(pharmacy => (
                <button
                  key={pharmacy.id}
                  onClick={() => focusPharmacy(pharmacy)}
                  className="w-full text-left p-3 rounded-xl border-2 border-brand-soft dark:border-slate-600 bg-brand-soft/20 dark:bg-slate-700/40 hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white">
                      <MapPin size={18} className="text-white group-hover:text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-brand-secondary dark:text-white group-hover:text-white truncate">
                        {pharmacy.name}
                      </p>
                      {pharmacy.address && (
                        <p className="text-xs text-brand-secondary/70 dark:text-gray-400 group-hover:text-white/90 truncate font-bold">
                          {pharmacy.address}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно с деталями аптеки */}
      {selectedPharmacy && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPharmacy(null)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-soft dark:border-slate-600 shadow-2xl p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPharmacy(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-brand-soft/40 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-brand-secondary dark:text-white transition-all flex items-center justify-center"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <MapPin size={28} className="text-white" />
              </div>
              <div className="flex-1 pr-10">
                <h3 className="font-black text-xl text-brand-secondary dark:text-white mb-1">
                  {selectedPharmacy.name}
                </h3>
                {selectedPharmacy.brand && selectedPharmacy.brand !== selectedPharmacy.name && (
                  <p className="text-xs font-bold text-brand-primary uppercase tracking-wider">
                    {selectedPharmacy.brand}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {selectedPharmacy.address && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-soft/30 dark:bg-slate-700/40 border border-brand-soft dark:border-slate-600">
                  <MapPin size={18} className="text-brand-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-brand-secondary/60 dark:text-gray-400 uppercase tracking-wider mb-1">Адрес</p>
                    <p className="text-sm font-bold text-brand-secondary dark:text-white">{selectedPharmacy.address}</p>
                  </div>
                </div>
              )}

              {selectedPharmacy.phone && (
                <a
                  href={`tel:${selectedPharmacy.phone}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-brand-soft/30 dark:bg-slate-700/40 border border-brand-soft dark:border-slate-600 hover:bg-brand-primary hover:text-white transition-all group"
                >
                  <Phone size={18} className="text-brand-primary flex-shrink-0 mt-0.5 group-hover:text-white" />
                  <div>
                    <p className="text-xs font-black text-brand-secondary/60 dark:text-gray-400 group-hover:text-white/80 uppercase tracking-wider mb-1">Телефон</p>
                    <p className="text-sm font-bold text-brand-secondary dark:text-white group-hover:text-white">{selectedPharmacy.phone}</p>
                  </div>
                </a>
              )}

              {selectedPharmacy.openingHours && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-soft/30 dark:bg-slate-700/40 border border-brand-soft dark:border-slate-600">
                  <Clock size={18} className="text-brand-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-brand-secondary/60 dark:text-gray-400 uppercase tracking-wider mb-1">Часы работы</p>
                    <p className="text-sm font-bold text-brand-secondary dark:text-white">{selectedPharmacy.openingHours}</p>
                  </div>
                </div>
              )}

              {selectedPharmacy.website && (
                <a
                  href={selectedPharmacy.website.startsWith('http') ? selectedPharmacy.website : `https://${selectedPharmacy.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-brand-soft/30 dark:bg-slate-700/40 border border-brand-soft dark:border-slate-600 hover:bg-brand-primary hover:text-white transition-all group"
                >
                  <Globe size={18} className="text-brand-primary flex-shrink-0 mt-0.5 group-hover:text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-brand-secondary/60 dark:text-gray-400 group-hover:text-white/80 uppercase tracking-wider mb-1">Сайт</p>
                    <p className="text-sm font-bold text-brand-secondary dark:text-white group-hover:text-white truncate">{selectedPharmacy.website}</p>
                  </div>
                </a>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <a
                href={`https://www.openstreetmap.org/?mlat=${selectedPharmacy.lat}&mlon=${selectedPharmacy.lon}#map=18/${selectedPharmacy.lat}/${selectedPharmacy.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-soft/40 dark:bg-slate-700 text-brand-secondary dark:text-white rounded-xl font-black text-sm border-2 border-brand-soft dark:border-slate-600 hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all"
              >
                <MapPin size={16} />
                На карте
              </a>
              {userLocation && (
                <a
                  href={`https://www.openstreetmap.org/directions?from=${userLocation.lat}%2C${userLocation.lon}&to=${selectedPharmacy.lat}%2C${selectedPharmacy.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-primary text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  <Navigation size={16} />
                  Маршрут
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmaciesPage;
