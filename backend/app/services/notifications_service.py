import smtplib
from email.mime.text import MIMEText

from ..core.config import settings
from ..models import Notification


def notify(db, user_id: str, ntype: str, title: str, message: str = "", dedupe_key=None):
    if dedupe_key:
        exists = db.query(Notification).filter(
            Notification.user_id == user_id, Notification.dedupe_key == dedupe_key).first()
        if exists:
            return None
    n = Notification(user_id=user_id, type=ntype, title=title, message=message, dedupe_key=dedupe_key)
    db.add(n)
    return n


def send_email(to: str, subject: str, body: str):
    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASS and to):
        return False
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as srv:
            srv.starttls()
            srv.login(settings.SMTP_USER, settings.SMTP_PASS)
            srv.send_message(msg)
        return True
    except Exception:
        return False
