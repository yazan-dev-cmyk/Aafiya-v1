#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — AUTOMATED BACKUP RETENTION & PRUNING SCRIPT
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/yazan/Downloads/Medi/mediservices/storage/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "[INFO] Running automated backup pruning in ${BACKUP_DIR} (Retention: ${RETENTION_DAYS} days)..."

# Safety check: Ensure at least one valid backup exists before pruning
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "*.sql.gz.enc" | wc -l)
if [ "${TOTAL_BACKUPS}" -le 1 ]; then
    echo "[INFO] Only ${TOTAL_BACKUPS} backup point(s) exist. Preserving all recovery points (Safety Invariant)."
    exit 0
fi

# Find and prune backups older than RETENTION_DAYS, keeping meta and signatures aligned
find "${BACKUP_DIR}" -type f -name "*.sql.gz.enc" -mtime +"${RETENTION_DAYS}" | while read -r old_file; do
    echo "[INFO] Pruning expired backup: ${old_file}"
    rm -f "${old_file}" "${old_file}.sha256" "${old_file%.sql.gz.enc}.meta.json"
done

echo "[SUCCESS] Backup pruning completed successfully."
