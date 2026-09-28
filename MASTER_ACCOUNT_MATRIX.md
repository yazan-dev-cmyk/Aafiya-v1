# Aafiya — MASTER ACCOUNT MATRIX

> [!IMPORTANT]
> **CANONICAL DATABASE RECONSTRUCTION (vCURRENT)**
> Generated directly from current live database records on 2026-09-07 15:19:45.
> Test credentials listed below are synthetic non-production accounts strictly for operational development and E2E verification.

---

## Executive Summary & Account Counts

| Account Category | Target Count | Actual DB Count | Status |
| :--- | :---: | :---: | :---: |
| **Patients (PAT-001..100)** | 100 | 100 | PASS |
| **Doctors (DOC-001..010)** | 13 | 13 | PASS |
| **Clinic Assistants (AST-001..010)** | 10 | 10 | PASS |
| **Booking Centers & Staff (BC-001..005, BCA-001..003)** | 8 | 8 | PASS |
| **Laboratories (LAB-001..005)** | 5 | 5 | PASS |
| **Laboratory Staff (LABA-001..005)** | 5 | 5 | PASS |
| **Radiology Centers (RAD-001..005)** | 5 | 5 | PASS |
| **Protected / System Accounts** | 14 | 14 | PASS |
| **TOTAL SYNTHETIC ACCOUNTS** | **146** | **146** | **PASS** |
| **PROTECTED SYSTEM ACCOUNTS** | **14** | **14** | **UNCHANGED** |
| **TOTAL DATABASE ACCOUNTS** | **160** | **160** | **PASS** |

---

## Quick Search Index (Test ID → Email → Entity)

| Test ID | Role | Name | Email | Primary Entity / Profile ID | Clinic / Center Affiliation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **PROT-ADM-001** | admin | لخضر جديد | `val.admin@aafiya.dz` | `N/A` | N/A | Active |
| **PROT-AST-001** | admin_assistant | عبدالله أحمد | `val.admin.ast@aafiya.dz` | `N/A` | N/A | Active |
| **PROT-DOC-001** | doctor | مرسلي فاتح | `val.doctor.dir@aafiya.dz` | `01a056bf-ece0-7053-a7c1-3f8334dfffc4` | عيادة الأمل (🔴 DIRECTOR) | Active |
| **PROT-DOC-003** | doctor | سمير بن علي | `val.doctor.emp@aafiya.dz` | `01a05821-6a78-7038-9eda-0d44243054db` | عيادة الأمل (🟠 EMPLOYED DOCTOR), عيادة الشفاء من عند الله (🟠 EMPLOYED DOCTOR) | Active |
| **PROT-AST-002** | doctor_assistant | أمينة حداد | `val.assistant@aafiya.dz` | `01a05bcb-534a-7185-a49f-a34f1171441d` | عيادة الأمل | Active |
| **PROT-AST-003** | doctor_assistant | مساعد طبيب 2 | `val.assistant2@aafiya.dz` | `01a05bef-95f9-72e9-908e-fd7e5e81cbfd` | عيادة الأمل | Active |
| **PROT-SYS-63CC** | booking_center | عيادة الشفاء | `val.doctor.dir_shifae@aafiya.dz` | `N/A` | N/A | Active |
| **PROT-DOC-002** | doctor | قادة بن محمد | `val.doctor.dir.2@aafiya.dz` | `01a05c2b-0e2e-7361-9de0-5187fb93cc3e` | عيادة الشفاء من عند الله (🔴 DIRECTOR) | Active |
| **PROT-LAB-001** | lab | مخبر العافية | `val.lab.mgr@aafiya.dz` | `N/A` | مخبر مخبر العافية | Active |
| **PROT-LABA-001** | lab_assistant | محمد بن كامل | `val.lab.tech@aafiya.dz` | `01a05d4a-85f2-71aa-86cd-bdece9581e2e` | مخبر مخبر العافية | Active |
| **PROT-RAD-001** | radiology | مركز الأشعة الخالصة | `val.rad.mgr@aafiya.dz` | `N/A` | مركز مركز الأشعة الخالصة | Active |
| **PROT-RADA-001** | rad_assistant | كلاخي بوديسة | `val.rad.tech@aafiya.dz` | `01a05d4f-478b-704a-9aa1-215bd485e8f1` | مركز مركز الأشعة الخالصة | Active |
| **PROT-PAT-001** | patient_registered | ريان شرقي | `val.patient@aafiya.dz` | `01a0614e-d94c-71e9-81dd-b0649dcf1627` | MRN: MRN-2026-0001 (سيدي بلعباس) | Active |
| **PROT-BC-002** | booking_center | مركز الحجز للشفاء | `val.booking-1@aafiya.dz` | `01a061bd-f41e-71be-8f80-76ad99f9d1da` | Quota: 18 units | Active |
| **PAT-001** | patient_registered | مريض اختباري 001 | `patient001@aafiya.test` | `01a06b59-0349-72c4-85e8-e280de9fc3d6` | MRN: MRN-2026-0002 (Alger) | Active |
| **PAT-002** | patient_registered | مريض اختباري 002 | `patient002@aafiya.test` | `01a06b59-0425-708f-a152-7aa77ef08e30` | MRN: MRN-2026-0003 (Oran) | Active |
| **PAT-003** | patient_registered | مريض اختباري 003 | `patient003@aafiya.test` | `01a06b59-04ff-7372-943e-7482c0ca2ae3` | MRN: MRN-2026-0004 (Constantine) | Active |
| **PAT-004** | patient_registered | مريض اختباري 004 | `patient004@aafiya.test` | `01a06b59-05da-733a-a260-ce4b5f0199b3` | MRN: MRN-2026-0005 (Blida) | Active |
| **PAT-005** | patient_registered | مريض اختباري 005 | `patient005@aafiya.test` | `01a06b59-06b4-736a-9c76-3d1a318db88f` | MRN: MRN-2026-0006 (Annaba) | Active |
| **PAT-006** | patient_registered | مريض اختباري 006 | `patient006@aafiya.test` | `01a06b59-0792-71fb-b96f-c17d01a6e5f7` | MRN: MRN-2026-0007 (Setif) | Active |
| **PAT-007** | patient_registered | مريض اختباري 007 | `patient007@aafiya.test` | `01a06b59-086e-734a-855a-dc606a315bdb` | MRN: MRN-2026-0008 (Batna) | Active |
| **PAT-008** | patient_registered | مريض اختباري 008 | `patient008@aafiya.test` | `01a06b59-094b-7149-97d8-2d39790cc579` | MRN: MRN-2026-0009 (Tlemcen) | Active |
| **PAT-009** | patient_registered | مريض اختباري 009 | `patient009@aafiya.test` | `01a06b59-0a25-7002-94ef-3f593ae60782` | MRN: MRN-2026-0010 (Alger) | Active |
| **PAT-010** | patient_registered | مريض اختباري 010 | `patient010@aafiya.test` | `01a06b59-0b01-70a4-8982-f31752efbc88` | MRN: MRN-2026-0011 (Oran) | Active |
| **PAT-011** | patient_registered | مريض اختباري 011 | `patient011@aafiya.test` | `01a06b59-0bdc-73ae-96c6-1844280dbfea` | MRN: MRN-2026-0012 (Constantine) | Active |
| **PAT-012** | patient_registered | مريض اختباري 012 | `patient012@aafiya.test` | `01a06b59-0cb8-72d0-ae13-68e9ed6f82b0` | MRN: MRN-2026-0013 (Blida) | Active |
| **PAT-013** | patient_registered | مريض اختباري 013 | `patient013@aafiya.test` | `01a06b59-0d91-72a7-a612-e5bd88d41c4d` | MRN: MRN-2026-0014 (Annaba) | Active |
| **PAT-014** | patient_registered | مريض اختباري 014 | `patient014@aafiya.test` | `01a06b59-0e6b-7299-8e19-bf2776043e12` | MRN: MRN-2026-0015 (Setif) | Active |
| **PAT-015** | patient_registered | مريض اختباري 015 | `patient015@aafiya.test` | `01a06b59-0f43-70df-8482-456636e75861` | MRN: MRN-2026-0016 (Batna) | Active |
| **PAT-016** | patient_registered | مريض اختباري 016 | `patient016@aafiya.test` | `01a06b59-101c-725f-8e4a-1e534ee0a630` | MRN: MRN-2026-0017 (Tlemcen) | Active |
| **PAT-017** | patient_registered | مريض اختباري 017 | `patient017@aafiya.test` | `01a06b59-10f4-72fb-b049-dbed4d7ab429` | MRN: MRN-2026-0018 (Alger) | Active |
| **PAT-018** | patient_registered | مريض اختباري 018 | `patient018@aafiya.test` | `01a06b59-11cd-7304-8e66-e32097709176` | MRN: MRN-2026-0019 (Oran) | Active |
| **PAT-019** | patient_registered | مريض اختباري 019 | `patient019@aafiya.test` | `01a06b59-12a6-72fc-92e7-ace72d9fb261` | MRN: MRN-2026-0020 (Constantine) | Active |
| **PAT-020** | patient_registered | مريض اختباري 020 | `patient020@aafiya.test` | `01a06b59-137f-7310-a1f3-52cae0d5abd3` | MRN: MRN-2026-0021 (Blida) | Active |
| **PAT-021** | patient_registered | مريض اختباري 021 | `patient021@aafiya.test` | `01a06b59-1455-7156-a1ff-193d2765e0d4` | MRN: MRN-2026-0022 (Annaba) | Active |
| **PAT-022** | patient_registered | مريض اختباري 022 | `patient022@aafiya.test` | `01a06b59-152e-71fa-bec7-68188c9632ca` | MRN: MRN-2026-0023 (Setif) | Active |
| **PAT-023** | patient_registered | مريض اختباري 023 | `patient023@aafiya.test` | `01a06b59-1607-70bc-919d-159b508c603a` | MRN: MRN-2026-0024 (Batna) | Active |
| **PAT-024** | patient_registered | مريض اختباري 024 | `patient024@aafiya.test` | `01a06b59-16df-718f-ab2f-7c60f714eb37` | MRN: MRN-2026-0025 (Tlemcen) | Active |
| **PAT-025** | patient_registered | مريض اختباري 025 | `patient025@aafiya.test` | `01a06b59-17b7-7200-be5c-6d239ee5f0cf` | MRN: MRN-2026-0026 (Alger) | Active |
| **PAT-026** | patient_registered | مريض اختباري 026 | `patient026@aafiya.test` | `01a06b59-1890-72bd-a6ad-1bf837a709ed` | MRN: MRN-2026-0027 (Oran) | Active |
| **PAT-027** | patient_registered | مريض اختباري 027 | `patient027@aafiya.test` | `01a06b59-196a-72b4-b84d-2405f4549abe` | MRN: MRN-2026-0028 (Constantine) | Active |
| **PAT-028** | patient_registered | مريض اختباري 028 | `patient028@aafiya.test` | `01a06b59-1a42-704e-91a8-4b2e6a6e4a30` | MRN: MRN-2026-0029 (Blida) | Active |
| **PAT-029** | patient_registered | مريض اختباري 029 | `patient029@aafiya.test` | `01a06b59-1b1a-739e-9f61-13f76af923ea` | MRN: MRN-2026-0030 (Annaba) | Active |
| **PAT-030** | patient_registered | مريض اختباري 030 | `patient030@aafiya.test` | `01a06b59-1bf3-725e-9043-798f018750f1` | MRN: MRN-2026-0031 (Setif) | Active |
| **PAT-031** | patient_registered | مريض اختباري 031 | `patient031@aafiya.test` | `01a06b59-1ccc-72f6-9e89-4279671046d2` | MRN: MRN-2026-0032 (Batna) | Active |
| **PAT-032** | patient_registered | مريض اختباري 032 | `patient032@aafiya.test` | `01a06b59-1da5-72d5-abc6-c5f9d01e8612` | MRN: MRN-2026-0033 (Tlemcen) | Active |
| **PAT-033** | patient_registered | مريض اختباري 033 | `patient033@aafiya.test` | `01a06b59-1e7f-719e-9f70-17561f737cf1` | MRN: MRN-2026-0034 (Alger) | Active |
| **PAT-034** | patient_registered | مريض اختباري 034 | `patient034@aafiya.test` | `01a06b59-1f57-73c7-9717-89258255a26d` | MRN: MRN-2026-0035 (Oran) | Active |
| **PAT-035** | patient_registered | مريض اختباري 035 | `patient035@aafiya.test` | `01a06b59-202e-7350-8a26-87a911d65c0e` | MRN: MRN-2026-0036 (Constantine) | Active |
| **PAT-036** | patient_registered | مريض اختباري 036 | `patient036@aafiya.test` | `01a06b59-2106-71cb-b58a-a38a549a85d8` | MRN: MRN-2026-0037 (Blida) | Active |
| **PAT-037** | patient_registered | مريض اختباري 037 | `patient037@aafiya.test` | `01a06b59-21de-71ac-b713-3ac36eaef55e` | MRN: MRN-2026-0038 (Annaba) | Active |
| **PAT-038** | patient_registered | مريض اختباري 038 | `patient038@aafiya.test` | `01a06b59-22b7-732f-8e82-86580f011824` | MRN: MRN-2026-0039 (Setif) | Active |
| **PAT-039** | patient_registered | مريض اختباري 039 | `patient039@aafiya.test` | `01a06b59-2390-7314-8ea4-40ad59f303ef` | MRN: MRN-2026-0040 (Batna) | Active |
| **PAT-040** | patient_registered | مريض اختباري 040 | `patient040@aafiya.test` | `01a06b59-246a-7231-b9ec-202c7a82b52d` | MRN: MRN-2026-0041 (Tlemcen) | Active |
| **PAT-041** | patient_registered | مريض اختباري 041 | `patient041@aafiya.test` | `01a06b59-2542-7038-8467-6e5e4f73ddff` | MRN: MRN-2026-0042 (Alger) | Active |
| **PAT-042** | patient_registered | مريض اختباري 042 | `patient042@aafiya.test` | `01a06b59-261b-72ae-89bf-2c714bfa9b86` | MRN: MRN-2026-0043 (Oran) | Active |
| **PAT-043** | patient_registered | مريض اختباري 043 | `patient043@aafiya.test` | `01a06b59-26f4-7356-9701-5fa1ff4381f5` | MRN: MRN-2026-0044 (Constantine) | Active |
| **PAT-044** | patient_registered | مريض اختباري 044 | `patient044@aafiya.test` | `01a06b59-27cc-7249-b1c1-31a6227eac93` | MRN: MRN-2026-0045 (Blida) | Active |
| **PAT-045** | patient_registered | مريض اختباري 045 | `patient045@aafiya.test` | `01a06b59-28a4-7212-8b78-8fcdb424bb93` | MRN: MRN-2026-0046 (Annaba) | Active |
| **PAT-046** | patient_registered | مريض اختباري 046 | `patient046@aafiya.test` | `01a06b59-297e-7120-a498-9de22ce276d7` | MRN: MRN-2026-0047 (Setif) | Active |
| **PAT-047** | patient_registered | مريض اختباري 047 | `patient047@aafiya.test` | `01a06b59-2a58-72d4-9f40-3e2fbc9d3af4` | MRN: MRN-2026-0048 (Batna) | Active |
| **PAT-048** | patient_registered | مريض اختباري 048 | `patient048@aafiya.test` | `01a06b59-2b34-700b-bf9d-245632f30fae` | MRN: MRN-2026-0049 (Tlemcen) | Active |
| **PAT-049** | patient_registered | مريض اختباري 049 | `patient049@aafiya.test` | `01a06b59-2c14-7307-9601-95feedce7eee` | MRN: MRN-2026-0050 (Alger) | Active |
| **PAT-050** | patient_registered | مريض اختباري 050 | `patient050@aafiya.test` | `01a06b59-2cf1-73aa-9974-c96c79d64cae` | MRN: MRN-2026-0051 (Oran) | Active |
| **PAT-051** | patient_registered | مريض اختباري 051 | `patient051@aafiya.test` | `01a06b59-2dd0-7298-b867-6673a3ea0e57` | MRN: MRN-2026-0052 (Constantine) | Active |
| **PAT-052** | patient_registered | مريض اختباري 052 | `patient052@aafiya.test` | `01a06b59-2eab-7026-8762-aad1e05d1718` | MRN: MRN-2026-0053 (Blida) | Active |
| **PAT-053** | patient_registered | مريض اختباري 053 | `patient053@aafiya.test` | `01a06b59-2f85-7282-b33c-cc3cf5339efd` | MRN: MRN-2026-0054 (Annaba) | Active |
| **PAT-054** | patient_registered | مريض اختباري 054 | `patient054@aafiya.test` | `01a06b59-305f-7056-a038-94d5154dad23` | MRN: MRN-2026-0055 (Setif) | Active |
| **PAT-055** | patient_registered | مريض اختباري 055 | `patient055@aafiya.test` | `01a06b59-3138-70fa-86d7-ddcdff169797` | MRN: MRN-2026-0056 (Batna) | Active |
| **PAT-056** | patient_registered | مريض اختباري 056 | `patient056@aafiya.test` | `01a06b59-320f-7249-a4ad-2aec6edbe36f` | MRN: MRN-2026-0057 (Tlemcen) | Active |
| **PAT-057** | patient_registered | مريض اختباري 057 | `patient057@aafiya.test` | `01a06b59-32e9-71bf-8e3d-cb1aec2ac3d9` | MRN: MRN-2026-0058 (Alger) | Active |
| **PAT-058** | patient_registered | مريض اختباري 058 | `patient058@aafiya.test` | `01a06b59-33c3-73ff-ba6c-b855771c2c23` | MRN: MRN-2026-0059 (Oran) | Active |
| **PAT-059** | patient_registered | مريض اختباري 059 | `patient059@aafiya.test` | `01a06b59-349b-7078-b042-79e9d541a032` | MRN: MRN-2026-0060 (Constantine) | Active |
| **PAT-060** | patient_registered | مريض اختباري 060 | `patient060@aafiya.test` | `01a06b59-3573-70a7-87bf-1c40c39ab6ad` | MRN: MRN-2026-0061 (Blida) | Active |
| **PAT-061** | patient_registered | مريض اختباري 061 | `patient061@aafiya.test` | `01a06b59-364c-71f6-9464-4eab7010a1a8` | MRN: MRN-2026-0062 (Annaba) | Active |
| **PAT-062** | patient_registered | مريض اختباري 062 | `patient062@aafiya.test` | `01a06b59-3724-7142-87ff-965cbb1ecf93` | MRN: MRN-2026-0063 (Setif) | Active |
| **PAT-063** | patient_registered | مريض اختباري 063 | `patient063@aafiya.test` | `01a06b59-37fc-715f-8227-87eb1743cfd7` | MRN: MRN-2026-0064 (Batna) | Active |
| **PAT-064** | patient_registered | مريض اختباري 064 | `patient064@aafiya.test` | `01a06b59-38d4-73b9-98d5-cce470ca9f6b` | MRN: MRN-2026-0065 (Tlemcen) | Active |
| **PAT-065** | patient_registered | مريض اختباري 065 | `patient065@aafiya.test` | `01a06b59-39ad-7287-8f70-a18cfbcd6c0f` | MRN: MRN-2026-0066 (Alger) | Active |
| **PAT-066** | patient_registered | مريض اختباري 066 | `patient066@aafiya.test` | `01a06b59-3a86-718b-9632-8577d980efca` | MRN: MRN-2026-0067 (Oran) | Active |
| **PAT-067** | patient_registered | مريض اختباري 067 | `patient067@aafiya.test` | `01a06b59-3b5e-73b9-ac7d-969a5190c362` | MRN: MRN-2026-0068 (Constantine) | Active |
| **PAT-068** | patient_registered | مريض اختباري 068 | `patient068@aafiya.test` | `01a06b59-3c38-7310-bca1-d7611c9815a4` | MRN: MRN-2026-0069 (Blida) | Active |
| **PAT-069** | patient_registered | مريض اختباري 069 | `patient069@aafiya.test` | `01a06b59-3d10-73f1-9fba-f939ff3ddaf1` | MRN: MRN-2026-0070 (Annaba) | Active |
| **PAT-070** | patient_registered | مريض اختباري 070 | `patient070@aafiya.test` | `01a06b59-3de9-7312-8203-835963092fb4` | MRN: MRN-2026-0071 (Setif) | Active |
| **PAT-071** | patient_registered | مريض اختباري 071 | `patient071@aafiya.test` | `01a06b59-3ec1-70f6-9927-de4929787c72` | MRN: MRN-2026-0072 (Batna) | Active |
| **PAT-072** | patient_registered | مريض اختباري 072 | `patient072@aafiya.test` | `01a06b59-3f9a-70bd-ae9e-619eba2f5504` | MRN: MRN-2026-0073 (Tlemcen) | Active |
| **PAT-073** | patient_registered | مريض اختباري 073 | `patient073@aafiya.test` | `01a06b59-4072-72c9-ad14-fb9f4d623f4c` | MRN: MRN-2026-0074 (Alger) | Active |
| **PAT-074** | patient_registered | مريض اختباري 074 | `patient074@aafiya.test` | `01a06b59-414b-73b6-b1d9-fac74adee5f0` | MRN: MRN-2026-0075 (Oran) | Active |
| **PAT-075** | patient_registered | مريض اختباري 075 | `patient075@aafiya.test` | `01a06b59-4224-7224-98ff-5d4659dac738` | MRN: MRN-2026-0076 (Constantine) | Active |
| **PAT-076** | patient_registered | مريض اختباري 076 | `patient076@aafiya.test` | `01a06b59-4307-7296-bb03-47ad9fd21e39` | MRN: MRN-2026-0077 (Blida) | Active |
| **PAT-077** | patient_registered | مريض اختباري 077 | `patient077@aafiya.test` | `01a06b59-43e1-73f6-8e55-8b6f31339ce9` | MRN: MRN-2026-0078 (Annaba) | Active |
| **PAT-078** | patient_registered | مريض اختباري 078 | `patient078@aafiya.test` | `01a06b59-44ba-71d6-a80e-1e598f393a51` | MRN: MRN-2026-0079 (Setif) | Active |
| **PAT-079** | patient_registered | مريض اختباري 079 | `patient079@aafiya.test` | `01a06b59-4592-70f2-9bbb-f4d2c8fbd5ec` | MRN: MRN-2026-0080 (Batna) | Active |
| **PAT-080** | patient_registered | مريض اختباري 080 | `patient080@aafiya.test` | `01a06b59-466c-719e-8e5a-3915f8e75006` | MRN: MRN-2026-0081 (Tlemcen) | Active |
| **PAT-081** | patient_registered | مريض اختباري 081 | `patient081@aafiya.test` | `01a06b59-4745-71a3-b8dc-0a48d0c22e60` | MRN: MRN-2026-0082 (Alger) | Active |
| **PAT-082** | patient_registered | مريض اختباري 082 | `patient082@aafiya.test` | `01a06b59-4820-73af-aa4d-4adb5eb133ef` | MRN: MRN-2026-0083 (Oran) | Active |
| **PAT-083** | patient_registered | مريض اختباري 083 | `patient083@aafiya.test` | `01a06b59-48f9-7387-886e-04ca71be73f0` | MRN: MRN-2026-0084 (Constantine) | Active |
| **PAT-084** | patient_registered | مريض اختباري 084 | `patient084@aafiya.test` | `01a06b59-49d1-704a-a6f0-8a7736b1ab9f` | MRN: MRN-2026-0085 (Blida) | Active |
| **PAT-085** | patient_registered | مريض اختباري 085 | `patient085@aafiya.test` | `01a06b59-4aab-711b-98a9-d35817cd2f69` | MRN: MRN-2026-0086 (Annaba) | Active |
| **PAT-086** | patient_registered | مريض اختباري 086 | `patient086@aafiya.test` | `01a06b59-4b87-7260-9335-655a7fe9cf2b` | MRN: MRN-2026-0087 (Setif) | Active |
| **PAT-087** | patient_registered | مريض اختباري 087 | `patient087@aafiya.test` | `01a06b59-4c62-7364-ae4a-cdb22d04cb29` | MRN: MRN-2026-0088 (Batna) | Active |
| **PAT-088** | patient_registered | مريض اختباري 088 | `patient088@aafiya.test` | `01a06b59-4d3e-70c2-b385-af53f6230e80` | MRN: MRN-2026-0089 (Tlemcen) | Active |
| **PAT-089** | patient_registered | مريض اختباري 089 | `patient089@aafiya.test` | `01a06b59-4e19-70b2-9853-4021cb3c5b34` | MRN: MRN-2026-0090 (Alger) | Active |
| **PAT-090** | patient_registered | مريض اختباري 090 | `patient090@aafiya.test` | `01a06b59-4f21-7188-a83e-02c439170d04` | MRN: MRN-2026-0091 (Oran) | Active |
| **PAT-091** | patient_registered | مريض اختباري 091 | `patient091@aafiya.test` | `01a06b59-4ffb-7196-bd1d-161e0c56f17b` | MRN: MRN-2026-0092 (Constantine) | Active |
| **PAT-092** | patient_registered | مريض اختباري 092 | `patient092@aafiya.test` | `01a06b59-50d4-7178-a4b2-8dc6a9202a05` | MRN: MRN-2026-0093 (Blida) | Active |
| **PAT-093** | patient_registered | مريض اختباري 093 | `patient093@aafiya.test` | `01a06b59-51ac-7324-8dbc-b2bbe96f7696` | MRN: MRN-2026-0094 (Annaba) | Active |
| **PAT-094** | patient_registered | مريض اختباري 094 | `patient094@aafiya.test` | `01a06b59-5285-713b-a763-b2f996662258` | MRN: MRN-2026-0095 (Setif) | Active |
| **PAT-095** | patient_registered | مريض اختباري 095 | `patient095@aafiya.test` | `01a06b59-535e-702a-973d-428bd5d24544` | MRN: MRN-2026-0096 (Batna) | Active |
| **PAT-096** | patient_registered | مريض اختباري 096 | `patient096@aafiya.test` | `01a06b59-5437-7183-bf8e-6a8d3fe7fb43` | MRN: MRN-2026-0097 (Tlemcen) | Active |
| **PAT-097** | patient_registered | مريض اختباري 097 | `patient097@aafiya.test` | `01a06b59-5513-7350-921d-031d1d86d4cb` | MRN: MRN-2026-0098 (Alger) | Active |
| **PAT-098** | patient_registered | مريض اختباري 098 | `patient098@aafiya.test` | `01a06b59-55ed-730f-9ae5-ac440c25b6a4` | MRN: MRN-2026-0099 (Oran) | Active |
| **PAT-099** | patient_registered | مريض اختباري 099 | `patient099@aafiya.test` | `01a06b59-56cb-7049-bd37-90b789454ef8` | MRN: MRN-2026-0100 (Constantine) | Active |
| **PAT-100** | patient_registered | مريض اختباري 100 | `patient100@aafiya.test` | `01a06b59-57a7-734e-b8ce-af47d15baf9c` | MRN: MRN-2026-0101 (Blida) | Active |
| **DOC-001** | doctor | د. طبيب اختباري 001 | `doctor001@aafiya.test` | `01a06b59-587f-72e5-bcc6-df39bf1ac1af` | عيادة شفاء الاختبارية 01 (🔴 DIRECTOR) | Active |
| **DOC-002** | doctor | د. طبيب اختباري 002 | `doctor002@aafiya.test` | `01a06b59-5959-7052-adfb-643062f513d3` | عيادة شفاء الاختبارية 02 (🔴 DIRECTOR) | Active |
| **DOC-003** | doctor | د. طبيب اختباري 003 | `doctor003@aafiya.test` | `01a06b59-5a31-73ad-ae74-aead5264a00e` | عيادة شفاء الاختبارية 03 (🔴 DIRECTOR) | Active |
| **DOC-004** | doctor | د. طبيب اختباري 004 | `doctor004@aafiya.test` | `01a06b59-5b0a-71ad-9eb9-49456e09aea0` | عيادة شفاء الاختبارية 04 (🔴 DIRECTOR) | Active |
| **DOC-005** | doctor | د. طبيب اختباري 005 | `doctor005@aafiya.test` | `01a06b59-5be3-715c-aa8c-3500df12f247` | عيادة شفاء الاختبارية 05 (🔴 DIRECTOR) | Active |
| **DOC-006** | doctor | د. طبيب اختباري 006 | `doctor006@aafiya.test` | `01a06b59-5cbb-717b-8ec6-ee25b97523c2` | عيادة شفاء الاختبارية 06 (🔴 DIRECTOR) | Active |
| **DOC-007** | doctor | د. طبيب اختباري 007 | `doctor007@aafiya.test` | `01a06b59-5d96-72b4-b910-5354f37576a4` | عيادة شفاء الاختبارية 06 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-008** | doctor | د. طبيب اختباري 008 | `doctor008@aafiya.test` | `01a06b59-5e6f-72dd-a89d-cf2049f34e72` | عيادة شفاء الاختبارية 07 (🔴 DIRECTOR) | Active |
| **DOC-009** | doctor | د. طبيب اختباري 009 | `doctor009@aafiya.test` | `01a06b59-5f48-7090-97b9-d93e9fd5943c` | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR), عيادة شفاء الاختبارية 07 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-010** | doctor | د. طبيب اختباري 010 | `doctor010@aafiya.test` | `01a06b59-601f-70e6-961b-33a68a16cb50` | عيادة شفاء الاختبارية 07 (🟠 EMPLOYED DOCTOR) | Active |
| **AST-001** | doctor_assistant | مساعد طبيب اختباري 001 | `ast001@aafiya.test` | `01a06b59-6117-71f4-bacc-bc328212bf41` | عيادة شفاء الاختبارية 01 | Active |
| **AST-002** | doctor_assistant | مساعد طبيب اختباري 002 | `ast002@aafiya.test` | `01a06b59-61f0-720e-b31b-62345d5644db` | عيادة شفاء الاختبارية 02 | Active |
| **AST-003** | doctor_assistant | مساعد طبيب اختباري 003 | `ast003@aafiya.test` | `01a06b59-62c8-726b-9728-6d2c97036610` | عيادة شفاء الاختبارية 03 | Active |
| **AST-004** | doctor_assistant | مساعد طبيب اختباري 004 | `ast004@aafiya.test` | `01a06b59-63a1-7218-ba91-3335d9d345a2` | عيادة شفاء الاختبارية 04 | Active |
| **AST-005** | doctor_assistant | مساعد طبيب اختباري 005 | `ast005@aafiya.test` | `01a06b59-647b-73ff-8c23-aa94be7e6a4d` | عيادة شفاء الاختبارية 05 | Active |
| **AST-006** | doctor_assistant | مساعد طبيب اختباري 006 | `ast006@aafiya.test` | `01a06b59-6555-7335-8769-d32f1c19954e` | عيادة شفاء الاختبارية 06 | Active |
| **AST-007** | doctor_assistant | مساعد طبيب اختباري 007 | `ast007@aafiya.test` | `01a06b59-662b-7270-bffc-4d78a63dd802` | عيادة شفاء الاختبارية 06 | Active |
| **AST-008** | doctor_assistant | مساعد طبيب اختباري 008 | `ast008@aafiya.test` | `01a06b59-6703-70b1-9352-2511940bb0c4` | عيادة شفاء الاختبارية 07 | Active |
| **AST-009** | doctor_assistant | مساعد طبيب اختباري 009 | `ast009@aafiya.test` | `01a06b59-67d9-7176-be67-13093d98c4b1` | عيادة شفاء الاختبارية 07 | Active |
| **AST-010** | doctor_assistant | مساعد طبيب اختباري 010 | `ast010@aafiya.test` | `01a06b59-68b3-72f3-a748-794f2acc0228` | عيادة شفاء الاختبارية 07 | Active |
| **BC-001** | booking_center | مركز الحجز التجريبي 001 | `bc001@aafiya.test` | `01a06b59-698d-7043-b1a5-53b2276e2aa3` | Quota: 17 units | Active |
| **BC-002** | booking_center | مركز الحجز التجريبي 002 | `bc002@aafiya.test` | `01a06b59-6a65-703b-8fd6-b70a5e2ad681` | Quota: 0 units | Active |
| **BC-003** | booking_center | مركز الحجز التجريبي 003 | `bc003@aafiya.test` | `01a06b59-6b3e-70ca-974d-06848bad8846` | Quota: 500 units | Active |
| **BC-004** | booking_center | مركز الحجز التجريبي 004 | `bc004@aafiya.test` | `01a06b59-6c15-7216-9055-9fa5b0e70641` | Quota: 1000 units | Active |
| **BC-005** | booking_center | مركز الحجز التجريبي 005 | `bc005@aafiya.test` | `01a06b59-6cec-7081-92ef-fb8972eb668e` | Quota: 250 units | Active |
| **BCA-001** | booking_center | مساعد مركز حجز اختباري 001 | `bca001@aafiya.test` | `N/A` | N/A | Active |
| **BCA-002** | booking_center | مساعد مركز حجز اختباري 002 | `bca002@aafiya.test` | `N/A` | N/A | Active |
| **BCA-003** | booking_center | مساعد مركز حجز اختباري 003 | `bca003@aafiya.test` | `N/A` | N/A | Active |
| **LAB-001** | lab | مخبر التحاليل التجريبي 001 | `lab001@aafiya.test` | `N/A` | مخبر التحاليل التجريبي 001 | Active |
| **LAB-002** | lab | مخبر التحاليل التجريبي 002 | `lab002@aafiya.test` | `N/A` | مخبر التحاليل التجريبي 002 | Active |
| **LAB-003** | lab | مخبر التحاليل التجريبي 003 | `lab003@aafiya.test` | `N/A` | مخبر التحاليل التجريبي 003 | Active |
| **LAB-004** | lab | مخبر التحاليل التجريبي 004 | `lab004@aafiya.test` | `N/A` | مخبر التحاليل التجريبي 004 | Active |
| **LAB-005** | lab | مخبر التحاليل التجريبي 005 | `lab005@aafiya.test` | `N/A` | مخبر التحاليل التجريبي 005 | Active |
| **LABA-001** | lab_assistant | فني مخبر اختباري 001 | `laba001@aafiya.test` | `01a06b59-7489-717e-b5a0-3d37f33021e4` | مخبر التحاليل التجريبي 001 | Active |
| **LABA-002** | lab_assistant | فني مخبر اختباري 002 | `laba002@aafiya.test` | `01a06b59-7565-72fc-b04c-e429c72f6954` | مخبر التحاليل التجريبي 002 | Active |
| **LABA-003** | lab_assistant | فني مخبر اختباري 003 | `laba003@aafiya.test` | `01a06b59-765a-73ca-bf03-abb78ba06165` | مخبر التحاليل التجريبي 003 | Active |
| **LABA-004** | lab_assistant | فني مخبر اختباري 004 | `laba004@aafiya.test` | `01a06b59-7736-73ac-aafe-d1e742ee4dee` | مخبر التحاليل التجريبي 004 | Active |
| **LABA-005** | lab_assistant | فني مخبر اختباري 005 | `laba005@aafiya.test` | `01a06b59-7810-7165-b43f-b41ad8e8480c` | مخبر التحاليل التجريبي 005 | Active |
| **RAD-001** | radiology | مركز الأشعة التجريبي 001 | `rad001@aafiya.test` | `N/A` | مركز الأشعة التجريبي 001 | Active |
| **RAD-002** | radiology | مركز الأشعة التجريبي 002 | `rad002@aafiya.test` | `N/A` | مركز الأشعة التجريبي 002 | Active |
| **RAD-003** | radiology | مركز الأشعة التجريبي 003 | `rad003@aafiya.test` | `N/A` | مركز الأشعة التجريبي 003 | Active |
| **RAD-004** | radiology | مركز الأشعة التجريبي 004 | `rad004@aafiya.test` | `N/A` | مركز الأشعة التجريبي 004 | Active |
| **RAD-005** | radiology | مركز الأشعة التجريبي 005 | `rad005@aafiya.test` | `N/A` | مركز الأشعة التجريبي 005 | Active |
| **DOC-014** | doctor | زين العابدين بن علي | `doctor014@aafiya.test` | `01a07a79-77d6-73ac-a58d-040029e12254` | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-015** | doctor | فلان الفلاني | `doctor015@aafiya.test` | `01a07a7a-c6a8-7136-b9d6-5368a2524a0c` | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-016** | doctor | بهلول أعقل المجانين | `doctor016@aafiya.test` | `01a07a7c-0a98-70bb-9c5a-61c9c1ec0701` | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |

