#!/bin/sh
set -eu

if [ -n "${REMBG_PRELOAD_MODEL:-}" ]; then
  python - <<'PY'
import os

from rembg import new_session

models = [model.strip() for model in os.environ["REMBG_PRELOAD_MODEL"].split(",") if model.strip()]

for model in models:
    print(f"Preloading rembg model: {model}", flush=True)
    new_session(model)
PY
fi

exec rembg "$@"
