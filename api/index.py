"""
index.py -- Vercel entrypoint for the Deal Viewer Flask app.
Vercel auto-detects the `app` variable as a WSGI application.
"""

import sys
import os

# Add the Flask backend directory to the Python path so `from app import app` works
# Go up one level from api/ to the repo root, then into deal-viewer/backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "deal-viewer", "backend"))

from app import app  # noqa: E402 — path must be set before import
