import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage') 
    ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.accessToken 
    : null;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export interface DoctorDashboardResponse {
  appointmentsToday: number;
  totalAppointments: number;
  completedAppointments: number;
  activeSlots: number;
}

export interface AppointmentResponse {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  symptomsDescription: string | null;
  doctorNotes: string | null;
  diagnosis: string | null;
  treatmentRecommendations: string | null;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentResponse['status'];
  doctorNotes?: string | null;
  diagnosis?: string | null;
  treatmentRecommendations?: string | null;
  cancelReason?: string | null;
}

export interface SlotResponse {
  id: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isBlocked: boolean;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
}

export interface DoctorResponse {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  specializationId: number | null;
  specializationName: string | null;
  description: string;
  experienceYears: number;
  education: string;
  rating: number;
  totalRatings: number;
}

export interface UpsertDoctorRequest {
  fullName: string;
  email: string;
  phone: string;
  specializationId: number | null;
  description: string;
  experienceYears: number;
  education: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  isBlocked: boolean;
}

export interface SpecializationResponse {
  id: number;
  name: string;
  description: string;
}

export interface SymptomResponse {
  id: number;
  name: string;
  description: string;
  isUrgent: boolean;
}

export interface UpsertSymptomRequest {
  name: string;
  description: string;
  isUrgent: boolean;
}

