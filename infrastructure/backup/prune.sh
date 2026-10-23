#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — AUTOMATED BACKUP RETENTION & PRUNING SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/home/yazan/Downloads/Medi/mediservices/storage/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MIN_KEEP="${MIN_KEEP:-1}"

# DEF-02: Strictly validate retention parameters as non-negative decimal integers
if ! [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] RETENTION_DAYS must be a non-negative decimal integer. Got: '${RETENTION_DAYS}'" >&2
    exit 1
fi

if ! [[ "${MIN_KEEP}" =~ ^[0-9]+$ ]]; then
    echo "[CRITICAL ERROR] MIN_KEEP must be a non-negative decimal integer. Got: '${MIN_KEEP}'" >&2
    exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
    echo "[ERROR] Backup directory does not exist: ${BACKUP_DIR}" >&2
    exit 1
fi
BACKUP_DIR=$(cd "${BACKUP_DIR}" && pwd)

echo "[INFO] Running automated backup pruning in ${BACKUP_DIR}..."
echo "[INFO] Retention Policy: ${RETENTION_DAYS} days | Minimum Valid Backups Kept: ${MIN_KEEP}"

VALID_BACKUP_ENTRIES=()
INVALID_BACKUPS=()

# 1. Inspect all candidate backup artifacts against the full verification contract
while IFS= read -r -d '' enc_file; do
    if "${SCRIPT_DIR}/verify-integrity.sh" "${enc_file}" > /dev/null 2>&1; then
        meta_file="${enc_file%.sql.gz.enc}.meta.json"
        ts=$(python3 -c 'import sys, json; print(json.load(open(sys.argv[1]))["timestamp"])' "${meta_file}" 2>/dev/null || true)
        if [[ "${ts}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
            VALID_BACKUP_ENTRIES+=("${ts}	${enc_file}")
        else
            INVALID_BACKUPS+=("${enc_file}")
        fi
    else
        INVALID_BACKUPS+=("${enc_file}")
    fi
done < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "backup_*.sql.gz.enc" -print0)

TOTAL_VALID="${#VALID_BACKUP_ENTRIES[@]}"
echo "[INFO] Verified ${TOTAL_VALID} valid, complete backup set(s) on disk."

# 2. Check Minimum Retention Invariant
if [ "${TOTAL_VALID}" -le "${MIN_KEEP}" ]; then
    echo "[INFO] Only ${TOTAL_VALID} valid backup set(s) exist (MIN_KEEP=${MIN_KEEP}). Preserving all recovery points."
fi

# DEF-01: Sort valid backups in ascending chronological order (oldest first) based on validated metadata timestamp
VALID_BACKUPS_SORTED=()
if [ "${TOTAL_VALID}" -gt 0 ]; then
    while IFS= read -r line; do
        enc_path=$(printf '%s' "${line}" | cut -f2-)
        VALID_BACKUPS_SORTED+=("${enc_path}")
    done < <(printf '%s\n' "${VALID_BACKUP_ENTRIES[@]}" | sort -k1,1)
fi

REMAINING_VALID="${TOTAL_VALID}"
PRUNED_COUNT=0

# 3. Prune expired valid backups starting from the oldest, preserving newest recovery points
for valid_file in "${VALID_BACKUPS_SORTED[@]}"; do
    # Check if file modification time is older than RETENTION_DAYS
    IS_EXPIRED=$(find "${valid_file}" -mtime +"${RETENTION_DAYS}" -print 2>/dev/null || true)

    if [ -n "${IS_EXPIRED}" ]; then
        if [ "${REMAINING_VALID}" -gt "${MIN_KEEP}" ]; then
            echo "[INFO] Pruning expired valid backup set: $(basename "${valid_file}")"
            rm -f "${valid_file}" "${valid_file}.sha256" "${valid_file%.sql.gz.enc}.meta.json"
            REMAINING_VALID=$((REMAINING_VALID - 1))
            PRUNED_COUNT=$((PRUNED_COUNT + 1))
        else
            echo "[INFO] Preserving expired backup set '$(basename "${valid_file}")' to satisfy minimum recovery count (${MIN_KEEP})."
        fi
    fi
done

# 4. Report unverified, incomplete, or corrupted artifacts without automatic deletion
if [ "${#INVALID_BACKUPS[@]}" -gt 0 ]; then
    echo "[WARNING] Detected ${#INVALID_BACKUPS[@]} incomplete, orphaned, or unverified backup artifact(s):"
    for inv in "${INVALID_BACKUPS[@]}"; do
        echo "  - $(basename "${inv}")"
    done
    echo "[WARNING] These artifacts were preserved for operator review (fail-safe policy)."
fi

echo "[SUCCESS] Backup pruning completed. Pruned sets: ${PRUNED_COUNT} | Remaining valid sets: ${REMAINING_VALID}."
exit 0

