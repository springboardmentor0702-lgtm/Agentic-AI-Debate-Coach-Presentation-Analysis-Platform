import os
import sys
from pathlib import Path

# Load env variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip().strip('"\''))

def test_postgresql():
    print("--- Checking PostgreSQL ---")
    try:
        import psycopg2
    except ImportError:
        print("[ERROR] psycopg2 driver not installed.")
        return False

    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "logos_ai_db")

    # Step A: Connect to default postgres DB first to check server connection
    try:
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database="postgres"
        )
        conn.autocommit = True
        print(f"[OK] Connected to PostgreSQL server on {host}:{port}")
    except Exception as e:
        print(f"[ERROR] Connection Refused: Could not reach PostgreSQL server on {host}:{port}.")
        print(f"   Reason: {e}")
        print("Solution: Ensure PostgreSQL Service is running on your computer.")
        return False

    # Step B: Check if target database exists, create if missing
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        if not exists:
            print(f"[WARNING] Target database '{db_name}' does not exist. Creating it now...")
            cur.execute(f"CREATE DATABASE {db_name}")
            print(f"[OK] Database '{db_name}' created successfully!")
        else:
            print(f"[OK] Target database '{db_name}' exists.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Error verifying or creating database: {e}")
        return False

    # Step C: Verify connection to the target database
    try:
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=db_name
        )
        conn.close()
        print(f"[SUCCESS] Fully connected to target database '{db_name}'!")
        return True
    except Exception as e:
        print(f"[ERROR] Error connecting to database '{db_name}': {e}")
        return False

def test_mongodb():
    print("\n--- Checking MongoDB ---")
    try:
        import pymongo
    except ImportError:
        print("[ERROR] pymongo driver not installed.")
        return False

    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB", "logos_ai_transcripts")

    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=2000)
        # Trigger connection check
        client.server_info()
        print(f"[OK] Connected to MongoDB server on {uri}")
        db = client[db_name]
        print(f"[SUCCESS] MongoDB database '{db_name}' is ready!")
        return True
    except Exception as e:
        print(f"[ERROR] Connection Refused: Could not reach MongoDB on {uri}")
        print(f"   Reason: {e}")
        print("Solution: Ensure MongoDB Service is running in the background.")
        return False

if __name__ == "__main__":
    pg_ok = test_postgresql()
    mongo_ok = test_mongodb()
    
    print("\n====================================")
    if pg_ok and mongo_ok:
        print("ALL SYSTEMS OPERATIONAL: Your production databases are ready!")
    else:
        print("WARNING: Some database checks failed. The app will fall back to local SQLite.")
    print("====================================")
