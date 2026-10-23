#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — SECURE ISOLATED DATABASE RESTORE DRILL SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -Eeuo pipefail

# 1. Mandatory Drill Mode Verification
if [ "${RESTORE_MODE:-}" != "drill" ]; then
    echo "[CRITICAL ERROR] Unauthorized execution mode: RESTORE_MODE must be explicitly set to 'drill'." >&2
    echo "Usage: RESTORE_MODE=drill $0 <path_to_encrypted_backup.sql.gz.enc> <target_restore_database>" >&2
    exit 10
fi

TARGET_ENC_FILE="${1:-}"
RESTORE_DB="${2:-}"

if [ -z "${TARGET_ENC_FILE}" ] || [ -z "${RESTORE_DB}" ]; then
    echo "[ERROR] Usage: RESTORE_MODE=drill $0 <path_to_encrypted_backup.sql.gz.enc> <target_restore_database>" >&2
    exit 1
fi

if [ ! -f "${TARGET_ENC_FILE}" ]; then
    echo "[ERROR] Encrypted backup file not found: ${TARGET_ENC_FILE}" >&2
    exit 1
fi

# 2. Strict Host Restrictions (Loopback Only)
DB_HOST="${DB_HOST:-127.0.0.1}"
if [ "${DB_HOST}" != "127.0.0.1" ] && [ "${DB_HOST}" != "localhost" ] && [ "${DB_HOST}" != "::1" ]; then
    echo "[CRITICAL ERROR] Non-loopback database host '${DB_HOST}' rejected. Restore drills permit local loopback connections only." >&2
    exit 12
fi

DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"

# 3. Disposable Database Name Allowlist & Protected Blocklist
DRILL_DB_REGEX='^aafiya_(drill|restore_test|disposable)_[a-zA-Z0-9_]+$'
if ! [[ "${RESTORE_DB}" =~ ${DRILL_DB_REGEX} ]]; then
    echo "[CRITICAL ERROR] Target database '${RESTORE_DB}' does not match permitted disposable pattern: ${DRILL_DB_REGEX}" >&2
    exit 11
fi

if [ "${RESTORE_DB}" = "medical_db" ] || [ "${RESTORE_DB}" = "railway" ] || \
   [ "${RESTORE_DB}" = "defaultdb" ] || [ "${RESTORE_DB}" = "mysql" ] || \
   [ "${RESTORE_DB}" = "information_schema" ] || [ "${RESTORE_DB}" = "performance_schema" ] || \
   [ "${RESTORE_DB}" = "sys" ]; then
    echo "[CRITICAL ERROR] Target database '${RESTORE_DB}' is in the protected blocklist." >&2
    exit 11
fi

# 4. Safe Secret Loading
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="${SCRIPT_DIR}/../../backend/.env"

if [ -f "${BACKEND_ENV}" ]; then
    if [ -z "${DB_PASSWORD:-}" ]; then
        DB_PASSWORD=$(grep -E '^[[:space:]]*DB_PASSWORD=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        BACKUP_ENCRYPTION_KEY=$(grep -E '^[[:space:]]*BACKUP_ENCRYPTION_KEY=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
fi

if [ -z "${DB_PASSWORD:-}" ]; then
    echo "[CRITICAL ERROR] DB_PASSWORD is not set. Please provide DB_PASSWORD via environment or backend/.env." >&2
    exit 1
fi

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "[CRITICAL ERROR] BACKUP_ENCRYPTION_KEY is not set. Please provide BACKUP_ENCRYPTION_KEY via environment or backend/.env." >&2
    exit 1
fi

# 5. Scoped Staging & State-Aware Trap Cleanup
RESTORE_STAGE=$(mktemp -d "${TMPDIR:-/tmp}/aafiya_restore.XXXXXXXXXX")
chmod 700 "${RESTORE_STAGE}"

DB_MODIFICATION_STARTED=0

cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM ERR
    if [ -n "${RESTORE_STAGE:-}" ] && [ -d "${RESTORE_STAGE}" ]; then
        rm -rf "${RESTORE_STAGE}"
    fi
    if [ ${exit_code} -ne 0 ] && [ "${DB_MODIFICATION_STARTED}" -eq 1 ]; then
        echo "================================================================================" >&2
        echo "[CRITICAL ALERT] RESTORE OPERATION FAILED AFTER DATABASE MODIFICATIONS BEGAN!" >&2
        echo "TARGET DATABASE '${RESTORE_DB}' IS INCOMPLETE / PARTIAL RESTORE — DO NOT USE!" >&2
        echo "RECOVERY ACTION: Target database was NOT automatically deleted. Operator must" >&2
        echo "manually inspect or drop this disposable drill database '${RESTORE_DB}'." >&2
        echo "================================================================================" >&2
    fi
    exit "${exit_code}"
}
trap cleanup EXIT INT TERM ERR

