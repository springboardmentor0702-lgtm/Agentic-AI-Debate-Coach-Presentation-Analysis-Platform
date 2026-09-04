import os,sys,asyncio
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),"..")))
os.environ['AI_PROVIDER']='groq';os.environ['AI_FALLBACK_ENABLED']='true'
from app.providers import provider_manager
from app.core.config import settings
from app.providers.providers import ProviderError
class Failing:
    async def generate(self,s,u,json_mode=False): raise ProviderError('offline')
class Working:
    async def generate(self,s,u,json_mode=False): return '{"ok":true}' if json_mode else 'gemini-result'

def test_groq_to_gemini_fallback():
    old=provider_manager.providers.copy(); oldp=settings.ai_provider; settings.ai_provider='groq';provider_manager.providers['groq']=Failing();provider_manager.providers['gemini']=Working()
    try:
        r=asyncio.run(provider_manager.generate('s','u'));assert r['provider']=='gemini' and r['fallback_used']
    finally: provider_manager.providers.update(old); settings.ai_provider=oldp; settings.ai_provider=oldp

def test_all_to_demo():
    old=provider_manager.providers.copy(); oldp=settings.ai_provider; settings.ai_provider='groq'; provider_manager.providers['groq']=Failing();provider_manager.providers['gemini']=Failing()
    try:
        r=asyncio.run(provider_manager.generate('s','u'));assert r['provider']=='demo'
    finally: provider_manager.providers.update(old)


class Malformed:
    async def generate(self,s,u,json_mode=False): return "{not-json"

def test_malformed_primary_falls_back():
    old=provider_manager.providers.copy(); oldp=settings.ai_provider; settings.ai_provider='groq'; provider_manager.providers['groq']=Malformed(); provider_manager.providers['gemini']=Working()
    try:
        r=asyncio.run(provider_manager.generate('s','u',json_mode=True)); assert r['provider']=='gemini' and r['fallback_used']
    finally:
        provider_manager.providers.update(old); settings.ai_provider=oldp
