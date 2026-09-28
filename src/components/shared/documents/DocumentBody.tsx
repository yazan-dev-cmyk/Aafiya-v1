import React from 'react';
import { Pill, Activity, FlaskConical, Stethoscope, Info, CheckSquare, ClipboardList, PenTool } from 'lucide-react';

interface DocumentBodyProps {
  type: 'prescription' | 'laboratory' | 'radiology';
  data: any[];
  diagnosis?: string;
  notes?: string;
  docId: string;
}

export const DocumentBody: React.FC<DocumentBodyProps> = ({
  type,
  data,
  diagnosis = "التهاب في الحلق والاحتقان",
  notes = "الراحة وشرب السوائل بكثرة.",
  docId
}) => {
  const isPrescription = type === 'prescription';
  const isLab = type === 'laboratory';
  const isRad = type === 'radiology';

  const sectionTitle = isPrescription ? "الوصفة الطبية" : isLab ? "التحاليل المطلوبة" : "نوع الفحص المطلوب";
  const Icon = isPrescription ? Stethoscope : isLab ? FlaskConical : Activity;

  return (
    <div className="flex-1 px-8 py-6 space-y-6" dir="rtl">
      {/* Document Label Badge */}
      <div className="flex justify-center -mt-10">
        <div className="bg-[#003d7c] text-white px-8 py-2 rounded-full flex items-center gap-3 shadow-lg border-2 border-white">
          <Icon className="w-5 h-5 text-blue-300" />
          <span className="text-sm font-black tracking-wider uppercase">{sectionTitle}</span>
        </div>
      </div>

      {/* Prescription View */}
      {isPrescription && (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <span className="text-blue-600 font-black text-sm mt-1 shrink-0">التشخيص:</span>
            <div className="flex-1 border-b border-dashed border-slate-300 pb-2">
              <span className="text-slate-800 font-bold text-lg">{diagnosis}</span>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-blue-600 font-black text-sm block">الأدوية:</span>
            <div className="space-y-3">
              {data.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#003d7c] font-black text-xs shadow-sm shrink-0 group-hover:bg-[#003d7c] group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 flex items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-800 font-black text-base">{item.name}</span>
                    <span className="text-slate-500 font-bold text-xs">{item.dosage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table View (Lab/Rad) */}
      {(isLab || isRad) && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 border-l border-slate-200 w-12 text-center">م</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 border-l border-slate-200">{isLab ? "التحليل المطلوب" : "نوع الفحص الإشعاعي"}</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 border-l border-slate-200 w-24 text-center">المنطقة / النوع</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 border-l border-slate-200">السبب / الأعراض</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 w-16 text-center">اختيار</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-xs font-black text-white bg-[#003d7c] border-l border-slate-200 text-center">{idx + 1}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800 border-l border-slate-200">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium" dir="ltr">({item.code})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-center border-l border-slate-200">
                     <div className="flex justify-center">
                        <Activity className="w-6 h-6 text-blue-400 opacity-50" />
                     </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono border-l border-slate-200 italic">................................................</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <div className="w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center">
                        {item.selected && <div className="w-3 h-3 bg-blue-600 rounded-xs" />}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lower Sections */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-blue-600">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs font-black">ملاحظات الطبيب / التشخيص المبدئي:</span>
           </div>
           <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 min-h-[100px] bg-slate-50/50">
              <p className="text-xs text-slate-700 font-bold leading-relaxed">{notes}</p>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center gap-2 text-blue-600">
              <Info className="w-4 h-4" />
              <span className="text-xs font-black">تعليمات للمريض:</span>
           </div>
           <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-blue-50/30">
              <ul className="text-[10px] text-slate-600 font-bold space-y-2 list-disc list-inside">
                <li>يرجى إحضار هذا الطلب عند إجراء الفحص/التحليل.</li>
                {isRad && <li>يرجى إبلاغ فني الأشعة في حال وجود حمل محتمل.</li>}
                {isLab && <li>الصوم لمدة 10-12 ساعة قبل سحب الدم للتحاليل المخبرية.</li>}
                <li>يُفضل الصيام لبعض الفحوصات حسب تعليمات الطبيب.</li>
              </ul>
           </div>
        </div>
      </div>

      {/* Signature & Stamp Area */}
      <div className="flex justify-between items-end pt-8">
        <div className="flex flex-col items-center">
           <span className="text-xs font-black text-slate-400 mb-2">توقيع الطبيب</span>
           <div className="relative w-40 h-20 flex items-center justify-center border-b border-slate-300">
              <PenTool className="w-12 h-12 text-blue-600 opacity-20 absolute rotate-12" />
              <span className="font-script text-2xl text-blue-900 rotate-[-5deg]">Dr. Ahmed S.</span>
           </div>
        </div>

        <div className="w-24 h-24 border-4 border-blue-600/30 rounded-full flex flex-col items-center justify-center opacity-40 -rotate-12 border-double scale-90">
           <div className="border-2 border-blue-600/20 rounded-full p-2 flex flex-col items-center">
              <Activity className="w-6 h-6 text-blue-600" />
              <span className="text-[8px] font-black text-blue-800">عيادة الحياة</span>
              <span className="text-[6px] font-bold text-blue-600 uppercase">General Medicine</span>
           </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-1">
              <div className="w-32 h-8 bg-slate-300 flex items-center justify-center font-mono text-[8px] text-slate-600 tracking-[0.3em]">
                |||| || | || |||| | ||
              </div>
              <span className="text-[10px] font-black text-slate-800 font-mono" dir="ltr">{docId}</span>
              <span className="text-[9px] font-bold text-blue-500 underline">يرجى الاحتفاظ بهذا الطلب</span>
           </div>
           <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[9px] font-bold">امسح QR لمتابعة النتائج</span>
              <div className="w-8 h-8 bg-slate-100 rounded border border-slate-200 p-1">
                 <div className="w-full h-full bg-slate-800 rounded-[2px]" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
