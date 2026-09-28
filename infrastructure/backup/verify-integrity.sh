#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — BACKUP INTEGRITY & CHECKSUM VERIFIER
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -eo pipefail

TARGET_FILE="$1"

if [ -z "${TARGET_FILE}" ]; then
    echo "[ERROR] Usage: $0 <path_to_encrypted_backup.sql.gz.enc>"
    exit 1
fi

if [ ! -f "${TARGET_FILE}" ]; then
    echo "[ERROR] File not found: ${TARGET_FILE}"
    exit 1
fi

DIRNAME=$(dirname "${TARGET_FILE}")
BASENAME=$(basename "${TARGET_FILE}")
SHA_FILE="${DIRNAME}/${BASENAME}.sha256"

if [ ! -f "${SHA_FILE}" ]; then
    echo "[ERROR] Checksum signature file not found: ${SHA_FILE}"
    exit 1
fi

EXPECTED_SHA=$(awk '{print $1}' "${SHA_FILE}")
ACTUAL_SHA=$(cd "${DIRNAME}" && sha256sum "${BASENAME}" | awk '{print $1}')

echo "[INFO] Verifying SHA-256 Checksum for: ${BASENAME}"
echo "[INFO] Expected Checksum: ${EXPECTED_SHA}"
echo "[INFO] Actual Checksum:   ${ACTUAL_SHA}"

if [ "${EXPECTED_SHA}" = "${ACTUAL_SHA}" ]; then
    echo "[SUCCESS] INTEGRITY CHECK PASSED (Valid, uncorrupted backup artifact)."
    exit 0
else
    echo "[CRITICAL ERROR] INTEGRITY CHECK FAILED (Artifact is corrupted, truncated or tampered)!"
    exit 1
fi
