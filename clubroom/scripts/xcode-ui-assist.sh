#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
IOS_DIR="${ROOT_DIR}/ios"
OUT_DIR="${IOS_UI_OUT_DIR:-${ROOT_DIR}/.ui-shots}"
DEVICE_REQUEST="${IOS_SIM_DEVICE:-iPhone 16 Pro}"

mkdir -p "${OUT_DIR}"

log() {
  printf "[xcode-ui] %s\n" "$*"
}

err() {
  printf "[xcode-ui] ERROR: %s\n" "$*" >&2
}

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    err "Missing required command: ${cmd}"
    exit 1
  fi
}

usage() {
  cat <<'USAGE'
Usage:
  bash ./scripts/xcode-ui-assist.sh <command> [name] [--device "iPhone Name"]

Commands:
  doctor            Verify Xcode + simulator tooling.
  devices           List available iPhone simulators.
  open              Open Xcode project/workspace and boot simulator.
  run               Open Xcode/simulator and run app (expo run:ios).
  shot [name]       Save screenshot from the booted simulator.
  record [name]     Record video from simulator until Ctrl+C.
  latest            Print latest capture path and copy to clipboard.
  open-shots        Open capture folder in Finder.
  help              Show this help.

Environment:
  IOS_SIM_DEVICE    Default simulator name (default: iPhone 16 Pro)
  IOS_UI_OUT_DIR    Capture folder (default: <repo>/.ui-shots)
USAGE
}

sanitize_label() {
  local raw="${1:-capture}"
  local cleaned
  cleaned="$(printf "%s" "${raw}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]_-')"
  if [[ -z "${cleaned}" ]]; then
    cleaned="capture"
  fi
  printf "%s" "${cleaned}"
}

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

pick_device() {
  local requested="${1:-}"
  xcrun simctl list devices available -j | node - "${requested}" <<'NODE'
const requested = (process.argv[2] || '').trim().toLowerCase();
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    process.exit(2);
  }

  const devices = [];
  for (const [runtime, list] of Object.entries(parsed.devices || {})) {
    for (const item of list || []) {
      if (!item || !item.isAvailable) continue;
      if (!String(item.name || '').toLowerCase().includes('iphone')) continue;
      devices.push({
        udid: item.udid,
        name: item.name,
        state: item.state || 'Unknown',
        runtime,
        score: runtimeScore(runtime),
      });
    }
  }

  if (devices.length === 0) {
    process.exit(3);
  }

  devices.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const booted = devices.filter((d) => d.state === 'Booted');

  const exact = (arr) => arr.find((d) => d.name.toLowerCase() === requested) || null;
  const fuzzy = (arr) => arr.find((d) => d.name.toLowerCase().includes(requested)) || null;

  let selected = null;
  if (requested) {
    selected = exact(booted) || exact(devices) || fuzzy(booted) || fuzzy(devices);
  } else {
    selected = booted[0] || devices[0];
  }

  if (!selected) {
    process.exit(4);
  }

  process.stdout.write(
    [selected.udid, selected.name, selected.state, selected.runtime].join('\t')
  );
});

function runtimeScore(runtime) {
  const ios = runtime.match(/iOS-(\d+)-(\d+)/i);
  if (ios) return Number(ios[1]) * 100 + Number(ios[2]);
  return -1;
}
NODE
}

list_devices() {
  xcrun simctl list devices available -j | node - <<'NODE'
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  const parsed = JSON.parse(raw);
  const rows = [];
  for (const [runtime, list] of Object.entries(parsed.devices || {})) {
    for (const item of list || []) {
      if (!item || !item.isAvailable) continue;
      if (!String(item.name || '').toLowerCase().includes('iphone')) continue;
      rows.push({
        name: item.name,
        state: item.state || 'Unknown',
        runtime: runtime.replace('com.apple.CoreSimulator.SimRuntime.', ''),
        udid: item.udid,
      });
    }
  }

  rows.sort((a, b) => (a.runtime < b.runtime ? 1 : -1));
  if (rows.length === 0) {
    console.log('No available iPhone simulators found.');
    return;
  }

  for (const row of rows) {
    console.log(`${row.name}\t${row.state}\t${row.runtime}\t${row.udid}`);
  }
});
NODE
}

copy_to_clipboard() {
  local value="$1"
  if command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "${value}" | pbcopy
    log "Copied path to clipboard."
  fi
}