---

## Detailed Account Records Hierarchy

### 00 — PROTECTED / SYSTEM (14 Accounts)

| Test ID | User ID | Name | Email | Password | Role | Entity ID | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **PROT-ADM-001** | `01a05674-65b5-723b-8003-e838548fb4d9` | لخضر جديد | `val.admin@aafiya.dz` | `Admin#Pass2026!` | admin | `N/A` | Active |
| **PROT-AST-001** | `01a05690-0b89-7263-a8e8-9a4abe2577e1` | عبدالله أحمد | `val.admin.ast@aafiya.dz` | `AdmAst#Pass2026!` | admin_assistant | `N/A` | Active |
| **PROT-DOC-001** | `01a056bf-ecda-72ad-a0f3-892affe6adb2` | مرسلي فاتح | `val.doctor.dir@aafiya.dz` | `DocDir#Pass2026!` | doctor | `01a056bf-ece0-7053-a7c1-3f8334dfffc4` | Active |
| **PROT-DOC-003** | `01a05821-6a70-71a8-b0c2-6a1ce37a8c0e` | سمير بن علي | `val.doctor.emp@aafiya.dz` | `DocEmp#Pass2026!` | doctor | `01a05821-6a78-7038-9eda-0d44243054db` | Active |
| **PROT-AST-002** | `01a05bcb-5342-728d-80d0-306c75d34277` | أمينة حداد | `val.assistant@aafiya.dz` | `Assist#Pass2026!` | doctor_assistant | `01a05bcb-534a-7185-a49f-a34f1171441d` | Active |
| **PROT-AST-003** | `01a05bef-95eb-737a-a5ef-ab6262cdc012` | مساعد طبيب 2 | `val.assistant2@aafiya.dz` | `Med#rY!NNY6Q2026!` | doctor_assistant | `01a05bef-95f9-72e9-908e-fd7e5e81cbfd` | Active |
| **PROT-SYS-63CC** | `01a05c27-9921-7131-8b29-a4f405e67578` | عيادة الشفاء | `val.doctor.dir_shifae@aafiya.dz` | `NOT_VERIFIABLE` | booking_center | `N/A` | Active |
| **PROT-DOC-002** | `01a05c2b-0e1f-72b6-bb05-52b5ce88b010` | قادة بن محمد | `val.doctor.dir.2@aafiya.dz` | `DocDir#Pass2026!` | doctor | `01a05c2b-0e2e-7361-9de0-5187fb93cc3e` | Active |
| **PROT-LAB-001** | `01a05d48-b111-714d-b997-d2908e4bdacc` | مخبر العافية | `val.lab.mgr@aafiya.dz` | `LabMgr#Pass2026!` | lab | `N/A` | Active |
| **PROT-LABA-001** | `01a05d4a-85ed-70a4-881b-c4f878689349` | محمد بن كامل | `val.lab.tech@aafiya.dz` | `LabTech#Pass2026!` | lab_assistant | `01a05d4a-85f2-71aa-86cd-bdece9581e2e` | Active |
| **PROT-RAD-001** | `01a05d4e-3fc2-7389-a056-22790c768684` | مركز الأشعة الخالصة | `val.rad.mgr@aafiya.dz` | `RadMgr#Pass2026!` | radiology | `N/A` | Active |
| **PROT-RADA-001** | `01a05d4f-4787-7267-994b-3d2fdad4d601` | كلاخي بوديسة | `val.rad.tech@aafiya.dz` | `RadTech#Pass2026!` | rad_assistant | `01a05d4f-478b-704a-9aa1-215bd485e8f1` | Active |
| **PROT-PAT-001** | `01a0614e-d92c-70b6-8eec-28680ee7e2d2` | ريان شرقي | `val.patient@aafiya.dz` | `Patient#Pass2026!` | patient_registered | `01a0614e-d94c-71e9-81dd-b0649dcf1627` | Active |
| **PROT-BC-002** | `01a06155-438a-7234-9346-f2d717380ccd` | مركز الحجز للشفاء | `val.booking-1@aafiya.dz` | `Booking#Pass2026!` | booking_center | `01a061bd-f41e-71be-8f80-76ad99f9d1da` | Active |

