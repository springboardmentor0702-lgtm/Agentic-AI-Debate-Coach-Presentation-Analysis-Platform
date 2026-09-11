import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
export default function OAuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { nav("/login"); return; }
    localStorage.setItem("token", t);
    api.get("/auth/me").then(r => {
      localStorage.setItem("user", JSON.stringify(r.data));
      nav("/");
    }).catch(() => nav("/login"));
  }, [nav]);
  return <div className="auth"><h1>Signing you in...</h1></div>;
}
