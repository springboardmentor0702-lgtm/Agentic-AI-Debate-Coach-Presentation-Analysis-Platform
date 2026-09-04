import sys
sys.path.insert(0,'.')
from app.database.db import SessionLocal, Base, engine
from app.models import User, Profile
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db=SessionLocal()
try:
    users=[
        ("learner@example.com","Demo Learner","learner"),
        ("coach@example.com","Demo Coach","coach"),
        ("educator@example.com","Demo Educator","educator"),
        ("admin@example.com","Demo Administrator","admin"),
    ]
    for email,name,role in users:
        u=db.query(User).filter(User.email==email).first()
        if not u:
            u=User(email=email,password_hash=hash_password("Demo1234!"),name=name,role=role)
            db.add(u);db.flush();db.add(Profile(user_id=u.id))
    db.commit()
    print("Seed complete. Demo accounts created without fabricated activity. Demo password: Demo1234!")
finally:
    db.close()