### 01 — PATIENTS (100 Accounts)

| Test ID | User ID | Patient Profile ID | Name | Email | Password | Phone | MRN | Wilaya | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **PAT-001** | `01a06b59-033e-707b-b34b-d342b1c559b1` | `01a06b59-0349-72c4-85e8-e280de9fc3d6` | مريض اختباري 001 | `patient001@aafiya.test` | `MediTest!2026-PAT-001` | `+213550000001` | `MRN-2026-0002` | Alger | Active |
| **PAT-002** | `01a06b59-0420-72b0-ae69-a676cd32f8d4` | `01a06b59-0425-708f-a152-7aa77ef08e30` | مريض اختباري 002 | `patient002@aafiya.test` | `MediTest!2026-PAT-002` | `+213550000002` | `MRN-2026-0003` | Oran | Active |
| **PAT-003** | `01a06b59-04fc-72d6-954b-e41bf8086f0a` | `01a06b59-04ff-7372-943e-7482c0ca2ae3` | مريض اختباري 003 | `patient003@aafiya.test` | `MediTest!2026-PAT-003` | `+213550000003` | `MRN-2026-0004` | Constantine | Active |
| **PAT-004** | `01a06b59-05d7-7158-bb78-b1f8553eaa71` | `01a06b59-05da-733a-a260-ce4b5f0199b3` | مريض اختباري 004 | `patient004@aafiya.test` | `MediTest!2026-PAT-004` | `+213550000004` | `MRN-2026-0005` | Blida | Active |
| **PAT-005** | `01a06b59-06b0-70b5-9e7b-442400f2faaa` | `01a06b59-06b4-736a-9c76-3d1a318db88f` | مريض اختباري 005 | `patient005@aafiya.test` | `MediTest!2026-PAT-005` | `+213550000005` | `MRN-2026-0006` | Annaba | Active |
| **PAT-006** | `01a06b59-078e-7312-9f23-9a6e6bd3a9c0` | `01a06b59-0792-71fb-b96f-c17d01a6e5f7` | مريض اختباري 006 | `patient006@aafiya.test` | `MediTest!2026-PAT-006` | `+213550000006` | `MRN-2026-0007` | Setif | Active |
| **PAT-007** | `01a06b59-086b-73d2-b4f0-aefc1b4e4da9` | `01a06b59-086e-734a-855a-dc606a315bdb` | مريض اختباري 007 | `patient007@aafiya.test` | `MediTest!2026-PAT-007` | `+213550000007` | `MRN-2026-0008` | Batna | Active |
| **PAT-008** | `01a06b59-0948-700b-8f1f-ce4035c444b4` | `01a06b59-094b-7149-97d8-2d39790cc579` | مريض اختباري 008 | `patient008@aafiya.test` | `MediTest!2026-PAT-008` | `+213550000008` | `MRN-2026-0009` | Tlemcen | Active |
| **PAT-009** | `01a06b59-0a23-7140-a161-068e3267c4ef` | `01a06b59-0a25-7002-94ef-3f593ae60782` | مريض اختباري 009 | `patient009@aafiya.test` | `MediTest!2026-PAT-009` | `+213550000009` | `MRN-2026-0010` | Alger | Active |
| **PAT-010** | `01a06b59-0afc-7197-b539-0d11e9e8b7c6` | `01a06b59-0b01-70a4-8982-f31752efbc88` | مريض اختباري 010 | `patient010@aafiya.test` | `MediTest!2026-PAT-010` | `+213550000010` | `MRN-2026-0011` | Oran | Active |
| **PAT-011** | `01a06b59-0bd7-7380-8703-771214fe44d9` | `01a06b59-0bdc-73ae-96c6-1844280dbfea` | مريض اختباري 011 | `patient011@aafiya.test` | `MediTest!2026-PAT-011` | `+213550000011` | `MRN-2026-0012` | Constantine | Active |
| **PAT-012** | `01a06b59-0cb4-70ef-9919-12b4f50bd44f` | `01a06b59-0cb8-72d0-ae13-68e9ed6f82b0` | مريض اختباري 012 | `patient012@aafiya.test` | `MediTest!2026-PAT-012` | `+213550000012` | `MRN-2026-0013` | Blida | Active |
| **PAT-013** | `01a06b59-0d8e-70c2-9f7f-2f2b990be929` | `01a06b59-0d91-72a7-a612-e5bd88d41c4d` | مريض اختباري 013 | `patient013@aafiya.test` | `MediTest!2026-PAT-013` | `+213550000013` | `MRN-2026-0014` | Annaba | Active |
| **PAT-014** | `01a06b59-0e68-7317-9d6b-061d51c5e083` | `01a06b59-0e6b-7299-8e19-bf2776043e12` | مريض اختباري 014 | `patient014@aafiya.test` | `MediTest!2026-PAT-014` | `+213550000014` | `MRN-2026-0015` | Setif | Active |
| **PAT-015** | `01a06b59-0f40-7128-b0b7-e9af450d50b8` | `01a06b59-0f43-70df-8482-456636e75861` | مريض اختباري 015 | `patient015@aafiya.test` | `MediTest!2026-PAT-015` | `+213550000015` | `MRN-2026-0016` | Batna | Active |
| **PAT-016** | `01a06b59-1019-7310-9da4-d878c99e96f3` | `01a06b59-101c-725f-8e4a-1e534ee0a630` | مريض اختباري 016 | `patient016@aafiya.test` | `MediTest!2026-PAT-016` | `+213550000016` | `MRN-2026-0017` | Tlemcen | Active |
| **PAT-017** | `01a06b59-10f2-725f-be0b-dfe47e3c23ce` | `01a06b59-10f4-72fb-b049-dbed4d7ab429` | مريض اختباري 017 | `patient017@aafiya.test` | `MediTest!2026-PAT-017` | `+213550000017` | `MRN-2026-0018` | Alger | Active |
| **PAT-018** | `01a06b59-11cb-73af-ac5c-03c5ac19c1eb` | `01a06b59-11cd-7304-8e66-e32097709176` | مريض اختباري 018 | `patient018@aafiya.test` | `MediTest!2026-PAT-018` | `+213550000018` | `MRN-2026-0019` | Oran | Active |
| **PAT-019** | `01a06b59-12a3-730c-b584-fb4540ae0132` | `01a06b59-12a6-72fc-92e7-ace72d9fb261` | مريض اختباري 019 | `patient019@aafiya.test` | `MediTest!2026-PAT-019` | `+213550000019` | `MRN-2026-0020` | Constantine | Active |
| **PAT-020** | `01a06b59-137c-70a0-bbca-69e4dd063dd3` | `01a06b59-137f-7310-a1f3-52cae0d5abd3` | مريض اختباري 020 | `patient020@aafiya.test` | `MediTest!2026-PAT-020` | `+213550000020` | `MRN-2026-0021` | Blida | Active |
| **PAT-021** | `01a06b59-1452-7346-b6c4-ab1a7e23c18c` | `01a06b59-1455-7156-a1ff-193d2765e0d4` | مريض اختباري 021 | `patient021@aafiya.test` | `MediTest!2026-PAT-021` | `+213550000021` | `MRN-2026-0022` | Annaba | Active |
| **PAT-022** | `01a06b59-152a-716f-9b99-42c272ef0ab0` | `01a06b59-152e-71fa-bec7-68188c9632ca` | مريض اختباري 022 | `patient022@aafiya.test` | `MediTest!2026-PAT-022` | `+213550000022` | `MRN-2026-0023` | Setif | Active |
| **PAT-023** | `01a06b59-1603-70d8-a68b-f276b0a0c8ea` | `01a06b59-1607-70bc-919d-159b508c603a` | مريض اختباري 023 | `patient023@aafiya.test` | `MediTest!2026-PAT-023` | `+213550000023` | `MRN-2026-0024` | Batna | Active |
| **PAT-024** | `01a06b59-16dc-70fe-a337-b7b320ce9640` | `01a06b59-16df-718f-ab2f-7c60f714eb37` | مريض اختباري 024 | `patient024@aafiya.test` | `MediTest!2026-PAT-024` | `+213550000024` | `MRN-2026-0025` | Tlemcen | Active |
| **PAT-025** | `01a06b59-17b3-7168-a819-7cec1b12cdb5` | `01a06b59-17b7-7200-be5c-6d239ee5f0cf` | مريض اختباري 025 | `patient025@aafiya.test` | `MediTest!2026-PAT-025` | `+213550000025` | `MRN-2026-0026` | Alger | Active |
| **PAT-026** | `01a06b59-188d-7262-812a-3089d5fcf5bf` | `01a06b59-1890-72bd-a6ad-1bf837a709ed` | مريض اختباري 026 | `patient026@aafiya.test` | `MediTest!2026-PAT-026` | `+213550000026` | `MRN-2026-0027` | Oran | Active |
| **PAT-027** | `01a06b59-1967-7366-8682-68b13d4a3d7c` | `01a06b59-196a-72b4-b84d-2405f4549abe` | مريض اختباري 027 | `patient027@aafiya.test` | `MediTest!2026-PAT-027` | `+213550000027` | `MRN-2026-0028` | Constantine | Active |
| **PAT-028** | `01a06b59-1a3f-71fc-94ff-4368c81c3389` | `01a06b59-1a42-704e-91a8-4b2e6a6e4a30` | مريض اختباري 028 | `patient028@aafiya.test` | `MediTest!2026-PAT-028` | `+213550000028` | `MRN-2026-0029` | Blida | Active |
| **PAT-029** | `01a06b59-1b17-7219-8ad4-5bf43c095a15` | `01a06b59-1b1a-739e-9f61-13f76af923ea` | مريض اختباري 029 | `patient029@aafiya.test` | `MediTest!2026-PAT-029` | `+213550000029` | `MRN-2026-0030` | Annaba | Active |
| **PAT-030** | `01a06b59-1bf0-7367-b8d6-d7390493e817` | `01a06b59-1bf3-725e-9043-798f018750f1` | مريض اختباري 030 | `patient030@aafiya.test` | `MediTest!2026-PAT-030` | `+213550000030` | `MRN-2026-0031` | Setif | Active |
| **PAT-031** | `01a06b59-1cc8-7392-9f8c-b1b94718f15b` | `01a06b59-1ccc-72f6-9e89-4279671046d2` | مريض اختباري 031 | `patient031@aafiya.test` | `MediTest!2026-PAT-031` | `+213550000031` | `MRN-2026-0032` | Batna | Active |
| **PAT-032** | `01a06b59-1da2-738b-802c-6ab36c06aa98` | `01a06b59-1da5-72d5-abc6-c5f9d01e8612` | مريض اختباري 032 | `patient032@aafiya.test` | `MediTest!2026-PAT-032` | `+213550000032` | `MRN-2026-0033` | Tlemcen | Active |
| **PAT-033** | `01a06b59-1e7b-73d0-9f1f-604ed193b8b9` | `01a06b59-1e7f-719e-9f70-17561f737cf1` | مريض اختباري 033 | `patient033@aafiya.test` | `MediTest!2026-PAT-033` | `+213550000033` | `MRN-2026-0034` | Alger | Active |
| **PAT-034** | `01a06b59-1f54-701d-954b-4657a94fd131` | `01a06b59-1f57-73c7-9717-89258255a26d` | مريض اختباري 034 | `patient034@aafiya.test` | `MediTest!2026-PAT-034` | `+213550000034` | `MRN-2026-0035` | Oran | Active |
| **PAT-035** | `01a06b59-202c-732b-a8f2-d0a97ab3b36b` | `01a06b59-202e-7350-8a26-87a911d65c0e` | مريض اختباري 035 | `patient035@aafiya.test` | `MediTest!2026-PAT-035` | `+213550000035` | `MRN-2026-0036` | Constantine | Active |
| **PAT-036** | `01a06b59-2104-7015-a1bd-cdd74117f5ea` | `01a06b59-2106-71cb-b58a-a38a549a85d8` | مريض اختباري 036 | `patient036@aafiya.test` | `MediTest!2026-PAT-036` | `+213550000036` | `MRN-2026-0037` | Blida | Active |
| **PAT-037** | `01a06b59-21db-7144-902a-c507fbe0795a` | `01a06b59-21de-71ac-b713-3ac36eaef55e` | مريض اختباري 037 | `patient037@aafiya.test` | `MediTest!2026-PAT-037` | `+213550000037` | `MRN-2026-0038` | Annaba | Active |
| **PAT-038** | `01a06b59-22b4-7121-b401-e8661bbf92c2` | `01a06b59-22b7-732f-8e82-86580f011824` | مريض اختباري 038 | `patient038@aafiya.test` | `MediTest!2026-PAT-038` | `+213550000038` | `MRN-2026-0039` | Setif | Active |
| **PAT-039** | `01a06b59-238d-71c6-ba6c-7bae20ae100a` | `01a06b59-2390-7314-8ea4-40ad59f303ef` | مريض اختباري 039 | `patient039@aafiya.test` | `MediTest!2026-PAT-039` | `+213550000039` | `MRN-2026-0040` | Batna | Active |
| **PAT-040** | `01a06b59-2467-7196-a1e0-fb0e2fb092dc` | `01a06b59-246a-7231-b9ec-202c7a82b52d` | مريض اختباري 040 | `patient040@aafiya.test` | `MediTest!2026-PAT-040` | `+213550000040` | `MRN-2026-0041` | Tlemcen | Active |
| **PAT-041** | `01a06b59-253f-71b4-824c-ddcf11b93941` | `01a06b59-2542-7038-8467-6e5e4f73ddff` | مريض اختباري 041 | `patient041@aafiya.test` | `MediTest!2026-PAT-041` | `+213550000041` | `MRN-2026-0042` | Alger | Active |
| **PAT-042** | `01a06b59-2618-729c-baf6-b254e8c7a08b` | `01a06b59-261b-72ae-89bf-2c714bfa9b86` | مريض اختباري 042 | `patient042@aafiya.test` | `MediTest!2026-PAT-042` | `+213550000042` | `MRN-2026-0043` | Oran | Active |
| **PAT-043** | `01a06b59-26f1-733e-bb89-161e27dfe378` | `01a06b59-26f4-7356-9701-5fa1ff4381f5` | مريض اختباري 043 | `patient043@aafiya.test` | `MediTest!2026-PAT-043` | `+213550000043` | `MRN-2026-0044` | Constantine | Active |
| **PAT-044** | `01a06b59-27c9-72e4-8c2a-be31ab2e5951` | `01a06b59-27cc-7249-b1c1-31a6227eac93` | مريض اختباري 044 | `patient044@aafiya.test` | `MediTest!2026-PAT-044` | `+213550000044` | `MRN-2026-0045` | Blida | Active |
| **PAT-045** | `01a06b59-28a1-72e6-87bc-c000cdea8ea2` | `01a06b59-28a4-7212-8b78-8fcdb424bb93` | مريض اختباري 045 | `patient045@aafiya.test` | `MediTest!2026-PAT-045` | `+213550000045` | `MRN-2026-0046` | Annaba | Active |
| **PAT-046** | `01a06b59-297b-71fc-9682-9ebbfe7fb6ab` | `01a06b59-297e-7120-a498-9de22ce276d7` | مريض اختباري 046 | `patient046@aafiya.test` | `MediTest!2026-PAT-046` | `+213550000046` | `MRN-2026-0047` | Setif | Active |
| **PAT-047** | `01a06b59-2a55-706d-aaac-92215d15f8be` | `01a06b59-2a58-72d4-9f40-3e2fbc9d3af4` | مريض اختباري 047 | `patient047@aafiya.test` | `MediTest!2026-PAT-047` | `+213550000047` | `MRN-2026-0048` | Batna | Active |
| **PAT-048** | `01a06b59-2b30-739c-be9a-c0bc7e963fc5` | `01a06b59-2b34-700b-bf9d-245632f30fae` | مريض اختباري 048 | `patient048@aafiya.test` | `MediTest!2026-PAT-048` | `+213550000048` | `MRN-2026-0049` | Tlemcen | Active |
| **PAT-049** | `01a06b59-2c10-732d-ab32-9231d4ae04dc` | `01a06b59-2c14-7307-9601-95feedce7eee` | مريض اختباري 049 | `patient049@aafiya.test` | `MediTest!2026-PAT-049` | `+213550000049` | `MRN-2026-0050` | Alger | Active |
| **PAT-050** | `01a06b59-2cee-7120-b0ab-5a5855c92882` | `01a06b59-2cf1-73aa-9974-c96c79d64cae` | مريض اختباري 050 | `patient050@aafiya.test` | `MediTest!2026-PAT-050` | `+213550000050` | `MRN-2026-0051` | Oran | Active |
| **PAT-051** | `01a06b59-2dca-738f-9d38-9181308cfdaa` | `01a06b59-2dd0-7298-b867-6673a3ea0e57` | مريض اختباري 051 | `patient051@aafiya.test` | `MediTest!2026-PAT-051` | `+213550000051` | `MRN-2026-0052` | Constantine | Active |
| **PAT-052** | `01a06b59-2ea7-73e1-92dc-56290b74e2f2` | `01a06b59-2eab-7026-8762-aad1e05d1718` | مريض اختباري 052 | `patient052@aafiya.test` | `MediTest!2026-PAT-052` | `+213550000052` | `MRN-2026-0053` | Blida | Active |
| **PAT-053** | `01a06b59-2f80-7090-98f3-59093372049b` | `01a06b59-2f85-7282-b33c-cc3cf5339efd` | مريض اختباري 053 | `patient053@aafiya.test` | `MediTest!2026-PAT-053` | `+213550000053` | `MRN-2026-0054` | Annaba | Active |
| **PAT-054** | `01a06b59-305b-713b-9ad2-c1047e5bee3d` | `01a06b59-305f-7056-a038-94d5154dad23` | مريض اختباري 054 | `patient054@aafiya.test` | `MediTest!2026-PAT-054` | `+213550000054` | `MRN-2026-0055` | Setif | Active |
| **PAT-055** | `01a06b59-3135-71df-b958-37bec62b56d6` | `01a06b59-3138-70fa-86d7-ddcdff169797` | مريض اختباري 055 | `patient055@aafiya.test` | `MediTest!2026-PAT-055` | `+213550000055` | `MRN-2026-0056` | Batna | Active |
| **PAT-056** | `01a06b59-320c-70c2-848e-b48fbeb901fe` | `01a06b59-320f-7249-a4ad-2aec6edbe36f` | مريض اختباري 056 | `patient056@aafiya.test` | `MediTest!2026-PAT-056` | `+213550000056` | `MRN-2026-0057` | Tlemcen | Active |
| **PAT-057** | `01a06b59-32e6-73cf-839e-c0aca4f65544` | `01a06b59-32e9-71bf-8e3d-cb1aec2ac3d9` | مريض اختباري 057 | `patient057@aafiya.test` | `MediTest!2026-PAT-057` | `+213550000057` | `MRN-2026-0058` | Alger | Active |
| **PAT-058** | `01a06b59-33bf-7270-9d8c-bf058f313a46` | `01a06b59-33c3-73ff-ba6c-b855771c2c23` | مريض اختباري 058 | `patient058@aafiya.test` | `MediTest!2026-PAT-058` | `+213550000058` | `MRN-2026-0059` | Oran | Active |
| **PAT-059** | `01a06b59-3498-7052-869d-af27a492daf4` | `01a06b59-349b-7078-b042-79e9d541a032` | مريض اختباري 059 | `patient059@aafiya.test` | `MediTest!2026-PAT-059` | `+213550000059` | `MRN-2026-0060` | Constantine | Active |
| **PAT-060** | `01a06b59-3570-7200-8a86-78400901b842` | `01a06b59-3573-70a7-87bf-1c40c39ab6ad` | مريض اختباري 060 | `patient060@aafiya.test` | `MediTest!2026-PAT-060` | `+213550000060` | `MRN-2026-0061` | Blida | Active |
| **PAT-061** | `01a06b59-3648-71c8-9407-ff8989631aab` | `01a06b59-364c-71f6-9464-4eab7010a1a8` | مريض اختباري 061 | `patient061@aafiya.test` | `MediTest!2026-PAT-061` | `+213550000061` | `MRN-2026-0062` | Annaba | Active |
| **PAT-062** | `01a06b59-3721-70a7-8140-98b00068b3b0` | `01a06b59-3724-7142-87ff-965cbb1ecf93` | مريض اختباري 062 | `patient062@aafiya.test` | `MediTest!2026-PAT-062` | `+213550000062` | `MRN-2026-0063` | Setif | Active |
| **PAT-063** | `01a06b59-37fa-70a3-a7f8-a3e479efffd5` | `01a06b59-37fc-715f-8227-87eb1743cfd7` | مريض اختباري 063 | `patient063@aafiya.test` | `MediTest!2026-PAT-063` | `+213550000063` | `MRN-2026-0064` | Batna | Active |
| **PAT-064** | `01a06b59-38d1-73a0-ab43-992365c453f2` | `01a06b59-38d4-73b9-98d5-cce470ca9f6b` | مريض اختباري 064 | `patient064@aafiya.test` | `MediTest!2026-PAT-064` | `+213550000064` | `MRN-2026-0065` | Tlemcen | Active |
| **PAT-065** | `01a06b59-39aa-71a8-b9aa-8dde3328b655` | `01a06b59-39ad-7287-8f70-a18cfbcd6c0f` | مريض اختباري 065 | `patient065@aafiya.test` | `MediTest!2026-PAT-065` | `+213550000065` | `MRN-2026-0066` | Alger | Active |
| **PAT-066** | `01a06b59-3a83-7018-940a-1299a43a2a9a` | `01a06b59-3a86-718b-9632-8577d980efca` | مريض اختباري 066 | `patient066@aafiya.test` | `MediTest!2026-PAT-066` | `+213550000066` | `MRN-2026-0067` | Oran | Active |
| **PAT-067** | `01a06b59-3b5b-702e-8f97-bccf1844cb6b` | `01a06b59-3b5e-73b9-ac7d-969a5190c362` | مريض اختباري 067 | `patient067@aafiya.test` | `MediTest!2026-PAT-067` | `+213550000067` | `MRN-2026-0068` | Constantine | Active |
| **PAT-068** | `01a06b59-3c35-737a-9a8c-404ef37e2407` | `01a06b59-3c38-7310-bca1-d7611c9815a4` | مريض اختباري 068 | `patient068@aafiya.test` | `MediTest!2026-PAT-068` | `+213550000068` | `MRN-2026-0069` | Blida | Active |
| **PAT-069** | `01a06b59-3d0d-71ca-928d-75ef1d23eb26` | `01a06b59-3d10-73f1-9fba-f939ff3ddaf1` | مريض اختباري 069 | `patient069@aafiya.test` | `MediTest!2026-PAT-069` | `+213550000069` | `MRN-2026-0070` | Annaba | Active |
| **PAT-070** | `01a06b59-3de6-7093-81ad-7a1ba0795cb6` | `01a06b59-3de9-7312-8203-835963092fb4` | مريض اختباري 070 | `patient070@aafiya.test` | `MediTest!2026-PAT-070` | `+213550000070` | `MRN-2026-0071` | Setif | Active |
| **PAT-071** | `01a06b59-3ebe-7309-8dc6-41e611b62a58` | `01a06b59-3ec1-70f6-9927-de4929787c72` | مريض اختباري 071 | `patient071@aafiya.test` | `MediTest!2026-PAT-071` | `+213550000071` | `MRN-2026-0072` | Batna | Active |
| **PAT-072** | `01a06b59-3f97-70c3-a599-747582c19125` | `01a06b59-3f9a-70bd-ae9e-619eba2f5504` | مريض اختباري 072 | `patient072@aafiya.test` | `MediTest!2026-PAT-072` | `+213550000072` | `MRN-2026-0073` | Tlemcen | Active |
| **PAT-073** | `01a06b59-406f-727a-828d-4e58843a5833` | `01a06b59-4072-72c9-ad14-fb9f4d623f4c` | مريض اختباري 073 | `patient073@aafiya.test` | `MediTest!2026-PAT-073` | `+213550000073` | `MRN-2026-0074` | Alger | Active |
| **PAT-074** | `01a06b59-4148-7268-b84b-8da69fcc05ec` | `01a06b59-414b-73b6-b1d9-fac74adee5f0` | مريض اختباري 074 | `patient074@aafiya.test` | `MediTest!2026-PAT-074` | `+213550000074` | `MRN-2026-0075` | Oran | Active |
| **PAT-075** | `01a06b59-4221-728c-b7df-7d696a1065bc` | `01a06b59-4224-7224-98ff-5d4659dac738` | مريض اختباري 075 | `patient075@aafiya.test` | `MediTest!2026-PAT-075` | `+213550000075` | `MRN-2026-0076` | Constantine | Active |
| **PAT-076** | `01a06b59-4302-7125-b4ab-171533e60a94` | `01a06b59-4307-7296-bb03-47ad9fd21e39` | مريض اختباري 076 | `patient076@aafiya.test` | `MediTest!2026-PAT-076` | `+213550000076` | `MRN-2026-0077` | Blida | Active |
| **PAT-077** | `01a06b59-43dd-73ea-b7a6-440b82e34bec` | `01a06b59-43e1-73f6-8e55-8b6f31339ce9` | مريض اختباري 077 | `patient077@aafiya.test` | `MediTest!2026-PAT-077` | `+213550000077` | `MRN-2026-0078` | Annaba | Active |
| **PAT-078** | `01a06b59-44b7-720b-8a53-1936bbce31eb` | `01a06b59-44ba-71d6-a80e-1e598f393a51` | مريض اختباري 078 | `patient078@aafiya.test` | `MediTest!2026-PAT-078` | `+213550000078` | `MRN-2026-0079` | Setif | Active |
| **PAT-079** | `01a06b59-458f-733e-b322-7cfe08ec241c` | `01a06b59-4592-70f2-9bbb-f4d2c8fbd5ec` | مريض اختباري 079 | `patient079@aafiya.test` | `MediTest!2026-PAT-079` | `+213550000079` | `MRN-2026-0080` | Batna | Active |
| **PAT-080** | `01a06b59-4668-724a-84d4-8d1c3d68ae43` | `01a06b59-466c-719e-8e5a-3915f8e75006` | مريض اختباري 080 | `patient080@aafiya.test` | `MediTest!2026-PAT-080` | `+213550000080` | `MRN-2026-0081` | Tlemcen | Active |
| **PAT-081** | `01a06b59-4742-73da-881d-77a3ef66aab8` | `01a06b59-4745-71a3-b8dc-0a48d0c22e60` | مريض اختباري 081 | `patient081@aafiya.test` | `MediTest!2026-PAT-081` | `+213550000081` | `MRN-2026-0082` | Alger | Active |
| **PAT-082** | `01a06b59-481d-7024-a379-383c3d2f89b9` | `01a06b59-4820-73af-aa4d-4adb5eb133ef` | مريض اختباري 082 | `patient082@aafiya.test` | `MediTest!2026-PAT-082` | `+213550000082` | `MRN-2026-0083` | Oran | Active |
| **PAT-083** | `01a06b59-48f6-7316-9d12-6aafcc466b87` | `01a06b59-48f9-7387-886e-04ca71be73f0` | مريض اختباري 083 | `patient083@aafiya.test` | `MediTest!2026-PAT-083` | `+213550000083` | `MRN-2026-0084` | Constantine | Active |
| **PAT-084** | `01a06b59-49ce-73f0-ab9a-034460418ea3` | `01a06b59-49d1-704a-a6f0-8a7736b1ab9f` | مريض اختباري 084 | `patient084@aafiya.test` | `MediTest!2026-PAT-084` | `+213550000084` | `MRN-2026-0085` | Blida | Active |
| **PAT-085** | `01a06b59-4aa7-7125-961d-7ecd1c317466` | `01a06b59-4aab-711b-98a9-d35817cd2f69` | مريض اختباري 085 | `patient085@aafiya.test` | `MediTest!2026-PAT-085` | `+213550000085` | `MRN-2026-0086` | Annaba | Active |
| **PAT-086** | `01a06b59-4b82-718e-b2aa-3f305d29c5c1` | `01a06b59-4b87-7260-9335-655a7fe9cf2b` | مريض اختباري 086 | `patient086@aafiya.test` | `MediTest!2026-PAT-086` | `+213550000086` | `MRN-2026-0087` | Setif | Active |
| **PAT-087** | `01a06b59-4c5c-739b-baa1-027979446bf0` | `01a06b59-4c62-7364-ae4a-cdb22d04cb29` | مريض اختباري 087 | `patient087@aafiya.test` | `MediTest!2026-PAT-087` | `+213550000087` | `MRN-2026-0088` | Batna | Active |
| **PAT-088** | `01a06b59-4d39-719a-b91f-35ee72a33467` | `01a06b59-4d3e-70c2-b385-af53f6230e80` | مريض اختباري 088 | `patient088@aafiya.test` | `MediTest!2026-PAT-088` | `+213550000088` | `MRN-2026-0089` | Tlemcen | Active |
| **PAT-089** | `01a06b59-4e13-738b-b0dd-abb10d7ed58e` | `01a06b59-4e19-70b2-9853-4021cb3c5b34` | مريض اختباري 089 | `patient089@aafiya.test` | `MediTest!2026-PAT-089` | `+213550000089` | `MRN-2026-0090` | Alger | Active |
| **PAT-090** | `01a06b59-4f1c-70c8-b132-8be676f16dcd` | `01a06b59-4f21-7188-a83e-02c439170d04` | مريض اختباري 090 | `patient090@aafiya.test` | `MediTest!2026-PAT-090` | `+213550000090` | `MRN-2026-0091` | Oran | Active |
| **PAT-091** | `01a06b59-4ff8-73b3-a574-8bc0b7fcc161` | `01a06b59-4ffb-7196-bd1d-161e0c56f17b` | مريض اختباري 091 | `patient091@aafiya.test` | `MediTest!2026-PAT-091` | `+213550000091` | `MRN-2026-0092` | Constantine | Active |
| **PAT-092** | `01a06b59-50d1-7185-99ac-bc9971c91e1e` | `01a06b59-50d4-7178-a4b2-8dc6a9202a05` | مريض اختباري 092 | `patient092@aafiya.test` | `MediTest!2026-PAT-092` | `+213550000092` | `MRN-2026-0093` | Blida | Active |
| **PAT-093** | `01a06b59-51a9-7348-ab3d-df175757135b` | `01a06b59-51ac-7324-8dbc-b2bbe96f7696` | مريض اختباري 093 | `patient093@aafiya.test` | `MediTest!2026-PAT-093` | `+213550000093` | `MRN-2026-0094` | Annaba | Active |
| **PAT-094** | `01a06b59-5282-705b-a258-2259d4ba7586` | `01a06b59-5285-713b-a763-b2f996662258` | مريض اختباري 094 | `patient094@aafiya.test` | `MediTest!2026-PAT-094` | `+213550000094` | `MRN-2026-0095` | Setif | Active |
| **PAT-095** | `01a06b59-535b-7115-83c1-33051fd3fa5a` | `01a06b59-535e-702a-973d-428bd5d24544` | مريض اختباري 095 | `patient095@aafiya.test` | `MediTest!2026-PAT-095` | `+213550000095` | `MRN-2026-0096` | Batna | Active |
| **PAT-096** | `01a06b59-5434-726c-924e-9dc69b2f4482` | `01a06b59-5437-7183-bf8e-6a8d3fe7fb43` | مريض اختباري 096 | `patient096@aafiya.test` | `MediTest!2026-PAT-096` | `+213550000096` | `MRN-2026-0097` | Tlemcen | Active |
| **PAT-097** | `01a06b59-5510-728c-b0cd-556d78370b8c` | `01a06b59-5513-7350-921d-031d1d86d4cb` | مريض اختباري 097 | `patient097@aafiya.test` | `MediTest!2026-PAT-097` | `+213550000097` | `MRN-2026-0098` | Alger | Active |
| **PAT-098** | `01a06b59-55ea-7188-a7b9-01bba3ae75e4` | `01a06b59-55ed-730f-9ae5-ac440c25b6a4` | مريض اختباري 098 | `patient098@aafiya.test` | `MediTest!2026-PAT-098` | `+213550000098` | `MRN-2026-0099` | Oran | Active |
| **PAT-099** | `01a06b59-56c5-71b6-ba9a-10b860f4caf7` | `01a06b59-56cb-7049-bd37-90b789454ef8` | مريض اختباري 099 | `patient099@aafiya.test` | `MediTest!2026-PAT-099` | `+213550000099` | `MRN-2026-0100` | Constantine | Active |
| **PAT-100** | `01a06b59-57a2-73aa-8012-89d3ec602e98` | `01a06b59-57a7-734e-b8ce-af47d15baf9c` | مريض اختباري 100 | `patient100@aafiya.test` | `MediTest!2026-PAT-100` | `+213550000100` | `MRN-2026-0101` | Blida | Active |

