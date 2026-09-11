import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";

const NAMES = { "/": "Overview", "/practice": "Practice", "/analyze": "Analyze", "/history": "History", "/progress": "Progress", "/settings": "Settings", "/coach": "Coach", "/educator": "Educator", "/admin": "Admin" };

export default function Topbar() {
  const loc = useLocation();
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const load = () => api.get("/notifications").then(r => { setItems(r.data.items); setUnread(r.data.unread_count); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const mons = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUG", "SEPT", "OCT", "NOV", "DEC"];
  const stamp = `${days[now.getDay()]} · ${mons[now.getMonth()]} ${String(now.getDate()).padStart(2, "0")}, ${now.getFullYear()} · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const label = NAMES[loc.pathname] || "Workspace";

  const readOne = async n => { if (!n.is_read) { await api.post(`/notifications/${n.id}/read`); load(); } };
  const readAll = async () => { await api.post("/notifications/read-all"); load(); };

  return (
    <div className="topbar">
      <div className="crumbs"><span>Workspace</span><span className="crumbsep">›</span><b>{label}</b></div>
      <div className="topright">
        <span className="topstamp">{stamp}</span>
        <div className="bellwrap" ref={ref}>
          <button className="iconbtn" onClick={() => { setOpen(!open); load(); }} title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          {open && (
            <div className="dropdown">
              <div className="notifhead"><b>Notifications</b><button onClick={readAll}>Mark all read</button></div>
              {items.length === 0 && <p className="notif">No notifications yet.</p>}
              {items.map(n => (
                <div key={n.id} className={"notif" + (n.is_read ? "" : " unread")} onClick={() => readOne(n)}>
                  <b>[{n.type}] {n.title}</b>
                  {n.message && <p>{n.message}</p>}
                  <small>{n.created_at}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
