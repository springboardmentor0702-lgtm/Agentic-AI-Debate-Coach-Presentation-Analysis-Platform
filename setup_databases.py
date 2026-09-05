import os
import sys
import zipfile
import subprocess
import time
import urllib.request
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "databases"
DB_DIR.mkdir(exist_ok=True)

PG_ZIP_URL = "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip"
PG_DIR = DB_DIR / "pgsql"
PG_DATA = PG_DIR / "data"
PG_BIN = PG_DIR / "bin"

MONGO_ZIP_URL = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14.zip"
MONGO_DIR = DB_DIR / "mongodb"
MONGO_DATA = MONGO_DIR / "data"

def download_file(url, target_path):
    if target_path.exists() and target_path.stat().st_size > 1000000:
        print(f"[CACHE] {target_path.name} already downloaded ({target_path.stat().st_size // (1024*1024)}MB).")
        return
    print(f"[DOWNLOADING] {url} -> {target_path.name}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(target_path, 'wb') as out_file:
        total_size = int(response.headers.get('Content-Length', 0))
        downloaded = 0
        chunk_size = 1024 * 1024 * 4
        last_pct = -1
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                pct = int(downloaded * 100 / total_size)
                if pct % 10 == 0 and pct != last_pct:
                    print(f"  Downloaded {pct}% ({downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB)")
                    last_pct = pct
    print(f"[DONE] Downloaded {target_path.name}")

def extract_zip(zip_path, extract_to):
    print(f"[EXTRACTING] {zip_path.name} to {extract_to}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"[DONE] Extracted {zip_path.name}")

def setup_postgresql():
    pg_zip = DB_DIR / "postgresql.zip"
    if not (PG_BIN / "initdb.exe").exists():
        download_file(PG_ZIP_URL, pg_zip)
        extract_zip(pg_zip, DB_DIR)

    if not (PG_BIN / "initdb.exe").exists():
        print("[ERROR] PostgreSQL binaries not found in expected directory:", PG_BIN)
        return False

    print("[CONFIG] Initializing PostgreSQL cluster...")
    if not (PG_DATA / "PG_VERSION").exists():
        PG_DATA.mkdir(parents=True, exist_ok=True)
        cmd = [
            str(PG_BIN / "initdb.exe"),
            "-U", "postgres",
            "-A", "trust",
            "-E", "UTF8",
            "-D", str(PG_DATA)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print("[ERROR] initdb failed:", res.stderr)
            return False
        print("[OK] PostgreSQL cluster initialized.")
    else:
        print("[INFO] PostgreSQL data directory already exists.")

    print("[STARTING] PostgreSQL server...")
    log_file = PG_DIR / "logfile.log"
    cmd_start = [
        str(PG_BIN / "pg_ctl.exe"),
        "-D", str(PG_DATA),
        "-l", str(log_file),
        "-w",
        "start"
    ]
    res_start = subprocess.run(cmd_start, capture_output=True, text=True)
    print("pg_ctl start result:", res_start.stdout, res_start.stderr)

    time.sleep(2)
    cmd_createdb = [
        str(PG_BIN / "createdb.exe"),
        "-U", "postgres",
        "-h", "localhost",
        "-p", "5432",
        "logos_ai_db"
    ]
    res_db = subprocess.run(cmd_createdb, capture_output=True, text=True)
    print("createdb result:", res_db.stdout, res_db.stderr)
    return True

def setup_mongodb():
    mongo_zip = DB_DIR / "mongodb.zip"
    if not (MONGO_DIR / "bin" / "mongod.exe").exists():
        download_file(MONGO_ZIP_URL, mongo_zip)
        extract_tmp = DB_DIR / "mongo_extracted"
        extract_tmp.mkdir(exist_ok=True)
        extract_zip(mongo_zip, extract_tmp)
        extracted_subdirs = [p for p in extract_tmp.iterdir() if p.is_dir()]
        if extracted_subdirs:
            inner_dir = extracted_subdirs[0]
            if MONGO_DIR.exists():
                shutil.rmtree(MONGO_DIR)
            inner_dir.rename(MONGO_DIR)
            print(f"[OK] Moved {inner_dir} to {MONGO_DIR}")

    mongod_exe = MONGO_DIR / "bin" / "mongod.exe"
    if not mongod_exe.exists():
        print("[ERROR] mongod.exe not found in:", MONGO_DIR / "bin")
        return False

    MONGO_DATA.mkdir(parents=True, exist_ok=True)
    mongo_log = MONGO_DIR / "mongod.log"

    print("[STARTING] MongoDB server...")
    cmd_mongo = [
        str(mongod_exe),
        "--dbpath", str(MONGO_DATA),
        "--port", "27017",
        "--logpath", str(mongo_log)
    ]
    subprocess.Popen(cmd_mongo, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    print("[OK] MongoDB started in background.")
    return True

if __name__ == "__main__":
    print("=== Setting up PostgreSQL and MongoDB ===")
    pg_ok = setup_postgresql()
    mongo_ok = setup_mongodb()
    print(f"Setup complete: Postgres={pg_ok}, MongoDB={mongo_ok}")
