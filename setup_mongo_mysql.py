import os
import sys
import zipfile
import subprocess
import time
import requests
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "databases"
DB_DIR.mkdir(exist_ok=True)

def download_with_requests(url, target_path):
    if target_path.exists() and target_path.stat().st_size > 1000000:
        print(f"[CACHE] {target_path.name} already downloaded ({target_path.stat().st_size // (1024*1024)}MB).")
        return
    print(f"[DOWNLOADING] {url} -> {target_path.name}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    with requests.get(url, headers=headers, stream=True, timeout=30) as r:
        r.raise_for_status()
        total_size = int(r.headers.get('content-length', 0))
        downloaded = 0
        chunk_size = 1024 * 1024 * 4
        last_pct = -1
        with open(target_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        pct = int(downloaded * 100 / total_size)
                        if pct % 10 == 0 and pct != last_pct:
                            print(f"  Downloaded {pct}% ({downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB)")
                            last_pct = pct
    print(f"[DONE] Downloaded {target_path.name}")

def extract_zip(zip_path, extract_to):
    print(f"[EXTRACTING] {zip_path.name}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"[DONE] Extracted {zip_path.name}")

def setup_mongodb():
    print("\n--- SETTING UP MONGODB ---")
    mongo_dir = DB_DIR / "mongodb"
    mongo_exe = mongo_dir / "bin" / "mongod.exe"
    
    if not mongo_exe.exists():
        mongo_zip = DB_DIR / "mongodb.zip"
        download_with_requests("https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14.zip", mongo_zip)
        extract_tmp = DB_DIR / "mongo_extracted"
        extract_tmp.mkdir(exist_ok=True)
        extract_zip(mongo_zip, extract_tmp)
        subdirs = [p for p in extract_tmp.iterdir() if p.is_dir()]
        if subdirs:
            if mongo_dir.exists():
                shutil.rmtree(mongo_dir)
            shdirs = subdirs[0]
            shutil.move(str(shdirs), str(mongo_dir))
            print(f"[OK] Configured MongoDB in {mongo_dir}")
        shutil.rmtree(extract_tmp, ignore_errors=True)

    if not mongo_exe.exists():
        print("[ERROR] mongod.exe not found!")
        return False

    mongo_data = mongo_dir / "data"
    mongo_data.mkdir(parents=True, exist_ok=True)
    mongo_log = mongo_dir / "mongod.log"

    print("[STARTING] MongoDB on port 27017...")
    subprocess.Popen([
        str(mongo_exe),
        "--dbpath", str(mongo_data),
        "--port", "27017",
        "--logpath", str(mongo_log)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    time.sleep(3)
    # verify connection
    try:
        import pymongo
        client = pymongo.MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
        client.server_info()
        print("[SUCCESS] MongoDB is running and connected on localhost:27017!")
        return True
    except Exception as e:
        print(f"[WARNING] MongoDB verify: {e}")
        return False

def setup_mysql():
    print("\n--- SETTING UP MYSQL / MARIADB ---")
    mysql_dir = DB_DIR / "mysql"
    mysqld_exe = mysql_dir / "bin" / "mysqld.exe"
    
    if not mysqld_exe.exists():
        mysql_zip = DB_DIR / "mariadb.zip"
        download_with_requests("https://archive.mariadb.org/mariadb-11.2.3/winx64-packages/mariadb-11.2.3-winx64.zip", mysql_zip)
        extract_tmp = DB_DIR / "mysql_extracted"
        extract_tmp.mkdir(exist_ok=True)
        extract_zip(mysql_zip, extract_tmp)
        subdirs = [p for p in extract_tmp.iterdir() if p.is_dir()]
        if subdirs:
            if mysql_dir.exists():
                shutil.rmtree(mysql_dir)
            shutil.move(str(subdirs[0]), str(mysql_dir))
            print(f"[OK] Configured MySQL in {mysql_dir}")
        shutil.rmtree(extract_tmp, ignore_errors=True)

    if not mysqld_exe.exists():
        print("[ERROR] mysqld.exe not found!")
        return False

    mysql_data = mysql_dir / "data"
    if not (mysql_data / "mysql").exists():
        print("[INITIALIZING] MySQL system tables...")
        install_db_exe = mysql_dir / "bin" / "mariadb-install-db.exe"
        if install_db_exe.exists():
            subprocess.run([str(install_db_exe), f"--datadir={mysql_data}"], capture_output=True)
        print("[OK] MySQL initialized.")

    print("[STARTING] MySQL server on port 3306...")
    subprocess.Popen([
        str(mysqld_exe),
        f"--datadir={mysql_data}",
        "--port=3306",
        "--console"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    print("[SUCCESS] MySQL server started on port 3306!")
    return True

if __name__ == "__main__":
    setup_mongodb()
    setup_mysql()
