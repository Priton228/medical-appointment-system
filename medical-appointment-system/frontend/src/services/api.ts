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
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - Token present: ${token.substring(0, 20)}...`);
  } else {
    console.warn(`[API] ${config.method?.toUpperCase()} ${config.url} - No token!`);
  }

  return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const url = error.config?.url || '';
        // Не редиректить на login при ошибке входа/регистрации — позволить toast показаться
        const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/forgot-password') || url.includes('/auth/verify-code') || url.includes('/auth/reset-password');
        if (!isAuthRequest) {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
      }
      if (error.response?.status === 403) {
        console.error('[API] 403 Forbidden:', error.config?.method?.toUpperCase(), error.config?.url);
        console.error('[API] Response:', error.response?.data);
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
  rating: number | null;
  totalRatings: number;
}

export interface AppointmentResponse {
  id: number;
  slotId: number;
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
  reportedSymptoms: SymptomResponse[];
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

export interface StatisticsResponse {
  kpis: {
    totalAppointments: number;
    totalPatients: number;
    averageRating: number;
    todayAppointments: number;
    freeSlotsToday: number;
  };
  monthlyAppointments: {
    month: string;
    completed: number;
    cancelled: number;
    scheduled: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    percent: number;
    color: string;
    darkColor: string;
  }[];
  weeklyTrend: number[];
  specializations: {
    name: string;
    count: number;
    color: string;
  }[];
  topDoctors: {
    name: string;
    rating: number;
    appointments: number;
  }[];
}

export interface DoctorResponse {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
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
  avatarUrl?: string | null;
}

export interface PatientResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  avatarUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
}

export interface SpecializationResponse {
  id: number;
  name: string;
  description: string;
}

export interface SymptomWeightResponse {
  symptomId: number;
  symptomName: string;
  weight: number;
}

export interface SpecializationDetailResponse {
  id: number;
  name: string;
  description: string;
  symptoms: SymptomWeightResponse[];
}

export interface UpsertSpecializationRequest {
  name: string;
  description: string;
  symptoms: { symptomId: number; weight: number }[];
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
  isBlocked?: boolean;
}

export interface RescheduleRequestResponse {
  id: number;
  appointmentId: number;
  patientName: string;
  doctorName: string;
  currentDate: string;
  currentStartTime: string;
  currentEndTime: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PatientProfileResponse {
  userId: number;
  patientId: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  chronicDiseases: string | null;
  allergies: string | null;
  bloodType: string | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface UpdatePatientProfileRequest {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  chronicDiseases: string | null;
  allergies: string | null;
  bloodType: string | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface MedicalRecordResponse {
  id: number;
  doctorName?: string;
  date?: string;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  complaints: string | null;
  examinationResults: string | null;
  createdAt: string;
  symptomsDescription?: string | null;
  reportedSymptoms?: { id: number; name: string }[];
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
      | 'MASS_NOTIFICATION'
      | 'RESCHEDULE_REQUEST_PENDING'
      | 'RESCHEDULE_REQUEST_APPROVED'
      | 'RESCHEDULE_REQUEST_REJECTED'
      | 'REVIEW_RECEIVED';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewResponse {
  id: number;
  appointmentId: number;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  appointmentId: number;
  rating: number;
  comment: string;
}

export const doctorApi = {
  getDashboard: async () => (await api.get<DoctorDashboardResponse>('/doctor/dashboard')).data,
  getTodayAppointments: async () => (await api.get<AppointmentResponse[]>('/doctor/appointments/today')).data,
  getAppointments: async () => (await api.get<AppointmentResponse[]>('/doctor/appointments')).data,
  updateAppointmentStatus: async (appointmentId: number, status: string) =>
      (await api.patch<AppointmentResponse>(`/doctor/appointments/${appointmentId}/status`, { status })).data,
  completeAppointment: async (appointmentId: number, payload: { doctorNotes?: string; diagnosis?: string; treatmentRecommendations?: string }) =>
      (await api.patch<AppointmentResponse>(`/doctor/appointments/${appointmentId}/complete`, payload)).data,
  rescheduleAppointment: async (appointmentId: number, newSlotId: number) =>
      (await api.patch<AppointmentResponse>(`/doctor/appointments/${appointmentId}/reschedule`, { newSlotId })).data,
  getSlots: async () => (await api.get<SlotResponse[]>('/doctor/slots')).data,
  createSlot: async (payload: UpsertSlotRequest) => (await api.post<SlotResponse>('/doctor/slots', payload)).data,
  updateSlot: async (slotId: number, payload: UpsertSlotRequest) =>
      (await api.put<SlotResponse>(`/doctor/slots/${slotId}`, payload)).data,
  deleteSlot: async (slotId: number) => api.delete(`/doctor/slots/${slotId}`),
  getProfile: async () => (await api.get('/doctor/profile')).data,
  updateProfile: async (payload: any) => (await api.put('/doctor/profile', payload)).data,
  uploadAvatar: async (avatarUrl: string) => {
    return (await api.post('/doctor/profile/avatar', { avatarUrl })).data;
  },
  changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
      api.post('/doctor/security/change-password', payload),
  getNotifications: async () => (await api.get<PatientNotificationResponse[]>('/doctor/notifications')).data,
  setNotificationRead: async (notificationId: number, read: boolean) =>
      (await api.patch<PatientNotificationResponse>(`/doctor/notifications/${notificationId}`, null, { params: { read } })).data,
  deleteNotification: async (notificationId: number) => api.delete(`/doctor/notifications/${notificationId}`),
  getReviews: async () => (await api.get<ReviewResponse[]>('/doctor/reviews')).data,
  getMyPatients: async () => (await api.get<PatientResponse[]>('/doctor/patients')).data,
  getPatientById: async (patientId: number) => (await api.get<PatientResponse>(`/doctor/patients/${patientId}`)).data,
  getPatientAppointments: async (patientId: number) => (await api.get<AppointmentResponse[]>(`/doctor/patients/${patientId}/appointments`)).data,
  getPatientMedicalRecords: async (patientId: number) => (await api.get<MedicalRecordResponse[]>(`/doctor/patients/${patientId}/records`)).data,
  createRescheduleRequest: async (appointmentId: number, newSlotId: number) =>
      (await api.post<RescheduleRequestResponse>(`/doctor/appointments/${appointmentId}/reschedule-request`, null, { params: { newSlotId } })).data,
  getRescheduleRequests: async () => (await api.get<RescheduleRequestResponse[]>('/doctor/reschedule-requests')).data,
};

// ===== Chat =====
export interface ChatMessageResponse {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  recipientId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversationResponse {
  partnerId: number;
  partnerName: string;
  partnerRole: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  partnerAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export const chatApi = {
  getMyMessages: async () =>
      (await api.get<ChatMessageResponse[]>('/chat/messages')).data,
  sendMessage: async (content: string, recipientId?: number) =>
      (await api.post<ChatMessageResponse>('/chat/messages', { content, recipientId })).data,
  markRead: async (partnerId?: number) =>
      api.post('/chat/messages/read', null, { params: { partnerId } }),
  getUnreadCount: async () =>
      (await api.get<{ count: number }>('/chat/unread-count')).data.count,
  getAdminConversations: async () =>
      (await api.get<ChatConversationResponse[]>('/chat/admin/conversations')).data,
  getAdminConversationWithUser: async (userId: number) =>
      (await api.get<ChatMessageResponse[]>(`/chat/admin/conversations/${userId}`)).data,
};

// ===== Admin profile / system status =====
export interface AdminProfileResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface UpdateAdminProfileRequest {
  fullName: string;
  email: string;
  phone?: string;
  username?: string;
}

export interface SystemStatusResponse {
  overallStatus: 'UP' | 'DEGRADED' | 'DOWN';
  checkedAt: string;
  uptimeMs: number;
  jvm: {
    usedMemoryMb: number;
    maxMemoryMb: number;
    totalMemoryMb: number;
    availableProcessors: number;
    activeThreads: number;
    javaVersion: string;
  };
  components: Array<{
    name: string;
    status: 'UP' | 'DEGRADED' | 'DOWN';
    message: string;
    latencyMs: number | null;
  }>;
  recentEvents: Array<{
    time: string;
    level: string;
    component: string;
    message: string;
  }>;
}

export const adminApi = {
  getSpecializations: async () => (await api.get<SpecializationResponse[]>('/admin/specializations')).data,
  getSpecializationDetail: async (id: number) => (await api.get<SpecializationDetailResponse>(`/admin/specializations/${id}`)).data,
  createSpecialization: async (payload: UpsertSpecializationRequest) =>
      (await api.post<SpecializationDetailResponse>('/admin/specializations', payload)).data,
  updateSpecialization: async (id: number, payload: UpsertSpecializationRequest) =>
      (await api.put<SpecializationDetailResponse>(`/admin/specializations/${id}`, payload)).data,
  deleteSpecialization: async (id: number) => api.delete(`/admin/specializations/${id}`),
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
  updateUserAvatar: async (userId: number, avatarUrl: string) =>
      (await api.post<UserResponse>(`/admin/users/${userId}/avatar`, { avatarUrl })).data,
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
  getReviews: async () => (await api.get<ReviewResponse[]>('/admin/reviews')).data,
  getReviewByAppointment: async (appointmentId: number) =>
      (await api.get<ReviewResponse | null>(`/admin/appointments/${appointmentId}/review`)).data,
  getPatients: async () => (await api.get<PatientResponse[]>('/admin/patients')).data,
  getPatientById: async (patientId: number) => (await api.get<PatientResponse>(`/admin/patients/${patientId}`)).data,
  getPatientAppointments: async (patientId: number) => (await api.get<AppointmentResponse[]>(`/admin/patients/${patientId}/appointments`)).data,
  getPatientMedicalRecords: async (patientId: number) => (await api.get<MedicalRecordResponse[]>(`/admin/patients/${patientId}/records`)).data,
  getRescheduleRequests: async (filter?: 'all' | 'pending') =>
      (await api.get<RescheduleRequestResponse[]>('/admin/reschedule-requests', { params: { filter: filter || 'all' } })).data,
  approveRescheduleRequest: async (requestId: number) =>
      (await api.post<RescheduleRequestResponse>(`/admin/reschedule-requests/${requestId}/approve`)).data,
  rejectRescheduleRequest: async (requestId: number, comment?: string) =>
      (await api.post<RescheduleRequestResponse>(`/admin/reschedule-requests/${requestId}/reject`, null, { params: { comment } })).data,
  createDoctorSlot: async (doctorId: number, payload: UpsertSlotRequest) =>
      (await api.post<SlotResponse>(`/admin/doctors/${doctorId}/slots`, payload)).data,
  updateDoctorSlot: async (slotId: number, payload: UpsertSlotRequest) =>
      (await api.put<SlotResponse>(`/admin/slots/${slotId}`, payload)).data,
  deleteDoctorSlot: async (slotId: number) => api.delete(`/admin/slots/${slotId}`),
  getStatistics: async () => (await api.get<StatisticsResponse>('/admin/statistics')).data,
  // System status
  getSystemStatus: async () => (await api.get<SystemStatusResponse>('/admin/system/status')).data,
  // Admin profile
  getProfile: async () => (await api.get<AdminProfileResponse>('/admin/profile')).data,
  updateProfile: async (payload: UpdateAdminProfileRequest) =>
      (await api.put<AdminProfileResponse>('/admin/profile', payload)).data,
  uploadAvatar: async (avatarUrl: string) =>
      (await api.post<AdminProfileResponse>('/admin/profile/avatar', { avatarUrl })).data,
  changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
      api.post('/admin/security/change-password', payload),
};

export const authApi = {
  forgotPassword: async (email: string) =>
      (await api.post('/auth/forgot-password', { email })).data,
  verifyCode: async (email: string, code: string) =>
      (await api.post('/auth/verify-code', { email, code })).data,
  resetPassword: async (email: string, code: string, newPassword: string, confirmPassword: string) =>
      (await api.post('/auth/reset-password', { email, code, newPassword, confirmPassword })).data,
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
  bookAppointment: async (payload: { slotId: number; symptomsDescription?: string; symptomIds?: number[] }) =>
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

  uploadAvatar: async (avatarUrl: string) => {
    return (await api.post<PatientProfileResponse>('/patient/profile/avatar', { avatarUrl })).data;
  },
  createReview: async (payload: CreateReviewRequest) =>
      (await api.post<ReviewResponse>('/patient/reviews', payload)).data,
  getReviewByAppointment: async (appointmentId: number) =>
      (await api.get<ReviewResponse | null>(`/patient/reviews/appointment/${appointmentId}`)).data,
  getDoctorReviews: async (doctorId: number) =>
      (await api.get<ReviewResponse[]>(`/patient/doctors/${doctorId}/reviews`)).data,
};
