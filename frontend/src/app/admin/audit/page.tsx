'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { admin as adminApi } from '@/lib/api';
import { ChevronLeft, FileText, Shield, User, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    adminApi.getAuditLogs({ limit: '100' })
      .then((data) => setLogs(data.logs || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in container-wide">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-secondary mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6" /> Audit Log
      </h1>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20"><p className="text-gray-500">No audit logs found</p></div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actor</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Action</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Target</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Result</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log._id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{log.actorId?.displayName || log.actorRole || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm font-medium">{log.action}</span></td>
                  <td className="px-6 py-4"><span className="text-sm text-gray-500">{log.targetType} {log.targetId ? `#${String(log.targetId).slice(-6)}` : ''}</span></td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium ${log.result === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
