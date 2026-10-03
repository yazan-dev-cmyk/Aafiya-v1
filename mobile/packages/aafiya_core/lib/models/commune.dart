/// Strongly typed Mobile model for authoritative Commune master data.
/// Mapped from `GET /api/v1/master/wilayas/{wilaya}/communes`.
class Commune {
  const Commune({
    required this.code,
    required this.wilayaCode,
    required this.nameAr,
    required this.nameFr,
    required this.nameEn,
    this.postalCode,
    this.isActive = true,
    this.displayOrder = 0,
  });

  /// Official ONS Commune code.
  final String code;

  /// 2-digit Wilaya code to which this commune belongs.
  final String wilayaCode;

  /// Authoritative Arabic name.
  final String nameAr;

  /// Authoritative French name.
  final String nameFr;

  /// Authoritative English name.
  final String nameEn;

  /// Nullable official postal code.
  final String? postalCode;

  /// Whether the Commune is currently active.
  final bool isActive;

  /// Numerical sort ordering.
  final int displayOrder;

  factory Commune.fromJson(Map<String, dynamic> json) {
    return Commune(
      code: (json['code'] ?? '').toString(),
      wilayaCode: (json['wilaya_code'] ?? '').toString(),
      nameAr: (json['name_ar'] ?? '').toString(),
      nameFr: (json['name_fr'] ?? '').toString(),
      nameEn: (json['name_en'] ?? '').toString(),
      postalCode: json['postal_code']?.toString(),
      isActive: json['is_active'] as bool? ?? true,
      displayOrder: (json['display_order'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'wilaya_code': wilayaCode,
      'name_ar': nameAr,
      'name_fr': nameFr,
      'name_en': nameEn,
      if (postalCode != null) 'postal_code': postalCode,
      'is_active': isActive,
      'display_order': displayOrder,
    };
  }

  /// Returns the localized name based on language code (`ar`, `fr`, `en`).
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
    return other is Commune && other.code == code;
  }

  @override
  int get hashCode => code.hashCode;

  @override
  String toString() => 'Commune($code: $nameAr / $nameFr)';
}
