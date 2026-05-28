'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { admin as adminApi } from '@/lib/api';
import {
  Shield,
  AlertTriangle,
  Lock,
  Monitor,
  Fingerprint,
  TrendingUp,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface SecurityData {
  failedLogins: { date: string; count: number }[];
  rateLimitTrips: { date: string; count: number }[];
  newDeviceLogins: { date: string; count: number }[];
  mfaFailures: { date: string; count: number }[];
  totalFailedLogins: number;
  totalSecurityEvents: number;
  lockedAccounts: number;
  suspendedAccounts: number;
}

export default function SecurityDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSecurityDashboard({ days });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    fetchData();
  }, [user, fetchData]);

  if (!user || user.role !== 'admin') return null;

  const totalEvents = data
    ? data.failedLogins.reduce((s, d) => s + d.count, 0) +
      data.rateLimitTrips.reduce((s, d) => s + d.count, 0) +
      data.newDeviceLogins.reduce((s, d) => s + d.count, 0) +
      data.mfaFailures.reduce((s, d) => s + d.count, 0)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-secondary">Security Dashboard</h1>
          </div>
          <p className="text-gray-500 ml-9">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 text-sm rounded-lg bg-white focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8] outline-none transition"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events', value: totalEvents, icon: Shield, color: 'bg-red-500', text: 'text-red-700' },
          { label: 'Locked Accounts', value: data?.lockedAccounts || 0, icon: Lock, color: 'bg-orange-500', text: 'text-orange-700' },
          { label: 'Suspended Accounts', value: data?.suspendedAccounts || 0, icon: AlertTriangle, color: 'bg-amber-500', text: 'text-amber-700' },
          { label: 'New Devices', value: data?.newDeviceLogins.reduce((s, d) => s + d.count, 0) || 0, icon: Monitor, color: 'bg-blue-500', text: 'text-blue-700' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DashboardSection
          title="Failed Login Attempts"
          icon={Lock}
          total={data?.totalFailedLogins || 0}
          data={data?.failedLogins || []}
          color="red"
          loading={loading}
        />
        <DashboardSection
          title="Rate Limit Violations"
          icon={AlertTriangle}
          total={data?.totalSecurityEvents || 0}
          data={data?.rateLimitTrips || []}
          color="amber"
          loading={loading}
        />
        <DashboardSection
          title="New Device Logins"
          icon={Monitor}
          total={data?.newDeviceLogins.reduce((s, d) => s + d.count, 0) || 0}
          data={data?.newDeviceLogins || []}
          color="blue"
          loading={loading}
        />
        <DashboardSection
          title="MFA Verification Failures"
          icon={Fingerprint}
          total={data?.mfaFailures.reduce((s, d) => s + d.count, 0) || 0}
          data={data?.mfaFailures || []}
          color="purple"
          loading={loading}
        />
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  icon: Icon,
  total,
  data,
  color,
  loading,
}: {
  title: string;
  icon: any;
  total: number;
  data: { date: string; count: number }[];
  color: string;
  loading: boolean;
}) {
  const colorMap: Record<string, { dot: string; bg: string; bar: string }> = {
    red: { dot: 'bg-red-500', bg: 'bg-red-50', bar: 'bg-red-500' },
    amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', bar: 'bg-amber-500' },
    blue: { dot: 'bg-blue-500', bg: 'bg-blue-50', bar: 'bg-blue-500' },
    purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', bar: 'bg-purple-500' },
  };

  const c = colorMap[color] || colorMap.blue;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${c.dot.replace('bg-', 'text-')}`} />
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        <span className={`text-sm font-bold ${c.dot.replace('bg-', 'text-')}`}>{total}</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No events in this period</p>
      ) : (
        <div className="space-y-1.5">
          {data.slice(-10).reverse().map((entry) => (
            <div key={entry.date} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24 shrink-0">{entry.date}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${(entry.count / maxCount) * 100}%`, minWidth: entry.count > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-8 text-right">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}