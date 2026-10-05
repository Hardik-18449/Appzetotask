import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { INotification } from '../types';

export const NotificationPopover: React.FC = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=20');
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      const handleNewNotification = (notification: INotification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('notification:new', handleNewNotification);
      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-700 px-1.5 py-0.2 rounded font-mono font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                No notifications to display.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={(e) => !n.isRead && handleMarkAsRead(n._id, e)}
                  className={`p-3 text-left transition-colors cursor-pointer flex items-start space-x-2.5 ${
                    n.isRead ? 'bg-transparent hover:bg-zinc-900/40' : 'bg-zinc-900/40 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        n.isRead ? 'bg-transparent' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white truncate">{n.title}</p>
                      <span className="text-[10px] text-zinc-500 flex items-center font-mono">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