resolve_device() {
  local requested="${1:-${DEVICE_REQUEST}}"
  local selected
  if ! selected="$(pick_device "${requested}")"; then
    if [[ -n "${requested}" ]]; then
      err "No simulator matched '${requested}'. Falling back to any available iPhone."
      selected="$(pick_device "")" || {
        err "No available iPhone simulators were found."
        exit 1
      }
    else
      err "No available iPhone simulators were found."
      exit 1
    fi
  fi
  IFS=$'\t' read -r SIM_UDID SIM_NAME SIM_STATE SIM_RUNTIME <<<"${selected}"
}

ensure_booted() {
  open -a Simulator --args -CurrentDeviceUDID "${SIM_UDID}" >/dev/null 2>&1 || true
  if [[ "${SIM_STATE}" != "Booted" ]]; then
    log "Booting '${SIM_NAME}'..."
    xcrun simctl boot "${SIM_UDID}" >/dev/null 2>&1 || true
  fi
  xcrun simctl bootstatus "${SIM_UDID}" -b >/dev/null
}

open_xcode() {
  local workspace
  workspace="$(find "${IOS_DIR}" -maxdepth 1 -type d -name "*.xcworkspace" | head -n 1 || true)"
  if [[ -n "${workspace}" ]]; then
    open -a Xcode "${workspace}"
    log "Opened workspace: ${workspace}"
    return
  fi

  local project
  project="$(find "${IOS_DIR}" -maxdepth 1 -type d -name "*.xcodeproj" | head -n 1 || true)"
  if [[ -n "${project}" ]]; then
    open -a Xcode "${project}"
    log "Opened project: ${project}"
    return
  fi

  open -a Xcode "${IOS_DIR}"
  log "Opened iOS folder: ${IOS_DIR}"
}

run_app() {
  log "Running app on '${SIM_NAME}' (Expo -> Xcode build)..."
  (
    cd "${ROOT_DIR}"
    npx expo run:ios --device "${SIM_NAME}"
  )
}

require_cmd bash
require_cmd node
require_cmd xcrun
require_cmd open

cmd="${1:-help}"
shift || true

args=()
while (($# > 0)); do
  case "$1" in
    --device)
      shift || true
      DEVICE_REQUEST="${1:-}"
      if [[ -z "${DEVICE_REQUEST}" ]]; then
        err "--device requires a simulator name."
        exit 1
      fi
      ;;
    *)
      args+=("$1")
      ;;
  esac
  shift || true
done

case "${cmd}" in
  help|-h|--help)
    usage
    ;;
  doctor)
    log "xcode-select: $(xcode-select -p)"
    log "Xcode version: $(xcodebuild -version | tr '\n' ' ' | sed 's/  */ /g')"
    log "Output folder: ${OUT_DIR}"
    log "Default simulator: ${DEVICE_REQUEST}"
    ;;
  devices)
    list_devices
    ;;
  open)
    resolve_device "${DEVICE_REQUEST}"
    ensure_booted
    open_xcode
    log "Simulator ready: ${SIM_NAME} (${SIM_RUNTIME})"
    ;;
  run)
    resolve_device "${DEVICE_REQUEST}"
    ensure_booted
    open_xcode
    run_app
    ;;
  shot)
    resolve_device "${DEVICE_REQUEST}"
    ensure_booted
    label="$(sanitize_label "${args[0]:-screen}")"
    file="${OUT_DIR}/${label}-$(timestamp).png"
    xcrun simctl io "${SIM_UDID}" screenshot "${file}" >/dev/null
    log "Saved screenshot: ${file}"
    copy_to_clipboard "${file}"
    ;;
  record)
    resolve_device "${DEVICE_REQUEST}"
    ensure_booted
    label="$(sanitize_label "${args[0]:-flow}")"
    file="${OUT_DIR}/${label}-$(timestamp).mp4"
    log "Recording to ${file}"
    log "Press Ctrl+C to stop."
    set +e
    xcrun simctl io "${SIM_UDID}" recordVideo --codec=h264 "${file}"
    record_exit_code=$?
    set -e
    if [[ ${record_exit_code} -ne 0 && ${record_exit_code} -ne 130 ]]; then
      err "Recording failed with exit code ${record_exit_code}."
      exit "${record_exit_code}"
    fi
    log "Saved video: ${file}"
    copy_to_clipboard "${file}"
    ;;
  latest)
    latest_file="$(ls -1t "${OUT_DIR}"/* 2>/dev/null | head -n 1 || true)"
    if [[ -z "${latest_file}" ]]; then
      err "No captures found in ${OUT_DIR}"
      exit 1
    fi
    printf "%s\n" "${latest_file}"
    copy_to_clipboard "${latest_file}"
    ;;
  open-shots)
    open "${OUT_DIR}"
    log "Opened capture folder: ${OUT_DIR}"
    ;;
  *)
    err "Unknown command: ${cmd}"
    usage
    exit 1
    ;;
esac
