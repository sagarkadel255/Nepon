'use client';

import React, { useState, useEffect } from 'react';
import { notifications as notificationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    notificationsApi.list()
      .then((data) => setNotifs(data.notifications || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in container-wide">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-secondary">Notifications</h1>
        <button onClick={markAllRead} className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"><CheckCheck className="w-4 h-4" /> Mark all read</button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 panel-rich p-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n: any) => (
            <div key={n._id} className={`p-4 border ${n.read ? 'bg-white border-border' : 'bg-primary/5 border-primary/20'} flex items-start gap-3`}>
              <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-muted' : 'bg-primary/10'}`}>
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">{n.title}</h3>
                <p className="text-sm text-gray-500">{n.message}</p>
                <span className="text-xs text-gray-400 mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n._id)} className="text-primary hover:text-primary-dark"><Check className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
