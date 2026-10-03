import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import '../models/appointment.dart';

/// Phase 1 centralized localized string repository.
class LocalizedStrings {
  const LocalizedStrings(this.locale);

  final Locale locale;

  static LocalizedStrings of(BuildContext context) {
    final loc = Localizations.localeOf(context);
    return LocalizedStrings(loc);
  }

  bool get isArabic => locale.languageCode == 'ar';
  bool get isFrench => locale.languageCode == 'fr';

  // Brand Identifiers
  String get appBrandName => isArabic ? 'عافية' : 'AAFIYA';
  String get brandGatewaySlogan => isArabic
      ? 'بوابتك إلى العافية'
      : isFrench
          ? 'Votre passerelle vers Aafiya'
          : 'Your Gateway To Aafiya';

  // App Titles
  String get patientAppTitle => isArabic ? 'عافية للمرضى' : 'AAFIYA Patient';
  String get proAppTitle => isArabic ? 'عافية للمهنيين' : 'AAFIYA Pro';

  // Navigation & Shells
  String get splashLoading => isArabic ? 'جاري التحميل...' : isFrench ? 'Chargement...' : 'Loading...';
  String get signIn => isArabic ? 'تسجيل الدخول' : isFrench ? 'Connexion' : 'Sign In';
  String get signUp => isArabic ? 'إنشاء حساب' : isFrench ? 'Créer un compte' : 'Create Account';
  String get signOut => isArabic ? 'تسجيل الخروج' : isFrench ? 'Déconnexion' : 'Sign Out';
  String get emailLabel => isArabic ? 'البريد الإلكتروني' : isFrench ? 'Adresse e-mail' : 'Email Address';
  String get passwordLabel => isArabic ? 'كلمة المرور' : isFrench ? 'Mot de passe' : 'Password';
  String get fullNameLabel => isArabic ? 'الاسم الكامل' : isFrench ? 'Nom complet' : 'Full Name';
  String get phoneLabel => isArabic ? 'رقم الهاتف' : isFrench ? 'Numéro de téléphone' : 'Phone Number';
  String get confirmPasswordLabel =>
      isArabic ? 'تأكيد كلمة المرور' : isFrench ? 'Confirmer le mot de passe' : 'Confirm Password';
  String get alreadyHaveAccount => isArabic
      ? 'لديك حساب بالفعل؟ تسجيل الدخول'
      : isFrench
          ? 'Vous avez déjà un compte ? Connexion'
          : 'Already have an account? Sign In';
  String get dontHaveAccount => isArabic
      ? 'ليس لديك حساب؟ إنشاء حساب جديد'
      : isFrench
          ? "Vous n'avez pas de compte ? S'inscrire"
          : "Don't have an account? Sign Up";
  String get retry => isArabic ? 'إعادة المحاولة' : isFrench ? 'Réessayer' : 'Retry';
  String get cancel => isArabic ? 'إلغاء' : isFrench ? 'Annuler' : 'Cancel';
  String get ok => isArabic ? 'حسناً' : isFrench ? 'OK' : 'OK';
  String get dismiss => isArabic ? 'إغلاق' : isFrench ? 'Fermer' : 'Dismiss';
  String get errorTitle => isArabic ? 'حدث خطأ' : isFrench ? 'Une erreur est survenue' : 'An error occurred';
  String get emptyTitle => isArabic ? 'لا توجد بيانات' : isFrench ? 'Aucune donnée' : 'No Data Available';

  // Reliability, Offline & Crash Boundaries (TASK-06-01)
  String get offlineBannerTitle =>
      isArabic ? 'لا يوجد اتصال بالإنترنت' : isFrench ? 'Aucune connexion Internet' : 'No Internet Connection';
  String get offlineBannerMessage => isArabic
      ? 'يرجى التحقق من اتصالك بالشبكة'
      : isFrench
          ? 'Veuillez vérifier votre connexion réseau'
          : 'Please check your network connection';
  String get offlineReconnected => isArabic
      ? 'تم استعادة الاتصال بالإنترنت'
      : isFrench
          ? 'Connexion Internet rétablie'
          : 'Internet connection restored';
  String get globalErrorTitle =>
      isArabic ? 'حدث خطأ غير متوقع' : isFrench ? 'Une erreur inattendue est survenue' : 'An unexpected error occurred';
  String get globalErrorMessage => isArabic
      ? 'نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة للرئيسية.'
      : isFrench
          ? 'Une erreur est survenue. Veuillez réessayer ou retourner à l’accueil.'
          : 'Something went wrong. Please retry or return to the main screen.';
  String get returnToHome =>
      isArabic ? 'العودة للرئيسية' : isFrench ? 'Retour à l’accueil' : 'Return to Home';
  String get restartApp =>
      isArabic ? 'إعادة التشغيل' : isFrench ? 'Redémarrer' : 'Restart';

  // Session Expiration (TASK-06-02)
  String get sessionExpiredTitle => isArabic
      ? 'انتهت الجلسة'
      : isFrench
          ? 'Session expirée'
          : 'Session Expired';

  String get sessionExpiredMessage => isArabic
      ? 'انتهت جلستك. يرجى تسجيل الدخول مجدداً للمتابعة.'
      : isFrench
          ? 'Votre session a expiré. Veuillez vous reconnecter pour continuer.'
          : 'Your session has expired. Please sign in again to continue.';

  String get signInAgain => isArabic
      ? 'تسجيل الدخول مجدداً'
      : isFrench
          ? 'Se reconnecter'
          : 'Sign In Again';

  // Validation & Feedback
  String get fieldRequired => isArabic ? 'هذا الحقل مطلوب' : isFrench ? 'Ce champ est requis' : 'This field is required';
  String get invalidEmail => isArabic
      ? 'يرجى إدخال بريد إلكتروني صالح'
      : isFrench
          ? 'Veuillez saisir une adresse e-mail valide'
          : 'Please enter a valid email address';
  String get invalidPhone => isArabic
      ? 'يرجى إدخال رقم هاتف صالح (مثال: 0555123456)'
      : isFrench
          ? 'Veuillez saisir un numéro de téléphone valide'
          : 'Please enter a valid phone number';
  String get passwordTooShort => isArabic
      ? 'كلمة المرور يجب ألا تقل عن 8 أحرف'
      : isFrench
          ? 'Le mot de passe doit contenir au moins 8 caractères'
          : 'Password must be at least 8 characters';
  String get passwordsDoNotMatch => isArabic
      ? 'كلمتا المرور غير متطابقتين'
      : isFrench
          ? 'Les mots de passe ne correspondent pas'
          : 'Passwords do not match';
  String get authenticationFailedTitle =>
      isArabic ? 'فشل تسجيل الدخول' : isFrench ? 'Échec de la connexion' : 'Authentication Failed';
  String get registrationFailedTitle =>
      isArabic ? 'فشل إنشاء الحساب' : isFrench ? "Échec de l'inscription" : 'Registration Failed';
  String get invalidCredentials => isArabic
      ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      : isFrench
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : 'Invalid email address or password.';
  String get registrationSuccessTitle =>
      isArabic ? 'تم إنشاء الحساب بنجاح' : isFrench ? 'Compte créé avec succès' : 'Account Created Successfully';
  String get registrationSuccessMessage => isArabic
      ? 'مرحباً بك في منصة عافية. جاري توجيهك إلى حسابك...'
      : isFrench
          ? 'Bienvenue sur Aafiya. Redirection vers votre compte...'
          : 'Welcome to Aafiya. Redirecting to your account...';
  String get serverError => isArabic
      ? 'تعذر الاتصال بالخادم، يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.'
      : isFrench
          ? 'Impossible de contacter le serveur, veuillez vérifier votre connexion.'
          : 'Unable to connect to server, please check your connection and retry.';

  // Language Switching
  String get language => isArabic ? 'اللغة' : isFrench ? 'Langue' : 'Language';
  String get languageArabic => 'العربية';
  String get languageEnglish => 'English';
  String get languageFrench => 'Français';

  // Patient Shell
  String get patientHomeTitle => isArabic ? 'الرئيسية' : isFrench ? 'Accueil' : 'Home';
  String get patientAppointmentsTitle =>
      isArabic ? 'المواعيد' : isFrench ? 'Rendez-vous' : 'Appointments';
  String get patientRecordsTitle =>
      isArabic ? 'السجل الطبي' : isFrench ? 'Dossier médical' : 'Medical Records';
  String get patientProfileTitle =>
      isArabic ? 'الملف الشخصي' : isFrench ? 'Profil' : 'Profile';
  String get patientNoticeDirectBookingNotice => isArabic
      ? 'يتم حجز المواعيد حصرياً عبر مراكز الحجز المعتمدة.'
      : isFrench
          ? 'Les rendez-vous sont réservés exclusivement via les centres de réservation agréés.'
          : 'Appointments are arranged exclusively through registered Booking Centers.';

  // Appointments (TASK-03-02)
  String get upcomingAppointments =>
      isArabic ? 'المواعيد القادمة' : isFrench ? 'Rendez-vous à venir' : 'Upcoming Appointments';
  String get pastAppointments =>
      isArabic ? 'المواعيد السابقة' : isFrench ? 'Rendez-vous passés' : 'Past Appointments';
  String get appointmentDetails =>
      isArabic ? 'تفاصيل الموعد' : isFrench ? 'Détails du rendez-vous' : 'Appointment Details';
  String get bookingReference =>
      isArabic ? 'رقم الحجز' : isFrench ? 'Référence de réservation' : 'Booking Reference';
  String get clinic => isArabic ? 'العيادة' : isFrench ? 'Clinique' : 'Clinic';
  String get doctor => isArabic ? 'الطبيب' : isFrench ? 'Médecin' : 'Doctor';
  String get specialty => isArabic ? 'التخصص' : isFrench ? 'Spécialité' : 'Specialty';
  String get appointmentDate =>
      isArabic ? 'تاريخ الموعد' : isFrench ? 'Date du rendez-vous' : 'Appointment Date';
  String get timeSlot =>
      isArabic ? 'التوقيت' : isFrench ? 'Créneau horaire' : 'Time Slot';
  String get notes => isArabic ? 'ملاحظات' : isFrench ? 'Remarques' : 'Notes';
  String get close => isArabic ? 'إغلاق' : isFrench ? 'Fermer' : 'Close';
  String get retryLoadingAppointments => isArabic
      ? 'إعادة محاولة تحميل المواعيد'
      : isFrench
          ? 'Réessayer de charger les rendez-vous'
          : 'Retry Loading Appointments';
  String get loadingAppointments => isArabic
      ? 'جاري تحميل المواعيد...'
      : isFrench
          ? 'Chargement des rendez-vous...'
          : 'Loading appointments...';
  String get emptyUpcomingAppointments => isArabic
      ? 'لا توجد مواعيد قادمة مجدولة.'
      : isFrench
          ? 'Aucun rendez-vous à venir planifié.'
          : 'No upcoming appointments scheduled.';
  String get emptyPastAppointments => isArabic
      ? 'لا توجد مواعيد سابقة مسجلة.'
      : isFrench
          ? 'Aucun rendez-vous passé enregistré.'
          : 'No past appointments on record.';
  String get appointmentConfirmedAt =>
      isArabic ? 'تم التأكيد بتاريخ' : isFrench ? 'Confirmé le' : 'Confirmed on';
  String get appointmentCheckedInAt =>
      isArabic ? 'تم تسجيل الحضور بتاريخ' : isFrench ? 'Présence enregistrée le' : 'Checked in on';

  static const List<String> _arMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  static const List<String> _frMonths = [
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
  ];

