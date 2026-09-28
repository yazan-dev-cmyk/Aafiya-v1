import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Save,
  MessageSquare,
  Bell,
  CheckCircle2,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/auth';
import { bookingCenterService, BookingPoliciesData } from '@/services/bookingCenterService';
import { ChangePasswordCard } from '../../shared/ChangePasswordCard';

export const ProfileSettingsTab: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const bc = user?.booking_center;

  const [centerName, setCenterName] = useState(bc?.name || user?.name || '');
  const [commercialRegister, setCommercialRegister] = useState(bc?.commercial_register || '');
  const [phone, setPhone] = useState(bc?.phone || '');
  const [email, setEmail] = useState(bc?.email || user?.email || '');
  const [wilaya, setWilaya] = useState(bc?.wilaya || '');
  const [address, setAddress] = useState(bc?.address || '');

  // Central platform booking policies (Read-Only)
  const [bookingPolicies, setBookingPolicies] = useState<BookingPoliciesData | null>(null);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    bookingCenterService.getBookingPolicies()
      .then((res) => {
        if (isMounted && res.data) {
          setBookingPolicies(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load central booking policies:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPolicies(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user?.booking_center) {
      setCenterName(user.booking_center.name || user.name || '');
      setCommercialRegister(user.booking_center.commercial_register || '');
      setPhone(user.booking_center.phone || '');
      setEmail(user.booking_center.email || user.email || '');
      setWilaya(user.booking_center.wilaya || '');
      setAddress(user.booking_center.address || '');
    } else if (user) {
      if (user.name) setCenterName(user.name);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const [enableSmsAlerts, setEnableSmsAlerts] = useState(true);
  const [enableWhatsappAlerts, setEnableWhatsappAlerts] = useState(true);

  const handleSaveSettings = async () => {
    setFeedback(null);

    if (!centerName.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال اسم المركز المعتمد.' });
      return;
    }
    if (!phone.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال رقم الهاتف الرسمي.' });
      return;
    }
    if (!wilaya.trim()) {
      setFeedback({ type: 'error', message: 'يرجى تحديد ولاية المقر.' });
      return;
    }
    if (!address.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال العنوان الكامل.' });
      return;
    }

    setIsSaving(true);
    try {
      await bookingCenterService.updateSettings({
        name: centerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        wilaya: wilaya.trim(),
        address: address.trim(),
      });

      await refreshUser();
      setFeedback({
        type: 'success',
        message: 'تم حفظ وتحديث إعدادات وبيانات مركز الحجز بنجاح!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ التغييرات.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">إعدادات مركز الحجز وتكوين النظام (Center Settings)</h2>
          <p className="text-xs text-slate-500 mt-1">
            تحديث البيانات الرسمية، ساعات الاستقبال، سياسات الإلغاء وقنوات التنبيه
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 transition-all"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Basic Official Information */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">البيانات الرسمية لـ مركز الحجز</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المركز المعتمد</label>
            <input
              type="text"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              الرقم التجاري / الاعتماد <span className="text-slate-400 font-normal">(للقراءة فقط)</span>
            </label>
            <input
              type="text"
              disabled
              value={commercialRegister || '--'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500 dir-ltr text-right cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف الرسمي</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني للإشعارات</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الولاية المقر</label>
            <input
              type="text"
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان الكامل</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Central Booking Policies (Read-Only) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-base">سياسة الحجز والإلغاء المعتمدة (Booking Policies)</h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>سياسة معتمدة من المنصة (للقراءة فقط)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              الحد الأقصى للإلغاء المسموح قبل الموعد
            </label>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 font-mono">
                {isLoadingPolicies ? '...' : `${bookingPolicies?.cancellation_cutoff_hours ?? 24} ساعة`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                إلغاء استردادي
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              يسمح للمريض بالإلغاء الاستردادي حتى {bookingPolicies?.cancellation_cutoff_hours ?? 24} ساعة قبل الموعد.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              أقصى عدد حجوزات مسموح للمريض الواحد في نفس اليوم
            </label>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 font-mono">
                {isLoadingPolicies ? '...' : `${bookingPolicies?.max_daily_bookings_per_patient ?? 5} حجوزات`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                حد أقصى يومي
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              لتفادي حجز المواعيد المكررة بشكل عشوائي، لا يمكن للمريض تجاوز {bookingPolicies?.max_daily_bookings_per_patient ?? 5} حجوزات في نفس اليوم.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Notification Integration Settings */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-base">قنوات إرسال التذاكر وتنبيهات WhatsApp & SMS</h3>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">إرسال التذكرة تلقائياً عبر WhatsApp API</h4>
                <p className="text-xs text-slate-500">إرسال رسالة توثيق تحتوي على رابط التذكرة والتوقيت فور إنشاء الحجز</p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={enableWhatsappAlerts}
              onChange={(e) => setEnableWhatsappAlerts(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">إرسال رسائل نصية قصيرة SMS (بوابة باريدي سيم)</h4>
                <p className="text-xs text-slate-500">إرسال رمز التأكيد والتذكير بالمواضيع قبل 3 ساعات من الموعد</p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={enableSmsAlerts}
              onChange={(e) => setEnableSmsAlerts(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. Password and Security */}
      <ChangePasswordCard isRtl={true} />

    </div>
  );
};
