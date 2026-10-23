#!/bin/bash
# ==============================================================================
# AAFIYA PLATFORM — BACKUP INTEGRITY & CHECKSUM VERIFIER
# Project: Aafiya — Unified National Digital Health Platform
# Workstream: P20-O6 Backup, Encryption & Automated Restore Drills
# ==============================================================================

set -Eeuo pipefail

TARGET_FILE="${1:-}"

if [ -z "${TARGET_FILE}" ]; then
    echo "[ERROR] Usage: $0 <path_to_encrypted_backup.sql.gz.enc>" >&2
    exit 1
fi

if [ ! -f "${TARGET_FILE}" ]; then
    echo "[ERROR] File not found: ${TARGET_FILE}" >&2
    exit 1
fi

DIRNAME=$(cd "$(dirname "${TARGET_FILE}")" && pwd)
BASENAME=$(basename "${TARGET_FILE}")
SHA_FILE="${DIRNAME}/${BASENAME}.sha256"
META_FILE="${DIRNAME}/${BASENAME%.sql.gz.enc}.meta.json"

if [ ! -f "${SHA_FILE}" ]; then
    echo "[CRITICAL ERROR] Checksum signature file not found: ${SHA_FILE}" >&2
    exit 1
fi

if [ ! -f "${META_FILE}" ]; then
    echo "[CRITICAL ERROR] Metadata record file not found: ${META_FILE}" >&2
    exit 1
fi

EXPECTED_SHA=$(awk '{print $1}' "${SHA_FILE}" | tr -d '[:space:]')
if [ -z "${EXPECTED_SHA}" ] || ! [[ "${EXPECTED_SHA}" =~ ^[a-fA-F0-9]{64}$ ]]; then
    echo "[CRITICAL ERROR] Checksum file is empty, missing, or malformed: '${EXPECTED_SHA}'" >&2
    exit 1
fi

ACTUAL_SHA=$(cd "${DIRNAME}" && sha256sum "${BASENAME}" | awk '{print $1}' | tr -d '[:space:]')
if [ -z "${ACTUAL_SHA}" ] || ! [[ "${ACTUAL_SHA}" =~ ^[a-fA-F0-9]{64}$ ]]; then
    echo "[CRITICAL ERROR] Failed to compute SHA-256 digest from '${BASENAME}'" >&2
    exit 1
fi

if [ "${EXPECTED_SHA,,}" != "${ACTUAL_SHA,,}" ]; then
    echo "[CRITICAL ERROR] SHA-256 Checksum mismatch!" >&2
    echo "  Expected: ${EXPECTED_SHA}" >&2
    echo "  Actual:   ${ACTUAL_SHA}" >&2
    exit 1
fi

# Run coreutils standard checksum verification
(cd "${DIRNAME}" && sha256sum --check --status "${BASENAME}.sha256") || {
    echo "[CRITICAL ERROR] sha256sum standard check failed." >&2
    exit 1
}

TARGET_SIZE=$(stat -c%s "${TARGET_FILE}")
if [ "${TARGET_SIZE}" -le 0 ]; then
    echo "[CRITICAL ERROR] Target encrypted file is empty (0 bytes)." >&2
    exit 1
fi

# 5. Resolve HMAC Key for Authenticated Backups
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="${SCRIPT_DIR}/../../backend/.env"

ALLOW_LEGACY_VERIFICATION="${ALLOW_LEGACY_VERIFICATION:-0}"

