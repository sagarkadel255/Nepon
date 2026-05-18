'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { orders as ordersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ChevronLeft, Package, Clock, CheckCircle, Truck } from 'lucide-react';
import Link from 'next/link';

const statusSteps = ['placed', 'confirmed', 'shipped', 'delivered', 'completed'];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id && user) {
      ordersApi.get(id)
        .then(setOrder)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, user]);

  const handleStatusUpdate = async (status: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await ordersApi.updateStatus(order._id, status);
      setOrder(updated);
    } catch (err: any) { alert(err.message); }
    finally { setUpdating(false); }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm('Cancel this order?')) return;
    try {
      const updated = await ordersApi.cancel(order._id);
      setOrder(updated);
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse"><div className="h-96 bg-muted" /></div>;
  if (!order) return <div className="text-center py-20"><p className="text-gray-500">Order not found</p></div>;

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in container-wide">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="bg-white border border-border p-8 mb-6 card-zero-static panel-rich">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`px-4 py-2 text-sm font-medium ${order.status === 'cancelled' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
          </span>
        </div>

        <div className="divider-deco mb-6" />

        {order.status !== 'cancelled' && (
          <div className="flex items-center justify-between mb-8">
            {statusSteps.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 flex items-center justify-center ${i <= currentStepIndex ? 'bg-primary text-white' : 'bg-muted text-gray-400'}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-2 capitalize text-gray-500">{step}</span>
                </div>
                {i < statusSteps.length - 1 && <div className={`flex-1 h-1 mx-2 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <h3 className="font-semibold text-secondary mb-3 text-lg">Items</h3>
        <div className="space-y-3">
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-muted/30">
              <div className="w-12 h-12 bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-gray-400" /></div>
              <div className="flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-500">Size: {item.size} &middot; Color: {item.color} &middot; Qty: {item.quantity}</p>
              </div>
              <span className="font-semibold">Rs. {(item.unitPrice * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <span className="font-semibold text-lg">Total</span>
          <span className="font-bold text-xl text-primary">Rs. {order.totalAmount?.toLocaleString()}</span>
        </div>
      </div>

      {user?.role === 'seller' && !['completed', 'cancelled'].includes(order.status) && (
        <div className="bg-white border border-border p-8 card-zero-static panel-rich">
          <h3 className="font-semibold text-secondary mb-4 text-lg">Update Status</h3>
          <div className="divider-deco mb-4" />
          <div className="flex gap-3">
            {order.status === 'placed' && <button onClick={() => handleStatusUpdate('confirmed')} disabled={updating} className="px-5 py-2 bg-primary text-white font-medium hover:bg-primary-dark">Confirm</button>}
            {order.status === 'confirmed' && <button onClick={() => handleStatusUpdate('shipped')} disabled={updating} className="px-5 py-2 bg-primary text-white font-medium hover:bg-primary-dark">Mark Shipped</button>}
            {order.status === 'shipped' && <button onClick={() => handleStatusUpdate('delivered')} disabled={updating} className="px-5 py-2 bg-primary text-white font-medium hover:bg-primary-dark">Mark Delivered</button>}
          </div>
        </div>
      )}

      {user?.role === 'buyer' && ['placed', 'confirmed'].includes(order.status) && (
        <div className="bg-white border border-border p-8 card-zero-static panel-rich">
          <button onClick={handleCancel} className="px-5 py-2 border border-error text-error font-medium hover:bg-error/5">Cancel Order</button>
        </div>
      )}
    </div>
  );
}
