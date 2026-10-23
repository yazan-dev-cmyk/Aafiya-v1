#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — SECURE CONSISTENT ENCRYPTED BACKUP SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -Eeuo pipefail

# 1. Configuration & Parameters
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
TARGET_DB="${DB_DATABASE:-medical_db}"
BACKUP_DIR="${BACKUP_DIR:-/home/yazan/Downloads/Medi/mediservices/storage/backups}"

# Validate target database identifier before any SQL interpolation
if ! [[ "${TARGET_DB}" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "[CRITICAL ERROR] Invalid target database name: '${TARGET_DB}'" >&2
    exit 1
fi

# Load secrets from backend/.env if not present in environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Safe Secret Loading: Prioritize systemd LoadCredential= then process env, then backend/.env
BACKUP_HMAC_KEY_ID="${BACKUP_HMAC_KEY_ID:-}"
if [ -n "${CREDENTIALS_DIRECTORY:-}" ]; then
    if [ -z "${BACKUP_HMAC_KEY_ID}" ] && [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_ID" ]; then
        BACKUP_HMAC_KEY_ID=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_ID")
    fi
    if [ -n "${BACKUP_HMAC_KEY_ID}" ] && [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_${BACKUP_HMAC_KEY_ID}" ]; then
        BACKUP_HMAC_KEY=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_${BACKUP_HMAC_KEY_ID}")
    elif [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY" ]; then
        BACKUP_HMAC_KEY=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY")
    fi
fi

BACKEND_ENV="${SCRIPT_DIR}/../../backend/.env"

if [ -f "${BACKEND_ENV}" ]; then
    if [ -z "${DB_PASSWORD:-}" ]; then
        DB_PASSWORD=$(grep -E '^[[:space:]]*DB_PASSWORD=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        BACKUP_ENCRYPTION_KEY=$(grep -E '^[[:space:]]*BACKUP_ENCRYPTION_KEY=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
    if [ -z "${BACKUP_HMAC_KEY_ID:-}" ]; then
        BACKUP_HMAC_KEY_ID=$(grep -E '^[[:space:]]*BACKUP_HMAC_KEY_ID=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
    if [ -z "${BACKUP_HMAC_KEY:-}" ]; then
        BACKUP_HMAC_KEY=$(grep -E '^[[:space:]]*BACKUP_HMAC_KEY=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
fi

BACKUP_HMAC_KEY_ID="${BACKUP_HMAC_KEY_ID:-v1}"

# Validate critical secrets are provided (Fail-Safe, zero hard-coded fallbacks)
if [ -z "${DB_PASSWORD:-}" ]; then
    echo "[CRITICAL ERROR] DB_PASSWORD is not set. Please provide DB_PASSWORD via environment or backend/.env." >&2
    exit 1
fi

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "[CRITICAL ERROR] BACKUP_ENCRYPTION_KEY is not set. Please provide BACKUP_ENCRYPTION_KEY via environment or backend/.env." >&2
    exit 1
fi

if [ -z "${BACKUP_HMAC_KEY:-}" ]; then
    echo "[CRITICAL ERROR] BACKUP_HMAC_KEY is not set. Please provide BACKUP_HMAC_KEY via environment, LoadCredential, or backend/.env." >&2
    exit 1
fi

# D2: Enforce cryptographic key separation (HMAC key must never be identical to encryption key)
if [ "${BACKUP_HMAC_KEY}" = "${BACKUP_ENCRYPTION_KEY}" ]; then
    echo "[CRITICAL ERROR] BACKUP_HMAC_KEY must not be identical to BACKUP_ENCRYPTION_KEY. Cryptographic separation is strictly required." >&2
    exit 1
fi

# Prepare backup directory with restricted permissions (0700)
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
BACKUP_DIR=$(cd "${BACKUP_DIR}" && pwd)

# 2. Collision-Resistant Identifiers & Destination Collision Pre-Check
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FILE_TIMESTAMP=$(echo "${TIMESTAMP}" | tr -d ':-')
PID=$$
BASE_FILENAME="backup_${TARGET_DB}_${FILE_TIMESTAMP}_${PID}"

FINAL_ENC_FILE="${BACKUP_DIR}/${BASE_FILENAME}.sql.gz.enc"
FINAL_SHA_FILE="${BACKUP_DIR}/${BASE_FILENAME}.sql.gz.enc.sha256"
FINAL_META_FILE="${BACKUP_DIR}/${BASE_FILENAME}.meta.json"

if [ -e "${FINAL_ENC_FILE}" ] || [ -e "${FINAL_SHA_FILE}" ] || [ -e "${FINAL_META_FILE}" ]; then
    echo "[CRITICAL ERROR] Destination artifact collision detected for '${BASE_FILENAME}'. Aborting to prevent overwrite." >&2
    exit 15
fi

# 3. Process-Exclusive Isolated Staging Directory
STAGE_DIR=$(mktemp -d "${BACKUP_DIR}/.stage_${BASE_FILENAME}.XXXXXXXXXX")
chmod 700 "${STAGE_DIR}"

cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM ERR
    if [ -n "${STAGE_DIR:-}" ] && [ -d "${STAGE_DIR}" ]; then
        rm -rf "${STAGE_DIR}"
    fi
    exit "${exit_code}"
}
trap cleanup EXIT INT TERM ERR

# 4. Ephemeral Credentials Configuration (0600, no command-line exposure)
# RSK-01: Correctly escape backslashes and double quotes for MySQL option-file syntax
ESCAPED_DB_USER=$(printf '%s' "${DB_USER}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
ESCAPED_DB_PASSWORD=$(printf '%s' "${DB_PASSWORD}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

MYSQL_CNF="${STAGE_DIR}/my.cnf"
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

KEY_FILE="${STAGE_DIR}/enc.key"
printf '%s' "${BACKUP_ENCRYPTION_KEY}" > "${KEY_FILE}"
chmod 600 "${KEY_FILE}"

echo "[INFO] Querying schema topology for database: ${TARGET_DB}..."
SCHEMA_TABLES_COUNT=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TARGET_DB}';")
SCHEMA_FKS_COUNT=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='${TARGET_DB}';")
SCHEMA_VIEWS_COUNT=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='${TARGET_DB}';" 2>/dev/null || echo "0")
SCHEMA_ROUTINES_COUNT=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='${TARGET_DB}';" 2>/dev/null || echo "0")
SCHEMA_TRIGGERS_COUNT=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='${TARGET_DB}';" 2>/dev/null || echo "0")

if ! [[ "${SCHEMA_TABLES_COUNT}" =~ ^[0-9]+$ ]] || ! [[ "${SCHEMA_FKS_COUNT}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] Failed to query schema statistics from source database '${TARGET_DB}'." >&2
    exit 16
fi

# Determine verification profile type
if [ "${TARGET_DB}" = "medical_db" ]; then
    PROFILE_TYPE="canonical_production"
    ENFORCE_CANONICAL="true"
else
    PROFILE_TYPE="synthetic_drill"
    ENFORCE_CANONICAL="false"
fi

# Build deterministic table manifest (base table -> row count)
MANIFEST_FILE="${STAGE_DIR}/table_manifest.tsv"
mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='${TARGET_DB}' AND table_type='BASE TABLE' ORDER BY table_name;" | while read -r tbl; do
    if [ -n "${tbl}" ]; then
        rc=$(mysql --defaults-extra-file="${MYSQL_CNF}" -s -N -e "SELECT COUNT(*) FROM \`${TARGET_DB}\`.\`${tbl}\`;" 2>/dev/null || echo "0")
        printf '%s\t%s\n' "${tbl}" "${rc}"
    fi
done > "${MANIFEST_FILE}"

# 5. Non-Locking Consistent Dump & AES-256 PBKDF2 Encryption in Staging
STAGE_DUMP="${STAGE_DIR}/${BASE_FILENAME}.sql.gz"
STAGE_ENC="${STAGE_DIR}/${BASE_FILENAME}.sql.gz.enc"
STAGE_SHA="${STAGE_DIR}/${BASE_FILENAME}.sql.gz.enc.sha256"
STAGE_META="${STAGE_DIR}/${BASE_FILENAME}.meta.json"

echo "[INFO] Generating consistent dump in staging area..."
START_TIME=$(date +%s)

mysqldump --defaults-extra-file="${MYSQL_CNF}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    "${TARGET_DB}" | gzip -c -9 > "${STAGE_DUMP}"

if [ ! -s "${STAGE_DUMP}" ]; then
    echo "[CRITICAL ERROR] Dump file is empty or failed to generate!" >&2
    exit 17
fi

echo "[INFO] Encrypting dump via AES-256-CBC PBKDF2..."
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
    -in "${STAGE_DUMP}" \
    -out "${STAGE_ENC}" \
    -pass file:"${KEY_FILE}"

# Immediately remove raw plaintext dump from disk
rm -f "${STAGE_DUMP}"

if [ ! -s "${STAGE_ENC}" ]; then
    echo "[CRITICAL ERROR] Encryption failed or produced empty file!" >&2
    exit 18
fi

chmod 600 "${STAGE_ENC}"
ENC_SIZE=$(stat -c%s "${STAGE_ENC}")

# 6. Generate SHA-256 Checksum
(cd "${STAGE_DIR}" && sha256sum "$(basename "${STAGE_ENC}")" > "${STAGE_SHA}")
chmod 600 "${STAGE_SHA}"
CHECKSUM=$(awk '{print $1}' "${STAGE_SHA}")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 7. Write Authenticated Contract 2.0 Metadata Record with HMAC-SHA-256
python3 - "${STAGE_META}" "${TARGET_DB}" "${TIMESTAMP}" "$(basename "${STAGE_ENC}")" "${CHECKSUM}" "${ENC_SIZE}" "${SCHEMA_TABLES_COUNT}" "${SCHEMA_FKS_COUNT}" "${DURATION}" "${BACKUP_HMAC_KEY}" "${BACKUP_HMAC_KEY_ID}" "${PROFILE_TYPE}" "${ENFORCE_CANONICAL}" "${SCHEMA_VIEWS_COUNT}" "${SCHEMA_ROUTINES_COUNT}" "${SCHEMA_TRIGGERS_COUNT}" "${MANIFEST_FILE}" << 'PYEOF'
import sys
import json
import hmac
import hashlib

out_path = sys.argv[1]
db_name = sys.argv[2]
ts = sys.argv[3]
enc_name = sys.argv[4]
checksum = sys.argv[5]
enc_size = int(sys.argv[6])
tables_count = int(sys.argv[7])
fks_count = int(sys.argv[8])
duration = int(sys.argv[9])
hmac_key = sys.argv[10]
key_id = sys.argv[11]
profile_type = sys.argv[12]
enforce_canonical = (sys.argv[13].lower() == "true")
views_count = int(sys.argv[14])
routines_count = int(sys.argv[15])
triggers_count = int(sys.argv[16])
manifest_path = sys.argv[17]

table_manifest = {}
try:
    with open(manifest_path, 'r', encoding='utf-8') as mf:
        for line in mf:
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            if len(parts) == 2:
                table_manifest[parts[0]] = {"expected_rows": int(parts[1])}
except Exception:
    pass

# Contract Version 2.0 Envelope
envelope = {
    "database": db_name,
    "timestamp": ts,
    "encrypted_file": enc_name,
    "checksum_sha256": checksum,
    "encrypted_size_bytes": enc_size,
    "schema_tables_count": tables_count,
    "schema_foreign_keys_count": fks_count,
    "cipher": "aes-256-cbc-pbkdf2-iter100000",
    "compression": "gzip-level9",
    "single_transaction": True,
    "duration_seconds": duration,
    "status": "COMPLETED_VALID",
    "contract_version": "2.0",
    "key_id": key_id,
    "verification_profile": {
        "profile_type": profile_type,
        "enforce_canonical_core_tables": enforce_canonical,
        "schema_views_count": views_count,
        "schema_routines_count": routines_count,
        "schema_triggers_count": triggers_count,
        "table_manifest": table_manifest
    }
}

# Compute HMAC-SHA-256 over deterministic canonical UTF-8 JSON representation
canonical_bytes = json.dumps(envelope, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
mac = hmac.new(hmac_key.encode('utf-8'), canonical_bytes, hashlib.sha256).hexdigest().lower()
envelope["hmac_sha256"] = mac

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(envelope, f, indent=2)
PYEOF
chmod 600 "${STAGE_META}"

# 8. Publication Protocol: Publish Data Artifacts First, Metadata Record Last
if [ -e "${FINAL_ENC_FILE}" ] || [ -e "${FINAL_SHA_FILE}" ] || [ -e "${FINAL_META_FILE}" ]; then
    echo "[CRITICAL ERROR] Collision detected before publishing final artifacts. Aborting." >&2
    exit 19
fi

mv "${STAGE_ENC}" "${FINAL_ENC_FILE}"
mv "${STAGE_SHA}" "${FINAL_SHA_FILE}"
# Publish valid metadata record last as the completion marker
mv "${STAGE_META}" "${FINAL_META_FILE}"

echo "[SUCCESS] Encrypted backup created: $(basename "${FINAL_ENC_FILE}")"
echo "[SUCCESS] Checksum: ${CHECKSUM}"
echo "[SUCCESS] Metadata recorded in: $(basename "${FINAL_META_FILE}")"

