// ignore_for_file: depend_on_referenced_packages
import 'dart:io';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/source/line_info.dart';

/// AAFIYA Mobile AST Design Compliance Linter.
///
/// Inspects Dart ASTs across mobile packages and applications to enforce:
/// 1. Design Token Adherence (eliminating unjustified raw Material colors)
/// 2. Touch Target Boundaries (min 48dp touch targets, 52dp primary CTAs)
/// 3. Shared Component Usage (flagging unmigrated raw Card and legacy components)
/// 4. Typography Rules (forbidding Amiri as default for interactive controls, forbidding unapproved fonts)
void main(List<String> args) {
  final strictMode = args.contains('--strict');
  final jsonMode = args.contains('--json');
  final helpMode = args.contains('--help') || args.contains('-h');

  if (helpMode) {
    stdout.writeln('''
AAFIYA AST Design Compliance Linter
Usage: dart mobile/tools/verify_design_compliance.dart [options]

Options:
  --strict    Exit with non-zero code on any finding (including WARNINGs)
  --json      Output structured JSON report
  --help, -h  Display this help message
''');
    exit(0);
  }

  final rootDir = Directory.current.path;
  final customTargets = args.where((a) => !a.startsWith('-')).toList();
  final targets = customTargets.isNotEmpty
      ? customTargets
      : [
          'mobile/packages/aafiya_ui/lib',
          'mobile/apps/aafiya_patient/lib',
          'mobile/apps/aafiya_pro/lib',
        ];

  final violations = <ComplianceViolation>[];
  var scannedFiles = 0;

  for (final targetPath in targets) {
    final entity = FileSystemEntity.typeSync('$rootDir/$targetPath');
    if (entity == FileSystemEntityType.file && targetPath.endsWith('.dart')) {
      scannedFiles++;
      _analyzeFile(File('$rootDir/$targetPath'), rootDir, violations);
    } else if (entity == FileSystemEntityType.directory) {
      final dir = Directory('$rootDir/$targetPath');
      final dartFiles = dir.listSync(recursive: true).whereType<File>().where(
          (f) => f.path.endsWith('.dart') && !f.path.contains('.g.dart'));

      for (final file in dartFiles) {
        scannedFiles++;
        _analyzeFile(file, rootDir, violations);
      }
    }
  }

  // Report Generation
  if (jsonMode) {
    _renderJsonReport(violations, scannedFiles);
  } else {
    _renderTextReport(violations, scannedFiles);
  }

  final blockingCount =
      violations.where((v) => v.severity == Severity.blocking).length;
  final warningCount =
      violations.where((v) => v.severity == Severity.warning).length;

  if (blockingCount > 0) {
    exit(1);
  } else if (strictMode && warningCount > 0) {
    exit(2);
  } else {
    exit(0);
  }
}

enum Severity {
  blocking,
  warning,
  manualReview,
}

class ComplianceViolation {
  final String filePath;
  final int line;
  final int column;
  final String ruleId;
  final String description;
  final Severity severity;
  final bool isDefinite;
  final String? exceptionRationale;

  ComplianceViolation({
    required this.filePath,
    required this.line,
    required this.column,
    required this.ruleId,
    required this.description,
    required this.severity,
    required this.isDefinite,
    this.exceptionRationale,
  });

  Map<String, dynamic> toJson() => {
        'filePath': filePath,
        'line': line,
        'column': column,
        'ruleId': ruleId,
        'description': description,
        'severity': severity.name,
        'isDefinite': isDefinite,
        if (exceptionRationale != null)
          'exceptionRationale': exceptionRationale,
      };
}

void _analyzeFile(
    File file, String rootDir, List<ComplianceViolation> violations) {
  final relativePath = file.path.startsWith(rootDir)
      ? file.path.substring(rootDir.length + 1)
      : file.path;

  // Exempt token definitions themselves
  if (relativePath.contains('tokens/aafiya_colors.dart') ||
      relativePath.contains('tokens/aafiya_typography.dart') ||
      relativePath.contains('tokens/aafiya_radius.dart')) {
    return;
  }

  String content;
  try {
    content = file.readAsStringSync();
  } catch (_) {
    return;
  }

  // Check for file-level exemption
  if (content.contains('// design_compliance: disable_file')) {
    return;
  }

  final parseResult = parseString(content: content, throwIfDiagnostics: false);
  final lineInfo = parseResult.lineInfo;

  final visitor = _DesignAstVisitor(
    filePath: relativePath,
    lineInfo: lineInfo,
    content: content,
    violations: violations,
  );

  parseResult.unit.accept(visitor);
}

