<?php

namespace App\Services;

use App\Models\MedicalSpecialty;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class LegacySpecialtyResolutionService
{
    /**
     * In-memory cache of active specialties indexed by code.
     *
     * @var Collection<string, MedicalSpecialty>|null
     */
    protected ?Collection $specialtiesByCode = null;

    /**
     * Map of known legacy variations to canonical specialty codes.
     */
    protected const KNOWN_ALIASES = [
        // GP
        'general practice' => 'GP',
        'general medicine' => 'GP',
        'general' => 'GP',
        'gp' => 'GP',
        'طب عام' => 'GP',
        'الطب العام' => 'GP',
        'médecine générale' => 'GP',

        // CARD
        'cardiology' => 'CARD',
        'cardiologie' => 'CARD',
        'طب القلب' => 'CARD',
        'أمراض القلب' => 'CARD',
        'أمراض القلب والشرايين' => 'CARD',
        'أمراض القلب (cardiology)' => 'CARD',
        'أمراض القلب والأوعية الدموية (cardiology)' => 'CARD',
        'طب القلب التداخلي' => 'CARD',
        'قلب' => 'CARD',

        // PED
        'pediatrics' => 'PED',
        'pédiatrie' => 'PED',
        'pediatrie' => 'PED',
        'طب الأطفال' => 'PED',
        'طب الأطفال (pediatrics)' => 'PED',
        'أطفال' => 'PED',

        // DERM
        'dermatology' => 'DERM',
        'dermatologie' => 'DERM',
        'طب الجلد' => 'DERM',
        'طب الجلد (dermatology)' => 'DERM',
        'الأمراض الجلدية' => 'DERM',
        'الأمراض الجلدية والتناسلية' => 'DERM',
        'جلدية' => 'DERM',

        // NEUR
        'neurology' => 'NEUR',
        'neurologie' => 'NEUR',
        'أمراض الأعصاب' => 'NEUR',
        'أمراض المخ والأعصاب' => 'NEUR',
        'أعصاب' => 'NEUR',

        // GYN_OBS
        'obstetrics & gynecology' => 'GYN_OBS',
        'gynecology' => 'GYN_OBS',
        'obstétrique' => 'GYN_OBS',
        'gynécologie' => 'GYN_OBS',
        'gynécologie-obstétrique' => 'GYN_OBS',
        'أمراض النساء والتوليد' => 'GYN_OBS',
        'نساء وتوليد' => 'GYN_OBS',

        // OPHTH
        'ophthalmology' => 'OPHTH',
        'ophtalmologie' => 'OPHTH',
        'طب وجراحة العيون' => 'OPHTH',
        'أمراض العيون' => 'OPHTH',
        'أمراض العيون (ophthalmology)' => 'OPHTH',
        'عيون' => 'OPHTH',

        // ORL
        'ent' => 'ORL',
        'orl' => 'ORL',
        'otolaryngology' => 'ORL',
        'oto-rhino-laryngologie' => 'ORL',
        'oto-rhino-laryngologie (orl)' => 'ORL',
        'أمراض الأنف والأذن والحنجرة' => 'ORL',
        'أنف وأذن وحنجرة' => 'ORL',

        // ORTH
        'orthopedics' => 'ORTH',
        'orthopédie' => 'ORTH',
        'orthopedie' => 'ORTH',
        'جراحة العظام' => 'ORTH',
        'جراحة العظام والمفاصل' => 'ORTH',
        'جراحة العظام (orthopedics)' => 'ORTH',
        'عظام' => 'ORTH',

        // INT_MED
        'internal medicine' => 'INT_MED',
        'médecine interne' => 'INT_MED',
        'الطب الباطني' => 'INT_MED',
        'طب باطني' => 'INT_MED',
        'باطنية' => 'INT_MED',

        // GASTRO
        'gastroenterology' => 'GASTRO',
        'gastro-entérologie' => 'GASTRO',
        'gastro' => 'GASTRO',
        'أمراض الجهاز الهضمي والكبد' => 'GASTRO',
        'جهاز هضمي' => 'GASTRO',

        // UROL
        'urology' => 'UROL',
        'urologie' => 'UROL',
        'جراحة الكلى والمسالك البولية' => 'UROL',
        'مسالك بولية' => 'UROL',

        // ENDO
        'endocrinology' => 'ENDO',
        'endocrinologie' => 'ENDO',
        'أمراض الغدد الصماء والسكري' => 'ENDO',
        'غدد صماء' => 'ENDO',

        // PNEUM
        'pulmonology' => 'PNEUM',
        'pneumologie' => 'PNEUM',
        'أمراض الصدر والجهاز التنفسي' => 'PNEUM',
        'صدرية' => 'PNEUM',

        // PSY
        'psychiatry' => 'PSY',
        'psychiatrie' => 'PSY',
        'الطب النفسي' => 'PSY',
        'نفسية' => 'PSY',

        // GEN_SURG
        'surgery' => 'GEN_SURG',
        'general surgery' => 'GEN_SURG',
        'chirurgie générale' => 'GEN_SURG',
        'الجراحة العامة' => 'GEN_SURG',
        'جراحة عامة' => 'GEN_SURG',
    ];

    /**
     * Resolve a raw legacy specialty string to a canonical MedicalSpecialty model.
     *
     * @param string|null $raw
     * @return array{
     *   status: 'RESOLVED'|'AMBIGUOUS'|'UNRESOLVED',
     *   specialty: ?MedicalSpecialty,
     *   specialty_id: ?int,
     *   code: ?string,
     *   reason: ?string,
     *   candidates: array<MedicalSpecialty>
     * }
     */
    public function resolve(string|null $raw): array
    {
        if ($raw === null || trim($raw) === '') {
            return [
                'status' => 'UNRESOLVED',
                'specialty' => null,
                'specialty_id' => null,
                'code' => null,
                'reason' => 'Empty or null specialty input',
                'candidates' => [],
            ];
        }

        $rawTrimmed = trim($raw);
        $norm = mb_strtolower($rawTrimmed, 'UTF-8');

        // Check for specific known typographic corruption
        if ($norm === 'كب الأطفال') {
            return [
                'status' => 'UNRESOLVED',
                'specialty' => null,
                'specialty_id' => null,
                'code' => null,
                'reason' => 'Typographic corruption requires operator confirmation (likely PED)',
                'candidates' => [],
            ];
        }

        // Check for composite strings (e.g., generated by legacy AuthModals: "طب عام (General Medicine) ...")
        if (str_contains($norm, 'طب عام (general medicine)') && $norm !== 'طب عام (general medicine)') {
            return [
                'status' => 'AMBIGUOUS',
                'specialty' => null,
                'specialty_id' => null,
                'code' => null,
                'reason' => 'Ambiguous composite specialty string requires human operator clarification',
                'candidates' => [],
            ];
        }

        // RAD and PATH represent diagnostic services and cannot be assigned as physician specialties
        if (in_array(strtoupper($rawTrimmed), ['RAD', 'PATH']) || in_array($norm, ['radiology', 'radiologie', 'pathology', 'pathologie', 'الأشعة والتصوير الطبي', 'علم الأمراض والتشريح المرضي', 'أشعة'])) {
            return [
                'status' => 'UNRESOLVED',
                'specialty' => null,
                'specialty_id' => null,
                'code' => null,
                'reason' => 'Radiology (RAD) and Pathology (PATH) represent diagnostic services and cannot be assigned as physician specialties',
                'candidates' => [],
            ];
        }

        $specialties = $this->loadSpecialties();

        // 1. Direct code lookup (case-insensitive)
        $codeUpper = strtoupper($rawTrimmed);
        if ($specialties->has($codeUpper)) {
            $model = $specialties->get($codeUpper);
            return [
                'status' => 'RESOLVED',
                'specialty' => $model,
                'specialty_id' => $model->id,
                'code' => $model->code,
                'reason' => 'Direct code match',
                'candidates' => [$model],
            ];
        }

        // 2. Direct name matching across all 3 languages
        foreach ($specialties as $item) {
            if (
                mb_strtolower($item->name_ar, 'UTF-8') === $norm ||
                mb_strtolower($item->name_fr, 'UTF-8') === $norm ||
                mb_strtolower($item->name_en, 'UTF-8') === $norm
            ) {
                return [
                    'status' => 'RESOLVED',
                    'specialty' => $item,
                    'specialty_id' => $item->id,
                    'code' => $item->code,
                    'reason' => 'Direct name match',
                    'candidates' => [$item],
                ];
            }
        }

        // 3. Known aliases lookup
        if (isset(self::KNOWN_ALIASES[$norm])) {
            $canonicalCode = self::KNOWN_ALIASES[$norm];
            if ($specialties->has($canonicalCode)) {
                $model = $specialties->get($canonicalCode);
                return [
                    'status' => 'RESOLVED',
                    'specialty' => $model,
                    'specialty_id' => $model->id,
                    'code' => $model->code,
                    'reason' => "Resolved via alias: {$norm} -> {$canonicalCode}",
                    'candidates' => [$model],
                ];
            }
        }

        // Fallback: unresolved
        return [
            'status' => 'UNRESOLVED',
            'specialty' => null,
            'specialty_id' => null,
            'code' => null,
            'reason' => 'No unambiguous match found in master data catalog',
            'candidates' => [],
        ];
    }

    /**
     * Convenience method returning only the resolved MedicalSpecialty model or null.
     */
    public function resolveSpecialtyModel(string|null $raw): ?MedicalSpecialty
    {
        $res = $this->resolve($raw);
        return $res['status'] === 'RESOLVED' ? $res['specialty'] : null;
    }

    /**
     * Load all active specialties into memory.
     *
     * @return Collection<string, MedicalSpecialty>
     */
    protected function loadSpecialties(): Collection
    {
        if ($this->specialtiesByCode === null) {
            $this->specialtiesByCode = MedicalSpecialty::active()->get()->keyBy(fn ($s) => strtoupper($s->code));
        }

        return $this->specialtiesByCode;
    }

    /**
     * Clear in-memory cache.
     */
    public function clearCache(): void
    {
        $this->specialtiesByCode = null;
    }
}
