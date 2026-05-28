'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { admin as adminApi } from '@/lib/api';
import { ChevronLeft, UserX, UserCheck, Search } from 'lucide-react';
import Link from 'next/link';

function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    adminApi.getUsers()
      .then((data) => setUsers(data.users || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspend this user?')) return;
    try {
      await adminApi.suspendUser(id);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status: 'suspended' } : u));
    } catch (err: any) { alert(err.message); }
  };

  const handleReactivate = async (id: string) => {
    try {
      await adminApi.reactivateUser(id);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status: 'active' } : u));
    } catch (err: any) { alert(err.message); }
  };

  if (!user || user.role !== 'admin') return null;

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in container-wide">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-secondary mb-6">User Management</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">User</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Verified</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u: any) => (
                <tr key={u._id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'seller' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium ${u.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.isEmailVerified ? <CheckCircle className="w-4 h-4 text-success" /> : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.status === 'active' ? (
                      <button onClick={() => handleSuspend(u._id)} className="text-sm text-error hover:underline flex items-center gap-1 ml-auto">
                        <UserX className="w-4 h-4" /> Suspend
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(u._id)} className="text-sm text-success hover:underline flex items-center gap-1 ml-auto">
                        <UserCheck className="w-4 h-4" /> Reactivate
                      </button>
                    )}
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