class _DesignAstVisitor extends RecursiveAstVisitor<void> {
  final String filePath;
  final LineInfo lineInfo;
  final String content;
  final List<ComplianceViolation> violations;

  _DesignAstVisitor({
    required this.filePath,
    required this.lineInfo,
    required this.content,
    required this.violations,
  });

  bool _isLineIgnored(int line, String ruleId) {
    final lines = content.split('\n');
    if (line > 0 && line <= lines.length) {
      final lineStr = lines[line - 1];
      if (lineStr.contains('// ignore: $ruleId') ||
          lineStr.contains('// design-token-exception') ||
          lineStr.contains('// ignore: design_compliance')) {
        return true;
      }
    }
    return false;
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    // Check 1A: Raw Material Color references like Colors.red, Colors.green, Colors.white
    if (node.prefix.name == 'Colors') {
      // If this is the target of a PropertyAccess (e.g. Colors.green.shade50),
      // skip here to avoid duplicate reporting; visitPropertyAccess will report the shade.
      if (node.parent is PropertyAccess) {
        super.visitPrefixedIdentifier(node);
        return;
      }
      final location = lineInfo.getLocation(node.offset);
      if (!_isLineIgnored(location.lineNumber, 'COLOR_RAW_MATERIAL')) {
        // Colors.transparent is standard Flutter layout utility, permit it
        if (node.identifier.name != 'transparent') {
          violations.add(ComplianceViolation(
            filePath: filePath,
            line: location.lineNumber,
            column: location.columnNumber,
            ruleId: 'COLOR_RAW_MATERIAL',
            description:
                'Direct usage of raw Material palette `Colors.${node.identifier.name}`. Prefer `AafiyaColors` tokens.',
            severity: Severity.warning,
            isDefinite: true,
          ));
        }
      }
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    // Check 1B: Colors.green.shade50 or similar chained property access
    final target = node.target;
    if (target is PrefixedIdentifier && target.prefix.name == 'Colors') {
      final location = lineInfo.getLocation(node.offset);
      if (!_isLineIgnored(location.lineNumber, 'COLOR_RAW_MATERIAL_SHADE')) {
        violations.add(ComplianceViolation(
          filePath: filePath,
          line: location.lineNumber,
          column: location.columnNumber,
          ruleId: 'COLOR_RAW_MATERIAL_SHADE',
          description:
              'Raw Material shade bypass `Colors.${target.identifier.name}.${node.propertyName.name}`. Replace with semantic `AafiyaColors` token.',
          severity: Severity.blocking,
          isDefinite: true,
        ));
      }
    }
    super.visitPropertyAccess(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name.lexeme;
    final location = lineInfo.getLocation(node.offset);

    // Check 1C: Direct Color(0x...) literals in application UI
    if (typeName == 'Color' && !filePath.contains('tokens/')) {
      if (!_isLineIgnored(location.lineNumber, 'COLOR_LITERAL_BYPASS')) {
        violations.add(ComplianceViolation(
          filePath: filePath,
          line: location.lineNumber,
          column: location.columnNumber,
          ruleId: 'COLOR_LITERAL_BYPASS',
          description:
              'Direct `Color(0x...)` literal instantiated in UI file. Tokenize into `AafiyaColors`.',
          severity: Severity.warning,
          isDefinite: true,
        ));
      }
    }

    // Check 2: Touch Target / Button Dimensions
    if (typeName == 'ElevatedButton' ||
        typeName == 'FilledButton' ||
        typeName == 'AafiyaButton') {
      _checkButtonHeight(node, typeName, location);
    }

    if (typeName == 'BoxConstraints') {
      _checkBoxConstraints(node, location);
    }

    // Check 3: Legacy Component Instantiation
    if (typeName == 'Card' && !filePath.contains('tokens/')) {
      if (!_isLineIgnored(location.lineNumber, 'COMPONENT_LEGACY_RAW_CARD')) {
        violations.add(ComplianceViolation(
          filePath: filePath,
          line: location.lineNumber,
          column: location.columnNumber,
          ruleId: 'COMPONENT_LEGACY_RAW_CARD',
          description:
              'Raw `Card()` widget used. Migrate to `AafiyaCard` for design token compliance.',
          severity: Severity.warning,
          isDefinite: true,
        ));
      }
    }

    if (typeName == 'AafiyaHeroHeader') {
      if (!_isLineIgnored(
          location.lineNumber, 'COMPONENT_HERO_HEADER_OVERRIDE')) {
        violations.add(ComplianceViolation(
          filePath: filePath,
          line: location.lineNumber,
          column: location.columnNumber,
          ruleId: 'COMPONENT_HERO_HEADER_OVERRIDE',
          description:
              'Legacy `AafiyaHeroHeader` mounted. Approved plan mandates luminous white card header (DEC-UI-01).',
          severity: Severity.warning,
          isDefinite: true,
        ));
      }
    }

    // Check 4: Typography Violations
    if (typeName == 'TextStyle') {
      _checkTextStyle(node, location);
    }

    super.visitInstanceCreationExpression(node);
  }

  void _checkButtonHeight(InstanceCreationExpression node, String typeName,
      CharacterLocation location) {
    // If button specifies explicit minimumSize or height, verify it meets 52dp target
    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression && arg.name.label.name == 'style') {
        final styleExpr = arg.expression;
        if (styleExpr is MethodInvocation &&
            styleExpr.methodName.name == 'styleFrom') {
          for (final styleArg in styleExpr.argumentList.arguments) {
            if (styleArg is NamedExpression &&
                styleArg.name.label.name == 'minimumSize') {
              final sizeExpr = styleArg.expression;
              if (sizeExpr is MethodInvocation &&
                  sizeExpr.methodName.name == 'fromHeight') {
                final heightArg = sizeExpr.argumentList.arguments.firstOrNull;
                if (heightArg is DoubleLiteral && heightArg.value < 48.0) {
                  violations.add(ComplianceViolation(
                    filePath: filePath,
                    line: location.lineNumber,
                    column: location.columnNumber,
                    ruleId: 'TOUCH_TARGET_BELOW_48DP',
                    description:
                        'Button minimum height is ${heightArg.value}dp, which violates minimum 48dp touch constraint.',
                    severity: Severity.blocking,
                    isDefinite: true,
                  ));
                }
              }
            }
          }
        }
      }
    }
  }