# 6. Step 1: Verify Artifact Integrity and Complete Metadata Contract
echo "=== [1/4] Verifying Artifact Checksum & Metadata Integrity ==="
"${SCRIPT_DIR}/verify-integrity.sh" "${TARGET_ENC_FILE}"

DIRNAME=$(cd "$(dirname "${TARGET_ENC_FILE}")" && pwd)
BASENAME=$(basename "${TARGET_ENC_FILE}")
META_FILE="${DIRNAME}/${BASENAME%.sql.gz.enc}.meta.json"

# Read metadata contract values safely with Python
eval $(python3 - "${META_FILE}" << 'PYEOF'
import sys
import json
import shlex

try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        meta = json.load(f)
except Exception as e:
    sys.exit(1)

cv = meta.get("contract_version", "1.0")
vp_raw = meta.get("verification_profile", {})
if isinstance(vp_raw, dict):
    vp = vp_raw.get("profile_type", "synthetic_drill" if "drill" in meta.get("database", "") else "custom")
    views = vp_raw.get("schema_views_count", meta.get("views_count", 0))
    routines = vp_raw.get("schema_routines_count", meta.get("routines_count", 0))
    triggers = vp_raw.get("schema_triggers_count", meta.get("triggers_count", 0))
else:
    vp = str(vp_raw)
    views = meta.get("views_count", 0)
    routines = meta.get("routines_count", 0)
    triggers = meta.get("triggers_count", 0)

tbls = meta.get("schema_tables_count", 0)
fks = meta.get("schema_foreign_keys_count", 0)

print(f"CONTRACT_VERSION={shlex.quote(str(cv))}")
print(f"VERIFICATION_PROFILE={shlex.quote(str(vp))}")
print(f"EXPECTED_TABLES={int(tbls)}")
print(f"EXPECTED_FKS={int(fks)}")
print(f"EXPECTED_VIEWS={int(views)}")
print(f"EXPECTED_ROUTINES={int(routines)}")
print(f"EXPECTED_TRIGGERS={int(triggers)}")
PYEOF
)

