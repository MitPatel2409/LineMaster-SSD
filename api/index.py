import sys
import os

# Add the 'backend' directory to the path so that it can import 'simulation'
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app import app

# Vercel serverless functions require the variable to be named `app` for Flask/FastAPI
