#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — SECURE ISOLATED DATABASE RESTORE SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -eo pipefail

TARGET_ENC_FILE="$1"
RESTORE_DB="$2"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"

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

if [ -z "${TARGET_ENC_FILE}" ] || [ -z "${RESTORE_DB}" ]; then
    echo "[ERROR] Usage: $0 <path_to_encrypted_backup.sql.gz.enc> <target_restore_database>"
    exit 1
fi

# [SAFETY INVARIANT] Absolute ban on restoring into production medical_db
if [ "${RESTORE_DB}" = "medical_db" ]; then
    echo "[CRITICAL ERROR] RESTORE TO PRIMARY PRODUCTION DATABASE 'medical_db' IS STRICTLY PROHIBITED!"
    exit 1
fi

if [ ! -f "${TARGET_ENC_FILE}" ]; then
    echo "[ERROR] Encrypted backup file not found: ${TARGET_ENC_FILE}"
    exit 1
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

# 1. Step 1: Verify Checksum Integrity
echo "=== [1/4] Verifying Artifact Checksum Integrity ==="
/home/yazan/Downloads/Medi/mediservices/infrastructure/backup/verify-integrity.sh "${TARGET_ENC_FILE}"

# 2. Step 2: Ensure Isolated Target Database Exists
echo "=== [2/4] Initializing Target Restore Database: ${RESTORE_DB} ==="
MYSQL_PWD="${DB_PASS}" mysql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Step 3: Decrypt & Restore Stream via Pipe (No Plaintext File on Disk)
echo "=== [3/4] Decrypting & Streaming Dump into ${RESTORE_DB} ==="
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "${TARGET_ENC_FILE}" \
    -pass pass:"${ENCRYPTION_KEY}" | \
    gzip -d -c | \
    MYSQL_PWD="${DB_PASS}" mysql \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        "${RESTORE_DB}"

echo "[SUCCESS] Restore execution finished successfully for ${RESTORE_DB}."

# 4. Step 4: Validate Restored Structure
echo "=== [4/4] Validating Structural & Data Integrity in ${RESTORE_DB} ==="
TABLES_COUNT=$(MYSQL_PWD="${DB_PASS}" mysql -N -B --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DB}';")
FKS_COUNT=$(MYSQL_PWD="${DB_PASS}" mysql -N -B --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" -e "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='${RESTORE_DB}';")
USERS_COUNT=$(MYSQL_PWD="${DB_PASS}" mysql -N -B --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" -e "SELECT COUNT(*) FROM \`${RESTORE_DB}\`.users;")

echo "[INFO] Restored Database Tables:       ${TABLES_COUNT} (Expected: 40)"
echo "[INFO] Restored Foreign Keys:         ${FKS_COUNT} (Expected: 62)"
echo "[INFO] Restored Administrative Users: ${USERS_COUNT} (Expected: 1)"

if [ "${TABLES_COUNT}" -eq 40 ] && [ "${FKS_COUNT}" -eq 62 ] && [ "${USERS_COUNT}" -eq 1 ]; then
    echo "[SUCCESS] RESTORE DRILL INTEGRITY VALIDATION PASSED 100%!"
    exit 0
else
    echo "[CRITICAL ERROR] RESTORE DRILL VALIDATION FAILED (Structural mismatch)!"
    exit 1
fi