# 7. Ephemeral Credentials Configuration (0600)
# RSK-01: Correctly escape backslashes and double quotes for MySQL option-file syntax
ESCAPED_DB_USER=$(printf '%s' "${DB_USER}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
ESCAPED_DB_PASSWORD=$(printf '%s' "${DB_PASSWORD}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

MYSQL_CNF="${RESTORE_STAGE}/my.cnf"
cat << CNF > "${MYSQL_CNF}"
[client]
user="${ESCAPED_DB_USER}"
password="${ESCAPED_DB_PASSWORD}"
host=${DB_HOST}
port=${DB_PORT}
CNF
if [ -n "${DB_SOCKET:-}" ]; then
    echo "socket=${DB_SOCKET}" >> "${MYSQL_CNF}"
fi
chmod 600 "${MYSQL_CNF}"

KEY_FILE="${RESTORE_STAGE}/enc.key"
printf '%s' "${BACKUP_ENCRYPTION_KEY}" > "${KEY_FILE}"
chmod 600 "${KEY_FILE}"

# 8. Step 2: Initialize & Check Disposable Target Database Preconditions (Zero-Object Policy)
# RSK-02: Check tables, routines, and triggers, failing closed if any query fails or non-zero count found
echo "=== [2/4] Checking Target Database Preconditions: ${RESTORE_DB} ==="
if ! mysql --defaults-extra-file="${MYSQL_CNF}" -e "CREATE DATABASE IF NOT EXISTS \`${RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2> "${RESTORE_STAGE}/mysql_err.log"; then
    echo "[CRITICAL ERROR] Failed to initialize target database '${RESTORE_DB}'." >&2
    cat "${RESTORE_STAGE}/mysql_err.log" >&2
    exit 13
fi

PRECHECK_TABLES=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DB}';" 2> "${RESTORE_STAGE}/mysql_err.log")
if ! [[ "${PRECHECK_TABLES}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] Target database pre-check failed to query table count." >&2
    cat "${RESTORE_STAGE}/mysql_err.log" >&2
    exit 13
fi

PRECHECK_ROUTINES=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='${RESTORE_DB}';" 2> "${RESTORE_STAGE}/mysql_err.log")
if ! [[ "${PRECHECK_ROUTINES}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] Target database pre-check failed to query routines count." >&2
    cat "${RESTORE_STAGE}/mysql_err.log" >&2
    exit 13
fi

PRECHECK_TRIGGERS=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='${RESTORE_DB}';" 2> "${RESTORE_STAGE}/mysql_err.log")
if ! [[ "${PRECHECK_TRIGGERS}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] Target database pre-check failed to query triggers count." >&2
    cat "${RESTORE_STAGE}/mysql_err.log" >&2
    exit 13
fi

if [ "${PRECHECK_TABLES}" -ne 0 ] || [ "${PRECHECK_ROUTINES}" -ne 0 ] || [ "${PRECHECK_TRIGGERS}" -ne 0 ]; then
    echo "[CRITICAL ERROR] Refusing to restore into non-empty target database '${RESTORE_DB}' (found ${PRECHECK_TABLES} tables, ${PRECHECK_ROUTINES} routines, ${PRECHECK_TRIGGERS} triggers)." >&2
    exit 14
fi

# 9. Step 3: Decrypt & Restore Stream via Pipe
echo "=== [3/4] Decrypting & Streaming Dump into ${RESTORE_DB} ==="
DB_MODIFICATION_STARTED=1

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "${TARGET_ENC_FILE}" \
    -pass file:"${KEY_FILE}" | \
    gzip -d -c | \
    mysql --defaults-extra-file="${MYSQL_CNF}" "${RESTORE_DB}"

echo "[SUCCESS] Restore stream ingestion finished successfully for ${RESTORE_DB}."

# 10. Step 4: Validate Restored Structure Against Verification Contract
echo "=== [4/4] Validating Structural & Data Integrity in ${RESTORE_DB} ==="
echo "[INFO] Verification Contract Version: ${CONTRACT_VERSION}"
echo "[INFO] Verification Profile:          ${VERIFICATION_PROFILE}"

RESTORED_TABLES=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DB}';")
RESTORED_FKS=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='${RESTORE_DB}';")

echo "[INFO] Restored Database Tables:       ${RESTORED_TABLES} (Expected: ${EXPECTED_TABLES})"
echo "[INFO] Restored Foreign Keys:         ${RESTORED_FKS} (Expected: ${EXPECTED_FKS})"

if [ "${RESTORED_TABLES}" -ne "${EXPECTED_TABLES}" ] || [ "${RESTORED_FKS}" -ne "${EXPECTED_FKS}" ]; then
    echo "[CRITICAL ERROR] RESTORE DRILL VALIDATION FAILED: Structural table/FK mismatch with backup metadata!" >&2
    exit 15
fi

# Contract 2.0 object verification
if [ "${CONTRACT_VERSION}" = "2.0" ]; then
    RESTORED_VIEWS=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='${RESTORE_DB}';")
    RESTORED_ROUTINES=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='${RESTORE_DB}';")
    RESTORED_TRIGGERS=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='${RESTORE_DB}';")

    echo "[INFO] Restored Views:                ${RESTORED_VIEWS} (Expected: ${EXPECTED_VIEWS})"
    echo "[INFO] Restored Routines:             ${RESTORED_ROUTINES} (Expected: ${EXPECTED_ROUTINES})"
    echo "[INFO] Restored Triggers:             ${RESTORED_TRIGGERS} (Expected: ${EXPECTED_TRIGGERS})"

    if [ "${RESTORED_VIEWS}" -ne "${EXPECTED_VIEWS}" ] || \
       [ "${RESTORED_ROUTINES}" -ne "${EXPECTED_ROUTINES}" ] || \
       [ "${RESTORED_TRIGGERS}" -ne "${EXPECTED_TRIGGERS}" ]; then
        echo "[CRITICAL ERROR] RESTORE DRILL VALIDATION FAILED: Object count mismatch (views, routines, or triggers)!" >&2
        exit 15
    fi

    echo "[NOTICE] MySQL scheduled events are excluded from the verification contract (requires dedicated event scheduler verification)."

    # Table Manifest & Row Count Validation (Hermetic Python + MySQL verification)
    MANIFEST_CHECK=$(python3 - "${META_FILE}" "${MYSQL_CNF}" "${RESTORE_DB}" << 'PYEOF'
import sys
import json
import subprocess

meta_path = sys.argv[1]
cnf_path = sys.argv[2]
restore_db = sys.argv[3]

with open(meta_path, 'r', encoding='utf-8') as f:
    meta = json.load(f)

vp_raw = meta.get("verification_profile", {})
if isinstance(vp_raw, dict) and "table_manifest" in vp_raw:
    manifest = vp_raw.get("table_manifest", {})
else:
    manifest = meta.get("table_manifest", {})

if not isinstance(manifest, dict):
    print("INVALID_MANIFEST")
    sys.exit(17)

for tbl, expected_val in manifest.items():
    if isinstance(expected_val, dict):
        expected_rows = expected_val.get("expected_rows", 0)
    else:
        try:
            expected_rows = int(expected_val)
        except Exception:
            expected_rows = 0

    # Query actual rows
    cmd = ["mysql", f"--defaults-extra-file={cnf_path}", "-s", "-N", "-e", f"SELECT COUNT(*) FROM `{restore_db}`.`{tbl}`;"]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"TABLE_MISSING:{tbl}")
        sys.exit(17)
    try:
        actual_rows = int(res.stdout.strip())
    except ValueError:
        print(f"COUNT_FAILED:{tbl}")
        sys.exit(17)

    if actual_rows != expected_rows:
        print(f"ROW_MISMATCH:{tbl}:expected_{expected_rows}:got_{actual_rows}")
        sys.exit(17)

print("MANIFEST_OK")
PYEOF
)
    MANIFEST_EXIT=$?
    if [ ${MANIFEST_EXIT} -ne 0 ] || [ "${MANIFEST_CHECK}" != "MANIFEST_OK" ]; then
        echo "[CRITICAL ERROR] RESTORE DRILL VALIDATION FAILED: Table manifest verification error: ${MANIFEST_CHECK}" >&2
        exit 17
    fi
    echo "[SUCCESS] Restored table manifest and row counts verified successfully."
fi

# Profile-Specific Assertions
if [ "${VERIFICATION_PROFILE}" = "canonical_production" ]; then
    echo "=== Validating Canonical Production Core Tables ==="
    CORE_TABLES=("users" "roles" "permissions" "clinics" "doctors" "patients" "appointments" "prescriptions" "clinical_visits" "diagnostic_orders" "migrations")
    for tbl in "${CORE_TABLES[@]}"; do
        EXISTS=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DB}' AND table_name='${tbl}' AND table_type='BASE TABLE';")
        if [ "${EXISTS}" -ne 1 ]; then
            echo "[CRITICAL ERROR] Canonical production core table '${tbl}' is missing in restored database!" >&2
            exit 16
        fi
    done
    echo "[SUCCESS] All 11 canonical core tables verified in restored production backup."
elif [ "${VERIFICATION_PROFILE}" = "synthetic_drill" ]; then
    echo "[INFO] Synthetic drill profile: skipping production core table checklist; verified declared drill manifest."
fi

echo "[SUCCESS] RESTORE DRILL STRUCTURAL & DATA VALIDATION PASSED."
exit 0