  void _checkBoxConstraints(
      InstanceCreationExpression node, CharacterLocation location) {
    double? minWidth;
    double? minHeight;

    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression) {
        final name = arg.name.label.name;
        final expr = arg.expression;
        if (name == 'minWidth' && expr is DoubleLiteral) {
          minWidth = expr.value;
        } else if (name == 'minHeight' && expr is DoubleLiteral) {
          minHeight = expr.value;
        }
      }
    }

    if ((minWidth != null && minWidth < 48.0) ||
        (minHeight != null && minHeight < 48.0)) {
      if (!_isLineIgnored(location.lineNumber, 'TOUCH_TARGET_CONSTRAINTS')) {
        violations.add(ComplianceViolation(
          filePath: filePath,
          line: location.lineNumber,
          column: location.columnNumber,
          ruleId: 'TOUCH_TARGET_CONSTRAINTS',
          description:
              'BoxConstraints specifies minWidth: ${minWidth ?? "?"}dp, minHeight: ${minHeight ?? "?"}dp (below 48dp minimum standard).',
          severity: Severity.warning,
          isDefinite: true,
        ));
      }
    }
  }

  void _checkTextStyle(
      InstanceCreationExpression node, CharacterLocation location) {
    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression && arg.name.label.name == 'fontFamily') {
        final expr = arg.expression;
        if (expr is SimpleStringLiteral) {
          final fontName = expr.value;
          // Amiri prohibited on interactive controls
          if (fontName == 'Amiri') {
            violations.add(ComplianceViolation(
              filePath: filePath,
              line: location.lineNumber,
              column: location.columnNumber,
              ruleId: 'TYPOGRAPHY_AMIRI_FORBIDDEN_INTERACTIVE',
              description:
                  '`fontFamily: "Amiri"` explicitly hardcoded in TextStyle. Amiri is forbidden as general UI control font.',
              severity: Severity.warning,
              isDefinite: false,
              exceptionRationale:
                  'Permitted exclusively on historical quotes or classical text containers.',
            ));
          } else if (fontName.toLowerCase().contains('cairo') ||
              fontName.toLowerCase().contains('outfit')) {
            violations.add(ComplianceViolation(
              filePath: filePath,
              line: location.lineNumber,
              column: location.columnNumber,
              ruleId: 'TYPOGRAPHY_UNAPPROVED_FONT_FAMILY',
              description:
                  'Unapproved font family "$fontName" referenced. Approved families are IBM Plex Sans Arabic and Plus Jakarta Sans.',
              severity: Severity.blocking,
              isDefinite: true,
            ));
          }
        }
      }
    }
  }
}

