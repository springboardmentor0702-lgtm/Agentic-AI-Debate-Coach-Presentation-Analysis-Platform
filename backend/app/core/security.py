import base64, hashlib, hmac, json, os, secrets
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.db import get_db
from app.models import User

oauth2=OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    salt=secrets.token_bytes(16); digest=hashlib.scrypt(password.encode(),salt=salt,n=2**14,r=8,p=1)
    return base64.urlsafe_b64encode(salt).decode()+"$"+base64.urlsafe_b64encode(digest).decode()
def verify_password(password: str, encoded: str) -> bool:
    try:
        s,d=encoded.split('$',1);salt=base64.urlsafe_b64decode(s.encode());expected=base64.urlsafe_b64decode(d.encode());actual=hashlib.scrypt(password.encode(),salt=salt,n=2**14,r=8,p=1);return hmac.compare_digest(actual,expected)
    except Exception:return False

def _b64(x): return base64.urlsafe_b64encode(x).rstrip(b'=').decode()
def _secret(refresh=False): return (settings.jwt_refresh_secret if refresh else settings.jwt_secret).encode()
def create_token(user_id,role,refresh=False):
    header=_b64(json.dumps({"alg":"HS256","typ":"JWT"},separators=(',',':')).encode());exp=int((datetime.now(timezone.utc)+timedelta(days=14 if refresh else settings.access_token_expire_minutes/1440)).timestamp());payload=_b64(json.dumps({"sub":str(user_id),"role":role,"type":"refresh" if refresh else "access","exp":exp},separators=(',',':')).encode());base=f"{header}.{payload}";sig=_b64(hmac.new(_secret(refresh),base.encode(),hashlib.sha256).digest());return f"{base}.{sig}"
def decode_token(token,refresh=False):
    parts=token.split('.');
    if len(parts)!=3: raise ValueError()
    base='.'.join(parts[:2]);expected=_b64(hmac.new(_secret(refresh),base.encode(),hashlib.sha256).digest())
    if not hmac.compare_digest(expected,parts[2]): raise ValueError()
    pad=parts[1]+'='*((4-len(parts[1])%4)%4);data=json.loads(base64.urlsafe_b64decode(pad.encode()));
    if data['exp']<int(datetime.now(timezone.utc).timestamp()): raise ValueError()
    return data

def current_user(token: str=Depends(oauth2), db: Session=Depends(get_db)):
    try:
        data=decode_token(token); assert data.get('type')=='access';uid=int(data['sub'])
    except Exception: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid or expired token")
    user=db.get(User,uid)
    if not user: raise HTTPException(status_code=401,detail="User not found")
    return user

def require_roles(*roles):
    def dep(user=Depends(current_user)):
        if user.role not in roles: raise HTTPException(status_code=403,detail="Insufficient role permissions")
        return user
    return dep
