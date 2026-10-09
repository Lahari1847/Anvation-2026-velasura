import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.main import initialize

if __name__ == '__main__':
    initialize()
    print('EcoRoute AI SQLite database initialized with synthetic zone and vehicle demo data.')
