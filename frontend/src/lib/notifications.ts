import { apiFetch } from "./api";

export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  unreadCount: number;
  items: AppNotification[];
}

export function getNotifications() {
  return apiFetch<NotificationList>("/notifications");
}

export function markNotificationRead(id: number) {
  return apiFetch<{ read: boolean }>(`/notifications/${id}/read`, {
    method: "POST",
  });
}
