import os,sys
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),"..")))
os.environ["AI_PROVIDER"]="demo"
os.environ["AI_FALLBACK_ENABLED"]="true"
from fastapi.testclient import TestClient
from app.main import app
from app.database.db import Base,engine,SessionLocal
from app.models import User
Base.metadata.drop_all(bind=engine);Base.metadata.create_all(bind=engine)
client=TestClient(app)

def login(email="learner@example.com",password="Test1234!"):
    r=client.post('/api/auth/login',json={'email':email,'password':password});return r.json()['access_token']

def test_auth_and_role():
    r=client.post('/api/auth/register',json={'email':'learner@example.com','password':'Test1234!','name':'Test Learner','role':'learner'});assert r.status_code==200
    token=r.json()['access_token']; assert client.get('/api/me',headers={'Authorization':f'Bearer {token}'}).status_code==200
    assert client.get('/api/admin/overview',headers={'Authorization':f'Bearer {token}'}).status_code==403

def test_debate_analysis_counter_fallacy():
    h={'Authorization':f'Bearer {login()}'}
    d=client.post('/api/debates',headers=h,json={'topic':'Should AI assist teachers?','format':'ai_simulation','position':'for','rounds':3,'ai_opponent':True}).json()
    assert d['id']
    assert client.post(f"/api/debates/{d['id']}/turn",headers=h,json={'text':'AI can personalize practice using feedback.'}).status_code==200
    assert client.post(f"/api/debates/{d['id']}/finish",headers=h).status_code==200
    assert client.post('/api/analysis/argument',headers=h,json={'text':'Research shows tutoring can improve practice outcomes.'}).status_code==200
    assert client.post('/api/analysis/fallacies',headers=h,json={'text':'You are stupid so your claim is wrong.'}).status_code==200
    assert client.post('/api/analysis/counterarguments',headers=h,json={'text':'AI should assist teachers.'}).status_code==200

def test_analytics_coaching_reports_and_health():
    h={'Authorization':f'Bearer {login()}'}
    assert client.get('/api/analytics',headers=h).status_code==200
    assert client.post('/api/coaching',headers=h,json={'question':'What should I practice today?'}).status_code==200
    assert client.post('/api/coaching/plan',headers=h).status_code==200
    assert client.get('/api/reports/performance/pdf',headers=h).status_code==200
    assert client.get('/api/reports/performance/xlsx',headers=h).status_code==200
    health=client.get('/api/health');assert health.status_code==200 and health.json()['status']=='ok'
