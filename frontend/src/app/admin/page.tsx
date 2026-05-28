'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { admin as adminApi } from '@/lib/api';
import { Users, ShoppingBag, Shield, AlertTriangle, CheckCircle, XCircle, Eye, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>({});
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [securityData, setSecurityData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    Promise.all([
      adminApi.getAnalytics().catch(() => ({})),
      adminApi.getSellerApplications().catch(() => []),
      adminApi.getSecurityDashboard().catch(() => ({})),
    ]).then(([analyticsData, sellersData, security]) => {
      setAnalytics(analyticsData);
      setPendingSellers(sellersData.sellers || sellersData || []);
      setSecurityData(security);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveSeller(id);
      setPendingSellers(prev => prev.filter(s => s._id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectSeller(id);
      setPendingSellers(prev => prev.filter(s => s._id !== id));
    } catch (err: any) { alert(err.message); }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in container-wide">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Admin Dashboard</h1>
          <p className="text-gray-500">Platform overview and management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users" className="px-5 py-2 border border-border text-sm font-medium hover:bg-muted bg-white">Users</Link>
          <Link href="/admin/audit" className="px-5 py-2 border border-border text-sm font-medium hover:bg-muted bg-white">Audit Log</Link>
          <Link href="/admin/security" className="px-5 py-2 border border-[#EC4899] text-sm font-medium hover:bg-[#FFF5F9] bg-white text-[#EC4899]">Security</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Users', value: analytics.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
          { label: 'Total Orders', value: analytics.totalOrders || 0, icon: ShoppingBag, color: 'bg-purple-500' },
          { label: 'Revenue', value: `Rs. ${(analytics.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Security Events', value: securityData.totalEvents || 0, icon: Shield, color: 'bg-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-border p-6 card-zero-static panel-rich">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-secondary">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border p-8 mb-8 card-zero-static panel-rich">
        <h2 className="font-semibold text-secondary mb-6 flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-warning" /> Pending Seller Applications ({pendingSellers.length})
        </h2>
        <div className="divider-deco mb-4" />
        {pendingSellers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No pending applications</p>
        ) : (
          <div className="space-y-3">
            {pendingSellers.map((seller: any) => (
              <div key={seller._id} className="flex items-center gap-4 p-4 bg-muted/30">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{seller.businessName || seller.displayName || seller.email}</p>
                  <p className="text-sm text-gray-500">{seller.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(seller._id)} className="px-4 py-1 bg-success text-white text-sm font-medium hover:opacity-90 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleReject(seller._id)} className="px-4 py-1 bg-error text-white text-sm font-medium hover:opacity-90 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-border p-8 card-zero-static panel-rich">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-secondary flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5" /> Security Overview
          </h2>
          <Link href="/admin/security" className="text-sm font-medium text-[#EC4899] hover:underline flex items-center gap-1">
            Full Dashboard <Activity className="w-4 h-4" />
          </Link>
        </div>
        <div className="divider-deco mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Failed Logins (24h)', value: securityData.failedLogins || 0, color: 'text-error' },
            { label: 'Rate Limit Trips', value: securityData.rateLimitTrips || 0, color: 'text-warning' },
            { label: 'MFA Failures', value: securityData.mfaFailures || 0, color: 'text-orange-500' },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-muted/30">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
