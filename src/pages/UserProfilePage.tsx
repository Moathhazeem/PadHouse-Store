import React from 'react';
import { User, Phone, MapPin, Mail, Package, Clock, ChevronLeft } from 'lucide-react';
import { AppUser, Order } from '../types';

interface UserProfilePageProps {
  currentUser: AppUser | null;
  orders: Order[];
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  orders,
  onNavigate,
  onLogout,
}) => {
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-xs text-slate-500">يرجى تسجيل الدخول لعرض حسابك وملفك الشخصي.</p>
        <button
          onClick={() => onNavigate('login')}
          className="bg-[#2EC4B6] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
        >
          تسجيل الدخول الآن
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">حسابي وملفي الشخصي</h1>
          <p className="text-xs text-slate-500 mt-1">إدارة معلومات الاتصال والعناوين ومتابعة الطلبات السابقة</p>
        </div>
        <button
          onClick={onLogout}
          className="self-start sm:self-auto text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 px-4 py-2 rounded-xl"
        >
          تسجيل الخروج
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#0F172A] text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-black text-[#0F172A]">{currentUser.name}</h2>
            <span className="text-xs text-[#2EC4B6] font-semibold">
              {currentUser.role === 'super_admin'
                ? 'مدير عام المتجر'
                : currentUser.role === 'admin'
                ? 'مدير عمليات المتجر'
                : 'عميل معتمد'}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 text-right space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{currentUser.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{currentUser.city}</span>
            </div>
          </div>
        </div>

        {/* Recent Orders Overview */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#2EC4B6]" />
              <span>طلباتي السابقة ({orders.length})</span>
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-[#2EC4B6] hover:underline"
            >
              عرض الكل
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">لا توجد طلبات سابقة حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-[#0F172A] block">{o.id}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{o.date} • {o.items.length} قطع</span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-[#0F172A] block">{o.total} ₪</span>
                    <span className="text-[10px] font-bold text-[#2EC4B6] bg-[#2EC4B6]/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