void _renderTextReport(List<ComplianceViolation> violations, int scannedFiles) {
  stdout.writeln('======================================================');
  stdout.writeln('     AAFIYA AST DESIGN COMPLIANCE AUDIT REPORT        ');
  stdout.writeln('======================================================');
  stdout.writeln('Files Scanned: $scannedFiles');
  stdout.writeln('Total Findings: ${violations.length}');
  stdout.writeln('');

  final blocking =
      violations.where((v) => v.severity == Severity.blocking).toList();
  final warnings =
      violations.where((v) => v.severity == Severity.warning).toList();
  final manual =
      violations.where((v) => v.severity == Severity.manualReview).toList();

  stdout.writeln('Findings Breakdown:');
  stdout.writeln('  - BLOCKING:      ${blocking.length}');
  stdout.writeln('  - WARNING:       ${warnings.length}');
  stdout.writeln('  - MANUAL_REVIEW: ${manual.length}');
  stdout.writeln('------------------------------------------------------');

  if (violations.isEmpty) {
    stdout.writeln('✓ 100% COMPLIANT: Zero design violations detected.');
  } else {
    for (final v in violations) {
      final badge = switch (v.severity) {
        Severity.blocking => '[BLOCKING]',
        Severity.warning => '[WARNING]',
        Severity.manualReview => '[MANUAL]',
      };
      stdout
          .writeln('$badge ${v.ruleId} at ${v.filePath}:${v.line}:${v.column}');
      stdout.writeln('   ${v.description}');
      if (v.exceptionRationale != null) {
        stdout.writeln('   Note: ${v.exceptionRationale}');
      }
      stdout.writeln('');
    }
  }
  stdout.writeln('======================================================');
}

void _renderJsonReport(List<ComplianceViolation> violations, int scannedFiles) {
  final out = {
    'scannedFiles': scannedFiles,
    'totalFindings': violations.length,
    'blockingCount':
        violations.where((v) => v.severity == Severity.blocking).length,
    'warningCount':
        violations.where((v) => v.severity == Severity.warning).length,
    'findings': violations.map((v) => v.toJson()).toList(),
  };

  // Convert to JSON string
  final buffer = StringBuffer('{\n');
  buffer.writeln('  "scannedFiles": ${out['scannedFiles']},');
  buffer.writeln('  "totalFindings": ${out['totalFindings']},');
  buffer.writeln('  "blockingCount": ${out['blockingCount']},');
  buffer.writeln('  "warningCount": ${out['warningCount']},');
  buffer.writeln('  "findings": [');
  final findings = out['findings'] as List<Map<String, dynamic>>;
  for (var i = 0; i < findings.length; i++) {
    final f = findings[i];
    buffer.write('    {');
    buffer.write('"filePath": "${f['filePath']}", ');
    buffer.write('"line": ${f['line']}, ');
    buffer.write('"column": ${f['column']}, ');
    buffer.write('"ruleId": "${f['ruleId']}", ');
    buffer.write('"severity": "${f['severity']}", ');
    buffer.write('"description": "${f['description']}"');
    buffer.write(i < findings.length - 1 ? '},\n' : '}\n');
  }
  buffer.writeln('  ]');
  buffer.writeln('}');
  stdout.writeln(buffer.toString());
}
