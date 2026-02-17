#!/bin/bash
# run.sh — Start the Deal Viewer Flask server
# Usage: ./run.sh (or bash run.sh)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "============================================"
echo "  Deal Viewer — Starting Flask Server"
echo "============================================"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "ERROR: Python not found. Install Python 3.8+ first."
    exit 1
fi

PYTHON=$(command -v python3 || command -v python)
echo "Using Python: $PYTHON"
echo "Backend dir:  $BACKEND_DIR"

# Install dependencies if needed
if [ ! -d "$BACKEND_DIR/.venv" ] && [ ! -f "$BACKEND_DIR/.deps_installed" ]; then
    echo ""
    echo "Installing dependencies..."
    $PYTHON -m pip install -r "$BACKEND_DIR/requirements.txt"
    touch "$BACKEND_DIR/.deps_installed"
    echo "Dependencies installed."
fi

# Check for .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo ""
    echo "WARNING: No .env file found at $BACKEND_DIR/.env"
    echo "Copy credentials from futuristic-dashboard/.env.local"
    exit 1
fi

echo ""
echo "Starting Flask server on port 5000..."
echo "Open http://localhost:5000 in your browser"
echo ""

cd "$BACKEND_DIR"
$PYTHON app.py
