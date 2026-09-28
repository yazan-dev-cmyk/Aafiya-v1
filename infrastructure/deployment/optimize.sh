#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — PRODUCTION OPTIMIZATION & CACHE WARMING RECIPE
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O5 Production Infrastructure
# ==============================================================================

set -e

PROJECT_ROOT="/var/www/aafiya"
BACKEND_DIR="${PROJECT_ROOT}/backend"

echo "=== [1/4] Optimizing Configuration Cache ==="
php "${BACKEND_DIR}/artisan" config:cache

echo "=== [2/4] Optimizing Route Cache ==="
php "${BACKEND_DIR}/artisan" route:cache

echo "=== [3/4] Optimizing Blade Views Cache ==="
php "${BACKEND_DIR}/artisan" view:cache

echo "=== [4/4] Optimizing Events Discovery Cache ==="
php "${BACKEND_DIR}/artisan" event:cache

echo "=== [OK] Production Caching Optimization Complete ==="