export interface UpsertSlotRequest {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PatientProfileResponse {
  userId: number;
  patientId: number;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
}

export interface UpdatePatientProfileRequest {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
}

export interface MedicalRecordResponse {
  id: number;
  doctorName: string;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  complaints: string | null;
  examinationResults: string | null;
  createdAt: string;
}

export interface PatientDashboardResponse {
  totalAppointments: number;
  activeAppointments: number;
  medicalRecords: number;
  upcomingAppointments: AppointmentResponse[];
}

export interface SymptomRecommendationResponse {
  recommendedSpecialization: string;
  doctors: DoctorResponse[];
}

export interface PatientNotificationResponse {
  id: number;
  type:
    | 'APPOINTMENT_REMINDER'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_CANCELLED'
    | 'APPOINTMENT_RESCHEDULED'
    | 'APPOINTMENT_COMPLETED'
    | 'SYSTEM_NOTIFICATION'
    | 'MASS_NOTIFICATION';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const doctorApi = {
  getDashboard: async () => (await api.get<DoctorDashboardResponse>('/doctor/dashboard')).data,
  getTodayAppointments: async () => (await api.get<AppointmentResponse[]>('/doctor/appointments/today')).data,
  getAppointments: async () => (await api.get<AppointmentResponse[]>('/doctor/appointments')).data,
  updateAppointmentStatus: async (appointmentId: number, payload: UpdateAppointmentStatusPayload) =>
    (await api.patch<AppointmentResponse>(`/doctor/appointments/${appointmentId}/status`, payload)).data,
  rescheduleAppointment: async (appointmentId: number, newSlotId: number) =>
    (await api.patch<AppointmentResponse>(`/doctor/appointments/${appointmentId}/reschedule`, { newSlotId })).data,
  getSlots: async () => (await api.get<SlotResponse[]>('/doctor/slots')).data,
  createSlot: async (payload: UpsertSlotRequest) => (await api.post<SlotResponse>('/doctor/slots', payload)).data,
  updateSlot: async (slotId: number, payload: UpsertSlotRequest) =>
    (await api.put<SlotResponse>(`/doctor/slots/${slotId}`, payload)).data,
  deleteSlot: async (slotId: number) => api.delete(`/doctor/slots/${slotId}`),
};

export const adminApi = {
  getSpecializations: async () => (await api.get<SpecializationResponse[]>('/admin/specializations')).data,
  getDashboard: async () => (await api.get<AdminDashboardResponse>('/admin/dashboard')).data,
  getDoctors: async () => (await api.get<DoctorResponse[]>('/admin/doctors')).data,
  createDoctor: async (payload: UpsertDoctorRequest) => (await api.post<DoctorResponse>('/admin/doctors', payload)).data,
  updateDoctor: async (doctorId: number, payload: UpsertDoctorRequest) =>
    (await api.put<DoctorResponse>(`/admin/doctors/${doctorId}`, payload)).data,
  deleteDoctor: async (doctorId: number) => api.delete(`/admin/doctors/${doctorId}`),
  getUsers: async (params?: { search?: string; role?: 'PATIENT' | 'DOCTOR' | 'ADMIN' }) =>
    (await api.get<UserResponse[]>('/admin/users', { params })).data,
  updateUser: async (userId: number, payload: { fullName: string; email: string; phone: string; role?: 'PATIENT' | 'DOCTOR' | 'ADMIN' }) =>
    (await api.put<UserResponse>(`/admin/users/${userId}`, payload)).data,
  setUserBlocked: async (userId: number, blocked: boolean) =>
    (await api.patch<UserResponse>(`/admin/users/${userId}/block`, null, { params: { blocked } })).data,
  getSymptoms: async (query?: string) => (await api.get<SymptomResponse[]>('/admin/symptoms', { params: { query } })).data,
  createSymptom: async (payload: UpsertSymptomRequest) => (await api.post<SymptomResponse>('/admin/symptoms', payload)).data,
  updateSymptom: async (symptomId: number, payload: UpsertSymptomRequest) =>
    (await api.put<SymptomResponse>(`/admin/symptoms/${symptomId}`, payload)).data,
  deleteSymptom: async (symptomId: number) => api.delete(`/admin/symptoms/${symptomId}`),
  getDoctorSchedule: async (doctorId: number) => (await api.get<SlotResponse[]>(`/admin/doctors/${doctorId}/schedule`)).data,
  getAppointments: async () => (await api.get<AppointmentResponse[]>('/admin/appointments')).data,
  updateAppointmentStatus: async (appointmentId: number, payload: UpdateAppointmentStatusPayload) =>
    (await api.patch<AppointmentResponse>(`/admin/appointments/${appointmentId}/status`, payload)).data,
  rescheduleAppointment: async (appointmentId: number, newSlotId: number) =>
    (await api.patch<AppointmentResponse>(`/admin/appointments/${appointmentId}/reschedule`, { newSlotId })).data,
};

export const patientApi = {
  getDashboard: async () => (await api.get<PatientDashboardResponse>('/patient/dashboard')).data,
  getProfile: async () => (await api.get<PatientProfileResponse>('/patient/profile')).data,
  updateProfile: async (payload: UpdatePatientProfileRequest) =>
    (await api.put<PatientProfileResponse>('/patient/profile', payload)).data,
  getDoctors: async (params?: { search?: string; minRating?: number }) =>
    (await api.get<DoctorResponse[]>('/patient/doctors', { params })).data,
  getDoctorSlots: async (doctorId: number, date?: string) =>
    (await api.get<SlotResponse[]>(`/patient/doctors/${doctorId}/slots`, { params: { date } })).data,
  bookAppointment: async (payload: { slotId: number; symptomsDescription?: string }) =>
    (await api.post<AppointmentResponse>('/patient/appointments', payload)).data,
  getAppointments: async () => (await api.get<AppointmentResponse[]>('/patient/appointments')).data,
  cancelAppointment: async (appointmentId: number) =>
    (await api.patch<AppointmentResponse>(`/patient/appointments/${appointmentId}/cancel`)).data,
  getMedicalRecords: async () => (await api.get<MedicalRecordResponse[]>('/patient/medical-records')).data,
  updateMedicalRecord: async (recordId: number, payload: { notes: string }) =>
    (await api.patch<MedicalRecordResponse>(`/patient/medical-records/${recordId}`, payload)).data,
  getSymptoms: async (query?: string) => (await api.get<SymptomResponse[]>('/patient/symptoms', { params: { query } })).data,
  getRecommendations: async (symptomIds: number[]) =>
    (await api.post<SymptomRecommendationResponse>('/patient/recommendations', { symptomIds })).data,
  getNotifications: async () => (await api.get<PatientNotificationResponse[]>('/patient/notifications')).data,
  setNotificationRead: async (notificationId: number, read: boolean) =>
    (await api.patch<PatientNotificationResponse>(`/patient/notifications/${notificationId}`, null, { params: { read } })).data,
  deleteNotification: async (notificationId: number) => api.delete(`/patient/notifications/${notificationId}`),
  changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
    api.post('/patient/security/change-password', payload),
};