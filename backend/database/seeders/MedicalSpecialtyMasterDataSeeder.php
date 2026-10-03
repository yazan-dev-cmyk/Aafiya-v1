<?php

namespace Database\Seeders;

use App\Models\MedicalSpecialty;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MedicalSpecialtyMasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $specialties = [
            ['code' => 'GP', 'name_ar' => 'الطب العام', 'name_fr' => 'Médecine générale', 'name_en' => 'General Practice', 'display_order' => 1],
            ['code' => 'CARD', 'name_ar' => 'أمراض القلب والشرايين', 'name_fr' => 'Cardiologie', 'name_en' => 'Cardiology', 'display_order' => 2],
            ['code' => 'PED', 'name_ar' => 'طب الأطفال', 'name_fr' => 'Pédiatrie', 'name_en' => 'Pediatrics', 'display_order' => 3],
            ['code' => 'DERM', 'name_ar' => 'الأمراض الجلدية والتناسلية', 'name_fr' => 'Dermatologie et vénéréologie', 'name_en' => 'Dermatology', 'display_order' => 4],
            ['code' => 'NEUR', 'name_ar' => 'أمراض المخ والأعصاب', 'name_fr' => 'Neurologie', 'name_en' => 'Neurology', 'display_order' => 5],
            ['code' => 'GYN_OBS', 'name_ar' => 'أمراض النساء والتوليد', 'name_fr' => 'Gynécologie-obstétrique', 'name_en' => 'Obstetrics & Gynecology', 'display_order' => 6],
            ['code' => 'OPHTH', 'name_ar' => 'طب وجراحة العيون', 'name_fr' => 'Ophtalmologie', 'name_en' => 'Ophthalmology', 'display_order' => 7],
            ['code' => 'ORL', 'name_ar' => 'أمراض الأنف والأذن والحنجرة', 'name_fr' => 'Oto-rhino-laryngologie (ORL)', 'name_en' => 'Otolaryngology (ENT)', 'display_order' => 8],
            ['code' => 'ORTH', 'name_ar' => 'جراحة العظام والمفاصل', 'name_fr' => 'Chirurgie orthopédique et traumatologie', 'name_en' => 'Orthopedics', 'display_order' => 9],
            ['code' => 'INT_MED', 'name_ar' => 'الطب الباطني', 'name_fr' => 'Médecine interne', 'name_en' => 'Internal Medicine', 'display_order' => 10],
            ['code' => 'GASTRO', 'name_ar' => 'أمراض الجهاز الهضمي والكبد', 'name_fr' => 'Gastro-entérologie et hépatologie', 'name_en' => 'Gastroenterology', 'display_order' => 11],
            ['code' => 'UROL', 'name_ar' => 'جراحة الكلى والمسالك البولية', 'name_fr' => 'Urologie', 'name_en' => 'Urology', 'display_order' => 12],
            ['code' => 'ENDO', 'name_ar' => 'أمراض الغدد الصماء والسكري', 'name_fr' => 'Endocrinologie et diabétologie', 'name_en' => 'Endocrinology', 'display_order' => 13],
            ['code' => 'PNEUM', 'name_ar' => 'أمراض الصدر والجهاز التنفسي', 'name_fr' => 'Pneumologie', 'name_en' => 'Pulmonology', 'display_order' => 14],
            ['code' => 'PSY', 'name_ar' => 'الطب النفسي', 'name_fr' => 'Psychiatrie', 'name_en' => 'Psychiatry', 'display_order' => 15],
            ['code' => 'PED_PSY', 'name_ar' => 'الطب النفسي للأطفال', 'name_fr' => 'Pédopsychiatrie', 'name_en' => 'Child Psychiatry', 'display_order' => 16],
            ['code' => 'RHUM', 'name_ar' => 'أمراض المفاصل والروماتيزم', 'name_fr' => 'Rhumatologie', 'name_en' => 'Rheumatology', 'display_order' => 17],
            ['code' => 'NEPH', 'name_ar' => 'أمراض وزراعة الكلى', 'name_fr' => 'Néphrologie', 'name_en' => 'Nephrology', 'display_order' => 18],
            ['code' => 'GEN_SURG', 'name_ar' => 'الجراحة العامة', 'name_fr' => 'Chirurgie générale', 'name_en' => 'General Surgery', 'display_order' => 19],
            ['code' => 'PED_SURG', 'name_ar' => 'جراحة الأطفال', 'name_fr' => 'Chirurgie pédiatrique', 'name_en' => 'Pediatric Surgery', 'display_order' => 20],
            ['code' => 'CARD_SURG', 'name_ar' => 'جراحة القلب والأوعية الدموية', 'name_fr' => 'Chirurgie cardiaque et vasculaire', 'name_en' => 'Cardiac Surgery', 'display_order' => 21],
            ['code' => 'THOR_SURG', 'name_ar' => 'جراحة الصدر', 'name_fr' => 'Chirurgie thoracique', 'name_en' => 'Thoracic Surgery', 'display_order' => 22],
            ['code' => 'NEUR_SURG', 'name_ar' => 'جراحة المخ والأعصاب', 'name_fr' => 'Neurochirurgie', 'name_en' => 'Neurosurgery', 'display_order' => 23],
            ['code' => 'PLAST_SURG', 'name_ar' => 'جراحة التجميل والترميم والحروق', 'name_fr' => 'Chirurgie plastique, reconstructrice et esthétique', 'name_en' => 'Plastic Surgery', 'display_order' => 24],
            ['code' => 'MAXIL_SURG', 'name_ar' => 'جراحة الوجه والفكين', 'name_fr' => 'Chirurgie maxillo-faciale et stomatologie', 'name_en' => 'Maxillofacial Surgery', 'display_order' => 25],
            ['code' => 'HEM_CLIN', 'name_ar' => 'أمراض الدم السريرية', 'name_fr' => 'Hématologie clinique', 'name_en' => 'Clinical Hematology', 'display_order' => 26],
            ['code' => 'ONC_MED', 'name_ar' => 'طب الأورام السرطانية', 'name_fr' => 'Oncologie médicale', 'name_en' => 'Medical Oncology', 'display_order' => 27],
            ['code' => 'RADIO_ONC', 'name_ar' => 'علاج الأورام بالأشعة', 'name_fr' => 'Radiothérapie oncologique', 'name_en' => 'Radiation Oncology', 'display_order' => 28],
            ['code' => 'INFECT', 'name_ar' => 'الأمراض المعدية والسارية', 'name_fr' => 'Maladies infectieuses', 'name_en' => 'Infectious Diseases', 'display_order' => 29],
            ['code' => 'PMR', 'name_ar' => 'الطب الفيزيائي وإعادة التأهيل', 'name_fr' => 'Médecine physique et de réadaptation', 'name_en' => 'Physical Medicine & Rehabilitation', 'display_order' => 30],
            ['code' => 'OCC_MED', 'name_ar' => 'طب العمل والأمراض المهنية', 'name_fr' => 'Médecine du travail', 'name_en' => 'Occupational Medicine', 'display_order' => 31],
            ['code' => 'FORENSIC', 'name_ar' => 'الطب الشرعي', 'name_fr' => 'Médecine légale', 'name_en' => 'Forensic Medicine', 'display_order' => 32],
            ['code' => 'NUC_MED', 'name_ar' => 'الطب النووي', 'name_fr' => 'Médecine nucléaire', 'name_en' => 'Nuclear Medicine', 'display_order' => 33],
            ['code' => 'ANESTH', 'name_ar' => 'التخدير والإنعاش', 'name_fr' => 'Anesthésie-réanimation', 'name_en' => 'Anesthesiology & Intensive Care', 'display_order' => 34],
            ['code' => 'ALLERG', 'name_ar' => 'أمراض الحساسية والمناعة', 'name_fr' => 'Allergologie et immunologie clinique', 'name_en' => 'Allergology & Immunology', 'display_order' => 35],
            ['code' => 'GERIAT', 'name_ar' => 'طب الشيخوخة والمسنين', 'name_fr' => 'Gériatrie', 'name_en' => 'Geriatrics', 'display_order' => 36],
            ['code' => 'RAD', 'name_ar' => 'الأشعة والتصوير الطبي', 'name_fr' => 'Radiologie et imagerie médicale', 'name_en' => 'Radiology', 'display_order' => 37, 'is_active' => false],
            ['code' => 'PATH', 'name_ar' => 'علم الأمراض والتشريح المرضي', 'name_fr' => 'Anatomie et cytologie pathologiques', 'name_en' => 'Pathology', 'display_order' => 38, 'is_active' => false],
        ];

        DB::transaction(function () use ($specialties) {
            foreach ($specialties as $spec) {
                MedicalSpecialty::updateOrCreate(
                    ['code' => $spec['code']],
                    [
                        'name_ar' => $spec['name_ar'],
                        'name_fr' => $spec['name_fr'],
                        'name_en' => $spec['name_en'],
                        'is_active' => $spec['is_active'] ?? true,
                        'display_order' => $spec['display_order'],
                    ]
                );
            }
        });
    }
}