### 02 — DOCTORS (13 Accounts)

| Test ID | User ID | Doctor Profile ID | Name | Email | Password | Specialty | License No | Verification Status | Clinic Affiliation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **DOC-001** | `01a06b59-587b-701a-8403-db1f0ec073cb` | `01a06b59-587f-72e5-bcc6-df39bf1ac1af` | د. طبيب اختباري 001 | `doctor001@aafiya.test` | `MediTest!2026-DOC-001` | Cardiology | `LIC-DOC-001` | verified | عيادة شفاء الاختبارية 01 (🔴 DIRECTOR) | Active |
| **DOC-002** | `01a06b59-5956-7265-99de-a51b758bd63a` | `01a06b59-5959-7052-adfb-643062f513d3` | د. طبيب اختباري 002 | `doctor002@aafiya.test` | `MediTest!2026-DOC-002` | General Practice | `LIC-DOC-002` | verified | عيادة شفاء الاختبارية 02 (🔴 DIRECTOR) | Active |
| **DOC-003** | `01a06b59-5a2f-7252-b2c1-cc62bd158a49` | `01a06b59-5a31-73ad-ae74-aead5264a00e` | د. طبيب اختباري 003 | `doctor003@aafiya.test` | `MediTest!2026-DOC-003` | Pediatrics | `LIC-DOC-003` | verified | عيادة شفاء الاختبارية 03 (🔴 DIRECTOR) | Active |
| **DOC-004** | `01a06b59-5b07-71d9-8120-dc4fe2899d62` | `01a06b59-5b0a-71ad-9eb9-49456e09aea0` | د. طبيب اختباري 004 | `doctor004@aafiya.test` | `MediTest!2026-DOC-004` | Dermatology | `LIC-DOC-004` | verified | عيادة شفاء الاختبارية 04 (🔴 DIRECTOR) | Active |
| **DOC-005** | `01a06b59-5be0-71ff-915a-6394c2fe6795` | `01a06b59-5be3-715c-aa8c-3500df12f247` | د. طبيب اختباري 005 | `doctor005@aafiya.test` | `MediTest!2026-DOC-005` | Neurology | `LIC-DOC-005` | verified | عيادة شفاء الاختبارية 05 (🔴 DIRECTOR) | Active |
| **DOC-006** | `01a06b59-5cb9-73e6-968a-24bd8e8887f3` | `01a06b59-5cbb-717b-8ec6-ee25b97523c2` | د. طبيب اختباري 006 | `doctor006@aafiya.test` | `MediTest!2026-DOC-006` | Orthopedics | `LIC-DOC-006` | verified | عيادة شفاء الاختبارية 06 (🔴 DIRECTOR) | Active |
| **DOC-007** | `01a06b59-5d90-7108-a3fe-165aa2bc3b06` | `01a06b59-5d96-72b4-b910-5354f37576a4` | د. طبيب اختباري 007 | `doctor007@aafiya.test` | `MediTest!2026-DOC-007` | Ophthalmology | `LIC-DOC-007` | verified | عيادة شفاء الاختبارية 06 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-008** | `01a06b59-5e6d-7391-a57c-ff20f31d0efb` | `01a06b59-5e6f-72dd-a89d-cf2049f34e72` | د. طبيب اختباري 008 | `doctor008@aafiya.test` | `MediTest!2026-DOC-008` | Internal Medicine | `LIC-DOC-008` | verified | عيادة شفاء الاختبارية 07 (🔴 DIRECTOR) | Active |
| **DOC-009** | `01a06b59-5f46-711a-96db-9faa74e83444` | `01a06b59-5f48-7090-97b9-d93e9fd5943c` | د. طبيب اختباري 009 | `doctor009@aafiya.test` | `MediTest!2026-DOC-009` | ENT | `LIC-DOC-009` | verified | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR); عيادة شفاء الاختبارية 07 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-010** | `01a06b59-601d-72c4-a66b-30bd4100c6be` | `01a06b59-601f-70e6-961b-33a68a16cb50` | د. طبيب اختباري 010 | `doctor010@aafiya.test` | `MediTest!2026-DOC-010` | Urology | `LIC-DOC-010` | verified | عيادة شفاء الاختبارية 07 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-014** | `01a07a79-77cf-7035-914f-aa45c5e1b613` | `01a07a79-77d6-73ac-a58d-040029e12254` | زين العابدين بن علي | `doctor014@aafiya.test` | `MediTest!2026-DOC-014` | طب عام (General Medicine) Gastro | `DZ-ALG-2026-DOC-541` | verified | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-015** | `01a07a7a-c69f-71b2-a440-b60ffdff829b` | `01a07a7a-c6a8-7136-b9d6-5368a2524a0c` | فلان الفلاني | `doctor015@aafiya.test` | `MediTest!2026-DOC-015` | طب عام (General Medicine) الأذن زالحنجرة | `DZ-ALG-2026-DOC-433` | verified | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |
| **DOC-016** | `01a07a7c-0a8c-7186-ad63-f15d963fdf12` | `01a07a7c-0a98-70bb-9c5a-61c9c1ec0701` | بهلول أعقل المجانين | `doctor016@aafiya.test` | `MediTest!2026-DOC-016` | طب عام (General Medicine) العظام | `DZ-ALG-2026-DOC-377` | verified | عيادة شفاء الاختبارية 01 (🟠 EMPLOYED DOCTOR) | Active |

