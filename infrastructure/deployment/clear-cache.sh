#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — CLEAR PRODUCTION CACHES (ROLLBACK / FLUSH)
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O5 Production Infrastructure
# ==============================================================================

set -e

PROJECT_ROOT="/var/www/aafiya"
BACKEND_DIR="${PROJECT_ROOT}/backend"

echo "=== Clearing Application & Optimization Caches ==="
php "${BACKEND_DIR}/artisan" optimize:clear

echo "=== [OK] All Caches Flushed Successfully ==="