  static const List<String> _enMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /// Safely formats an ISO date or timestamp string into a localized date representation.
  /// Handles full timestamps, short dates, malformed inputs, and null safely without throwing exceptions.
  String formatDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) return '-';
    final trimmed = raw.trim();
    final parsed = DateTime.tryParse(trimmed)?.toLocal();
    if (parsed == null) {
      return trimmed;
    }
    final day = parsed.day;
    final month = parsed.month;
    final year = parsed.year;

    if (month < 1 || month > 12) return '$year-$month-$day';

    if (isArabic) {
      return '$day ${_arMonths[month - 1]} $year';
    } else if (isFrench) {
      return '$day ${_frMonths[month - 1]} $year';
    } else {
      return '${_enMonths[month - 1]} $day, $year';
    }
  }

  // Appointment Statuses
  String get statusPending => isArabic ? 'قيد الانتظار' : isFrench ? 'En attente' : 'Pending';
  String get statusConfirmed => isArabic ? 'مؤكد' : isFrench ? 'Confirmé' : 'Confirmed';
  String get statusAttended => isArabic ? 'تم الحضور' : isFrench ? 'Présent' : 'Attended';
  String get statusNoShow => isArabic ? 'لم يحضر' : isFrench ? 'Non présenté' : 'No Show';
  String get statusCancelled => isArabic ? 'ملغى' : isFrench ? 'Annulé' : 'Cancelled';
  String get statusRejected => isArabic ? 'مرفوض' : isFrench ? 'Refusé' : 'Rejected';
  String get statusExpired => isArabic ? 'منتهي' : isFrench ? 'Expiré' : 'Expired';
  String get statusRescheduled =>
      isArabic ? 'معاد جدولته' : isFrench ? 'Reprogrammé' : 'Rescheduled';
  String get statusUnknown => isArabic ? 'غير محدد' : isFrench ? 'Inconnu' : 'Unknown';

  String statusLabel(AppointmentStatus status) => switch (status) {
        AppointmentStatus.pending => statusPending,
        AppointmentStatus.confirmed => statusConfirmed,
        AppointmentStatus.attended => statusAttended,
        AppointmentStatus.noShow => statusNoShow,
        AppointmentStatus.cancelled => statusCancelled,
        AppointmentStatus.rejected => statusRejected,
        AppointmentStatus.expired => statusExpired,
        AppointmentStatus.rescheduled => statusRescheduled,
        AppointmentStatus.unknown => statusUnknown,
      };

  // Pro Roles
  String get doctorRoleTitle => isArabic ? 'طبيب' : isFrench ? 'Médecin' : 'Doctor';
  String get assistantRoleTitle => isArabic ? 'مساعد عيادة' : isFrench ? 'Assistant' : 'Assistant';
  String get bookingCenterRoleTitle =>
      isArabic ? 'مركز حجز' : isFrench ? 'Centre de réservation' : 'Booking Center';
  String get unauthorizedRoleMessage => isArabic
      ? 'الحساب الحالي غير مصرح له بالدخول إلى هذا التطبيق.'
      : isFrench
          ? "Ce compte n'est pas autorisé à accéder à cette application."
          : 'This account is not authorized to access this application.';

  String get proAccountGuidance => isArabic
      ? 'هذا الحساب مخصص للكوادر الطبية والإدارية. يرجى استخدام تطبيق عافية للمهنيين (AAFIYA Pro).'
      : isFrench
          ? 'Ce compte est réservé aux professionnels. Veuillez utiliser AAFIYA Pro.'
          : 'This account is designated for medical staff. Please use AAFIYA Pro.';

  String get webOnlyRoleMessage => isArabic
      ? 'الوظائف الإدارية والتشخيصية مخصصة للاستخدام عبر بوابة الويب حصرياً.'
      : isFrench
          ? "Les fonctions administratives et diagnostiques sont réservées exclusivement au portail Web."
          : 'Administrative and diagnostic functions must be accessed via the web console.';

  // Role Shell Placeholders
  String get doctorDashboardTitle =>
      isArabic ? 'لوحة تحكم الطبيب' : isFrench ? 'Tableau de bord médecin' : 'Doctor Operational Dashboard';
  String get assistantDashboardTitle =>
      isArabic ? 'لوحة تحكم المساعد' : isFrench ? 'Tableau de bord assistant' : 'Assistant Operational Dashboard';
  String get bookingCenterDashboardTitle =>
      isArabic ? 'لوحة مركز الحجز' : isFrench ? 'Tableau de bord centre de réservation' : 'Booking Center Operations';

  String get quotaBalanceLabel =>
      isArabic ? 'رصيد الحصص' : isFrench ? 'Solde de quota' : 'Quota Balance';

  // Doctor & Clinic Directory (TASK-03-03)
  String get doctorDirectory => isArabic ? 'دليل الأطباء' : isFrench ? 'Annuaire des médecins' : 'Doctor Directory';
  String get clinicDirectory => isArabic ? 'دليل العيادات' : isFrench ? 'Annuaire des cliniques' : 'Clinic Directory';
  String get directorySearchHint =>
      isArabic ? 'ابحث عن طبيب أو عيادة أو ولاية...' : isFrench ? 'Rechercher médecin, clinique, wilaya...' : 'Search doctor, clinic, wilaya...';
  String get searchDoctorsHint =>
      isArabic ? 'ابحث بالاسم أو التخصص أو العيادة...' : isFrench ? 'Rechercher par nom, spécialité, clinique...' : 'Search by name, specialty, clinic...';
  String get searchClinicsHint =>
      isArabic ? 'ابحث عن اسم العيادة أو الولاية...' : isFrench ? 'Rechercher par nom de clinique ou wilaya...' : 'Search by clinic name or wilaya...';
  String get search => isArabic ? 'بحث' : isFrench ? 'Rechercher' : 'Search';
  String get verifiedDoctor => isArabic ? 'طبيب معتمد' : isFrench ? 'Médecin vérifié' : 'Verified Doctor';
  String get affiliatedClinics => isArabic ? 'العيادات التابعة' : isFrench ? 'Cliniques affiliées' : 'Affiliated Clinics';
  String get noAffiliatedClinics =>
      isArabic ? 'لا توجد عيادات تابعة مسجلة.' : isFrench ? 'Aucune clinique affiliée enregistrée.' : 'No affiliated clinics registered.';
  String get noDoctorsFound =>
      isArabic ? 'لم يتم العثور على أطباء مطابقين للبحث.' : isFrench ? 'Aucun médecin trouvé.' : 'No doctors found matching search.';
  String get noClinicsFound =>
      isArabic ? 'لم يتم العثور على عيادات مطابقة للبحث.' : isFrench ? 'Aucune clinique trouvée.' : 'No clinics found matching search.';
  String get filterBySpecialty => isArabic ? 'تصفية بالتخصص' : isFrench ? 'Filtrer par spécialité' : 'Filter by Specialty';
  String get filterByWilaya => isArabic ? 'تصفية بالولاية' : isFrench ? 'Filtrer par wilaya' : 'Filter by Wilaya';
  String get allSpecialties => isArabic ? 'جميع التخصصات' : isFrench ? 'Toutes les spécialités' : 'All Specialties';
  String get allWilayas => isArabic ? 'جميع الولايات' : isFrench ? 'Toutes les wilayas' : 'All Wilayas';

  // Master Data (TASK-MD-09 & TASK-MD-12)
  String get selectSpecialty => isArabic ? 'اختر التخصص' : isFrench ? 'Sélectionner la spécialité' : 'Select Specialty';
  String get loadingSpecialties => isArabic ? 'جاري تحميل التخصصات...' : isFrench ? 'Chargement des spécialités...' : 'Loading specialties...';
  String get errorLoadingSpecialties => isArabic ? 'تعذر تحميل التخصصات' : isFrench ? 'Échec du chargement des spécialités' : 'Failed to load specialties';
  String get noSpecialtiesFound => isArabic ? 'لا توجد تخصصات متاحة' : isFrench ? 'Aucune spécialité disponible' : 'No specialties available';
  String get selectWilaya => isArabic ? 'اختر الولاية' : isFrench ? 'Sélectionner la wilaya' : 'Select Wilaya';
  String get selectCommune => isArabic ? 'اختر البلدية' : isFrench ? 'Sélectionner la commune' : 'Select Commune';
  String get selectWilayaFirst => isArabic ? 'اختر الولاية أولاً' : isFrench ? 'Sélectionnez d\'abord la wilaya' : 'Select Wilaya first';
  String get loadingWilayas => isArabic ? 'جاري تحميل الولايات...' : isFrench ? 'Chargement des wilayas...' : 'Loading wilayas...';
  String get loadingCommunes => isArabic ? 'جاري تحميل البلديات...' : isFrench ? 'Chargement des communes...' : 'Loading communes...';
  String get errorLoadingWilayas => isArabic ? 'تعذر تحميل الولايات' : isFrench ? 'Échec du chargement des wilayas' : 'Failed to load wilayas';
  String get errorLoadingCommunes => isArabic ? 'تعذر تحميل البلديات' : isFrench ? 'Échec du chargement des communes' : 'Failed to load communes';
  String get noCommunesFound => isArabic ? 'لا توجد بلديات متاحة' : isFrench ? 'Aucune commune disponible' : 'No communes available';
  String get allCommunes => isArabic ? 'جميع البلديات' : isFrench ? 'Toutes les communes' : 'All Communes';
  String get communeLabel => isArabic ? 'البلدية' : isFrench ? 'Commune' : 'Commune';
  String get wilayaLabel => isArabic ? 'الولاية' : isFrench ? 'Wilaya' : 'Wilaya';
  String get postalCodeLabel => isArabic ? 'الرمز البريدي' : isFrench ? 'Code postal' : 'Postal Code';

  // Specialties (DEF-02 Stage A)
  String get specialtyCardiology => isArabic ? 'أمراض القلب' : isFrench ? 'Cardiologie' : 'Cardiology';
  String get specialtyPediatrics => isArabic ? 'طب الأطفال' : isFrench ? 'Pédiatrie' : 'Pediatrics';
  String get specialtyOphthalmology => isArabic ? 'طب العيون' : isFrench ? 'Ophtalmologie' : 'Ophthalmology';
  String get specialtyDentistry => isArabic ? 'طب وجراحة الأسنان' : isFrench ? 'Dentisterie' : 'Dentistry';
  String get specialtyGeneralPractice => isArabic ? 'الطب العام' : isFrench ? 'Médecine générale' : 'General Practice';
  String get specialtyOrthopedics => isArabic ? 'جراحة العظام' : isFrench ? 'Orthopédie' : 'Orthopedics';
  String get specialtyDermatology => isArabic ? 'الأمراض الجلدية' : isFrench ? 'Dermatologie' : 'Dermatology';

  /// Resolves localized specialty label from raw key or Arabic string.
  String specialtyName(String raw) {
    final trimmed = raw.trim();
    switch (trimmed) {
      case 'cardiology':
      case 'Cardiology':
      case 'أمراض القلب':
        return specialtyCardiology;
      case 'pediatrics':
      case 'Pediatrics':
      case 'طب الأطفال':
        return specialtyPediatrics;
      case 'ophthalmology':
      case 'Ophthalmology':
      case 'طب العيون':
        return specialtyOphthalmology;
      case 'dentistry':
      case 'Dentistry':
      case 'طب وجراحة الأسنان':
        return specialtyDentistry;
      case 'general_practice':
      case 'General Practice':
      case 'الطب العام':
      case 'طب عام':
        return specialtyGeneralPractice;
      case 'orthopedics':
      case 'Orthopedics':
      case 'جراحة العظام':
        return specialtyOrthopedics;
      case 'dermatology':
      case 'Dermatology':
      case 'الأمراض الجلدية':
        return specialtyDermatology;
      default:
        return raw;
    }
  }

  // Supported Wilayas (DEF-02 Stage A)
  String get wilayaAlgiers => isArabic ? 'الجزائر' : isFrench ? 'Alger' : 'Algiers';
  String get wilayaBlida => isArabic ? 'البليدة' : isFrench ? 'Blida' : 'Blida';
  String get wilayaOran => isArabic ? 'وهران' : isFrench ? 'Oran' : 'Oran';
  String get wilayaConstantine => isArabic ? 'قسنطينة' : isFrench ? 'Constantine' : 'Constantine';
  String get wilayaSetif => isArabic ? 'سطيف' : isFrench ? 'Sétif' : 'Setif';
  String get wilayaAnnaba => isArabic ? 'عنابة' : isFrench ? 'Annaba' : 'Annaba';
  String get wilayaTlemcen => isArabic ? 'تلمسان' : isFrench ? 'Tlemcen' : 'Tlemcen';

  /// Resolves localized Wilaya label from raw key or Arabic string.
  String wilayaName(String raw) {
    final trimmed = raw.trim();
    switch (trimmed) {
      case 'algiers':
      case 'Algiers':
      case 'Alger':
      case 'الجزائر':
        return wilayaAlgiers;
      case 'blida':
      case 'Blida':
      case 'البليدة':
        return wilayaBlida;
      case 'oran':
      case 'Oran':
      case 'وهران':
        return wilayaOran;
      case 'constantine':
      case 'Constantine':
      case 'قسنطينة':
        return wilayaConstantine;
      case 'setif':
      case 'Setif':
      case 'Sétif':
      case 'سطيف':
        return wilayaSetif;
      case 'annaba':
      case 'Annaba':
      case 'عنابة':
        return wilayaAnnaba;
      case 'tlemcen':
      case 'Tlemcen':
      case 'تلمسان':
        return wilayaTlemcen;
      default:
        return raw;
    }
  }
  String get callClinic => isArabic ? 'الاتصال بالعيادة' : isFrench ? 'Appeler la clinique' : 'Call Clinic';
  String get director => isArabic ? 'المدير الطبي' : isFrench ? 'Directeur médical' : 'Medical Director';
  String get doctorsCount => isArabic ? 'عدد الأطباء' : isFrench ? 'Médecins' : 'Doctors';
  String get loadMore => isArabic ? 'تحميل المزيد' : isFrench ? 'Charger plus' : 'Load More';
  String get loadingMore => isArabic ? 'جاري تحميل المزيد...' : isFrench ? 'Chargement...' : 'Loading more...';
  String get failedToLoadMore =>
      isArabic ? 'فشل تحميل المزيد، انقر للمحاولة مجدداً.' : isFrench ? 'Échec du chargement, appuyez pour réessayer.' : 'Failed to load more. Tap to retry.';
  String get endOfResults => isArabic ? 'تم عرض جميع النتائج.' : isFrench ? 'Toutes les résultats sont affichés.' : 'All results displayed.';
  String get discoverDoctorsAndClinics =>
      isArabic ? 'دليل الأطباء والعيادات' : isFrench ? 'Découvrir les médecins et cliniques' : 'Discover Doctors & Clinics';
  String get discoverDirectorySubtitle =>
      isArabic ? 'استكشف المراكز والعيادات المعتمدة وأطباء الشبكة' : isFrench ? 'Explorez les cliniques agréées et les médecins' : 'Explore affiliated clinics and licensed practitioners';
  String get loading => isArabic ? 'جاري التحميل...' : isFrench ? 'Chargement...' : 'Loading...';
  String get loadingDoctors => isArabic ? 'جاري تحميل قائمة الأطباء...' : isFrench ? 'Chargement des médecins...' : 'Loading doctors...';
  String get loadingClinics => isArabic ? 'جاري تحميل قائمة العيادات...' : isFrench ? 'Chargement des cliniques...' : 'Loading clinics...';

  // Prescriptions & Medical Records (TASK-03-04)
  String get prescriptionsTitle =>
      isArabic ? 'الوصفات الطبية' : isFrench ? 'Ordonnances médicales' : 'Prescriptions';
  String get loadingPrescriptions =>
      isArabic ? 'جاري تحميل الوصفات الطبية...' : isFrench ? 'Chargement des ordonnances...' : 'Loading prescriptions...';
  String get emptyPrescriptions =>
      isArabic ? 'لا توجد وصفات طبية مسجلة.' : isFrench ? 'Aucune ordonnance enregistrée.' : 'No prescriptions on record.';
  String get emptyPrescriptionsFiltered =>
      isArabic ? 'لا توجد وصفات تطابق هذا التصنيف.' : isFrench ? 'Aucune ordonnance pour ce filtre.' : 'No prescriptions match this filter.';
  String get retryLoadingPrescriptions =>
      isArabic ? 'إعادة تحميل الوصفات' : isFrench ? 'Réessayer le chargement' : 'Retry loading prescriptions';
  String get prescriptionReference =>
      isArabic ? 'الرقم المرجعي' : isFrench ? 'Référence' : 'Reference';
  String get allPrescriptions =>
      isArabic ? 'الكل' : isFrench ? 'Toutes' : 'All';
  String get filterStatusActive =>
      isArabic ? 'نشطة' : isFrench ? 'Actives' : 'Active';
  String get filterStatusCompleted =>
      isArabic ? 'مكتملة' : isFrench ? 'Terminées' : 'Completed';
  String get filterStatusVoided =>
      isArabic ? 'ملغاة' : isFrench ? 'Annulées' : 'Voided';
  String get filterStatusExpired =>
      isArabic ? 'منتهية' : isFrench ? 'Expirées' : 'Expired';
  String get statusActive =>
      isArabic ? 'نشطة' : isFrench ? 'Active' : 'Active';
  String get statusVoided =>
      isArabic ? 'ملغاة' : isFrench ? 'Annulée' : 'Voided';
  String get validUntil =>
      isArabic ? 'صالحة حتى' : isFrench ? "Valable jusqu'au" : 'Valid until';
  String get issuedOn =>
      isArabic ? 'تاريخ الإصدار' : isFrench ? 'Délivrée le' : 'Issued on';
  String get expiresOn =>
      isArabic ? 'تاريخ الانتهاء' : isFrench ? 'Expire le' : 'Expires on';
  String get medicationsCount =>
      isArabic ? 'الأدوية الموصوفة' : isFrench ? 'Médicaments prescrits' : 'Prescribed Medications';

  // Prescription Details
  String get prescriptionDetailTitle =>
      isArabic ? 'تفاصيل الوصفة الطبية' : isFrench ? "Détails de l'ordonnance" : 'Prescription Details';
  String get medications =>
      isArabic ? 'الأدوية الموصوفة' : isFrench ? 'Médicaments prescrits' : 'Prescribed Medications';
  String get noPrescriptionItems => isArabic
      ? 'لا توجد أدوية مدرجة في هذه الوصفة'
      : isFrench
          ? 'Aucun médicament inscrit sur cette ordonnance'
          : 'No medications listed in this prescription';
  String get dosage =>
      isArabic ? 'الجرعة' : isFrench ? 'Dosage' : 'Dosage';
  String get frequency =>
      isArabic ? 'التكرار' : isFrench ? 'Fréquence' : 'Frequency';
  String get duration =>
      isArabic ? 'المدة' : isFrench ? 'Durée' : 'Duration';
  String get instructions =>
      isArabic ? 'تعليمات الاستعمال' : isFrench ? 'Instructions' : 'Instructions';
  String get doctorNotes =>
      isArabic ? 'ملاحظات الطبيب' : isFrench ? 'Notes du médecin' : "Doctor's Notes";
  String get substitutionAllowed =>
      isArabic ? 'يُسمح بالبديل' : isFrench ? 'Substitution autorisée' : 'Substitution Allowed';
  String get substitutionNotAllowed =>
      isArabic ? 'لا يُسمح بالبديل' : isFrench ? 'Substitution interdite' : 'Substitution Not Allowed';
  String get readOnlyPrescriptionNotice =>
      isArabic ? 'هذه الوصفة الطبية رقمية معتمدة ومخصصة للعرض فقط.' : isFrench ? 'Cette ordonnance numérique certifiée est en lecture seule.' : 'This verified digital prescription is read-only.';

  // QR Code Verification
  String get qrVerification =>
      isArabic ? 'التحقق الرقمي (QR)' : isFrench ? 'Vérification QR' : 'QR Verification';
  String get scanQrNotice =>
      isArabic ? 'امسح رمز الاستجابة السريعة لدى الصيدلية للتحقق الفوري من أصالة الوصفة.' : isFrench ? "Scannez ce code QR en pharmacie pour authentifier l'ordonnance." : 'Scan this QR code at the pharmacy to verify prescription authenticity.';
  String get qrSecureToken =>
      isArabic ? 'رمز التحقق الآمن' : isFrench ? 'Jeton sécurisé' : 'Secure Token';
  String get copyVerificationLink =>
      isArabic ? 'نسخ رابط التحقق' : isFrench ? 'Copier le lien' : 'Copy verification link';
  String get linkCopied =>
      isArabic ? 'تم نسخ رابط التحقق بنجاح' : isFrench ? 'Lien copié avec succès' : 'Verification link copied';
  String get prescriptionAuthentic =>
      isArabic ? 'وصفة طبية موثقة' : isFrench ? 'Ordonnance certifiée' : 'Certified Prescription';

  // Emergency Medical Profile
  String get emergencyProfileTitle =>
      isArabic ? 'الملف الطبي للطوارئ' : isFrench ? "Profil médical d'urgence" : 'Emergency Medical Profile';
  String get bloodType =>
      isArabic ? 'فصيلة الدم' : isFrench ? 'Groupe sanguin' : 'Blood Group';
  String get unknownBloodType =>
      isArabic ? 'غير محددة' : isFrench ? 'Non défini' : 'Not specified';
  String get allergiesTitle =>
      isArabic ? 'الحساسية الطبية' : isFrench ? 'Allergies médicales' : 'Medical Allergies';
  String get noAllergies =>
      isArabic ? 'لا توجد حالات حساسية مسجلة.' : isFrench ? 'Aucune allergie enregistrée.' : 'No documented allergies.';
  String get chronicConditionsTitle =>
      isArabic ? 'الأمراض والحالات المزمنة' : isFrench ? 'Affections chroniques' : 'Chronic Conditions';
  String get noChronicConditions =>
      isArabic ? 'لا توجد حالات مزمنة مسجلة.' : isFrench ? 'Aucune affection chronique enregistrée.' : 'No chronic conditions documented.';
  String get isChronicPatient =>
      isArabic ? 'مريض مصاب بأمراض مزمنة' : isFrench ? 'Affection chronique' : 'Chronic Condition';
  String get notChronicPatient =>
      isArabic ? 'لا توجد أمراض مزمنة مسجلة' : isFrench ? 'Aucune affection chronique' : 'No chronic conditions on file';
  String get emergencyContactsTitle =>
      isArabic ? 'جهات الاتصال في حالات الطوارئ' : isFrench ? "Contacts d'urgence" : 'Emergency Contacts';
  String get noEmergencyContacts =>
      isArabic ? 'لا توجد جهات اتصال طوارئ مسجلة.' : isFrench ? 'Aucun contact enregistré.' : 'No emergency contacts recorded.';
  String get primaryContact =>
      isArabic ? 'جهة اتصال رئيسية' : isFrench ? 'Contact principal' : 'Primary Contact';
  String get call =>
      isArabic ? 'اتصال' : isFrench ? 'Appeler' : 'Call';
  String get relationship =>
      isArabic ? 'صلة القرابة' : isFrench ? 'Relation' : 'Relationship';
  String get readOnlyProfileNotice =>
      isArabic ? 'هذا الملف مخصص للعرض في حالات الطوارئ. تعديل البيانات يتم حصراً عبر الطبيب أو العيادة المعتمدة.' : isFrench ? 'Ce profil est en lecture seule. Toute modification doit être effectuée par un professionnel de santé agréé.' : 'This emergency profile is read-only. Updates must be performed exclusively by authorized medical staff.';
  String get loadingEmergencyProfile =>
      isArabic ? 'جاري تحميل ملف الطوارئ...' : isFrench ? "Chargement du profil d'urgence..." : 'Loading emergency profile...';
  String get retryLoadingProfile =>
      isArabic ? 'إعادة تحميل الملف' : isFrench ? 'Réessayer' : 'Retry loading profile';
  String get allergen =>
      isArabic ? 'المسبب' : isFrench ? 'Allergène' : 'Allergen';
  String get severity =>
      isArabic ? 'درجة الخطورة' : isFrench ? 'Gravité' : 'Severity';
  String get severitySevere =>
      isArabic ? 'شديدة الخطورة' : isFrench ? 'Grave' : 'Severe';
  String get severityModerate =>
      isArabic ? 'متوسطة' : isFrench ? 'Modérée' : 'Moderate';
  String get severityMild =>
      isArabic ? 'خفيفة' : isFrench ? 'Légère' : 'Mild';
  String get reaction =>
      isArabic ? 'رد الفعل التحسسي' : isFrench ? 'Réaction' : 'Reaction';
  String get diagnosedDate =>
      isArabic ? 'تاريخ التشخيص' : isFrench ? 'Date de diagnostic' : 'Diagnosis Date';
  String get medicalHubTitle =>
      isArabic ? 'السجل الطبي' : isFrench ? 'Dossier Médical' : 'Medical Records';
  String get medicalHubSubtitle =>
      isArabic ? 'الوصفات الطبية، الحساسية، وملف الطوارئ' : isFrench ? "Ordonnances, allergies et profil d'urgence" : 'Prescriptions, allergies & emergency profile';
  String get emergencyQuickAccess =>
      isArabic ? 'الملف الطبي السريع للطوارئ' : isFrench ? "Profil médical d'urgence rapide" : 'Emergency Quick Profile';
  String get viewPrescriptions =>
      isArabic ? 'استعراض الوصفات الطبية' : isFrench ? 'Voir les ordonnances' : 'View Prescriptions';
  String get viewEmergencyProfile =>
      isArabic ? 'استعراض ملف الطوارئ' : isFrench ? 'Voir le profil d’urgence' : 'View Emergency Profile';

  // Doctor Navigation Labels (DEF-03 / TASK-B-03)
  String get waitingRoomTitle => isArabic
      ? 'قاعة الانتظار'
      : isFrench
          ? "Salle d'attente"
          : 'Waiting Room';
  String get myClinicsTitle => isArabic
      ? 'عياداتي'
      : isFrench
          ? 'Mes Cabinets'
          : 'My Clinics';

  // Doctor Operational & Clinic Context (TASK-04-01)
  String get activeClinic =>
      isArabic ? 'العيادة النشطة' : isFrench ? 'Clinique active' : 'Active Clinic';
  String get selectClinic =>
      isArabic ? 'اختر العيادة' : isFrench ? 'Sélectionner une clinique' : 'Select Clinic';
  String get switchClinic =>
      isArabic ? 'تبديل العيادة' : isFrench ? 'Changer de clinique' : 'Switch Clinic';
  String get availableClinics =>
      isArabic ? 'العيادات المتاحة' : isFrench ? 'Cliniques disponibles' : 'Available Clinics';
  String get noClinicsAssigned =>
      isArabic ? 'لا توجد عيادة مرتبطة بحسابك حالياً. يرجى التواصل مع الإدارة.' : isFrench ? 'Aucune clinique associée à votre compte. Veuillez contacter l’administration.' : 'No clinic currently associated with your account. Please contact administration.';
  String get clinicSwitchSuccess =>
      isArabic ? 'تم تغيير العيادة النشطة بنجاح.' : isFrench ? 'Clinique active changée avec succès.' : 'Active clinic switched successfully.';
  String get directorPosition =>
      isArabic ? 'مدير طبي' : isFrench ? 'Directeur médical' : 'Medical Director';
  String get doctorPosition =>
      isArabic ? 'طبيب ممارس' : isFrench ? 'Médecin praticien' : 'Practicing Doctor';
  String get primaryClinicBadge =>
      isArabic ? 'رئيسية' : isFrench ? 'Principale' : 'Primary';
  String get clinicSuspended =>
      isArabic ? 'حسابك معلق في هذه العيادة' : isFrench ? 'Compte suspendu dans cette clinique' : 'Account suspended in this clinic';
  String get changeClinic =>
      isArabic ? 'تغيير' : isFrench ? 'Changer' : 'Change';
  String get loadingDoctorClinics =>
      isArabic ? 'جاري تحميل العيادات...' : isFrench ? 'Chargement des cliniques...' : 'Loading clinics...';
  String get failedToLoadClinics =>
      isArabic ? 'فشل تحميل قائمة العيادات.' : isFrench ? 'Échec du chargement des cliniques.' : 'Failed to load clinics.';
  String get futureFeaturesNote =>
      isArabic ? 'الميزات السريرية وإدارة المواعيد ستتوفر في المراحل القادمة.' : isFrench ? 'Les fonctionnalités cliniques et la gestion des rendez-vous seront disponibles prochainement.' : 'Clinical features and appointment management will be available in upcoming phases.';

  // Doctor Operational Dashboard & Today's Agenda (TASK-04-02)
  String get todayTotalLabel =>
      isArabic ? 'إجمالي مواعيد اليوم' : isFrench ? "Total des rendez-vous" : "Today's Total";
  String get pendingCheckInLabel =>
      isArabic ? 'بانتظار الحضور' : isFrench ? "En attente d'enregistrement" : 'Pending Check-in';
  String get inWaitingRoomLabel =>
      isArabic ? 'في قاعة الانتظار' : isFrench ? "En salle d'attente" : 'In Waiting Room';
  String get completedTodayLabel =>
      isArabic ? 'الكشوفات المكتملة' : isFrench ? 'Visites terminées' : 'Completed';
  String get noShowTodayLabel =>
      isArabic ? 'غياب / لم يحضر' : isFrench ? 'Rendez-vous manqués' : 'No-Show';
  String get todayAgendaTitle =>
      isArabic ? 'جدول مواعيد اليوم' : isFrench ? "Programme d'aujourd'hui" : "Today's Schedule";
  String get noAppointmentsToday =>
      isArabic ? 'لا توجد مواعيد مسجلة لهذا اليوم.' : isFrench ? "Aucun rendez-vous enregistré aujourd'hui." : 'No appointments scheduled for today.';
  String get noAppointmentsFiltered =>
      isArabic ? 'لا توجد مواعيد تطابق هذا الفلتر.' : isFrench ? 'Aucun rendez-vous pour ce filtre.' : 'No appointments match this filter.';
  String get loadingDashboard =>
      isArabic ? 'جاري تحميل جدول اليوم والمؤشرات...' : isFrench ? "Chargement du tableau de bord..." : "Loading today's schedule...";
  String get failedToLoadDashboard =>
      isArabic ? 'فشل تحميل بيانات لوحة التحكم.' : isFrench ? 'Échec du chargement du tableau de bord.' : 'Failed to load dashboard data.';
  String get operationalSummary =>
      isArabic ? 'ملخص العمليات اليومية' : isFrench ? 'Résumé opérationnel' : 'Operational Summary';
  String get filterAll =>
      isArabic ? 'الكل' : isFrench ? 'Tous' : 'All';
  String get filterWaitingRoom =>
      isArabic ? 'قاعة الانتظار' : isFrench ? "Salle d'attente" : 'Waiting Room';
  String get filterConfirmed =>
      isArabic ? 'مؤكدة' : isFrench ? 'Confirmés' : 'Confirmed';
  String get filterAttended =>
      isArabic ? 'حاضر' : isFrench ? 'Présents' : 'Attended';
  String get filterNoShow =>
      isArabic ? 'لم يحضر' : isFrench ? 'Absents' : 'No-Show';
  String get filterCompleted =>
      isArabic ? 'مكتمل' : isFrench ? 'Terminés' : 'Completed';
  String get timeSlotLabel =>
      isArabic ? 'التوقيت' : isFrench ? 'Horaire' : 'Time';
  String get patientNameLabel =>
      isArabic ? 'المريض' : isFrench ? 'Patient' : 'Patient';
  String get bookingRefLabel =>
      isArabic ? 'المرجع' : isFrench ? 'Réf.' : 'Ref.';
  String get refreshDashboard =>
      isArabic ? 'تحديث البيانات' : isFrench ? 'Actualiser' : 'Refresh';

  // Live Waiting Room Queue & Attendance Actions (TASK-04-03)
  String get queueTitle =>
      isArabic ? 'طابور الانتظار وقاعة الكشف' : isFrench ? "File d'attente et salle d'attente" : 'Waiting Queue & Clinical Flow';
  String get waitingRoomTab =>
      isArabic ? 'في قاعة الانتظار' : isFrench ? "En salle d'attente" : 'In Waiting Room';
  String get expectedCheckInTab =>
      isArabic ? 'المتوقع حضورهم' : isFrench ? "Arrivées attendues" : 'Expected Arrivals';
  String get markAttendedAction =>
      isArabic ? 'تسجيل حضور' : isFrench ? "Enregistrer l'arrivée" : 'Mark Attended';
  String get markNoShowAction =>
      isArabic ? 'لم يحضر' : isFrench ? 'Non présenté' : 'Mark No-Show';
  String get confirmAttendanceTitle =>
      isArabic ? 'تأكيد تسجيل الحضور' : isFrench ? "Confirmer l'arrivée" : 'Confirm Attendance';
  String get confirmAttendancePrompt =>
      isArabic ? 'هل ترغب في تسجيل حضور المريض للموعد؟ سيتم نقله مباشرة إلى قاعة الانتظار.' : isFrench ? "Voulez-vous enregistrer l'arrivée de ce patient ? Il sera placé en salle d'attente." : 'Do you want to mark this patient as attended? They will be moved to the waiting room.';
  String get confirmNoShowTitle =>
      isArabic ? 'تأكيد عدم الحضور (No-Show)' : isFrench ? "Confirmer l'absence (No-Show)" : 'Confirm No-Show';
  String get confirmNoShowPrompt =>
      isArabic ? 'هل أنت متأكد من تسجيل عدم حضور المريض للموعد؟ هذا الإجراء لا يمكن التراجع عنه.' : isFrench ? "Êtes-vous sûr de vouloir marquer ce patient comme non présenté ? Cette action est irréversible." : 'Are you sure you want to mark this patient as a no-show? This action cannot be undone.';
  String get noShowReasonOptional =>
      isArabic ? 'سبب عدم الحضور (اختياري)' : isFrench ? 'Motif de l’absence (optionnel)' : 'Reason for no-show (optional)';
  String get attendanceSuccessMessage =>
      isArabic ? 'تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.' : isFrench ? 'Arrivée du patient enregistrée avec succès.' : 'Patient marked as attended successfully.';
  String get noShowSuccessMessage =>
      isArabic ? 'تم تسجيل عدم حضور المريض للموعد (No-Show).' : isFrench ? 'Absence enregistrée avec succès.' : 'Patient marked as no-show successfully.';
  String get emptyWaitingRoom =>
      isArabic ? 'لا يوجد أي مريض في قاعة الانتظار حالياً.' : isFrench ? 'Aucun patient en salle d’attente actuellement.' : 'No patients currently in the waiting room.';
  String get emptyExpectedQueue =>
      isArabic ? 'لا توجد مواعيد مؤكدة أخرى متوقعة اليوم.' : isFrench ? 'Aucun autre rendez-vous attendu aujourd’hui.' : 'No other confirmed appointments expected today.';
  String get actionProcessing =>
      isArabic ? 'جاري المعالجة...' : isFrench ? 'Traitement en cours...' : 'Processing...';
  String get patientInWaitingRoomBadge =>
      isArabic ? 'في الانتظار' : isFrench ? 'En attente' : 'Waiting';
  String get checkedInAtLabel =>
      isArabic ? 'وقت الوصول' : isFrench ? 'Arrivé à' : 'Arrived at';
  String get queuePositionLabel =>
      isArabic ? 'الترتيب' : isFrench ? 'Rang' : 'Order';

  // Read-Only Patient Medical Summary Viewer (TASK-04-04)
  String get patientSummaryTitle =>
      isArabic ? 'الملخص الطبي للمريض' : isFrench ? 'Résumé médical du patient' : 'Patient Medical Summary';
  String get viewPatientSummary =>
      isArabic ? 'الملخص الطبي' : isFrench ? 'Résumé médical' : 'Medical Summary';
  String get loadingPatientSummary =>
      isArabic ? 'جاري تحميل الملخص الطبي...' : isFrench ? 'Chargement du résumé médical...' : 'Loading medical summary...';
  String get failedToLoadPatientSummary =>
      isArabic ? 'فشل تحميل الملخص الطبي للمريض.' : isFrench ? 'Échec du chargement du résumé médical.' : 'Failed to load patient summary.';
  String get accessDeniedPatientSummary =>
      isArabic ? 'غير مصرح لك بعرض الملف الطبي لهذا المريض.' : isFrench ? 'Accès refusé au dossier médical de ce patient.' : 'Access denied to this patient\'s medical summary.';
  String get readOnlySummaryNotice =>
      isArabic ? 'هذا العرض مخصص للاطلاع السريري المباشر فقط (للقراءة فقط).' : isFrench ? 'Cet affichage est réservé à la consultation clinique directe (lecture seule).' : 'This view is strictly for direct clinical consultation (read-only).';
  String get noKnownAllergies =>
      isArabic ? 'لا توجد أي حساسيات مسجلة لهذا المريض.' : isFrench ? 'Aucune allergie connue enregistrée.' : 'No known allergies recorded.';
  String get noKnownChronicConditions =>
      isArabic ? 'لا توجد أي أمراض مزمنة مسجلة لهذا المريض.' : isFrench ? 'Aucune maladie chronique enregistrée.' : 'No chronic conditions recorded.';
  String get noEmergencyContactsRecorded =>
      isArabic ? 'لا توجد جهات اتصال للطوارئ مسجلة.' : isFrench ? 'Aucun contact d\'urgence enregistré.' : 'No emergency contacts recorded.';
  String get primaryContactBadge =>
      isArabic ? 'رئيسي' : isFrench ? 'Principal' : 'Primary';
  String get severityLifeThreatening =>
      isArabic ? 'مهددة للحياة' : isFrench ? 'Menace vitale' : 'Life-Threatening';
  String get conditionStatusActive =>
      isArabic ? 'نشط' : isFrench ? 'Actif' : 'Active';
  String get conditionStatusManaged =>
      isArabic ? 'تحت السيطرة' : isFrench ? 'Contrôlé' : 'Managed';
  String get conditionStatusRemission =>
      isArabic ? 'في هجوع' : isFrench ? 'En rémission' : 'In Remission';
  String get conditionStatusResolved =>
      isArabic ? 'شُفي / منتهي' : isFrench ? 'Résolu' : 'Resolved';
  String get closeButtonLabel =>
      isArabic ? 'إغلاق' : isFrench ? 'Fermer' : 'Close';

  // Clinic Director Staff Management (TASK-04-05)
  String get clinicStaffTitle =>
      isArabic ? 'طاقم العيادة' : isFrench ? 'Personnel' : 'Clinic Staff';
  String get staffManagementTitle =>
      isArabic ? 'إدارة طاقم العيادة' : isFrench ? 'Gestion du personnel' : 'Staff Management';
  String get doctorsTab =>
      isArabic ? 'الأطباء' : isFrench ? 'Médecins' : 'Doctors';
  String get assistantsTab =>
      isArabic ? 'المساعدون' : isFrench ? 'Assistants' : 'Assistants';
  String get invitationsSection =>
      isArabic ? 'الدعوات المعلقة' : isFrench ? 'Invitations en attente' : 'Pending Invitations';
  String get addDoctor =>
      isArabic ? 'إضافة طبيب' : isFrench ? 'Ajouter un médecin' : 'Add Doctor';
  String get lookupDoctorTab =>
      isArabic ? 'بحث ودعوة' : isFrench ? 'Rechercher et inviter' : 'Lookup & Invite';
  String get createNewDoctorTab =>
      isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un compte' : 'Create Account';
  String get addAssistant =>
      isArabic ? 'إضافة مساعد' : isFrench ? 'Ajouter un assistant' : 'Add Assistant';
  String get specialtyLabel =>
      isArabic ? 'التخصص' : isFrench ? 'Spécialité' : 'Specialty';
  String get licenseNumberLabel =>
      isArabic ? 'رقم الترخيص' : isFrench ? 'Numéro de licence' : 'License Number';
  String get bioLabel =>
      isArabic ? 'نبذة تعريفية' : isFrench ? 'Biographie' : 'Bio';
  String get directorBadge =>
      isArabic ? 'مدير' : isFrench ? 'Directeur' : 'Director';
  String get doctorBadge =>
      isArabic ? 'طبيب' : isFrench ? 'Médecin' : 'Doctor';
  String get assistantBadge =>
      isArabic ? 'مساعد' : isFrench ? 'Assistant' : 'Assistant';
  String get primaryBadge =>
      isArabic ? 'رئيسي' : isFrench ? 'Principal' : 'Primary';
  String get activeStatus =>
      isArabic ? 'نشط' : isFrench ? 'Actif' : 'Active';
  String get suspendedStatus =>
      isArabic ? 'معلق' : isFrench ? 'Suspendu' : 'Suspended';
  String get staffStatusLabel =>
      isArabic ? 'الحالة' : isFrench ? 'Statut' : 'Status';
  String get suspendStaff =>
      isArabic ? 'تعليق الحساب' : isFrench ? 'Suspendre le compte' : 'Suspend Account';
  String get activateStaff =>
      isArabic ? 'تنشيط الحساب' : isFrench ? 'Activer le compte' : 'Activate Account';
  String get detachDoctor =>
      isArabic ? 'فصل الطبيب من العيادة' : isFrench ? 'Détacher le médecin' : 'Detach Doctor';
  String get deleteAssistant =>
      isArabic ? 'حذف المساعد' : isFrench ? 'Supprimer l\'assistant' : 'Delete Assistant';
  String get editPermissions =>
      isArabic ? 'تعديل الصلاحيات' : isFrench ? 'Modifier les autorisations' : 'Edit Permissions';
  String get permissionsLabel =>
      isArabic ? 'الصلاحيات' : isFrench ? 'Autorisations' : 'Permissions';
  String get cancelInvitation =>
      isArabic ? 'إلغاء الدعوة' : isFrench ? 'Annuler l\'invitation' : 'Cancel Invitation';
  String get sendInvitation =>
      isArabic ? 'إرسال دعوة' : isFrench ? 'Envoyer une invitation' : 'Send Invitation';
  String get invitationSent =>
      isArabic ? 'تم إرسال الدعوة بنجاح' : isFrench ? 'Invitation envoyée avec succès' : 'Invitation sent successfully';
  String get invitationCancelled =>
      isArabic ? 'تم إلغاء الدعوة بنجاح' : isFrench ? 'Invitation annulée avec succès' : 'Invitation cancelled successfully';
  String get staffStatusUpdated =>
      isArabic ? 'تم تحديث حالة العضو بنجاح' : isFrench ? 'Statut mis à jour avec succès' : 'Staff status updated successfully';
  String get permissionsUpdated =>
      isArabic ? 'تم تحديث الصلاحيات بنجاح' : isFrench ? 'Autorisations mises à jour' : 'Permissions updated successfully';
  String get doctorCreated =>
      isArabic ? 'تم إنشاء حساب الطبيب بنجاح' : isFrench ? 'Compte médecin créé avec succès' : 'Doctor account created successfully';
  String get assistantCreated =>
      isArabic ? 'تم إنشاء حساب المساعد بنجاح' : isFrench ? 'Compte assistant créé avec succès' : 'Assistant account created successfully';
  String get doctorDetached =>
      isArabic ? 'تم فصل الطبيب من العيادة بنجاح' : isFrench ? 'Médecin détaché avec succès' : 'Doctor detached successfully';
  String get assistantDeleted =>
      isArabic ? 'تم حذف المساعد من العيادة بنجاح' : isFrench ? 'Assistant supprimé avec succès' : 'Assistant removed successfully';
  String get confirmSuspendTitle =>
      isArabic ? 'تأكيد تعليق الحساب' : isFrench ? 'Confirmer la suspension' : 'Confirm Suspension';
  String get confirmSuspendMessage => isArabic
      ? 'هل أنت متأكد من تعليق هذا الحساب؟ لن يتمكن العضو من الوصول إلى هذه العيادة حتى إعادة التنشيط.'
      : isFrench
          ? 'Êtes-vous sûr de vouloir suspendre ce compte ? Le membre ne pourra plus accéder à cette clinique.'
          : 'Are you sure you want to suspend this account? The member will not be able to access this clinic until reactivated.';
  String get confirmActivateTitle =>
      isArabic ? 'تأكيد تنشيط الحساب' : isFrench ? 'Confirmer l\'activation' : 'Confirm Activation';
  String get confirmActivateMessage => isArabic
      ? 'هل أنت متأكد من إعادة تنشيط هذا الحساب؟'
      : isFrench
          ? 'Êtes-vous sûr de vouloir réactiver ce compte ?'
          : 'Are you sure you want to reactivate this account?';
  String get confirmDetachDoctorTitle =>
      isArabic ? 'تأكيد فصل الطبيب' : isFrench ? 'Confirmer le détachement' : 'Confirm Detach Doctor';
  String get confirmDetachDoctorMessage => isArabic
      ? 'هل أنت متأكد من فصل هذا الطبيب من العيادة؟ لن يؤثر هذا على حسابه الشخصي أو بياناته في عيادات أخرى.'
      : isFrench
          ? 'Êtes-vous sûr de vouloir détacher ce médecin de la clinique ? Cela n\'affectera pas son compte personnel.'
          : 'Are you sure you want to detach this doctor from the clinic? This will not affect their personal account or other clinics.';
  String get confirmDeleteAssistantTitle =>
      isArabic ? 'تأكيد حذف المساعد' : isFrench ? 'Confirmer la suppression' : 'Confirm Remove Assistant';
  String get confirmDeleteAssistantMessage => isArabic
      ? 'هل أنت متأكد من حذف هذا المساعد من العيادة؟ سيتم إلغاء وصوله نهائياً.'
      : isFrench
          ? 'Êtes-vous sûr de vouloir supprimer cet assistant de la clinique ? Son accès sera révoqué.'
          : 'Are you sure you want to remove this assistant from the clinic? Their access will be revoked.';
  String get confirmCancelInvitationTitle =>
      isArabic ? 'تأكيد إلغاء الدعوة' : isFrench ? 'Confirmer l\'annulation' : 'Confirm Cancel Invitation';
  String get confirmCancelInvitationMessage => isArabic
      ? 'هل أنت متأكد من إلغاء دعوة هذا الطبيب؟'
      : isFrench
          ? 'Êtes-vous sûr de vouloir annuler cette invitation ?'
          : 'Are you sure you want to cancel this invitation?';
  String get cannotModifySelfNotice => isArabic
      ? 'لا يمكنك تعليق أو فصل حسابك الخاص أو المدير الرئيسي للعيادة.'
      : isFrench
          ? 'Vous ne pouvez pas suspendre ou détacher votre propre compte ou le directeur principal.'
          : 'You cannot suspend or detach your own account or the clinic\'s primary director.';
  String get permManageQueueTitle =>
      isArabic ? 'إدارة قائمة الانتظار' : isFrench ? 'Gérer la file d\'attente' : 'Manage Queue';
  String get permManageQueueDesc => isArabic
      ? 'ترتيب ونداء المرضى وتحديث حالة الحضور'
      : isFrench
          ? 'Ordonner et appeler les patients dans la file'
          : 'Reorder and call patients in the queue';
  String get permConfirmAttendanceTitle =>
      isArabic ? 'تأكيد الحضور' : isFrench ? 'Confirmer la présence' : 'Confirm Attendance';
  String get permConfirmAttendanceDesc => isArabic
      ? 'تسجيل وصول المريض إلى العيادة'
      : isFrench
          ? 'Enregistrer l\'arrivée du patient à la clinique'
          : 'Register patient check-in at the clinic';
  String get permCreateBookingTitle =>
      isArabic ? 'إنشاء المواعيد' : isFrench ? 'Créer des rendez-vous' : 'Create Bookings';
  String get permCreateBookingDesc => isArabic
      ? 'حجز مواعيد جديدة للمرضى'
      : isFrench
          ? 'Réserver de nouveaux créneaux pour les patients'
          : 'Book new appointments for patients';
  String get permViewContactsTitle =>
      isArabic ? 'عرض بيانات الاتصال' : isFrench ? 'Voir les coordonnées' : 'View Patient Contacts';
  String get permViewContactsDesc => isArabic
      ? 'الاطلاع على أرقام هواتف وعناوين المرضى'
      : isFrench
          ? 'Consulter les téléphones et coordonnées des patients'
          : 'View patient phone numbers and contact details';
  String get permConfirmBookingTitle =>
      isArabic ? 'تأكيد المواعيد' : isFrench ? 'Confirmer les rendez-vous' : 'Confirm Appointments';
  String get permConfirmBookingDesc => isArabic
      ? 'تأكيد المواعيد المعلقة وخصم الحصة من رصيد العيادة'
      : isFrench
          ? 'Confirmer les rendez-vous en attente et déduire le quota'
          : 'Confirm pending medical appointments and consume quota';
  String get searchDoctorHint => isArabic
      ? 'ابحث بالاسم أو البريد أو الهاتف...'
      : isFrench
          ? 'Rechercher par nom, e-mail ou tél...'
          : 'Search by name, email, or phone...';
  String get noDoctorFound => isArabic
      ? 'لم يتم العثور على أطباء يطابقون البحث.'
      : isFrench
          ? 'Aucun médecin trouvé.'
          : 'No doctors found matching query.';
  String get alreadyEmployedBadge =>
      isArabic ? 'عضو بالعيادة' : isFrench ? 'Déjà membre' : 'Already Member';
  String get invitationPendingBadge =>
      isArabic ? 'دعوة معلقة' : isFrench ? 'Invitation envoyée' : 'Invited';
  String get joinedAtLabel =>
      isArabic ? 'تاريخ الانضمام' : isFrench ? 'Rejoint le' : 'Joined';
  String get noStaffFound =>
      isArabic ? 'لا يوجد أعضاء مسجلين.' : isFrench ? 'Aucun membre enregistré.' : 'No staff members registered.';
  String get noPendingInvitations =>
      isArabic ? 'لا توجد دعوات معلقة.' : isFrench ? 'Aucune invitation en attente.' : 'No pending invitations.';
  String get directorAccessOnly => isArabic
      ? 'هذه الميزة متاحة فقط لمدير العيادة.'
      : isFrench
          ? 'Cette fonctionnalité est réservée au directeur de la clinique.'
          : 'This feature is only accessible to the clinic director.';
  String get invitedOnLabel =>
      isArabic ? 'تاريخ الدعوة' : isFrench ? 'Invité le' : 'Invited on';
  String get staffMemberDetails =>
      isArabic ? 'تفاصيل العضو' : isFrench ? 'Détails du membre' : 'Staff Member Details';
  String get savePermissions =>
      isArabic ? 'حفظ الصلاحيات' : isFrench ? 'Enregistrer les autorisations' : 'Save Permissions';

  // Assistant Operational Flow (TASK-05-01)
  String get assistantQueueTab =>
      isArabic ? 'طابور الانتظار' : isFrench ? "File d'attente" : 'Live Queue';
  String get assistantCheckInTab =>
      isArabic ? 'تسجيل الحضور' : isFrench ? 'Enregistrement' : 'Check-In';
  String get assistantPatientsTab =>
      isArabic ? 'بحث المرضى' : isFrench ? 'Recherche patients' : 'Patient Search';
  String get checkInCodePrompt => isArabic
      ? 'أدخل رمز تسجيل الحضور المكون من 64 حرفاً أو امسح رمز QR الموعد'
      : isFrench
          ? 'Entrez le code de présence ou scannez le QR code du rendez-vous'
          : 'Enter the 64-character appointment check-in token or scan QR code';
  String get checkInTokenLabel =>
      isArabic ? 'رمز حضور الموعد' : isFrench ? 'Code de présence' : 'Check-In Token';
  String get checkInTokenHint =>
      isArabic ? 'أدخل رمز الموعد...' : isFrench ? 'Saisir le code...' : 'Enter token...';
  String get submitCheckIn =>
      isArabic ? 'تأكيد الحضور الآن' : isFrench ? "Confirmer l'arrivée" : 'Confirm Check-In';
  String get checkInSuccess => isArabic
      ? 'تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.'
      : isFrench
          ? 'Arrivée confirmée avec succès et patient placé en salle d’attente.'
          : 'Patient check-in confirmed and moved to waiting room.';
  String get invalidTokenPrompt => isArabic
      ? 'يرجى إدخال رمز حضور صالح للموعد.'
      : isFrench
          ? 'Veuillez saisir un code de présence valide.'
          : 'Please enter a valid check-in token.';
  String get searchPatientsPrompt => isArabic
      ? 'ابحث بالاسم، رقم الملف الطبي (MRN)، أو الهاتف...'
      : isFrench
          ? 'Rechercher par nom, IPP ou tél...'
          : 'Search by name, MRN, or phone...';
  String get noPatientsFound => isArabic
      ? 'لم يتم العثور على أي مريض مسجل يطابق البحث.'
      : isFrench
          ? 'Aucun patient trouvé.'
          : 'No registered patients found matching query.';
  String get patientMrnLabel =>
      isArabic ? 'رقم الملف الطبي (MRN)' : isFrench ? 'Numéro IPP' : 'MRN';
  String get patientPhoneLabel =>
      isArabic ? 'الهاتف' : isFrench ? 'Téléphone' : 'Phone';
  String get quickCheckInAction =>
      isArabic ? 'تسجيل حضور سريع' : isFrench ? 'Enregistrement rapide' : 'Quick Check-In';
  String get scanQrAction =>
      isArabic ? 'مسح رمز QR' : isFrench ? 'Scanner QR' : 'Scan QR';

  // In-Clinic Appointment Booking Flow (TASK-05-02)
  String get assistantNewBookingAction =>
      isArabic ? 'حجز موعد جديد' : isFrench ? 'Nouveau rendez-vous' : 'New Booking';
  String get newBookingAction => assistantNewBookingAction;
  String get assistantBookingTitle => isArabic
      ? 'حجز موعد جديد في العيادة'
      : isFrench
          ? 'Nouveau rendez-vous en clinique'
          : 'New Clinic Booking';
  String get bookReturnVisitAction => isArabic
      ? 'حجز موعد عودة'
      : isFrench
          ? 'Rendez-vous de retour'
          : 'Book Return Visit';
  String get selectDoctorLabel => isArabic
      ? 'اختر الطبيب المعالج'
      : isFrench
          ? 'Sélectionner le médecin'
          : 'Select Treating Doctor';
  String get noDoctorsAvailable => isArabic
      ? 'لا يوجد أطباء متاحون حالياً في هذه العيادة.'
      : isFrench
          ? 'Aucun médecin disponible dans cette clinique.'
          : 'No doctors currently available in this clinic.';
  String get selectDateLabel => isArabic
      ? 'تاريخ الموعد'
      : isFrench
          ? 'Date du rendez-vous'
          : 'Appointment Date';
  String get selectTimeSlotLabel => isArabic
      ? 'الفترة الزمنية المتاحة'
      : isFrench
          ? 'Créneau horaire disponible'
          : 'Available Time Slot';
  String get loadingSlotsPrompt => isArabic
      ? 'جارٍ تحميل الفترات المتاحة...'
      : isFrench
          ? 'Chargement des créneaux...'
          : 'Loading available slots...';
  String get noSlotsAvailable => isArabic
      ? 'لا توجد فترات حجز متاحة لهذا التاريخ.'
      : isFrench
          ? 'Aucun créneau disponible pour cette date.'
          : 'No available booking slots for this date.';
  String slotCapacityAvailable(int available, int total) => isArabic
      ? 'متاح: $available من $total'
      : isFrench
          ? '$available sur $total disponible'
          : '$available of $total available';
  String get slotFullBadge =>
      isArabic ? 'مكتمل' : isFrench ? 'Complet' : 'Full';
  String get patientNameRequired => isArabic
      ? 'يرجى إدخال اسم المريض'
      : isFrench
          ? 'Veuillez saisir le nom du patient'
          : 'Please enter patient name';
  String get patientPhoneRequired => isArabic
      ? 'يرجى إدخال رقم هاتف المريض'
      : isFrench
          ? 'Veuillez saisir le numéro de téléphone'
          : 'Please enter patient phone number';
  String get patientPhoneInvalid => isArabic
      ? 'يرجى إدخال رقم هاتف صالح'
      : isFrench
          ? 'Numéro de téléphone invalide'
          : 'Please enter a valid phone number';
  String get bookingNotesLabel => isArabic
      ? 'ملاحظات الحجز (اختياري)'
      : isFrench
          ? 'Notes de réservation (optionnel)'
          : 'Booking notes (optional)';
  String get bookingNotesHint => isArabic
      ? 'أدخل أي ملاحظات خاصة بالزيارة...'
      : isFrench
          ? 'Notes particulières...'
          : 'Enter any visit notes...';
  String get confirmBookingButton => isArabic
      ? 'تأكيد حجز الموعد'
      : isFrench
          ? 'Confirmer la réservation'
          : 'Confirm Appointment Booking';
  String get bookingInProgress => isArabic
      ? 'جارٍ إنشاء الحجز...'
      : isFrench
          ? 'Création en cours...'
          : 'Creating booking...';
  String get bookingSuccessTitle => isArabic
      ? 'تم إنشاء حجز الموعد بنجاح'
      : isFrench
          ? 'Rendez-vous créé avec succès'
          : 'Appointment Booked Successfully';
  String get bookingSuccessMessage => isArabic
      ? 'تم تسجيل الموعد في جدول العيادة بنجاح.'
      : isFrench
          ? 'Le rendez-vous a été enregistré avec succès.'
          : 'The appointment was successfully scheduled.';
  String get bookingReferenceLabel => isArabic
      ? 'الرقم المرجعي للموعد'
      : isFrench
          ? 'Référence de réservation'
          : 'Booking Reference';
  String get backToQueueAction => isArabic
      ? 'العودة إلى قائمة الانتظار'
      : isFrench
          ? "Retour à la file d'attente"
          : 'Back to Queue';
  String get bookAnotherAction => isArabic
      ? 'حجز موعد آخر'
      : isFrench
          ? 'Réserver un autre rendez-vous'
          : 'Book Another Appointment';
  String get slotAlreadyFullError => isArabic
      ? 'عذراً، امتلأت السعة القصوى لهذه الفترة الزمنية للتو. يرجى اختيار فترة أخرى.'
      : isFrench
          ? 'Ce créneau vient d’être rempli. Veuillez en choisir un autre.'
          : 'Sorry, this time slot has just reached full capacity. Please select another slot.';
  String get duplicateBookingError => isArabic
      ? 'المريض لديه حجز نشط بالفعل في نفس الفترة الزمنية مع هذا الطبيب.'
      : isFrench
          ? 'Ce patient a déjà un rendez-vous actif sur ce créneau.'
          : 'The patient already has an active appointment in this time slot with this doctor.';
  String get walkInPatientBadge => isArabic
      ? 'مريض قادم مباشرة'
      : isFrench
          ? 'Patient sans rendez-vous'
          : 'Walk-in Patient';
  String get returnVisitPatientBadge => isArabic
      ? 'زيارة عودة'
      : isFrench
          ? 'Visite de contrôle'
          : 'Return Visit';

  // Assistant Appointment Confirmation & Triage (TASK-05-04)
  String get confirmAppointmentTitle => isArabic
      ? 'تأكيد الموعد الطبي'
      : isFrench
          ? 'Confirmer le rendez-vous médical'
          : 'Confirm Medical Appointment';
  String get confirmAppointmentPrompt => isArabic
      ? 'هل أنت متأكد من تأكيد هذا الموعد الطبي وخصم الحصة من رصيد العيادة؟'
      : isFrench
          ? 'Êtes-vous sûr de vouloir confirmer ce rendez-vous médical et déduire le quota ?'
          : 'Are you sure you want to confirm this medical appointment and consume quota?';
  String get confirmAppointmentAction => isArabic
      ? 'تأكيد الموعد'
      : isFrench
          ? 'Confirmer le rendez-vous'
          : 'Confirm Appointment';
  String get appointmentConfirmedSuccess => isArabic
      ? 'تم تأكيد الموعد بنجاح.'
      : isFrench
          ? 'Rendez-vous confirmé avec succès.'
          : 'Appointment confirmed successfully.';
  String get pendingConfirmationTab => isArabic
      ? 'بانتظار التأكيد'
      : isFrench
          ? 'En attente'
          : 'Pending Confirmation';
  String get emptyPendingQueue => isArabic
      ? 'لا توجد مواعيد معلقة بانتظار التأكيد.'
      : isFrench
          ? 'Aucun rendez-vous en attente de confirmation.'
          : 'No appointments pending confirmation.';
  String get queueUnauthorizedMessage => isArabic
      ? 'غير مصرح لك باستعراض قائمة مواعيد العيادة. يرجى مراجعة مدير العيادة.'
      : isFrench
          ? 'Vous n\'êtes pas autorisé à consulter la file d\'attente. Contactez le directeur.'
          : 'You are not authorized to manage or view the clinic queue. Please contact the clinic director.';

  // Date & Doctor Filtering
  String get filterAllDoctors => isArabic
      ? 'جميع الأطباء'
      : isFrench
          ? 'Tous les médecins'
          : 'All Doctors';
  String get filterAllDates => isArabic
      ? 'جميع التواريخ'
      : isFrench
          ? 'Toutes les dates'
          : 'All Dates';
  String get filterToday => isArabic
      ? 'اليوم'
      : isFrench
          ? 'Aujourd’hui'
          : 'Today';
  String get filterSpecificDate => isArabic
      ? 'تاريخ محدد'
      : isFrench
          ? 'Date précise'
          : 'Specific Date';
  String get filterDateRange => isArabic
      ? 'نطاق زمني'
      : isFrench
          ? 'Plage de dates'
          : 'Date Range';
  String get selectDatePrompt => isArabic
      ? 'اختر التاريخ'
      : isFrench
          ? 'Choisir la date'
          : 'Select Date';
  String get selectDateRangePrompt => isArabic
      ? 'اختر نطاق التاريخ'
      : isFrench
          ? 'Choisir la plage'
          : 'Select Date Range';
  String get fromDateLabel => isArabic
      ? 'من'
      : isFrench
          ? 'Du'
          : 'From';
  String get toDateLabel => isArabic
      ? 'إلى'
      : isFrench
          ? 'Au'
          : 'To';
  String get doctorFilterLabel => isArabic
      ? 'الطبيب'
      : isFrench
          ? 'Médecin'
          : 'Doctor';
  String get dateFilterLabel => isArabic
      ? 'التاريخ'
      : isFrench
          ? 'Date'
          : 'Date';

  // =========================================================================
  // Clinic Director Doctor Statistics (TASK-CLINIC-DIRECTOR-PARITY-FLUTTER)
  // =========================================================================
  String get clinicDoctorStatsTitle => isArabic
      ? 'إحصائيات أطباء العيادة'
      : isFrench
          ? 'Statistiques des Médecins'
          : 'Doctor Statistics';

  String get clinicDoctorStatsSubtitle => isArabic
      ? 'متابعة أداء الأطباء والمواعيد الطبية للعيادة الحالية'
      : isFrench
          ? 'Suivez les performances des médecins et le flux des rendez-vous pour la clinique active'
          : 'Monitor doctor performance and appointment flow for the active clinic';

  String get activeClinicBadge => isArabic
      ? 'العيادة النشطة'
      : isFrench
          ? 'Clinique active'
          : 'Active Clinic';

  String get refreshStats => isArabic
      ? 'تحديث البيانات'
      : isFrench
          ? 'Actualiser les données'
          : 'Refresh Data';

  String get allDoctorsOption => isArabic
      ? 'جميع الأطباء'
      : isFrench
          ? 'Tous les médecins'
          : 'All Doctors';

  String get filterDateModeLabel => isArabic
      ? 'نطاق التاريخ'
      : isFrench
          ? 'Période'
          : 'Date Filter';

  String get filterDoctorLabel => doctorFilterLabel;

  String get invalidDateRangeError => isArabic
      ? 'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية'
      : isFrench
          ? 'La date de début doit être antérieure ou égale à la date de fin'
          : 'Start date must be before or equal to end date';

  String get viewingDoctorStats => isArabic
      ? 'عرض إحصائيات الطبيب المحدد'
      : isFrench
          ? 'Affichage des statistiques du médecin sélectionné'
          : 'Viewing Selected Doctor Statistics';

  String get clearDoctorFilter => isArabic
      ? 'إلغاء التصفية'
      : isFrench
          ? 'Effacer le filtre'
          : 'Clear Filter';

  String get primaryKpisSection => isArabic
      ? 'المؤشرات الرئيسية'
      : isFrench
          ? 'Indicateurs principaux'
          : 'Primary KPIs';

  String get secondaryKpisSection => isArabic
      ? 'حالات المواعيد'
      : isFrench
          ? 'Statuts des rendez-vous'
          : 'Appointment Statuses';

  String get doctorBreakdownSection => isArabic
      ? 'أداء الأطباء'
      : isFrench
          ? 'Performances des médecins de la clinique'
          : 'Clinic Doctors Performance';

  String get totalAppointmentsLabel => isArabic
      ? 'إجمالي المواعيد'
      : isFrench
          ? 'Total des rendez-vous'
          : 'Total Appointments';

  String get completedAppointmentsLabel => isArabic
      ? 'المكتملة'
      : isFrench
          ? 'Terminés'
          : 'Completed';

  String get walkInVisitsLabel => isArabic
      ? 'الزيارات المباشرة'
      : isFrench
          ? 'Visites directes (Sans RDV)'
          : 'Walk-in Visits';

  String get noShowLabel => isArabic
      ? 'لم يحضر'
      : isFrench
          ? 'Non présentés'
          : 'No-Show';

  String get cancelledLabel => isArabic
      ? 'الملغاة'
      : isFrench
          ? 'Annulés'
          : 'Cancelled';

  String get rescheduledLabel => isArabic
      ? 'المعاد جدولتها'
      : isFrench
          ? 'Reportés'
          : 'Rescheduled';

  String get rejectedLabel => isArabic
      ? 'المرفوضة'
      : isFrench
          ? 'Refusés'
          : 'Rejected';

  String get expiredLabel => isArabic
      ? 'المنتهية'
      : isFrench
          ? 'Expirés'
          : 'Expired';

  String get doctorCountBadge => isArabic
      ? 'طبيب'
      : isFrench
          ? 'médecin(s)'
          : 'doctor(s)';

  String get doctorNameLabel => isArabic
      ? 'الطبيب'
      : isFrench
          ? 'Médecin'
          : 'Doctor';

  String get positionLabel => isArabic
      ? 'الصفة'
      : isFrench
          ? 'Rôle'
          : 'Position';

  String get viewDoctorStatsButton => isArabic
      ? 'عرض إحصائيات الطبيب'
      : isFrench
          ? 'Voir les statistiques'
          : 'View Doctor Stats';

  String get directorPositionBadge => isArabic
      ? 'مدير'
      : isFrench
          ? 'Directeur'
          : 'Director';

  String get doctorStaffPositionBadge => isArabic
      ? 'طبيب ممارس'
      : isFrench
          ? 'Médecin'
          : 'Doctor';

  String get zeroStatsTitle => isArabic
      ? 'لا توجد مواعيد أو زيارات في هذه الفترة'
      : isFrench
          ? 'Aucun rendez-vous ou visite pour cette période'
          : 'No appointments or visits in this period';

  String get zeroStatsMessage => isArabic
      ? 'لم تسجل العيادة أي نشاط ضمن المعايير المحددة. جرب اختيار تاريخ آخر أو تغيير الطبيب.'
      : isFrench
          ? "Aucune activité enregistrée pour les critères sélectionnés. Essayez de sélectionner une autre date ou de changer de médecin."
          : 'No activity recorded for the selected criteria. Try selecting another date or changing the doctor filter.';

  String get forbiddenStatsError => isArabic
      ? 'غير مصرح لك بالوصول إلى إحصائيات هذه العيادة.'
      : isFrench
          ? "Vous n'êtes pas autorisé à accéder aux statistiques de cette clinique."
          : 'You are not authorized to view statistics for this clinic.';

  String get invalidParamsStatsError => isArabic
      ? 'معايير البحث غير صالحة. يرجى التحقق من التاريخ المختار.'
      : isFrench
          ? 'Paramètres de recherche non valides. Veuillez vérifier les dates sélectionnées.'
          : 'Invalid search parameters. Please verify the selected dates.';

  String get generalStatsError => isArabic
      ? 'تعذر تحميل إحصائيات العيادة'
      : isFrench
          ? 'Impossible de charger les statistiques de la clinique'
          : 'Failed to load clinic statistics';

  String get unauthorizedClinicStatsMessage => isArabic
      ? 'عرض إحصائيات الأطباء متاح حصراً للمدير الطبي للعيادة أو من يمتلك صلاحية التحليلات.'
      : isFrench
          ? "L'accès aux statistiques des médecins est réservé au directeur médical de la clinique ou aux utilisateurs autorisés."
          : 'Access to doctor statistics is restricted to the clinic medical director or users with analytics permissions.';

  String get backToDashboard => isArabic
      ? 'العودة إلى لوحة التحكم'
      : isFrench
          ? 'Retour au tableau de bord'
          : 'Back to Dashboard';

  // Booking Center Quota & Packages (TASK-05-03)
  String get availablePackages => isArabic
      ? 'الباقات المتاحة'
      : isFrench
          ? 'Forfaits disponibles'
          : 'Available Packages';

  String get purchaseRequest => isArabic
      ? 'طلب شراء باقة'
      : isFrench
          ? "Demande d'achat"
          : 'Purchase Request';

  String get paymentMethod => isArabic
      ? 'طريقة الدفع'
      : isFrench
          ? 'Mode de paiement'
          : 'Payment Method';

  String get baridimob => isArabic
      ? 'بريدي موب'
      : isFrench
          ? 'BaridiMob'
          : 'BaridiMob';

  String get bankTransfer => isArabic
      ? 'تحويل بنكي'
      : isFrench
          ? 'Virement bancaire'
          : 'Bank Transfer';

  String get transactionReference => isArabic
      ? 'رقم مرجع التحويل'
      : isFrench
          ? 'Référence de transaction'
          : 'Transaction Reference';

  String get requestPending => isArabic
      ? 'قيد المراجعة'
      : isFrench
          ? 'En attente'
          : 'Pending Review';

  String get requestApproved => isArabic
      ? 'معتمد'
      : isFrench
          ? 'Approuvé'
          : 'Approved';

  String get requestRejected => isArabic
      ? 'مرفوض'
      : isFrench
          ? 'Rejeté'
          : 'Rejected';

  String get transactionsLedger => isArabic
      ? 'سجل العمليات والحصص'
      : isFrench
          ? 'Historique des quotas'
          : 'Quota Transaction Ledger';

  String get currencyDzd => isArabic
      ? 'د.ج'
      : isFrench
          ? 'DA'
          : 'DZD';

  String get requestSubmittedSuccess => isArabic
      ? 'تم تقديم طلب شراء الباقة بنجاح وهو قيد المراجعة.'
      : isFrench
          ? "Demande d'achat soumise avec succès et en attente de révision."
          : 'Purchase request submitted successfully and is pending review.';

  String get rechargeQuotaPrompt => isArabic
      ? 'يرجى شحن رصيد الحصص لمواصلة تأكيد المواعيد.'
      : isFrench
          ? 'Veuillez recharger votre solde de quotas pour continuer à confirmer les rendez-vous.'
          : 'Please recharge your quota balance to continue confirming appointments.';

  String get zeroQuotaWarning => isArabic
      ? 'الرصيد الحالي 0 — لا يمكن تأكيد حجوزات جديدة دون شحن باقة.'
      : isFrench
          ? "Solde actuel 0 — impossible de confirmer de nouveaux rendez-vous sans recharger."
          : 'Current balance is 0 — new bookings cannot be confirmed without a quota recharge.';

  String get purchaseHistoryTitle => isArabic
      ? 'سجل طلبات الشراء'
      : isFrench
          ? "Historique des demandes d'achat"
          : 'Purchase Requests History';

  String get noPackagesFound => isArabic
      ? 'لا توجد باقات متاحة حالياً.'
      : isFrench
          ? 'Aucun forfait disponible pour le moment.'
          : 'No booking packages currently available.';

  String get noPurchaseRequestsFound => isArabic
      ? 'لا توجد طلبات شراء سابقة.'
      : isFrench
          ? "Aucune demande d'achat enregistrée."
          : 'No purchase requests recorded.';

  String get noTransactionsFound => isArabic
      ? 'لا توجد عمليات مسجلة في السجل المالي.'
      : isFrench
          ? 'Aucune transaction enregistrée.'
          : 'No transactions recorded in the ledger.';

  String get optionalNotes => isArabic
      ? 'ملاحظات إضافية (اختياري)'
      : isFrench
          ? 'Notes supplémentaires (facultatif)'
          : 'Additional notes (optional)';

  String get submitPurchaseRequest => isArabic
      ? 'إرسال طلب الشراء'
      : isFrench
          ? "Envoyer la demande d'achat"
          : 'Submit Purchase Request';

  String get transactionTypePurchase => isArabic
      ? 'شراء باقة (+)'
      : isFrench
          ? 'Achat de forfait (+)'
          : 'Package Purchase (+)';

  String get transactionTypeConfirmation => isArabic
      ? 'تأكيد موعد (-)'
      : isFrench
          ? 'Confirmation RDV (-)'
          : 'Appointment Confirmation (-)';

  String get transactionTypeRefund => isArabic
      ? 'استرداد حصة (+)'
      : isFrench
          ? 'Remboursement quota (+)'
          : 'Quota Refund (+)';

  String get balanceAfterLabel => isArabic
      ? 'الرصيد بعد العملية'
      : isFrench
          ? 'Solde après opération'
          : 'Balance After';

  String get unitsLabel => isArabic
      ? 'الحصص'
      : isFrench
          ? 'Unités'
          : 'Units';

  // --- TASK-05-04: Booking Center Operational Booking Flow ---

  String get appointmentsHistoryAction => isArabic
      ? 'سجل مواعيد المركز'
      : isFrench
          ? 'Historique des rendez-vous'
          : 'Appointments History';

  String get patientStepTitle => isArabic
      ? 'بيانات المريض'
      : isFrench
          ? 'Informations du patient'
          : 'Patient Information';

  String get doctorClinicStepTitle => isArabic
      ? 'اختيار الطبيب والعيادة'
      : isFrench
          ? 'Médecin & Clinique'
          : 'Doctor & Clinic';

  String get dateTimeStepTitle => isArabic
      ? 'التاريخ والموعد'
      : isFrench
          ? 'Date & Créneau'
          : 'Date & Time Slot';

  String get reviewStepTitle => isArabic
      ? 'مراجعة وتأكيد'
      : isFrench
          ? 'Vérification & Confirmation'
          : 'Review & Confirm';

  String get nextStepAction => isArabic
      ? 'المتابعة'
      : isFrench
          ? 'Continuer'
          : 'Continue';

  String get previousStepAction => isArabic
      ? 'السابق'
      : isFrench
          ? 'Précédent'
          : 'Back';

  String get registeredPatientTab => isArabic
      ? 'مريض مسجل'
      : isFrench
          ? 'Patient enregistré'
          : 'Registered Patient';

  String get guestPatientTab => isArabic
      ? 'مريض زائر / جديد'
      : isFrench
          ? 'Patient visiteur'
          : 'Guest / Walk-in Patient';

  String get searchPatientPlaceholder => isArabic
      ? 'ابحث بالاسم، رقم الملف MRN، أو الهاتف...'
      : isFrench
          ? 'Rechercher par nom, MRN ou téléphone...'
          : 'Search by name, MRN, or phone...';

  String get selectedPatientLabel => isArabic
      ? 'المريض المحدد'
      : isFrench
          ? 'Patient sélectionné'
          : 'Selected Patient';

  String get changePatientAction => isArabic
      ? 'تغيير المريض'
      : isFrench
          ? 'Changer de patient'
          : 'Change Patient';

  String get searchPatientMinChars => isArabic
      ? 'يرجى كتابة حرفين على الأقل للبحث.'
      : isFrench
          ? 'Veuillez saisir au moins 2 caractères.'
          : 'Please enter at least 2 characters to search.';

  String get searchDoctorPlaceholder => isArabic
      ? 'ابحث باسم الطبيب أو التخصص...'
      : isFrench
          ? 'Rechercher un médecin ou spécialité...'
          : 'Search doctor name or specialty...';

  String get selectClinicPrompt => isArabic
      ? 'اختر العيادة:'
      : isFrench
          ? 'Sélectionnez la clinique :'
          : 'Select Clinic:';

  String get doctorVerified => isArabic
      ? 'طبيب معتمد'
      : isFrench
          ? 'Médecin vérifié'
          : 'Verified Doctor';

  String get selectSlotPrompt => isArabic
      ? 'اختر الفترة الزمنية المتاحة'
      : isFrench
          ? 'Sélectionnez un créneau horaire'
          : 'Select Available Time Slot';

  String get noSlotsForDate => isArabic
      ? 'لا توجد فترات متاحة في هذا التاريخ.'
      : isFrench
          ? 'Aucun créneau disponible à cette date.'
          : 'No slots available for this date.';

  String get bookingNoticeTitle => isArabic
      ? 'تنبيه هام حول خصم الحصص'
      : isFrench
          ? 'Rappel important sur les quotas'
          : 'Important Quota Notice';

  String get bookingNoticeBody => isArabic
      ? 'يتم إنشاء الموعد بحالة "معلق" ولن يتم خصم أي حصة من رصيد المركز في هذه المرحلة. يتم خصم الحصة (1 وحدة) حصراً عند قيام العيادة أو الطبيب بتأكيد الموعد رسمياً.'
      : isFrench
          ? 'Le rendez-vous sera créé avec le statut "En attente" sans déduction de quota. L\'unité de quota (1 unité) ne sera déduite que lors de la confirmation officielle par la clinique.'
          : 'The appointment is created with "Pending" status and zero quota is deducted. 1 quota unit is strictly deducted upon official clinic confirmation.';

  String get confirmAndBookAction => isArabic
      ? 'تأكيد وإنشاء الموعد'
      : isFrench
          ? 'Confirmer et réserver'
          : 'Confirm & Create Booking';

  String get bookingTicketTitle => isArabic
      ? 'تذكرة الحجز'
      : isFrench
          ? 'Ticket de rendez-vous'
          : 'Booking Ticket';

  String get secureTokenLabel => isArabic
      ? 'رمز تسجيل الحضور (Token)'
      : isFrench
          ? 'Jeton de présence (Token)'
          : 'Check-in Token';

  String get copyReferenceSuccess => isArabic
      ? 'تم نسخ رقم المرجع إلى الحافظة'
      : isFrench
          ? 'Référence copiée dans le presse-papier'
          : 'Booking reference copied to clipboard';

  String get viewAppointmentsListAction => isArabic
      ? 'عرض سجل الحجوزات'
      : isFrench
          ? 'Historique des rendez-vous'
          : 'View Appointments History';

  String get centerAppointmentsTitle => isArabic
      ? 'سجل مواعيد المركز'
      : isFrench
          ? 'Rendez-vous du centre'
          : 'Center Appointments';

  String get noAppointmentsFound => isArabic
      ? 'لا توجد مواعيد مسجلة في هذا القسم.'
      : isFrench
          ? 'Aucun rendez-vous trouvé.'
          : 'No appointments found.';

  String get cancelAppointmentTitle => isArabic
      ? 'إلغاء الموعد الطبي'
      : isFrench
          ? 'Annuler le rendez-vous'
          : 'Cancel Appointment';

  String get cancelAppointmentConfirmPrompt => isArabic
      ? 'هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟'
      : isFrench
          ? 'Êtes-vous sûr de vouloir annuler ce rendez-vous ?'
          : 'Are you sure you want to cancel this appointment?';

  String get cancellationReasonPrompt => isArabic
      ? 'سبب الإلغاء (اختياري)'
      : isFrench
          ? 'Motif d\'annulation (facultatif)'
          : 'Cancellation Reason (optional)';

  String get confirmCancelAction => isArabic
      ? 'تأكيد الإلغاء'
      : isFrench
          ? 'Confirmer l\'annulation'
          : 'Confirm Cancellation';

  String get cancelSuccessMessage => isArabic
      ? 'تم إلغاء الموعد بنجاح وتحديث الرصيد إن كان مؤكداً.'
      : isFrench
          ? 'Rendez-vous annulé avec succès.'
          : 'Appointment cancelled successfully.';

  String get rescheduleAppointmentTitle => isArabic
      ? 'إعادة جدولة الموعد'
      : isFrench
          ? 'Reporter le rendez-vous'
          : 'Reschedule Appointment';

  String get rescheduleSuccessMessage => isArabic
      ? 'تمت إعادة جدولة الموعد بنجاح.'
      : isFrench
          ? 'Rendez-vous reprogrammé avec succès.'
          : 'Appointment rescheduled successfully.';

  String get confirmRescheduleAction => isArabic
      ? 'تأكيد الموعد الجديد'
      : isFrench
          ? 'Confirmer la nouvelle date'
          : 'Confirm New Date';

  String get insufficientQuotaBookingError => isArabic
      ? 'رصيد الحصص غير كافٍ (0). يرجى شحن باقة حجز جديدة لتتمكن من إنشاء الحجوزات.'
      : isFrench
          ? 'Solde de quotas insuffisant. Veuillez recharger votre compte.'
          : 'Insufficient quota balance. Please recharge your booking quota.';
}


/// Minimal LocalizationsDelegate for LocalizedStrings.
class AafiyaLocalizationsDelegate extends LocalizationsDelegate<LocalizedStrings> {
  const AafiyaLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['ar', 'en', 'fr'].contains(locale.languageCode);

  @override
  Future<LocalizedStrings> load(Locale locale) => SynchronousFuture<LocalizedStrings>(LocalizedStrings(locale));

  @override
  bool shouldReload(AafiyaLocalizationsDelegate old) => false;
}