### 03 — CLINIC ASSISTANTS (10 Accounts)

| Test ID | User ID | Assistant Profile ID | Name | Email | Password | Clinic ID | Clinic Name | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **AST-001** | `01a06b59-6111-7361-b882-61b456ce15a2` | `01a06b59-6117-71f4-bacc-bc328212bf41` | مساعد طبيب اختباري 001 | `ast001@aafiya.test` | `MediTest!2026-AST-001` | `01a06b59-6020-72f9-b1a5-92420ee2f948` | عيادة شفاء الاختبارية 01 | Active |
| **AST-002** | `01a06b59-61ec-7268-8826-567af91a9cbc` | `01a06b59-61f0-720e-b31b-62345d5644db` | مساعد طبيب اختباري 002 | `ast002@aafiya.test` | `MediTest!2026-AST-002` | `01a06b59-6022-7250-9e9a-3907b0edb958` | عيادة شفاء الاختبارية 02 | Active |
| **AST-003** | `01a06b59-62c5-7176-8684-6b3941c47c47` | `01a06b59-62c8-726b-9728-6d2c97036610` | مساعد طبيب اختباري 003 | `ast003@aafiya.test` | `MediTest!2026-AST-003` | `01a06b59-6028-705b-b221-3502a501129f` | عيادة شفاء الاختبارية 03 | Active |
| **AST-004** | `01a06b59-639e-711b-9458-eea759258b6a` | `01a06b59-63a1-7218-ba91-3335d9d345a2` | مساعد طبيب اختباري 004 | `ast004@aafiya.test` | `MediTest!2026-AST-004` | `01a06b59-602a-7143-92d7-c45af8afbb40` | عيادة شفاء الاختبارية 04 | Active |
| **AST-005** | `01a06b59-6478-73bb-a7bd-63e3126d6a1b` | `01a06b59-647b-73ff-8c23-aa94be7e6a4d` | مساعد طبيب اختباري 005 | `ast005@aafiya.test` | `MediTest!2026-AST-005` | `01a06b59-602d-73ac-8def-61e2b847bc2b` | عيادة شفاء الاختبارية 05 | Active |
| **AST-006** | `01a06b59-6552-72d2-a63f-8d1532cb81bc` | `01a06b59-6555-7335-8769-d32f1c19954e` | مساعد طبيب اختباري 006 | `ast006@aafiya.test` | `MediTest!2026-AST-006` | `01a06b59-602f-7177-944c-5234e59b77ce` | عيادة شفاء الاختبارية 06 | Active |
| **AST-007** | `01a06b59-6629-704b-b626-a8cc886de6b9` | `01a06b59-662b-7270-bffc-4d78a63dd802` | مساعد طبيب اختباري 007 | `ast007@aafiya.test` | `MediTest!2026-AST-007` | `01a06b59-602f-7177-944c-5234e59b77ce` | عيادة شفاء الاختبارية 06 | Active |
| **AST-008** | `01a06b59-6700-7038-93d6-6dfde6e46ced` | `01a06b59-6703-70b1-9352-2511940bb0c4` | مساعد طبيب اختباري 008 | `ast008@aafiya.test` | `MediTest!2026-AST-008` | `01a06b59-6032-72d8-a56d-504880eae302` | عيادة شفاء الاختبارية 07 | Active |
| **AST-009** | `01a06b59-67d7-7080-bf0d-35a0e5d74a72` | `01a06b59-67d9-7176-be67-13093d98c4b1` | مساعد طبيب اختباري 009 | `ast009@aafiya.test` | `MediTest!2026-AST-009` | `01a06b59-6032-72d8-a56d-504880eae302` | عيادة شفاء الاختبارية 07 | Active |
| **AST-010** | `01a06b59-68af-72b7-ae9f-848f2f8b0ebc` | `01a06b59-68b3-72f3-a748-794f2acc0228` | مساعد طبيب اختباري 010 | `ast010@aafiya.test` | `MediTest!2026-AST-010` | `01a06b59-6032-72d8-a56d-504880eae302` | عيادة شفاء الاختبارية 07 | Active |

### 04 — BOOKING CENTERS (8 Accounts)

| Test ID | User ID | Booking Center ID | Name | Email | Password | License No | Verification Status | Quota Balance | Tx Count | Latest Tx | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **BC-001** | `01a06b59-698a-7073-9350-99ae6d7dfd8b` | `01a06b59-698d-7043-b1a5-53b2276e2aa3` | مركز الحجز التجريبي 001 | `bc001@aafiya.test` | `MediTest!2026-BC-001` | `LIC-BC-001` | verified | **17** | 4 | 2026-09-07 12:25:46 | Active |
| **BC-002** | `01a06b59-6a63-7156-b227-7b6e0039f7b7` | `01a06b59-6a65-703b-8fd6-b70a5e2ad681` | مركز الحجز التجريبي 002 | `bc002@aafiya.test` | `MediTest!2026-BC-002` | `LIC-BC-002` | verified | **0** | 0 | None | Active |
| **BC-003** | `01a06b59-6b3b-71f0-aa9a-d593d1dea79d` | `01a06b59-6b3e-70ca-974d-06848bad8846` | مركز الحجز التجريبي 003 | `bc003@aafiya.test` | `MediTest!2026-BC-003` | `LIC-BC-003` | verified | **500** | 1 | 2026-09-04 11:19:43 | Active |
| **BC-004** | `01a06b59-6c13-7033-a375-50fc55f78e51` | `01a06b59-6c15-7216-9055-9fa5b0e70641` | مركز الحجز التجريبي 004 | `bc004@aafiya.test` | `MediTest!2026-BC-004` | `LIC-BC-004` | verified | **1000** | 1 | 2026-09-04 11:19:40 | Active |
| **BC-005** | `01a06b59-6cea-7011-8e63-d4889f848424` | `01a06b59-6cec-7081-92ef-fb8972eb668e` | مركز الحجز التجريبي 005 | `bc005@aafiya.test` | `MediTest!2026-BC-005` | `LIC-BC-005` | verified | **250** | 1 | 2026-09-04 11:19:32 | Active |
| **BCA-001** | `01a06b59-6dbf-7280-a61f-a9eaaaaeca14` | `N/A` | مساعد مركز حجز اختباري 001 | `bca001@aafiya.test` | `MediTest!2026-BCA-001` | `N/A` | N/A | **0** | 0 | None | Active |
| **BCA-002** | `01a06b59-6e96-73a5-bdf0-6d40b3201a0c` | `N/A` | مساعد مركز حجز اختباري 002 | `bca002@aafiya.test` | `MediTest!2026-BCA-002` | `N/A` | N/A | **0** | 0 | None | Active |
| **BCA-003** | `01a06b59-6f70-729c-b148-f2febdb74aaa` | `N/A` | مساعد مركز حجز اختباري 003 | `bca003@aafiya.test` | `MediTest!2026-BCA-003` | `N/A` | N/A | **0** | 0 | None | Active |

### 05 — LABORATORIES (5 Accounts)

| Test ID | User ID | Diagnostic Center ID | Name | Email | Password | License No | Type | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **LAB-001** | `01a06b59-7049-7162-ba5a-41ed3ac5ed6d` | `01a06b59-704d-73c3-b197-1150bae1b63e` | مخبر التحاليل التجريبي 001 | `lab001@aafiya.test` | `MediTest!2026-LAB-001` | `LIC-LAB-001` | laboratory | Active |
| **LAB-002** | `01a06b59-7122-7343-b7dc-4b08ab16f1d8` | `01a06b59-7125-73d4-a111-db8b553f38dd` | مخبر التحاليل التجريبي 002 | `lab002@aafiya.test` | `MediTest!2026-LAB-002` | `LIC-LAB-002` | laboratory | Active |
| **LAB-003** | `01a06b59-71fa-7317-a9ca-9ed7e1035bc2` | `01a06b59-71fd-710b-98fb-2cba62206502` | مخبر التحاليل التجريبي 003 | `lab003@aafiya.test` | `MediTest!2026-LAB-003` | `LIC-LAB-003` | laboratory | Active |
| **LAB-004** | `01a06b59-72d5-72f7-ad2f-c6646881dd2e` | `01a06b59-72d8-71e0-8283-51fcb03d5697` | مخبر التحاليل التجريبي 004 | `lab004@aafiya.test` | `MediTest!2026-LAB-004` | `LIC-LAB-004` | laboratory | Active |
| **LAB-005** | `01a06b59-73ae-7172-bd94-25e154661541` | `01a06b59-73b0-7084-87ec-ca26cf7705c6` | مخبر التحاليل التجريبي 005 | `lab005@aafiya.test` | `MediTest!2026-LAB-005` | `LIC-LAB-005` | laboratory | Active |

### 06 — LABORATORY STAFF (5 Accounts)

| Test ID | User ID | Staff Profile ID | Name | Email | Password | Center ID | Center Name | Role Type | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **LABA-001** | `01a06b59-7484-73f3-91a8-7ded0ffe0d68` | `01a06b59-7489-717e-b5a0-3d37f33021e4` | فني مخبر اختباري 001 | `laba001@aafiya.test` | `MediTest!2026-LABA-001` | `01a06b59-704d-73c3-b197-1150bae1b63e` | مخبر التحاليل التجريبي 001 | assistant | Active |
| **LABA-002** | `01a06b59-7560-734e-a4d0-5ebd2e2a6abd` | `01a06b59-7565-72fc-b04c-e429c72f6954` | فني مخبر اختباري 002 | `laba002@aafiya.test` | `MediTest!2026-LABA-002` | `01a06b59-7125-73d4-a111-db8b553f38dd` | مخبر التحاليل التجريبي 002 | assistant | Active |
| **LABA-003** | `01a06b59-7655-73b5-bb0c-41daac974213` | `01a06b59-765a-73ca-bf03-abb78ba06165` | فني مخبر اختباري 003 | `laba003@aafiya.test` | `MediTest!2026-LABA-003` | `01a06b59-71fd-710b-98fb-2cba62206502` | مخبر التحاليل التجريبي 003 | assistant | Active |
| **LABA-004** | `01a06b59-7733-7201-8718-296892852311` | `01a06b59-7736-73ac-aafe-d1e742ee4dee` | فني مخبر اختباري 004 | `laba004@aafiya.test` | `MediTest!2026-LABA-004` | `01a06b59-72d8-71e0-8283-51fcb03d5697` | مخبر التحاليل التجريبي 004 | assistant | Active |
| **LABA-005** | `01a06b59-780d-712a-bd96-e15ea3933a86` | `01a06b59-7810-7165-b43f-b41ad8e8480c` | فني مخبر اختباري 005 | `laba005@aafiya.test` | `MediTest!2026-LABA-005` | `01a06b59-73b0-7084-87ec-ca26cf7705c6` | مخبر التحاليل التجريبي 005 | assistant | Active |

### 07 — RADIOLOGY CENTERS (5 Accounts)

| Test ID | User ID | Diagnostic Center ID | Name | Email | Password | License No | Type | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **RAD-001** | `01a06b59-78e8-71bd-949c-cef770a4b89e` | `01a06b59-78ea-703e-b553-45103034e6ca` | مركز الأشعة التجريبي 001 | `rad001@aafiya.test` | `MediTest!2026-RAD-001` | `LIC-RAD-001` | radiology | Active |
| **RAD-002** | `01a06b59-79c1-7294-a88f-022f4ac6cb21` | `01a06b59-79c3-71bd-b0ff-dbd01a473d56` | مركز الأشعة التجريبي 002 | `rad002@aafiya.test` | `MediTest!2026-RAD-002` | `LIC-RAD-002` | radiology | Active |
| **RAD-003** | `01a06b59-7a9a-70ac-b7c1-eb2a68d9aedc` | `01a06b59-7a9d-735b-92ff-dd6489c0efb7` | مركز الأشعة التجريبي 003 | `rad003@aafiya.test` | `MediTest!2026-RAD-003` | `LIC-RAD-003` | radiology | Active |
| **RAD-004** | `01a06b59-7b74-73a4-a3aa-a28ff6526063` | `01a06b59-7b7a-71ba-b8e3-d3b80b1fb251` | مركز الأشعة التجريبي 004 | `rad004@aafiya.test` | `MediTest!2026-RAD-004` | `LIC-RAD-004` | radiology | Active |
| **RAD-005** | `01a06b59-7c53-70df-8b76-babfff75d59c` | `01a06b59-7c56-70fe-8c85-b1bc3b856afe` | مركز الأشعة التجريبي 005 | `rad005@aafiya.test` | `MediTest!2026-RAD-005` | `LIC-RAD-005` | radiology | Active |

---

## Clinic-Centric Roster Index

### 🏥 عيادة الأمل (Clinic ID: `01a056bf-ece2-70f7-9b7c-c8355ded4529`)
* **🔴 Director:** مرسلي فاتح (`val.doctor.dir@aafiya.dz`)
* **🟠 Employed Doctors:** سمير بن علي (`val.doctor.emp@aafiya.dz`) - Position: doctor
* **👩‍💼 Clinic Assistants:** أمينة حداد (`val.assistant@aafiya.dz`); مساعد طبيب 2 (`val.assistant2@aafiya.dz`)

### 🏥 عيادة الشفاء من عند الله (Clinic ID: `01a05c2b-0e30-7252-8fc9-480512074ea3`)
* **🔴 Director:** قادة بن محمد (`val.doctor.dir.2@aafiya.dz`)
* **🟠 Employed Doctors:** سمير بن علي (`val.doctor.emp@aafiya.dz`) - Position: doctor
* **👩‍💼 Clinic Assistants:** None

