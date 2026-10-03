/// Strongly typed Mobile model for authoritative Medical Specialty master data.
/// Mapped from canonical `GET /api/v1/master/specialties`.
class MedicalSpecialty {
  const MedicalSpecialty({
    required this.id,
    required this.code,
    required this.nameAr,
    required this.nameFr,
    required this.nameEn,
    this.isActive = true,
    this.displayOrder = 0,
  });

  /// Canonical integer identifier from the database.
  final int id;

  /// Unique alphanumeric specialty code (e.g. `GP`, `CARD`, `PED`).
  final String code;

  /// Authoritative Arabic name.
  final String nameAr;

  /// Authoritative French name.
  final String nameFr;

  /// Authoritative English name.
  final String nameEn;

  /// Whether the specialty is currently active in the clinical catalog.
  final bool isActive;

  /// Numerical sort ordering.
  final int displayOrder;

  factory MedicalSpecialty.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final parsedId = rawId is num
        ? rawId.toInt()
        : int.tryParse(rawId?.toString() ?? '') ?? 0;

    final rawOrder = json['display_order'];
    final parsedOrder = rawOrder is num
        ? rawOrder.toInt()
        : int.tryParse(rawOrder?.toString() ?? '') ?? 0;

    return MedicalSpecialty(
      id: parsedId,
      code: (json['code'] ?? '').toString(),
      nameAr: (json['name_ar'] ?? '').toString(),
      nameFr: (json['name_fr'] ?? '').toString(),
      nameEn: (json['name_en'] ?? '').toString(),
      isActive: json['is_active'] as bool? ?? true,
      displayOrder: parsedOrder,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name_ar': nameAr,
      'name_fr': nameFr,
      'name_en': nameEn,
      'is_active': isActive,
      'display_order': displayOrder,
    };
  }

  /// Returns the localized name based on language code (`ar`, `fr`, `en`).
  /// Fallback order ensures non-empty return value if canonical translation is present.
  String localizedName(String languageCode) {
    switch (languageCode.toLowerCase()) {
      case 'ar':
        return nameAr.isNotEmpty ? nameAr : (nameFr.isNotEmpty ? nameFr : nameEn);
      case 'fr':
        return nameFr.isNotEmpty ? nameFr : (nameAr.isNotEmpty ? nameAr : nameEn);
      case 'en':
      default:
        return nameEn.isNotEmpty ? nameEn : (nameFr.isNotEmpty ? nameFr : nameAr);
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MedicalSpecialty && other.id == id && other.code == code;
  }

  @override
  int get hashCode => Object.hash(id, code);

  @override
  String toString() => 'MedicalSpecialty(id: $id, code: $code: $nameAr / $nameFr)';
}