if [ -n "${CREDENTIALS_DIRECTORY:-}" ]; then
    if [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY" ]; then
        BACKUP_HMAC_KEY=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY")
    fi
    if [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_ID" ]; then
        BACKUP_HMAC_KEY_ID=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEY_ID")
    fi
    if [ -f "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEYS" ]; then
        BACKUP_HMAC_KEYS=$(cat "${CREDENTIALS_DIRECTORY}/BACKUP_HMAC_KEYS")
    fi
elif [ -f "${BACKEND_ENV}" ]; then
    if [ -z "${BACKUP_HMAC_KEY:-}" ]; then
        BACKUP_HMAC_KEY=$(grep -E '^[[:space:]]*BACKUP_HMAC_KEY=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
    if [ -z "${BACKUP_HMAC_KEY_ID:-}" ]; then
        BACKUP_HMAC_KEY_ID=$(grep -E '^[[:space:]]*BACKUP_HMAC_KEY_ID=' "${BACKEND_ENV}" | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
    fi
fi

BACKUP_HMAC_KEY="${BACKUP_HMAC_KEY:-}"
BACKUP_HMAC_KEY_ID="${BACKUP_HMAC_KEY_ID:-v1}"
BACKUP_HMAC_KEYS="${BACKUP_HMAC_KEYS:-}"

# 6. Execute Hermetic Python validation of the metadata contract & HMAC envelope
python3 - "${META_FILE}" "${BASENAME}" "${TARGET_SIZE}" "${ACTUAL_SHA}" "${BACKUP_HMAC_KEY}" "${BACKUP_HMAC_KEY_ID}" "${BACKUP_HMAC_KEYS}" "${ALLOW_LEGACY_VERIFICATION}" << 'PYEOF'
import sys
import json
import re
import hmac
import hashlib
import os
from datetime import datetime

meta_path = sys.argv[1]
expected_enc_name = sys.argv[2]
expected_enc_size = int(sys.argv[3])
computed_sha256 = sys.argv[4].strip().lower()
default_hmac_key = sys.argv[5]
default_key_id = sys.argv[6]
historical_keys_json = sys.argv[7]
allow_legacy = (sys.argv[8] == "1")

# Parse historical keys dictionary if provided
keys_map = {}
if default_hmac_key:
    keys_map[default_key_id] = default_hmac_key
if historical_keys_json:
    try:
        parsed_keys = json.loads(historical_keys_json)
        if isinstance(parsed_keys, dict):
            keys_map.update(parsed_keys)
    except Exception:
        pass

# Discover keys from systemd CREDENTIALS_DIRECTORY if present
cred_dir = os.environ.get("CREDENTIALS_DIRECTORY")
if cred_dir and os.path.isdir(cred_dir):
    json_keys_path = os.path.join(cred_dir, "BACKUP_HMAC_KEYS")
    if os.path.isfile(json_keys_path):
        try:
            with open(json_keys_path, 'r', encoding='utf-8') as jf:
                parsed = json.load(jf)
                if isinstance(parsed, dict):
                    keys_map.update(parsed)
        except Exception:
            pass
    try:
        for fname in os.listdir(cred_dir):
            if fname.startswith("BACKUP_HMAC_KEY_") and not fname.endswith(("_ID", ".sha256")):
                kid = fname[len("BACKUP_HMAC_KEY_"):]
                if kid and kid not in keys_map:
                    try:
                        with open(os.path.join(cred_dir, fname), 'r', encoding='utf-8') as kf:
                            keys_map[kid] = kf.read().strip()
                    except Exception:
                        pass
    except Exception:
        pass

def reject_duplicate_keys(pairs):
    res = {}
    for k, v in pairs:
        if k in res:
            raise ValueError(f"DUPLICATE_KEY_DETECTED:{k}")
        res[k] = v
    return res

try:
    with open(meta_path, 'r', encoding='utf-8') as f:
        raw_text = f.read()
    data = json.loads(raw_text, object_pairs_hook=reject_duplicate_keys)
except ValueError as e:
    sys.stderr.write(f"Metadata JSON parsing rejected: {e}\n")
    sys.exit(20)
except Exception as e:
    sys.stderr.write(f"Metadata read error: {e}\n")
    sys.exit(20)

if type(data) is not dict:
    sys.stderr.write("Metadata root must be a JSON object\n")
    sys.exit(20)

is_contract_v2 = ("contract_version" in data or "hmac_sha256" in data)

if not is_contract_v2:
    # Legacy Format Handling
    if not allow_legacy:
        sys.stderr.write("[CRITICAL ERROR] Legacy unauthenticated backup rejected. Backup lacks an HMAC envelope and verification profile. Set ALLOW_LEGACY_VERIFICATION=1 for explicit operator review.\n")
        sys.exit(45)

    LEGACY_REQUIRED_FIELDS = {
        "database", "timestamp", "encrypted_file", "checksum_sha256",
        "encrypted_size_bytes", "schema_tables_count", "schema_foreign_keys_count",
        "cipher", "compression", "single_transaction", "duration_seconds", "status"
    }
    if set(data.keys()) != LEGACY_REQUIRED_FIELDS:
        sys.stderr.write(f"Schema mismatch: expected {LEGACY_REQUIRED_FIELDS}, found {set(data.keys())}\n")
        sys.exit(20)
else:
    # Contract 2.0 Authenticated Envelope Validation
    V2_REQUIRED_FIELDS = {
        "database", "timestamp", "encrypted_file", "checksum_sha256",
        "encrypted_size_bytes", "schema_tables_count", "schema_foreign_keys_count",
        "cipher", "compression", "single_transaction", "duration_seconds", "status",
        "contract_version", "key_id", "verification_profile", "hmac_sha256"
    }
    if set(data.keys()) != V2_REQUIRED_FIELDS:
        sys.stderr.write(f"Schema mismatch: expected {V2_REQUIRED_FIELDS}, found {set(data.keys())}\n")
        sys.exit(20)

    if data["contract_version"] != "2.0":
        sys.stderr.write(f"Unsupported contract version: '{data.get('contract_version')}'. Expected '2.0'\n")
        sys.exit(43)

    key_id = data["key_id"]
    if type(key_id) is not str or not re.match(r'^[a-zA-Z0-9_-]+$', key_id):
        sys.stderr.write(f"Invalid key_id format: '{key_id}'\n")
        sys.exit(42)

    # Resolve HMAC key
    hmac_key = keys_map.get(key_id) or os.environ.get(f"BACKUP_HMAC_KEY_{key_id}")
    if not hmac_key and default_hmac_key and key_id == default_key_id:
        hmac_key = default_hmac_key

    if not hmac_key:
        if not default_hmac_key and not keys_map:
            sys.stderr.write("Missing HMAC key for authenticated backup. Please set BACKUP_HMAC_KEY.\n")
            sys.exit(41)
        else:
            sys.stderr.write(f"Unknown or unconfigured key_id: '{key_id}'\n")
            sys.exit(42)

    received_hmac = str(data["hmac_sha256"]).strip().lower()
    if not re.match(r'^[a-f0-9]{64}$', received_hmac):
        sys.stderr.write(f"Invalid HMAC-SHA-256 format: '{received_hmac}'\n")
        sys.exit(40)

    # Canonical UTF-8 JSON serialization of envelope (all keys except hmac_sha256)
    envelope_to_verify = {k: v for k, v in data.items() if k != "hmac_sha256"}
    canonical_bytes = json.dumps(envelope_to_verify, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    computed_mac = hmac.new(hmac_key.encode('utf-8'), canonical_bytes, hashlib.sha256).hexdigest().lower()

    if not hmac.compare_digest(received_hmac, computed_mac):
        sys.stderr.write("HMAC-SHA-256 authentication failed! Metadata envelope has been tampered with or key is incorrect.\n")
        sys.exit(40)

    # Validate verification_profile structure
    vp = data["verification_profile"]
    if type(vp) is not dict:
        sys.stderr.write("Field 'verification_profile' must be a dictionary\n")
        sys.exit(44)

    REQUIRED_VP_FIELDS = {
        "profile_type", "enforce_canonical_core_tables",
        "schema_views_count", "schema_routines_count", "schema_triggers_count",
        "table_manifest"
    }
    if set(vp.keys()) != REQUIRED_VP_FIELDS:
        sys.stderr.write(f"Verification profile schema mismatch: expected {REQUIRED_VP_FIELDS}, found {set(vp.keys())}\n")
        sys.exit(44)

    if vp["profile_type"] not in ["canonical_production", "synthetic_drill"]:
        sys.stderr.write(f"Invalid profile_type: '{vp.get('profile_type')}'. Must be 'canonical_production' or 'synthetic_drill'\n")
        sys.exit(44)

    if type(vp["enforce_canonical_core_tables"]) is not bool:
        sys.stderr.write("Field 'enforce_canonical_core_tables' must be a boolean\n")
        sys.exit(44)

    for count_field in ["schema_views_count", "schema_routines_count", "schema_triggers_count"]:
        if type(vp[count_field]) is not int or vp[count_field] < 0:
            sys.stderr.write(f"Field '{count_field}' must be a non-negative integer\n")
            sys.exit(44)

    if type(vp["table_manifest"]) is not dict:
        sys.stderr.write("Field 'table_manifest' must be a dictionary mapping table names to properties\n")
        sys.exit(44)

    for tbl, tbl_meta in vp["table_manifest"].items():
        if type(tbl_meta) is not dict or "expected_rows" not in tbl_meta or type(tbl_meta["expected_rows"]) is not int or tbl_meta["expected_rows"] < 0:
            sys.stderr.write(f"Table manifest entry for '{tbl}' is invalid or missing non-negative 'expected_rows'\n")
            sys.exit(44)

# Common field validations
if type(data["database"]) is not str or not re.match(r'^[a-zA-Z0-9_]+$', data["database"]):
    sys.stderr.write("Field 'database' must be a valid alphanumeric identifier string\n")
    sys.exit(21)

if type(data["timestamp"]) is not str or not re.match(r'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$', data["timestamp"]):
    sys.stderr.write("Field 'timestamp' must be ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)\n")
    sys.exit(22)

try:
    datetime.strptime(data["timestamp"], "%Y-%m-%dT%H:%M:%SZ")
except ValueError as e:
    sys.stderr.write(f"Field 'timestamp' contains invalid calendar values: {e}\n")
    sys.exit(22)

if type(data["encrypted_file"]) is not str or data["encrypted_file"] != expected_enc_name:
    sys.stderr.write(f"Field 'encrypted_file' mismatch: expected {expected_enc_name}, got {data.get('encrypted_file')}\n")
    sys.exit(23)

meta_sha = str(data["checksum_sha256"]).strip().lower()
if type(data["checksum_sha256"]) is not str or not re.match(r'^[a-f0-9]{64}$', meta_sha) or meta_sha != computed_sha256:
    sys.stderr.write("Field 'checksum_sha256' is invalid or does not match artifact digest\n")
    sys.exit(24)

if type(data["encrypted_size_bytes"]) is not int or data["encrypted_size_bytes"] != expected_enc_size or data["encrypted_size_bytes"] <= 0:
    sys.stderr.write(f"Field 'encrypted_size_bytes' must be an integer matching disk size ({expected_enc_size})\n")
    sys.exit(25)

if type(data["schema_tables_count"]) is not int or data["schema_tables_count"] < 0:
    sys.stderr.write("Field 'schema_tables_count' must be a non-negative integer\n")
    sys.exit(26)

if type(data["schema_foreign_keys_count"]) is not int or data["schema_foreign_keys_count"] < 0:
    sys.stderr.write("Field 'schema_foreign_keys_count' must be a non-negative integer\n")
    sys.exit(27)

if data["cipher"] != "aes-256-cbc-pbkdf2-iter100000":
    sys.stderr.write(f"Field 'cipher' unsupported: {data['cipher']}\n")
    sys.exit(28)

if data["compression"] != "gzip-level9":
    sys.stderr.write(f"Field 'compression' unsupported: {data['compression']}\n")
    sys.exit(29)

if type(data["single_transaction"]) is not bool or data["single_transaction"] is not True:
    sys.stderr.write("Field 'single_transaction' must be boolean true\n")
    sys.exit(30)

if type(data["duration_seconds"]) is not int or data["duration_seconds"] < 0:
    sys.stderr.write("Field 'duration_seconds' must be a non-negative integer\n")
    sys.exit(31)

if data["status"] != "COMPLETED_VALID":
    sys.stderr.write(f"Field 'status' must be COMPLETED_VALID, got: {data['status']}\n")
    sys.exit(32)

if not is_contract_v2:
    sys.stderr.write("[WARNING] Legacy unauthenticated backup verified against 12-field schema and SHA-256 checksum.\n")
    sys.stderr.write("[WARNING] Metadata Authenticity (HMAC), contract version, and fidelity manifest are NOT VERIFIED.\n")
else:
    print(f"[SUCCESS] Backup artifact set is verified, authenticated (HMAC-SHA-256 [key_id: {data['key_id']}]), and valid: {expected_enc_name}")

sys.exit(0)
PYEOF

exit 0