### 🏥 عيادة شفاء الاختبارية 01 (Clinic ID: `01a06b59-6020-72f9-b1a5-92420ee2f948`)
* **🔴 Director:** د. طبيب اختباري 001 (`doctor001@aafiya.test`)
* **🟠 Employed Doctors:** د. طبيب اختباري 009 (`doctor009@aafiya.test`) - Position: doctor; زين العابدين بن علي (`doctor014@aafiya.test`) - Position: doctor; فلان الفلاني (`doctor015@aafiya.test`) - Position: doctor; بهلول أعقل المجانين (`doctor016@aafiya.test`) - Position: doctor
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 001 (`ast001@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 02 (Clinic ID: `01a06b59-6022-7250-9e9a-3907b0edb958`)
* **🔴 Director:** د. طبيب اختباري 002 (`doctor002@aafiya.test`)
* **🟠 Employed Doctors:** None
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 002 (`ast002@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 03 (Clinic ID: `01a06b59-6028-705b-b221-3502a501129f`)
* **🔴 Director:** د. طبيب اختباري 003 (`doctor003@aafiya.test`)
* **🟠 Employed Doctors:** None
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 003 (`ast003@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 04 (Clinic ID: `01a06b59-602a-7143-92d7-c45af8afbb40`)
* **🔴 Director:** د. طبيب اختباري 004 (`doctor004@aafiya.test`)
* **🟠 Employed Doctors:** None
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 004 (`ast004@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 05 (Clinic ID: `01a06b59-602d-73ac-8def-61e2b847bc2b`)
* **🔴 Director:** د. طبيب اختباري 005 (`doctor005@aafiya.test`)
* **🟠 Employed Doctors:** None
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 005 (`ast005@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 06 (Clinic ID: `01a06b59-602f-7177-944c-5234e59b77ce`)
* **🔴 Director:** د. طبيب اختباري 006 (`doctor006@aafiya.test`)
* **🟠 Employed Doctors:** د. طبيب اختباري 007 (`doctor007@aafiya.test`) - Position: doctor
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 006 (`ast006@aafiya.test`); مساعد طبيب اختباري 007 (`ast007@aafiya.test`)

### 🏥 عيادة شفاء الاختبارية 07 (Clinic ID: `01a06b59-6032-72d8-a56d-504880eae302`)
* **🔴 Director:** د. طبيب اختباري 008 (`doctor008@aafiya.test`)
* **🟠 Employed Doctors:** د. طبيب اختباري 009 (`doctor009@aafiya.test`) - Position: doctor; د. طبيب اختباري 010 (`doctor010@aafiya.test`) - Position: doctor
* **👩‍💼 Clinic Assistants:** مساعد طبيب اختباري 008 (`ast008@aafiya.test`); مساعد طبيب اختباري 009 (`ast009@aafiya.test`); مساعد طبيب اختباري 010 (`ast010@aafiya.test`)

---

## Diagnostic-Center Roster Index

### 🧪 LABORATORIES
* **مخبر مخبر العافية** (Center ID: `01a05d4a-84dc-7047-9644-d2f1d68a7077`, Manager: `val.lab.mgr@aafiya.dz`)
  └── 🔶 Staff: محمد بن كامل (`val.lab.tech@aafiya.dz`) [Role: technician]
* **مخبر التحاليل التجريبي 001** (Center ID: `01a06b59-704d-73c3-b197-1150bae1b63e`, Manager: `lab001@aafiya.test`)
  └── 🔶 Staff: فني مخبر اختباري 001 (`laba001@aafiya.test`) [Role: assistant]
* **مخبر التحاليل التجريبي 002** (Center ID: `01a06b59-7125-73d4-a111-db8b553f38dd`, Manager: `lab002@aafiya.test`)
  └── 🔶 Staff: فني مخبر اختباري 002 (`laba002@aafiya.test`) [Role: assistant]
* **مخبر التحاليل التجريبي 003** (Center ID: `01a06b59-71fd-710b-98fb-2cba62206502`, Manager: `lab003@aafiya.test`)
  └── 🔶 Staff: فني مخبر اختباري 003 (`laba003@aafiya.test`) [Role: assistant]
* **مخبر التحاليل التجريبي 004** (Center ID: `01a06b59-72d8-71e0-8283-51fcb03d5697`, Manager: `lab004@aafiya.test`)
  └── 🔶 Staff: فني مخبر اختباري 004 (`laba004@aafiya.test`) [Role: assistant]
* **مخبر التحاليل التجريبي 005** (Center ID: `01a06b59-73b0-7084-87ec-ca26cf7705c6`, Manager: `lab005@aafiya.test`)
  └── 🔶 Staff: فني مخبر اختباري 005 (`laba005@aafiya.test`) [Role: assistant]

### 🩻 RADIOLOGY CENTERS
* **مركز مركز الأشعة الخالصة** (Center ID: `01a05d4f-464b-7206-96b6-9bff5b0921f4`, Manager: `val.rad.mgr@aafiya.dz`)
  └── 🔶 Staff: كلاخي بوديسة (`val.rad.tech@aafiya.dz`) [Role: assistant]
* **مركز الأشعة التجريبي 001** (Center ID: `01a06b59-78ea-703e-b553-45103034e6ca`, Manager: `rad001@aafiya.test`)
  └── (No dedicated staff registered)
* **مركز الأشعة التجريبي 002** (Center ID: `01a06b59-79c3-71bd-b0ff-dbd01a473d56`, Manager: `rad002@aafiya.test`)
  └── (No dedicated staff registered)
* **مركز الأشعة التجريبي 003** (Center ID: `01a06b59-7a9d-735b-92ff-dd6489c0efb7`, Manager: `rad003@aafiya.test`)
  └── (No dedicated staff registered)
* **مركز الأشعة التجريبي 004** (Center ID: `01a06b59-7b7a-71ba-b8e3-d3b80b1fb251`, Manager: `rad004@aafiya.test`)
  └── (No dedicated staff registered)
* **مركز الأشعة التجريبي 005** (Center ID: `01a06b59-7c56-70fe-8c85-b1bc3b856afe`, Manager: `rad005@aafiya.test`)
  └── (No dedicated staff registered)

---

## Fast Lookup Indexes

### By Test ID → Email
| Test ID | Role | Name | Email | Primary Entity ID |
| :--- | :--- | :--- | :--- | :--- |
| **PROT-ADM-001** | admin | لخضر جديد | `val.admin@aafiya.dz` | `N/A` |
| **PROT-AST-001** | admin_assistant | عبدالله أحمد | `val.admin.ast@aafiya.dz` | `N/A` |
| **PROT-DOC-001** | doctor | مرسلي فاتح | `val.doctor.dir@aafiya.dz` | `01a056bf-ece0-7053-a7c1-3f8334dfffc4` |
| **PROT-DOC-003** | doctor | سمير بن علي | `val.doctor.emp@aafiya.dz` | `01a05821-6a78-7038-9eda-0d44243054db` |
| **PROT-AST-002** | doctor_assistant | أمينة حداد | `val.assistant@aafiya.dz` | `01a05bcb-534a-7185-a49f-a34f1171441d` |
| **PROT-AST-003** | doctor_assistant | مساعد طبيب 2 | `val.assistant2@aafiya.dz` | `01a05bef-95f9-72e9-908e-fd7e5e81cbfd` |
| **PROT-SYS-63CC** | booking_center | عيادة الشفاء | `val.doctor.dir_shifae@aafiya.dz` | `N/A` |
| **PROT-DOC-002** | doctor | قادة بن محمد | `val.doctor.dir.2@aafiya.dz` | `01a05c2b-0e2e-7361-9de0-5187fb93cc3e` |
| **PROT-LAB-001** | lab | مخبر العافية | `val.lab.mgr@aafiya.dz` | `N/A` |
| **PROT-LABA-001** | lab_assistant | محمد بن كامل | `val.lab.tech@aafiya.dz` | `01a05d4a-85f2-71aa-86cd-bdece9581e2e` |
| **PROT-RAD-001** | radiology | مركز الأشعة الخالصة | `val.rad.mgr@aafiya.dz` | `N/A` |
| **PROT-RADA-001** | rad_assistant | كلاخي بوديسة | `val.rad.tech@aafiya.dz` | `01a05d4f-478b-704a-9aa1-215bd485e8f1` |
| **PROT-PAT-001** | patient_registered | ريان شرقي | `val.patient@aafiya.dz` | `01a0614e-d94c-71e9-81dd-b0649dcf1627` |
| **PROT-BC-002** | booking_center | مركز الحجز للشفاء | `val.booking-1@aafiya.dz` | `01a061bd-f41e-71be-8f80-76ad99f9d1da` |
| **PAT-001** | patient_registered | مريض اختباري 001 | `patient001@aafiya.test` | `01a06b59-0349-72c4-85e8-e280de9fc3d6` |
| **PAT-002** | patient_registered | مريض اختباري 002 | `patient002@aafiya.test` | `01a06b59-0425-708f-a152-7aa77ef08e30` |
| **PAT-003** | patient_registered | مريض اختباري 003 | `patient003@aafiya.test` | `01a06b59-04ff-7372-943e-7482c0ca2ae3` |
| **PAT-004** | patient_registered | مريض اختباري 004 | `patient004@aafiya.test` | `01a06b59-05da-733a-a260-ce4b5f0199b3` |
| **PAT-005** | patient_registered | مريض اختباري 005 | `patient005@aafiya.test` | `01a06b59-06b4-736a-9c76-3d1a318db88f` |
| **PAT-006** | patient_registered | مريض اختباري 006 | `patient006@aafiya.test` | `01a06b59-0792-71fb-b96f-c17d01a6e5f7` |
| **PAT-007** | patient_registered | مريض اختباري 007 | `patient007@aafiya.test` | `01a06b59-086e-734a-855a-dc606a315bdb` |
| **PAT-008** | patient_registered | مريض اختباري 008 | `patient008@aafiya.test` | `01a06b59-094b-7149-97d8-2d39790cc579` |
| **PAT-009** | patient_registered | مريض اختباري 009 | `patient009@aafiya.test` | `01a06b59-0a25-7002-94ef-3f593ae60782` |
| **PAT-010** | patient_registered | مريض اختباري 010 | `patient010@aafiya.test` | `01a06b59-0b01-70a4-8982-f31752efbc88` |
| **PAT-011** | patient_registered | مريض اختباري 011 | `patient011@aafiya.test` | `01a06b59-0bdc-73ae-96c6-1844280dbfea` |
| **PAT-012** | patient_registered | مريض اختباري 012 | `patient012@aafiya.test` | `01a06b59-0cb8-72d0-ae13-68e9ed6f82b0` |
| **PAT-013** | patient_registered | مريض اختباري 013 | `patient013@aafiya.test` | `01a06b59-0d91-72a7-a612-e5bd88d41c4d` |
| **PAT-014** | patient_registered | مريض اختباري 014 | `patient014@aafiya.test` | `01a06b59-0e6b-7299-8e19-bf2776043e12` |
| **PAT-015** | patient_registered | مريض اختباري 015 | `patient015@aafiya.test` | `01a06b59-0f43-70df-8482-456636e75861` |
| **PAT-016** | patient_registered | مريض اختباري 016 | `patient016@aafiya.test` | `01a06b59-101c-725f-8e4a-1e534ee0a630` |
| **PAT-017** | patient_registered | مريض اختباري 017 | `patient017@aafiya.test` | `01a06b59-10f4-72fb-b049-dbed4d7ab429` |
| **PAT-018** | patient_registered | مريض اختباري 018 | `patient018@aafiya.test` | `01a06b59-11cd-7304-8e66-e32097709176` |
| **PAT-019** | patient_registered | مريض اختباري 019 | `patient019@aafiya.test` | `01a06b59-12a6-72fc-92e7-ace72d9fb261` |
| **PAT-020** | patient_registered | مريض اختباري 020 | `patient020@aafiya.test` | `01a06b59-137f-7310-a1f3-52cae0d5abd3` |
| **PAT-021** | patient_registered | مريض اختباري 021 | `patient021@aafiya.test` | `01a06b59-1455-7156-a1ff-193d2765e0d4` |
| **PAT-022** | patient_registered | مريض اختباري 022 | `patient022@aafiya.test` | `01a06b59-152e-71fa-bec7-68188c9632ca` |
| **PAT-023** | patient_registered | مريض اختباري 023 | `patient023@aafiya.test` | `01a06b59-1607-70bc-919d-159b508c603a` |
| **PAT-024** | patient_registered | مريض اختباري 024 | `patient024@aafiya.test` | `01a06b59-16df-718f-ab2f-7c60f714eb37` |
| **PAT-025** | patient_registered | مريض اختباري 025 | `patient025@aafiya.test` | `01a06b59-17b7-7200-be5c-6d239ee5f0cf` |
| **PAT-026** | patient_registered | مريض اختباري 026 | `patient026@aafiya.test` | `01a06b59-1890-72bd-a6ad-1bf837a709ed` |
| **PAT-027** | patient_registered | مريض اختباري 027 | `patient027@aafiya.test` | `01a06b59-196a-72b4-b84d-2405f4549abe` |
| **PAT-028** | patient_registered | مريض اختباري 028 | `patient028@aafiya.test` | `01a06b59-1a42-704e-91a8-4b2e6a6e4a30` |
| **PAT-029** | patient_registered | مريض اختباري 029 | `patient029@aafiya.test` | `01a06b59-1b1a-739e-9f61-13f76af923ea` |
| **PAT-030** | patient_registered | مريض اختباري 030 | `patient030@aafiya.test` | `01a06b59-1bf3-725e-9043-798f018750f1` |
| **PAT-031** | patient_registered | مريض اختباري 031 | `patient031@aafiya.test` | `01a06b59-1ccc-72f6-9e89-4279671046d2` |
| **PAT-032** | patient_registered | مريض اختباري 032 | `patient032@aafiya.test` | `01a06b59-1da5-72d5-abc6-c5f9d01e8612` |
| **PAT-033** | patient_registered | مريض اختباري 033 | `patient033@aafiya.test` | `01a06b59-1e7f-719e-9f70-17561f737cf1` |
| **PAT-034** | patient_registered | مريض اختباري 034 | `patient034@aafiya.test` | `01a06b59-1f57-73c7-9717-89258255a26d` |
| **PAT-035** | patient_registered | مريض اختباري 035 | `patient035@aafiya.test` | `01a06b59-202e-7350-8a26-87a911d65c0e` |
| **PAT-036** | patient_registered | مريض اختباري 036 | `patient036@aafiya.test` | `01a06b59-2106-71cb-b58a-a38a549a85d8` |
| **PAT-037** | patient_registered | مريض اختباري 037 | `patient037@aafiya.test` | `01a06b59-21de-71ac-b713-3ac36eaef55e` |
| **PAT-038** | patient_registered | مريض اختباري 038 | `patient038@aafiya.test` | `01a06b59-22b7-732f-8e82-86580f011824` |
| **PAT-039** | patient_registered | مريض اختباري 039 | `patient039@aafiya.test` | `01a06b59-2390-7314-8ea4-40ad59f303ef` |
| **PAT-040** | patient_registered | مريض اختباري 040 | `patient040@aafiya.test` | `01a06b59-246a-7231-b9ec-202c7a82b52d` |
| **PAT-041** | patient_registered | مريض اختباري 041 | `patient041@aafiya.test` | `01a06b59-2542-7038-8467-6e5e4f73ddff` |
| **PAT-042** | patient_registered | مريض اختباري 042 | `patient042@aafiya.test` | `01a06b59-261b-72ae-89bf-2c714bfa9b86` |
| **PAT-043** | patient_registered | مريض اختباري 043 | `patient043@aafiya.test` | `01a06b59-26f4-7356-9701-5fa1ff4381f5` |
| **PAT-044** | patient_registered | مريض اختباري 044 | `patient044@aafiya.test` | `01a06b59-27cc-7249-b1c1-31a6227eac93` |
| **PAT-045** | patient_registered | مريض اختباري 045 | `patient045@aafiya.test` | `01a06b59-28a4-7212-8b78-8fcdb424bb93` |
| **PAT-046** | patient_registered | مريض اختباري 046 | `patient046@aafiya.test` | `01a06b59-297e-7120-a498-9de22ce276d7` |
| **PAT-047** | patient_registered | مريض اختباري 047 | `patient047@aafiya.test` | `01a06b59-2a58-72d4-9f40-3e2fbc9d3af4` |
| **PAT-048** | patient_registered | مريض اختباري 048 | `patient048@aafiya.test` | `01a06b59-2b34-700b-bf9d-245632f30fae` |
| **PAT-049** | patient_registered | مريض اختباري 049 | `patient049@aafiya.test` | `01a06b59-2c14-7307-9601-95feedce7eee` |
| **PAT-050** | patient_registered | مريض اختباري 050 | `patient050@aafiya.test` | `01a06b59-2cf1-73aa-9974-c96c79d64cae` |
| **PAT-051** | patient_registered | مريض اختباري 051 | `patient051@aafiya.test` | `01a06b59-2dd0-7298-b867-6673a3ea0e57` |
| **PAT-052** | patient_registered | مريض اختباري 052 | `patient052@aafiya.test` | `01a06b59-2eab-7026-8762-aad1e05d1718` |
| **PAT-053** | patient_registered | مريض اختباري 053 | `patient053@aafiya.test` | `01a06b59-2f85-7282-b33c-cc3cf5339efd` |
| **PAT-054** | patient_registered | مريض اختباري 054 | `patient054@aafiya.test` | `01a06b59-305f-7056-a038-94d5154dad23` |
| **PAT-055** | patient_registered | مريض اختباري 055 | `patient055@aafiya.test` | `01a06b59-3138-70fa-86d7-ddcdff169797` |
| **PAT-056** | patient_registered | مريض اختباري 056 | `patient056@aafiya.test` | `01a06b59-320f-7249-a4ad-2aec6edbe36f` |
| **PAT-057** | patient_registered | مريض اختباري 057 | `patient057@aafiya.test` | `01a06b59-32e9-71bf-8e3d-cb1aec2ac3d9` |
| **PAT-058** | patient_registered | مريض اختباري 058 | `patient058@aafiya.test` | `01a06b59-33c3-73ff-ba6c-b855771c2c23` |
| **PAT-059** | patient_registered | مريض اختباري 059 | `patient059@aafiya.test` | `01a06b59-349b-7078-b042-79e9d541a032` |
| **PAT-060** | patient_registered | مريض اختباري 060 | `patient060@aafiya.test` | `01a06b59-3573-70a7-87bf-1c40c39ab6ad` |
| **PAT-061** | patient_registered | مريض اختباري 061 | `patient061@aafiya.test` | `01a06b59-364c-71f6-9464-4eab7010a1a8` |
| **PAT-062** | patient_registered | مريض اختباري 062 | `patient062@aafiya.test` | `01a06b59-3724-7142-87ff-965cbb1ecf93` |
| **PAT-063** | patient_registered | مريض اختباري 063 | `patient063@aafiya.test` | `01a06b59-37fc-715f-8227-87eb1743cfd7` |
| **PAT-064** | patient_registered | مريض اختباري 064 | `patient064@aafiya.test` | `01a06b59-38d4-73b9-98d5-cce470ca9f6b` |
| **PAT-065** | patient_registered | مريض اختباري 065 | `patient065@aafiya.test` | `01a06b59-39ad-7287-8f70-a18cfbcd6c0f` |
| **PAT-066** | patient_registered | مريض اختباري 066 | `patient066@aafiya.test` | `01a06b59-3a86-718b-9632-8577d980efca` |
| **PAT-067** | patient_registered | مريض اختباري 067 | `patient067@aafiya.test` | `01a06b59-3b5e-73b9-ac7d-969a5190c362` |
| **PAT-068** | patient_registered | مريض اختباري 068 | `patient068@aafiya.test` | `01a06b59-3c38-7310-bca1-d7611c9815a4` |
| **PAT-069** | patient_registered | مريض اختباري 069 | `patient069@aafiya.test` | `01a06b59-3d10-73f1-9fba-f939ff3ddaf1` |
| **PAT-070** | patient_registered | مريض اختباري 070 | `patient070@aafiya.test` | `01a06b59-3de9-7312-8203-835963092fb4` |
| **PAT-071** | patient_registered | مريض اختباري 071 | `patient071@aafiya.test` | `01a06b59-3ec1-70f6-9927-de4929787c72` |
| **PAT-072** | patient_registered | مريض اختباري 072 | `patient072@aafiya.test` | `01a06b59-3f9a-70bd-ae9e-619eba2f5504` |
| **PAT-073** | patient_registered | مريض اختباري 073 | `patient073@aafiya.test` | `01a06b59-4072-72c9-ad14-fb9f4d623f4c` |
| **PAT-074** | patient_registered | مريض اختباري 074 | `patient074@aafiya.test` | `01a06b59-414b-73b6-b1d9-fac74adee5f0` |
| **PAT-075** | patient_registered | مريض اختباري 075 | `patient075@aafiya.test` | `01a06b59-4224-7224-98ff-5d4659dac738` |
| **PAT-076** | patient_registered | مريض اختباري 076 | `patient076@aafiya.test` | `01a06b59-4307-7296-bb03-47ad9fd21e39` |
| **PAT-077** | patient_registered | مريض اختباري 077 | `patient077@aafiya.test` | `01a06b59-43e1-73f6-8e55-8b6f31339ce9` |
| **PAT-078** | patient_registered | مريض اختباري 078 | `patient078@aafiya.test` | `01a06b59-44ba-71d6-a80e-1e598f393a51` |
| **PAT-079** | patient_registered | مريض اختباري 079 | `patient079@aafiya.test` | `01a06b59-4592-70f2-9bbb-f4d2c8fbd5ec` |
| **PAT-080** | patient_registered | مريض اختباري 080 | `patient080@aafiya.test` | `01a06b59-466c-719e-8e5a-3915f8e75006` |
| **PAT-081** | patient_registered | مريض اختباري 081 | `patient081@aafiya.test` | `01a06b59-4745-71a3-b8dc-0a48d0c22e60` |
| **PAT-082** | patient_registered | مريض اختباري 082 | `patient082@aafiya.test` | `01a06b59-4820-73af-aa4d-4adb5eb133ef` |
| **PAT-083** | patient_registered | مريض اختباري 083 | `patient083@aafiya.test` | `01a06b59-48f9-7387-886e-04ca71be73f0` |
| **PAT-084** | patient_registered | مريض اختباري 084 | `patient084@aafiya.test` | `01a06b59-49d1-704a-a6f0-8a7736b1ab9f` |
| **PAT-085** | patient_registered | مريض اختباري 085 | `patient085@aafiya.test` | `01a06b59-4aab-711b-98a9-d35817cd2f69` |
| **PAT-086** | patient_registered | مريض اختباري 086 | `patient086@aafiya.test` | `01a06b59-4b87-7260-9335-655a7fe9cf2b` |
| **PAT-087** | patient_registered | مريض اختباري 087 | `patient087@aafiya.test` | `01a06b59-4c62-7364-ae4a-cdb22d04cb29` |
| **PAT-088** | patient_registered | مريض اختباري 088 | `patient088@aafiya.test` | `01a06b59-4d3e-70c2-b385-af53f6230e80` |
| **PAT-089** | patient_registered | مريض اختباري 089 | `patient089@aafiya.test` | `01a06b59-4e19-70b2-9853-4021cb3c5b34` |
| **PAT-090** | patient_registered | مريض اختباري 090 | `patient090@aafiya.test` | `01a06b59-4f21-7188-a83e-02c439170d04` |
| **PAT-091** | patient_registered | مريض اختباري 091 | `patient091@aafiya.test` | `01a06b59-4ffb-7196-bd1d-161e0c56f17b` |
| **PAT-092** | patient_registered | مريض اختباري 092 | `patient092@aafiya.test` | `01a06b59-50d4-7178-a4b2-8dc6a9202a05` |
| **PAT-093** | patient_registered | مريض اختباري 093 | `patient093@aafiya.test` | `01a06b59-51ac-7324-8dbc-b2bbe96f7696` |
| **PAT-094** | patient_registered | مريض اختباري 094 | `patient094@aafiya.test` | `01a06b59-5285-713b-a763-b2f996662258` |
| **PAT-095** | patient_registered | مريض اختباري 095 | `patient095@aafiya.test` | `01a06b59-535e-702a-973d-428bd5d24544` |
| **PAT-096** | patient_registered | مريض اختباري 096 | `patient096@aafiya.test` | `01a06b59-5437-7183-bf8e-6a8d3fe7fb43` |
| **PAT-097** | patient_registered | مريض اختباري 097 | `patient097@aafiya.test` | `01a06b59-5513-7350-921d-031d1d86d4cb` |
| **PAT-098** | patient_registered | مريض اختباري 098 | `patient098@aafiya.test` | `01a06b59-55ed-730f-9ae5-ac440c25b6a4` |
| **PAT-099** | patient_registered | مريض اختباري 099 | `patient099@aafiya.test` | `01a06b59-56cb-7049-bd37-90b789454ef8` |
| **PAT-100** | patient_registered | مريض اختباري 100 | `patient100@aafiya.test` | `01a06b59-57a7-734e-b8ce-af47d15baf9c` |
| **DOC-001** | doctor | د. طبيب اختباري 001 | `doctor001@aafiya.test` | `01a06b59-587f-72e5-bcc6-df39bf1ac1af` |
| **DOC-002** | doctor | د. طبيب اختباري 002 | `doctor002@aafiya.test` | `01a06b59-5959-7052-adfb-643062f513d3` |
| **DOC-003** | doctor | د. طبيب اختباري 003 | `doctor003@aafiya.test` | `01a06b59-5a31-73ad-ae74-aead5264a00e` |
| **DOC-004** | doctor | د. طبيب اختباري 004 | `doctor004@aafiya.test` | `01a06b59-5b0a-71ad-9eb9-49456e09aea0` |
| **DOC-005** | doctor | د. طبيب اختباري 005 | `doctor005@aafiya.test` | `01a06b59-5be3-715c-aa8c-3500df12f247` |
| **DOC-006** | doctor | د. طبيب اختباري 006 | `doctor006@aafiya.test` | `01a06b59-5cbb-717b-8ec6-ee25b97523c2` |
| **DOC-007** | doctor | د. طبيب اختباري 007 | `doctor007@aafiya.test` | `01a06b59-5d96-72b4-b910-5354f37576a4` |
| **DOC-008** | doctor | د. طبيب اختباري 008 | `doctor008@aafiya.test` | `01a06b59-5e6f-72dd-a89d-cf2049f34e72` |
| **DOC-009** | doctor | د. طبيب اختباري 009 | `doctor009@aafiya.test` | `01a06b59-5f48-7090-97b9-d93e9fd5943c` |
| **DOC-010** | doctor | د. طبيب اختباري 010 | `doctor010@aafiya.test` | `01a06b59-601f-70e6-961b-33a68a16cb50` |
| **AST-001** | doctor_assistant | مساعد طبيب اختباري 001 | `ast001@aafiya.test` | `01a06b59-6117-71f4-bacc-bc328212bf41` |
| **AST-002** | doctor_assistant | مساعد طبيب اختباري 002 | `ast002@aafiya.test` | `01a06b59-61f0-720e-b31b-62345d5644db` |
| **AST-003** | doctor_assistant | مساعد طبيب اختباري 003 | `ast003@aafiya.test` | `01a06b59-62c8-726b-9728-6d2c97036610` |
| **AST-004** | doctor_assistant | مساعد طبيب اختباري 004 | `ast004@aafiya.test` | `01a06b59-63a1-7218-ba91-3335d9d345a2` |
| **AST-005** | doctor_assistant | مساعد طبيب اختباري 005 | `ast005@aafiya.test` | `01a06b59-647b-73ff-8c23-aa94be7e6a4d` |
| **AST-006** | doctor_assistant | مساعد طبيب اختباري 006 | `ast006@aafiya.test` | `01a06b59-6555-7335-8769-d32f1c19954e` |
| **AST-007** | doctor_assistant | مساعد طبيب اختباري 007 | `ast007@aafiya.test` | `01a06b59-662b-7270-bffc-4d78a63dd802` |
| **AST-008** | doctor_assistant | مساعد طبيب اختباري 008 | `ast008@aafiya.test` | `01a06b59-6703-70b1-9352-2511940bb0c4` |
| **AST-009** | doctor_assistant | مساعد طبيب اختباري 009 | `ast009@aafiya.test` | `01a06b59-67d9-7176-be67-13093d98c4b1` |
| **AST-010** | doctor_assistant | مساعد طبيب اختباري 010 | `ast010@aafiya.test` | `01a06b59-68b3-72f3-a748-794f2acc0228` |
| **BC-001** | booking_center | مركز الحجز التجريبي 001 | `bc001@aafiya.test` | `01a06b59-698d-7043-b1a5-53b2276e2aa3` |
| **BC-002** | booking_center | مركز الحجز التجريبي 002 | `bc002@aafiya.test` | `01a06b59-6a65-703b-8fd6-b70a5e2ad681` |
| **BC-003** | booking_center | مركز الحجز التجريبي 003 | `bc003@aafiya.test` | `01a06b59-6b3e-70ca-974d-06848bad8846` |
| **BC-004** | booking_center | مركز الحجز التجريبي 004 | `bc004@aafiya.test` | `01a06b59-6c15-7216-9055-9fa5b0e70641` |
| **BC-005** | booking_center | مركز الحجز التجريبي 005 | `bc005@aafiya.test` | `01a06b59-6cec-7081-92ef-fb8972eb668e` |
| **BCA-001** | booking_center | مساعد مركز حجز اختباري 001 | `bca001@aafiya.test` | `N/A` |
| **BCA-002** | booking_center | مساعد مركز حجز اختباري 002 | `bca002@aafiya.test` | `N/A` |
| **BCA-003** | booking_center | مساعد مركز حجز اختباري 003 | `bca003@aafiya.test` | `N/A` |
| **LAB-001** | lab | مخبر التحاليل التجريبي 001 | `lab001@aafiya.test` | `N/A` |
| **LAB-002** | lab | مخبر التحاليل التجريبي 002 | `lab002@aafiya.test` | `N/A` |
| **LAB-003** | lab | مخبر التحاليل التجريبي 003 | `lab003@aafiya.test` | `N/A` |
| **LAB-004** | lab | مخبر التحاليل التجريبي 004 | `lab004@aafiya.test` | `N/A` |
| **LAB-005** | lab | مخبر التحاليل التجريبي 005 | `lab005@aafiya.test` | `N/A` |
| **LABA-001** | lab_assistant | فني مخبر اختباري 001 | `laba001@aafiya.test` | `01a06b59-7489-717e-b5a0-3d37f33021e4` |
| **LABA-002** | lab_assistant | فني مخبر اختباري 002 | `laba002@aafiya.test` | `01a06b59-7565-72fc-b04c-e429c72f6954` |
| **LABA-003** | lab_assistant | فني مخبر اختباري 003 | `laba003@aafiya.test` | `01a06b59-765a-73ca-bf03-abb78ba06165` |
| **LABA-004** | lab_assistant | فني مخبر اختباري 004 | `laba004@aafiya.test` | `01a06b59-7736-73ac-aafe-d1e742ee4dee` |
| **LABA-005** | lab_assistant | فني مخبر اختباري 005 | `laba005@aafiya.test` | `01a06b59-7810-7165-b43f-b41ad8e8480c` |
| **RAD-001** | radiology | مركز الأشعة التجريبي 001 | `rad001@aafiya.test` | `N/A` |
| **RAD-002** | radiology | مركز الأشعة التجريبي 002 | `rad002@aafiya.test` | `N/A` |
| **RAD-003** | radiology | مركز الأشعة التجريبي 003 | `rad003@aafiya.test` | `N/A` |
| **RAD-004** | radiology | مركز الأشعة التجريبي 004 | `rad004@aafiya.test` | `N/A` |
| **RAD-005** | radiology | مركز الأشعة التجريبي 005 | `rad005@aafiya.test` | `N/A` |
| **DOC-014** | doctor | زين العابدين بن علي | `doctor014@aafiya.test` | `01a07a79-77d6-73ac-a58d-040029e12254` |
| **DOC-015** | doctor | فلان الفلاني | `doctor015@aafiya.test` | `01a07a7a-c6a8-7136-b9d6-5368a2524a0c` |
| **DOC-016** | doctor | بهلول أعقل المجانين | `doctor016@aafiya.test` | `01a07a7c-0a98-70bb-9c5a-61c9c1ec0701` |

### By Email → Test ID
| Email | Test ID | User ID | Profile Entity ID |
| :--- | :--- | :--- | :--- |
| `val.admin@aafiya.dz` | **PROT-ADM-001** | `01a05674-65b5-723b-8003-e838548fb4d9` | `N/A` |
| `val.admin.ast@aafiya.dz` | **PROT-AST-001** | `01a05690-0b89-7263-a8e8-9a4abe2577e1` | `N/A` |
| `val.doctor.dir@aafiya.dz` | **PROT-DOC-001** | `01a056bf-ecda-72ad-a0f3-892affe6adb2` | `01a056bf-ece0-7053-a7c1-3f8334dfffc4` |
| `val.doctor.emp@aafiya.dz` | **PROT-DOC-003** | `01a05821-6a70-71a8-b0c2-6a1ce37a8c0e` | `01a05821-6a78-7038-9eda-0d44243054db` |
| `val.assistant@aafiya.dz` | **PROT-AST-002** | `01a05bcb-5342-728d-80d0-306c75d34277` | `01a05bcb-534a-7185-a49f-a34f1171441d` |
| `val.assistant2@aafiya.dz` | **PROT-AST-003** | `01a05bef-95eb-737a-a5ef-ab6262cdc012` | `01a05bef-95f9-72e9-908e-fd7e5e81cbfd` |
| `val.doctor.dir_shifae@aafiya.dz` | **PROT-SYS-63CC** | `01a05c27-9921-7131-8b29-a4f405e67578` | `N/A` |
| `val.doctor.dir.2@aafiya.dz` | **PROT-DOC-002** | `01a05c2b-0e1f-72b6-bb05-52b5ce88b010` | `01a05c2b-0e2e-7361-9de0-5187fb93cc3e` |
| `val.lab.mgr@aafiya.dz` | **PROT-LAB-001** | `01a05d48-b111-714d-b997-d2908e4bdacc` | `N/A` |
| `val.lab.tech@aafiya.dz` | **PROT-LABA-001** | `01a05d4a-85ed-70a4-881b-c4f878689349` | `01a05d4a-85f2-71aa-86cd-bdece9581e2e` |
| `val.rad.mgr@aafiya.dz` | **PROT-RAD-001** | `01a05d4e-3fc2-7389-a056-22790c768684` | `N/A` |
| `val.rad.tech@aafiya.dz` | **PROT-RADA-001** | `01a05d4f-4787-7267-994b-3d2fdad4d601` | `01a05d4f-478b-704a-9aa1-215bd485e8f1` |
| `val.patient@aafiya.dz` | **PROT-PAT-001** | `01a0614e-d92c-70b6-8eec-28680ee7e2d2` | `01a0614e-d94c-71e9-81dd-b0649dcf1627` |
| `val.booking-1@aafiya.dz` | **PROT-BC-002** | `01a06155-438a-7234-9346-f2d717380ccd` | `01a061bd-f41e-71be-8f80-76ad99f9d1da` |
| `patient001@aafiya.test` | **PAT-001** | `01a06b59-033e-707b-b34b-d342b1c559b1` | `01a06b59-0349-72c4-85e8-e280de9fc3d6` |
| `patient002@aafiya.test` | **PAT-002** | `01a06b59-0420-72b0-ae69-a676cd32f8d4` | `01a06b59-0425-708f-a152-7aa77ef08e30` |
| `patient003@aafiya.test` | **PAT-003** | `01a06b59-04fc-72d6-954b-e41bf8086f0a` | `01a06b59-04ff-7372-943e-7482c0ca2ae3` |
| `patient004@aafiya.test` | **PAT-004** | `01a06b59-05d7-7158-bb78-b1f8553eaa71` | `01a06b59-05da-733a-a260-ce4b5f0199b3` |
| `patient005@aafiya.test` | **PAT-005** | `01a06b59-06b0-70b5-9e7b-442400f2faaa` | `01a06b59-06b4-736a-9c76-3d1a318db88f` |
| `patient006@aafiya.test` | **PAT-006** | `01a06b59-078e-7312-9f23-9a6e6bd3a9c0` | `01a06b59-0792-71fb-b96f-c17d01a6e5f7` |
| `patient007@aafiya.test` | **PAT-007** | `01a06b59-086b-73d2-b4f0-aefc1b4e4da9` | `01a06b59-086e-734a-855a-dc606a315bdb` |
| `patient008@aafiya.test` | **PAT-008** | `01a06b59-0948-700b-8f1f-ce4035c444b4` | `01a06b59-094b-7149-97d8-2d39790cc579` |
| `patient009@aafiya.test` | **PAT-009** | `01a06b59-0a23-7140-a161-068e3267c4ef` | `01a06b59-0a25-7002-94ef-3f593ae60782` |
| `patient010@aafiya.test` | **PAT-010** | `01a06b59-0afc-7197-b539-0d11e9e8b7c6` | `01a06b59-0b01-70a4-8982-f31752efbc88` |
| `patient011@aafiya.test` | **PAT-011** | `01a06b59-0bd7-7380-8703-771214fe44d9` | `01a06b59-0bdc-73ae-96c6-1844280dbfea` |
| `patient012@aafiya.test` | **PAT-012** | `01a06b59-0cb4-70ef-9919-12b4f50bd44f` | `01a06b59-0cb8-72d0-ae13-68e9ed6f82b0` |
| `patient013@aafiya.test` | **PAT-013** | `01a06b59-0d8e-70c2-9f7f-2f2b990be929` | `01a06b59-0d91-72a7-a612-e5bd88d41c4d` |
| `patient014@aafiya.test` | **PAT-014** | `01a06b59-0e68-7317-9d6b-061d51c5e083` | `01a06b59-0e6b-7299-8e19-bf2776043e12` |
| `patient015@aafiya.test` | **PAT-015** | `01a06b59-0f40-7128-b0b7-e9af450d50b8` | `01a06b59-0f43-70df-8482-456636e75861` |
| `patient016@aafiya.test` | **PAT-016** | `01a06b59-1019-7310-9da4-d878c99e96f3` | `01a06b59-101c-725f-8e4a-1e534ee0a630` |
| `patient017@aafiya.test` | **PAT-017** | `01a06b59-10f2-725f-be0b-dfe47e3c23ce` | `01a06b59-10f4-72fb-b049-dbed4d7ab429` |
| `patient018@aafiya.test` | **PAT-018** | `01a06b59-11cb-73af-ac5c-03c5ac19c1eb` | `01a06b59-11cd-7304-8e66-e32097709176` |
| `patient019@aafiya.test` | **PAT-019** | `01a06b59-12a3-730c-b584-fb4540ae0132` | `01a06b59-12a6-72fc-92e7-ace72d9fb261` |
| `patient020@aafiya.test` | **PAT-020** | `01a06b59-137c-70a0-bbca-69e4dd063dd3` | `01a06b59-137f-7310-a1f3-52cae0d5abd3` |
| `patient021@aafiya.test` | **PAT-021** | `01a06b59-1452-7346-b6c4-ab1a7e23c18c` | `01a06b59-1455-7156-a1ff-193d2765e0d4` |
| `patient022@aafiya.test` | **PAT-022** | `01a06b59-152a-716f-9b99-42c272ef0ab0` | `01a06b59-152e-71fa-bec7-68188c9632ca` |
| `patient023@aafiya.test` | **PAT-023** | `01a06b59-1603-70d8-a68b-f276b0a0c8ea` | `01a06b59-1607-70bc-919d-159b508c603a` |
| `patient024@aafiya.test` | **PAT-024** | `01a06b59-16dc-70fe-a337-b7b320ce9640` | `01a06b59-16df-718f-ab2f-7c60f714eb37` |
| `patient025@aafiya.test` | **PAT-025** | `01a06b59-17b3-7168-a819-7cec1b12cdb5` | `01a06b59-17b7-7200-be5c-6d239ee5f0cf` |
| `patient026@aafiya.test` | **PAT-026** | `01a06b59-188d-7262-812a-3089d5fcf5bf` | `01a06b59-1890-72bd-a6ad-1bf837a709ed` |
| `patient027@aafiya.test` | **PAT-027** | `01a06b59-1967-7366-8682-68b13d4a3d7c` | `01a06b59-196a-72b4-b84d-2405f4549abe` |
| `patient028@aafiya.test` | **PAT-028** | `01a06b59-1a3f-71fc-94ff-4368c81c3389` | `01a06b59-1a42-704e-91a8-4b2e6a6e4a30` |
| `patient029@aafiya.test` | **PAT-029** | `01a06b59-1b17-7219-8ad4-5bf43c095a15` | `01a06b59-1b1a-739e-9f61-13f76af923ea` |
| `patient030@aafiya.test` | **PAT-030** | `01a06b59-1bf0-7367-b8d6-d7390493e817` | `01a06b59-1bf3-725e-9043-798f018750f1` |
| `patient031@aafiya.test` | **PAT-031** | `01a06b59-1cc8-7392-9f8c-b1b94718f15b` | `01a06b59-1ccc-72f6-9e89-4279671046d2` |
| `patient032@aafiya.test` | **PAT-032** | `01a06b59-1da2-738b-802c-6ab36c06aa98` | `01a06b59-1da5-72d5-abc6-c5f9d01e8612` |
| `patient033@aafiya.test` | **PAT-033** | `01a06b59-1e7b-73d0-9f1f-604ed193b8b9` | `01a06b59-1e7f-719e-9f70-17561f737cf1` |
| `patient034@aafiya.test` | **PAT-034** | `01a06b59-1f54-701d-954b-4657a94fd131` | `01a06b59-1f57-73c7-9717-89258255a26d` |
| `patient035@aafiya.test` | **PAT-035** | `01a06b59-202c-732b-a8f2-d0a97ab3b36b` | `01a06b59-202e-7350-8a26-87a911d65c0e` |
| `patient036@aafiya.test` | **PAT-036** | `01a06b59-2104-7015-a1bd-cdd74117f5ea` | `01a06b59-2106-71cb-b58a-a38a549a85d8` |
| `patient037@aafiya.test` | **PAT-037** | `01a06b59-21db-7144-902a-c507fbe0795a` | `01a06b59-21de-71ac-b713-3ac36eaef55e` |
| `patient038@aafiya.test` | **PAT-038** | `01a06b59-22b4-7121-b401-e8661bbf92c2` | `01a06b59-22b7-732f-8e82-86580f011824` |
| `patient039@aafiya.test` | **PAT-039** | `01a06b59-238d-71c6-ba6c-7bae20ae100a` | `01a06b59-2390-7314-8ea4-40ad59f303ef` |
| `patient040@aafiya.test` | **PAT-040** | `01a06b59-2467-7196-a1e0-fb0e2fb092dc` | `01a06b59-246a-7231-b9ec-202c7a82b52d` |
| `patient041@aafiya.test` | **PAT-041** | `01a06b59-253f-71b4-824c-ddcf11b93941` | `01a06b59-2542-7038-8467-6e5e4f73ddff` |
| `patient042@aafiya.test` | **PAT-042** | `01a06b59-2618-729c-baf6-b254e8c7a08b` | `01a06b59-261b-72ae-89bf-2c714bfa9b86` |
| `patient043@aafiya.test` | **PAT-043** | `01a06b59-26f1-733e-bb89-161e27dfe378` | `01a06b59-26f4-7356-9701-5fa1ff4381f5` |
| `patient044@aafiya.test` | **PAT-044** | `01a06b59-27c9-72e4-8c2a-be31ab2e5951` | `01a06b59-27cc-7249-b1c1-31a6227eac93` |
| `patient045@aafiya.test` | **PAT-045** | `01a06b59-28a1-72e6-87bc-c000cdea8ea2` | `01a06b59-28a4-7212-8b78-8fcdb424bb93` |
| `patient046@aafiya.test` | **PAT-046** | `01a06b59-297b-71fc-9682-9ebbfe7fb6ab` | `01a06b59-297e-7120-a498-9de22ce276d7` |
| `patient047@aafiya.test` | **PAT-047** | `01a06b59-2a55-706d-aaac-92215d15f8be` | `01a06b59-2a58-72d4-9f40-3e2fbc9d3af4` |
| `patient048@aafiya.test` | **PAT-048** | `01a06b59-2b30-739c-be9a-c0bc7e963fc5` | `01a06b59-2b34-700b-bf9d-245632f30fae` |
| `patient049@aafiya.test` | **PAT-049** | `01a06b59-2c10-732d-ab32-9231d4ae04dc` | `01a06b59-2c14-7307-9601-95feedce7eee` |
| `patient050@aafiya.test` | **PAT-050** | `01a06b59-2cee-7120-b0ab-5a5855c92882` | `01a06b59-2cf1-73aa-9974-c96c79d64cae` |
| `patient051@aafiya.test` | **PAT-051** | `01a06b59-2dca-738f-9d38-9181308cfdaa` | `01a06b59-2dd0-7298-b867-6673a3ea0e57` |
| `patient052@aafiya.test` | **PAT-052** | `01a06b59-2ea7-73e1-92dc-56290b74e2f2` | `01a06b59-2eab-7026-8762-aad1e05d1718` |
| `patient053@aafiya.test` | **PAT-053** | `01a06b59-2f80-7090-98f3-59093372049b` | `01a06b59-2f85-7282-b33c-cc3cf5339efd` |
| `patient054@aafiya.test` | **PAT-054** | `01a06b59-305b-713b-9ad2-c1047e5bee3d` | `01a06b59-305f-7056-a038-94d5154dad23` |
| `patient055@aafiya.test` | **PAT-055** | `01a06b59-3135-71df-b958-37bec62b56d6` | `01a06b59-3138-70fa-86d7-ddcdff169797` |
| `patient056@aafiya.test` | **PAT-056** | `01a06b59-320c-70c2-848e-b48fbeb901fe` | `01a06b59-320f-7249-a4ad-2aec6edbe36f` |
| `patient057@aafiya.test` | **PAT-057** | `01a06b59-32e6-73cf-839e-c0aca4f65544` | `01a06b59-32e9-71bf-8e3d-cb1aec2ac3d9` |
| `patient058@aafiya.test` | **PAT-058** | `01a06b59-33bf-7270-9d8c-bf058f313a46` | `01a06b59-33c3-73ff-ba6c-b855771c2c23` |
| `patient059@aafiya.test` | **PAT-059** | `01a06b59-3498-7052-869d-af27a492daf4` | `01a06b59-349b-7078-b042-79e9d541a032` |
| `patient060@aafiya.test` | **PAT-060** | `01a06b59-3570-7200-8a86-78400901b842` | `01a06b59-3573-70a7-87bf-1c40c39ab6ad` |
| `patient061@aafiya.test` | **PAT-061** | `01a06b59-3648-71c8-9407-ff8989631aab` | `01a06b59-364c-71f6-9464-4eab7010a1a8` |
| `patient062@aafiya.test` | **PAT-062** | `01a06b59-3721-70a7-8140-98b00068b3b0` | `01a06b59-3724-7142-87ff-965cbb1ecf93` |
| `patient063@aafiya.test` | **PAT-063** | `01a06b59-37fa-70a3-a7f8-a3e479efffd5` | `01a06b59-37fc-715f-8227-87eb1743cfd7` |
| `patient064@aafiya.test` | **PAT-064** | `01a06b59-38d1-73a0-ab43-992365c453f2` | `01a06b59-38d4-73b9-98d5-cce470ca9f6b` |
| `patient065@aafiya.test` | **PAT-065** | `01a06b59-39aa-71a8-b9aa-8dde3328b655` | `01a06b59-39ad-7287-8f70-a18cfbcd6c0f` |
| `patient066@aafiya.test` | **PAT-066** | `01a06b59-3a83-7018-940a-1299a43a2a9a` | `01a06b59-3a86-718b-9632-8577d980efca` |
| `patient067@aafiya.test` | **PAT-067** | `01a06b59-3b5b-702e-8f97-bccf1844cb6b` | `01a06b59-3b5e-73b9-ac7d-969a5190c362` |
| `patient068@aafiya.test` | **PAT-068** | `01a06b59-3c35-737a-9a8c-404ef37e2407` | `01a06b59-3c38-7310-bca1-d7611c9815a4` |
| `patient069@aafiya.test` | **PAT-069** | `01a06b59-3d0d-71ca-928d-75ef1d23eb26` | `01a06b59-3d10-73f1-9fba-f939ff3ddaf1` |
| `patient070@aafiya.test` | **PAT-070** | `01a06b59-3de6-7093-81ad-7a1ba0795cb6` | `01a06b59-3de9-7312-8203-835963092fb4` |
| `patient071@aafiya.test` | **PAT-071** | `01a06b59-3ebe-7309-8dc6-41e611b62a58` | `01a06b59-3ec1-70f6-9927-de4929787c72` |
| `patient072@aafiya.test` | **PAT-072** | `01a06b59-3f97-70c3-a599-747582c19125` | `01a06b59-3f9a-70bd-ae9e-619eba2f5504` |
| `patient073@aafiya.test` | **PAT-073** | `01a06b59-406f-727a-828d-4e58843a5833` | `01a06b59-4072-72c9-ad14-fb9f4d623f4c` |
| `patient074@aafiya.test` | **PAT-074** | `01a06b59-4148-7268-b84b-8da69fcc05ec` | `01a06b59-414b-73b6-b1d9-fac74adee5f0` |
| `patient075@aafiya.test` | **PAT-075** | `01a06b59-4221-728c-b7df-7d696a1065bc` | `01a06b59-4224-7224-98ff-5d4659dac738` |
| `patient076@aafiya.test` | **PAT-076** | `01a06b59-4302-7125-b4ab-171533e60a94` | `01a06b59-4307-7296-bb03-47ad9fd21e39` |
| `patient077@aafiya.test` | **PAT-077** | `01a06b59-43dd-73ea-b7a6-440b82e34bec` | `01a06b59-43e1-73f6-8e55-8b6f31339ce9` |
| `patient078@aafiya.test` | **PAT-078** | `01a06b59-44b7-720b-8a53-1936bbce31eb` | `01a06b59-44ba-71d6-a80e-1e598f393a51` |
| `patient079@aafiya.test` | **PAT-079** | `01a06b59-458f-733e-b322-7cfe08ec241c` | `01a06b59-4592-70f2-9bbb-f4d2c8fbd5ec` |
| `patient080@aafiya.test` | **PAT-080** | `01a06b59-4668-724a-84d4-8d1c3d68ae43` | `01a06b59-466c-719e-8e5a-3915f8e75006` |
| `patient081@aafiya.test` | **PAT-081** | `01a06b59-4742-73da-881d-77a3ef66aab8` | `01a06b59-4745-71a3-b8dc-0a48d0c22e60` |
| `patient082@aafiya.test` | **PAT-082** | `01a06b59-481d-7024-a379-383c3d2f89b9` | `01a06b59-4820-73af-aa4d-4adb5eb133ef` |
| `patient083@aafiya.test` | **PAT-083** | `01a06b59-48f6-7316-9d12-6aafcc466b87` | `01a06b59-48f9-7387-886e-04ca71be73f0` |
| `patient084@aafiya.test` | **PAT-084** | `01a06b59-49ce-73f0-ab9a-034460418ea3` | `01a06b59-49d1-704a-a6f0-8a7736b1ab9f` |
| `patient085@aafiya.test` | **PAT-085** | `01a06b59-4aa7-7125-961d-7ecd1c317466` | `01a06b59-4aab-711b-98a9-d35817cd2f69` |
| `patient086@aafiya.test` | **PAT-086** | `01a06b59-4b82-718e-b2aa-3f305d29c5c1` | `01a06b59-4b87-7260-9335-655a7fe9cf2b` |
| `patient087@aafiya.test` | **PAT-087** | `01a06b59-4c5c-739b-baa1-027979446bf0` | `01a06b59-4c62-7364-ae4a-cdb22d04cb29` |
| `patient088@aafiya.test` | **PAT-088** | `01a06b59-4d39-719a-b91f-35ee72a33467` | `01a06b59-4d3e-70c2-b385-af53f6230e80` |
| `patient089@aafiya.test` | **PAT-089** | `01a06b59-4e13-738b-b0dd-abb10d7ed58e` | `01a06b59-4e19-70b2-9853-4021cb3c5b34` |
| `patient090@aafiya.test` | **PAT-090** | `01a06b59-4f1c-70c8-b132-8be676f16dcd` | `01a06b59-4f21-7188-a83e-02c439170d04` |
| `patient091@aafiya.test` | **PAT-091** | `01a06b59-4ff8-73b3-a574-8bc0b7fcc161` | `01a06b59-4ffb-7196-bd1d-161e0c56f17b` |
| `patient092@aafiya.test` | **PAT-092** | `01a06b59-50d1-7185-99ac-bc9971c91e1e` | `01a06b59-50d4-7178-a4b2-8dc6a9202a05` |
| `patient093@aafiya.test` | **PAT-093** | `01a06b59-51a9-7348-ab3d-df175757135b` | `01a06b59-51ac-7324-8dbc-b2bbe96f7696` |
| `patient094@aafiya.test` | **PAT-094** | `01a06b59-5282-705b-a258-2259d4ba7586` | `01a06b59-5285-713b-a763-b2f996662258` |
| `patient095@aafiya.test` | **PAT-095** | `01a06b59-535b-7115-83c1-33051fd3fa5a` | `01a06b59-535e-702a-973d-428bd5d24544` |
| `patient096@aafiya.test` | **PAT-096** | `01a06b59-5434-726c-924e-9dc69b2f4482` | `01a06b59-5437-7183-bf8e-6a8d3fe7fb43` |
| `patient097@aafiya.test` | **PAT-097** | `01a06b59-5510-728c-b0cd-556d78370b8c` | `01a06b59-5513-7350-921d-031d1d86d4cb` |
| `patient098@aafiya.test` | **PAT-098** | `01a06b59-55ea-7188-a7b9-01bba3ae75e4` | `01a06b59-55ed-730f-9ae5-ac440c25b6a4` |
| `patient099@aafiya.test` | **PAT-099** | `01a06b59-56c5-71b6-ba9a-10b860f4caf7` | `01a06b59-56cb-7049-bd37-90b789454ef8` |
| `patient100@aafiya.test` | **PAT-100** | `01a06b59-57a2-73aa-8012-89d3ec602e98` | `01a06b59-57a7-734e-b8ce-af47d15baf9c` |
| `doctor001@aafiya.test` | **DOC-001** | `01a06b59-587b-701a-8403-db1f0ec073cb` | `01a06b59-587f-72e5-bcc6-df39bf1ac1af` |
| `doctor002@aafiya.test` | **DOC-002** | `01a06b59-5956-7265-99de-a51b758bd63a` | `01a06b59-5959-7052-adfb-643062f513d3` |
| `doctor003@aafiya.test` | **DOC-003** | `01a06b59-5a2f-7252-b2c1-cc62bd158a49` | `01a06b59-5a31-73ad-ae74-aead5264a00e` |
| `doctor004@aafiya.test` | **DOC-004** | `01a06b59-5b07-71d9-8120-dc4fe2899d62` | `01a06b59-5b0a-71ad-9eb9-49456e09aea0` |
| `doctor005@aafiya.test` | **DOC-005** | `01a06b59-5be0-71ff-915a-6394c2fe6795` | `01a06b59-5be3-715c-aa8c-3500df12f247` |
| `doctor006@aafiya.test` | **DOC-006** | `01a06b59-5cb9-73e6-968a-24bd8e8887f3` | `01a06b59-5cbb-717b-8ec6-ee25b97523c2` |
| `doctor007@aafiya.test` | **DOC-007** | `01a06b59-5d90-7108-a3fe-165aa2bc3b06` | `01a06b59-5d96-72b4-b910-5354f37576a4` |
| `doctor008@aafiya.test` | **DOC-008** | `01a06b59-5e6d-7391-a57c-ff20f31d0efb` | `01a06b59-5e6f-72dd-a89d-cf2049f34e72` |
| `doctor009@aafiya.test` | **DOC-009** | `01a06b59-5f46-711a-96db-9faa74e83444` | `01a06b59-5f48-7090-97b9-d93e9fd5943c` |
| `doctor010@aafiya.test` | **DOC-010** | `01a06b59-601d-72c4-a66b-30bd4100c6be` | `01a06b59-601f-70e6-961b-33a68a16cb50` |
| `ast001@aafiya.test` | **AST-001** | `01a06b59-6111-7361-b882-61b456ce15a2` | `01a06b59-6117-71f4-bacc-bc328212bf41` |
| `ast002@aafiya.test` | **AST-002** | `01a06b59-61ec-7268-8826-567af91a9cbc` | `01a06b59-61f0-720e-b31b-62345d5644db` |
| `ast003@aafiya.test` | **AST-003** | `01a06b59-62c5-7176-8684-6b3941c47c47` | `01a06b59-62c8-726b-9728-6d2c97036610` |
| `ast004@aafiya.test` | **AST-004** | `01a06b59-639e-711b-9458-eea759258b6a` | `01a06b59-63a1-7218-ba91-3335d9d345a2` |
| `ast005@aafiya.test` | **AST-005** | `01a06b59-6478-73bb-a7bd-63e3126d6a1b` | `01a06b59-647b-73ff-8c23-aa94be7e6a4d` |
| `ast006@aafiya.test` | **AST-006** | `01a06b59-6552-72d2-a63f-8d1532cb81bc` | `01a06b59-6555-7335-8769-d32f1c19954e` |
| `ast007@aafiya.test` | **AST-007** | `01a06b59-6629-704b-b626-a8cc886de6b9` | `01a06b59-662b-7270-bffc-4d78a63dd802` |
| `ast008@aafiya.test` | **AST-008** | `01a06b59-6700-7038-93d6-6dfde6e46ced` | `01a06b59-6703-70b1-9352-2511940bb0c4` |
| `ast009@aafiya.test` | **AST-009** | `01a06b59-67d7-7080-bf0d-35a0e5d74a72` | `01a06b59-67d9-7176-be67-13093d98c4b1` |
| `ast010@aafiya.test` | **AST-010** | `01a06b59-68af-72b7-ae9f-848f2f8b0ebc` | `01a06b59-68b3-72f3-a748-794f2acc0228` |
| `bc001@aafiya.test` | **BC-001** | `01a06b59-698a-7073-9350-99ae6d7dfd8b` | `01a06b59-698d-7043-b1a5-53b2276e2aa3` |
| `bc002@aafiya.test` | **BC-002** | `01a06b59-6a63-7156-b227-7b6e0039f7b7` | `01a06b59-6a65-703b-8fd6-b70a5e2ad681` |
| `bc003@aafiya.test` | **BC-003** | `01a06b59-6b3b-71f0-aa9a-d593d1dea79d` | `01a06b59-6b3e-70ca-974d-06848bad8846` |
| `bc004@aafiya.test` | **BC-004** | `01a06b59-6c13-7033-a375-50fc55f78e51` | `01a06b59-6c15-7216-9055-9fa5b0e70641` |
| `bc005@aafiya.test` | **BC-005** | `01a06b59-6cea-7011-8e63-d4889f848424` | `01a06b59-6cec-7081-92ef-fb8972eb668e` |
| `bca001@aafiya.test` | **BCA-001** | `01a06b59-6dbf-7280-a61f-a9eaaaaeca14` | `N/A` |
| `bca002@aafiya.test` | **BCA-002** | `01a06b59-6e96-73a5-bdf0-6d40b3201a0c` | `N/A` |
| `bca003@aafiya.test` | **BCA-003** | `01a06b59-6f70-729c-b148-f2febdb74aaa` | `N/A` |
| `lab001@aafiya.test` | **LAB-001** | `01a06b59-7049-7162-ba5a-41ed3ac5ed6d` | `N/A` |
| `lab002@aafiya.test` | **LAB-002** | `01a06b59-7122-7343-b7dc-4b08ab16f1d8` | `N/A` |
| `lab003@aafiya.test` | **LAB-003** | `01a06b59-71fa-7317-a9ca-9ed7e1035bc2` | `N/A` |
| `lab004@aafiya.test` | **LAB-004** | `01a06b59-72d5-72f7-ad2f-c6646881dd2e` | `N/A` |
| `lab005@aafiya.test` | **LAB-005** | `01a06b59-73ae-7172-bd94-25e154661541` | `N/A` |
| `laba001@aafiya.test` | **LABA-001** | `01a06b59-7484-73f3-91a8-7ded0ffe0d68` | `01a06b59-7489-717e-b5a0-3d37f33021e4` |
| `laba002@aafiya.test` | **LABA-002** | `01a06b59-7560-734e-a4d0-5ebd2e2a6abd` | `01a06b59-7565-72fc-b04c-e429c72f6954` |
| `laba003@aafiya.test` | **LABA-003** | `01a06b59-7655-73b5-bb0c-41daac974213` | `01a06b59-765a-73ca-bf03-abb78ba06165` |
| `laba004@aafiya.test` | **LABA-004** | `01a06b59-7733-7201-8718-296892852311` | `01a06b59-7736-73ac-aafe-d1e742ee4dee` |
| `laba005@aafiya.test` | **LABA-005** | `01a06b59-780d-712a-bd96-e15ea3933a86` | `01a06b59-7810-7165-b43f-b41ad8e8480c` |
| `rad001@aafiya.test` | **RAD-001** | `01a06b59-78e8-71bd-949c-cef770a4b89e` | `N/A` |
| `rad002@aafiya.test` | **RAD-002** | `01a06b59-79c1-7294-a88f-022f4ac6cb21` | `N/A` |
| `rad003@aafiya.test` | **RAD-003** | `01a06b59-7a9a-70ac-b7c1-eb2a68d9aedc` | `N/A` |
| `rad004@aafiya.test` | **RAD-004** | `01a06b59-7b74-73a4-a3aa-a28ff6526063` | `N/A` |
| `rad005@aafiya.test` | **RAD-005** | `01a06b59-7c53-70df-8b76-babfff75d59c` | `N/A` |
| `doctor014@aafiya.test` | **DOC-014** | `01a07a79-77cf-7035-914f-aa45c5e1b613` | `01a07a79-77d6-73ac-a58d-040029e12254` |
| `doctor015@aafiya.test` | **DOC-015** | `01a07a7a-c69f-71b2-a440-b60ffdff829b` | `01a07a7a-c6a8-7136-b9d6-5368a2524a0c` |
| `doctor016@aafiya.test` | **DOC-016** | `01a07a7c-0a8c-7186-ad63-f15d963fdf12` | `01a07a7c-0a98-70bb-9c5a-61c9c1ec0701` |
