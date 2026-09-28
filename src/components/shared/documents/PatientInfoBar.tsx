import React from 'react';
import { Calendar, Clock, User, UserCheck, Users, Phone } from 'lucide-react';

interface PatientInfoBarProps {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  date: string;
  time: string;
}

export const PatientInfoBar: React.FC<PatientInfoBarProps> = ({
  patientName = "محمد عبد الرحمن",
  age = "28 سنة",
  gender = "ذكر",
  phone = "0555 123 456",
  date = "24 / 05 / 2024",
  time = "10:30 AM"
}) => {
  const items = [
    { label: 'الجنس', value: gender, icon: Users },
    { label: 'اسم المريض', value: patientName, icon: User },
    { label: 'التاريخ', value: date, icon: Calendar },
    { label: 'رقم الهاتف', value: phone, icon: Phone },
    { label: 'العمر', value: age, icon: UserCheck },
    { label: 'الوقت', value: time, icon: Clock },
  ];

  return (
    <div className="mx-8 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm grid grid-cols-3 gap-x-12 gap-y-6" dir="rtl">
      {items.map((item, idx) => (
        <div key={idx} className={`flex items-center gap-4 ${idx % 3 !== 2 ? 'border-l border-slate-100 pl-8' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
            <item.icon className="w-5 h-5 text-[#003d7c]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
            <span className="text-sm font-black text-slate-800">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
