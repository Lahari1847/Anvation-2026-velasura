"""Create or initialize reproducible synthetic EcoRoute demo data."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scripts.initialize_database import initialize

if __name__ == '__main__':
    initialize()
    print('EcoRoute demo data initialized.')
