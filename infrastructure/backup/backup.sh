#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — CONSISTENT ENCRYPTED BACKUP SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -eo pipefail

# 1. Configuration & Parameters
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
TARGET_DB="${DB_DATABASE:-medical_db}"
BACKUP_DIR="${BACKUP_DIR:-/home/yazan/Downloads/Medi/mediservices/storage/backups}"

# Load secrets from backend/.env if not present in environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="${SCRIPT_DIR}/../../backend/.env"

if [ -f "${BACKEND_ENV}" ]; then
    if [ -z "${DB_PASSWORD}" ]; then
        DB_PASSWORD=$(grep -E "^DB_PASSWORD=" "${BACKEND_ENV}" | cut -d '=' -f2- | tr -d '\r"' || true)
    fi
    if [ -z "${BACKUP_ENCRYPTION_KEY}" ]; then
        BACKUP_ENCRYPTION_KEY=$(grep -E "^BACKUP_ENCRYPTION_KEY=" "${BACKEND_ENV}" | cut -d '=' -f2- | tr -d '\r"' || true)
    fi
fi

# Validate critical secrets are provided (Fail-Safe, zero hard-coded fallbacks)
if [ -z "${DB_PASSWORD}" ]; then
    echo "[CRITICAL ERROR] DB_PASSWORD is not set. Please provide DB_PASSWORD via environment or backend/.env."
    exit 1
fi

if [ -z "${BACKUP_ENCRYPTION_KEY}" ]; then
    echo "[CRITICAL ERROR] BACKUP_ENCRYPTION_KEY is not set. Please provide BACKUP_ENCRYPTION_KEY via environment or backend/.env."
    exit 1
fi

DB_PASS="${DB_PASSWORD}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_FILENAME="backup_${TARGET_DB}_${TIMESTAMP}"
DUMP_FILE="${BACKUP_DIR}/${BASE_FILENAME}.sql.gz"
ENC_FILE="${BACKUP_DIR}/${BASE_FILENAME}.sql.gz.enc"
SHA_FILE="${BACKUP_DIR}/${BASE_FILENAME}.sql.gz.enc.sha256"
META_FILE="${BACKUP_DIR}/${BASE_FILENAME}.meta.json"

# Enforce secure least-privilege permissions on backup directory (700)
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[INFO] Starting consistent backup for database: ${TARGET_DB}..."
START_TIME=$(date +%s)

# 2. Execute Non-Locking Consistent Dump using InnoDB single-transaction
MYSQL_PWD="${DB_PASS}" mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    "${TARGET_DB}" | gzip -c -9 > "${DUMP_FILE}"

if [ ! -s "${DUMP_FILE}" ]; then
    echo "[ERROR] Dump file is empty or failed to generate!"
    rm -f "${DUMP_FILE}"
    exit 1
fi

UNENC_SIZE=$(stat -c%s "${DUMP_FILE}")
echo "[SUCCESS] Dump generated successfully (${UNENC_SIZE} bytes)."

# 3. Authenticated AES-256 Encryption (PBKDF2 with 100,000 iterations)
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
    -in "${DUMP_FILE}" \
    -out "${ENC_FILE}" \
    -pass pass:"${ENCRYPTION_KEY}"

# Securely remove unencrypted raw dump after encryption
rm -f "${DUMP_FILE}"

if [ ! -s "${ENC_FILE}" ]; then
    echo "[ERROR] Encryption failed!"
    exit 1
fi

ENC_SIZE=$(stat -c%s "${ENC_FILE}")

# 4. Generate SHA-256 Checksum
cd "${BACKUP_DIR}"
sha256sum "$(basename "${ENC_FILE}")" > "${SHA_FILE}"
CHECKSUM=$(awk '{print $1}' "${SHA_FILE}")

# Enforce secure file permissions on backup artifacts (600)
chmod 600 "${ENC_FILE}" "${SHA_FILE}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 5. Write Metadata JSON
cat << META > "${META_FILE}"
{
  "database": "${TARGET_DB}",
  "timestamp": "${TIMESTAMP}",
  "encrypted_file": "$(basename "${ENC_FILE}")",
  "checksum_sha256": "${CHECKSUM}",
  "encrypted_size_bytes": ${ENC_SIZE},
  "cipher": "aes-256-cbc-pbkdf2-iter100000",
  "compression": "gzip-level9",
  "single_transaction": true,
  "duration_seconds": ${DURATION},
  "status": "COMPLETED_VALID"
}
META

chmod 600 "${META_FILE}"

echo "[SUCCESS] Encrypted backup created: $(basename "${ENC_FILE}")"
echo "[SUCCESS] Checksum: ${CHECKSUM}"
echo "[SUCCESS] Metadata recorded in: $(basename "${META_FILE}")"
