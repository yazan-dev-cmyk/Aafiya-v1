import React from 'react';
import { User, Activity, ShieldCheck } from 'lucide-react';

interface DocumentHeaderProps {
  title: string;
  subtitle?: string;
  doctorName?: string;
  specialization?: string;
  licenseNumber?: string;
  experience?: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  title,
  subtitle = "RADIOLOGY REQUEST",
  doctorName = "د. أحمد بن سعيد",
  specialization = "طبيب عام",
  licenseNumber = "12345/ط.ب",
  experience = "خبرة أكثر من 10 سنوات"
}) => {
  return (
    <div className="relative overflow-hidden pt-2 pb-6 px-8 rounded-t-3xl bg-white border-b-0">
      {/* Background Wave Effect */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-[#003d7c] clip-path-wave -z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-700 opacity-80" />
      </div>
      
      <style jsx>{`
        .clip-path-wave {
          clip-path: ellipse(80% 60% at 50% 0%);
        }
      `}</style>

      <div className="relative z-10 flex justify-between items-start mt-4">
        {/* Clinic Logo & Name (Left) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <h1 className="text-2xl font-black text-[#003d7c] leading-tight">عيادة الحياة</h1>
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-8 bg-blue-400" />
                <span className="text-blue-500 font-bold text-sm">للطب العام</span>
              </div>
            </div>
            <div className="w-16 h-16 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-600 rounded-full opacity-10 blur-xl animate-pulse" />
              <Activity className="w-12 h-12 text-blue-600 relative z-10" />
              <div className="absolute -top-1 -right-1">
                <div className="bg-white p-0.5 rounded-full border border-blue-100">
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 tracking-widest uppercase">رعايتكم... أولويتنا</p>
        </div>

        {/* Document Title (Center) */}
        <div className="flex flex-col items-center pt-2">
          <h2 className="text-2xl font-black text-[#003d7c] tracking-tight">{title}</h2>
          <div className="w-24 h-1 bg-blue-400 mt-1 rounded-full" />
          <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-[0.2em]">{subtitle}</p>
          <div className="mt-4 p-2 border border-blue-100 rounded-lg bg-blue-50/50">
             <Activity className="w-6 h-6 text-[#003d7c]" />
          </div>
        </div>

        {/* Doctor Info (Right) */}
        <div className="flex items-start gap-3 text-right">
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-900">{doctorName}</h3>
            <span className="text-sm font-bold text-blue-600">{specialization}</span>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-400 font-medium tracking-tighter">رقم التسجيل: {licenseNumber}</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tighter">{experience}</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
            <div className="bg-slate-800 p-2 rounded-full">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
