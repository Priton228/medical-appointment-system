import { create } from 'zustand';
import { patientApi, doctorApi, adminApi, chatApi, type PatientNotificationResponse } from '../services/api';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface NotificationState {
  notifications: PatientNotificationResponse[];
  unreadCount: number;
  chatUnreadCount: number;
  isLoading: boolean;
  loadNotifications: () => Promise<void>;
  loadChatUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refreshUnreadCount: () => number;
}

const getApi = () => {
  const role = useAuthStore.getState().user?.role;
  if (role === 'DOCTOR') return doctorApi;
  return patientApi;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  chatUnreadCount: 0,
  isLoading: false,

  loadNotifications: async () => {
    try {
      set({ isLoading: true });
      const role = useAuthStore.getState().user?.role;
      // Admin doesn't have regular notifications, only chat
      if (role === 'ADMIN') {
        set({ notifications: [], unreadCount: 0 });
        return;
      }
      const api = getApi();
      const data = await api.getNotifications();
      set({ 
        notifications: data,
        unreadCount: data.filter(n => !n.isRead).length
      });
    } catch (error) {
      console.error('Failed to load notifications');
    } finally {
      set({ isLoading: false });
    }
  },

  loadChatUnreadCount: async () => {
    try {
      const role = useAuthStore.getState().user?.role;
      if (role === 'ADMIN') {
        // For admin, get all conversations and count unread messages
        const conversations = await chatApi.getAdminConversations();
        const unreadCount = conversations.filter(c => c.unreadCount > 0).length;
        set({ chatUnreadCount: unreadCount });
      } else {
        // For patient/doctor, check their chat with admin
        const messages = await chatApi.getMyMessages();
        const unreadCount = messages.filter(m => m.recipientId === useAuthStore.getState().user?.id && !m.isRead).length;
        set({ chatUnreadCount: unreadCount });
      }
    } catch (error) {
      console.error('Failed to load chat unread count');
    }
  },

  markAsRead: async (id: number) => {
    try {
      const role = useAuthStore.getState().user?.role;
      if (role === 'ADMIN') return;
      const api = getApi();
      await api.setNotificationRead(id, true);
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      set({ 
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length
      });
    } catch (error) {
      toast.error('Ошибка при отметке уведомления');
    }
  },

  deleteNotification: async (id: number) => {
    try {
      const role = useAuthStore.getState().user?.role;
      if (role === 'ADMIN') return;
      const api = getApi();
      await api.deleteNotification(id);
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.filter(n => n.id !== id);
      set({ 
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length
      });
    } catch (error) {
      toast.error('Ошибка при удалении уведомления');
    }
  },

  refreshUnreadCount: () => {
    const count = get().notifications.filter(n => !n.isRead).length;
    set({ unreadCount: count });
    return count;
  },

  get totalUnreadCount() {
    return get().unreadCount + get().chatUnreadCount;
  }
}));
