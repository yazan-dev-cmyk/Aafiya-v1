import React from 'react';
import { MapPin, Phone, Mail, Clock, Activity } from 'lucide-react';

export const DocumentFooter: React.FC = () => {
  return (
    <div className="mt-auto">
      {/* ECG Line Divider */}
      <div className="relative h-8 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center opacity-20">
          <div className="w-full h-[1px] bg-blue-500" />
        </div>
        <div className="relative bg-white px-4">
           <Activity className="w-8 h-4 text-blue-600 animate-pulse" />
        </div>
        <p className="absolute right-8 text-[9px] font-bold text-blue-700 tracking-widest uppercase">نتمنى لكم دوام الصحة والعافية</p>
      </div>

      {/* Dark Footer */}
      <div className="bg-[#001d3d] text-white p-6 rounded-b-3xl flex justify-between items-center" dir="rtl">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-blue-300">123 شارع الصحة، حي النور</span>
            <span className="text-[9px] font-bold text-white">الرياض، المملكة العربية السعودية</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-blue-300">الهاتف</span>
            <span className="text-[9px] font-bold text-white" dir="ltr">+966 55 123 4567</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-blue-300">البريد الإلكتروني</span>
            <span className="text-[9px] font-bold text-white">info@alhayatclinic.sa</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-blue-300">مواعيد العمل</span>
            <span className="text-[9px] font-bold text-white">8:00 ص - 10:00 م</span>
          </div>
        </div>

        <div className="w-20 h-10 border border-blue-500/30 rounded-lg flex items-center justify-center opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
           <Activity className="w-12 h-12 text-blue-400" />
        </div>
      </div>
    </div>
  );
};
