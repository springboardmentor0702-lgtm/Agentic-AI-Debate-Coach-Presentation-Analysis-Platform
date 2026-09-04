from app.core.config import settings
try:
    from pymongo import MongoClient
except Exception: MongoClient=None
_client=None

def get_collection(name):
    global _client
    if not settings.mongodb_uri or MongoClient is None: return None
    if _client is None: _client=MongoClient(settings.mongodb_uri,serverSelectionTimeoutMS=1500)
    return _client[settings.mongodb_database][name]

def store_artifact(kind, payload):
    c=get_collection(kind)
    if c is None: return False
    c.insert_one(payload); return True
