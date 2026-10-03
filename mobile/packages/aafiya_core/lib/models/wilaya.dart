/// Strongly typed Mobile model for authoritative Wilaya master data.
/// Mapped from `GET /api/v1/master/wilayas`.
class Wilaya {
  const Wilaya({
    this.id,
    required this.code,
    required this.nameAr,
    required this.nameFr,
    required this.nameEn,
    this.isActive = true,
    this.displayOrder = 0,
  });

  /// Canonical database integer identifier if present.
  final int? id;

  /// Official 2-digit zero-padded Wilaya code (`01` through `69`).
  final String code;

  /// Authoritative Arabic name.
  final String nameAr;

  /// Authoritative French name.
  final String nameFr;

  /// Authoritative English name.
  final String nameEn;

  /// Whether the Wilaya is currently active.
  final bool isActive;

  /// Numerical sort ordering.
  final int displayOrder;

  factory Wilaya.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final parsedId = rawId is num
        ? rawId.toInt()
        : int.tryParse(rawId?.toString() ?? '') ?? int.tryParse((json['code'] ?? '').toString());

    final rawOrder = json['display_order'];
    final parsedOrder = rawOrder is num
        ? rawOrder.toInt()
        : int.tryParse(rawOrder?.toString() ?? '') ?? 0;

    return Wilaya(
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
      if (id != null) 'id': id,
      'code': code,
      'name_ar': nameAr,
      'name_fr': nameFr,
      'name_en': nameEn,
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
    return other is Wilaya && other.code == code;
  }

  @override
  int get hashCode => code.hashCode;

  @override
  String toString() => 'Wilaya($code: $nameAr / $nameFr)';
}
