import { createContext, useContext, useState } from "react";
import api from "../api";
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const login = async (email, password) => {
    const f = new FormData(); f.append("username", email); f.append("password", password);
    const { data } = await api.post("/auth/login", f);
    localStorage.setItem("token", data.access_token);
    const me = (await api.get("/auth/me")).data;
    setUser(me); localStorage.setItem("user", JSON.stringify(me));
    return me;
  };
  const register = async (body) => (await api.post("/auth/register", body)).data;
  const logout = () => { localStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
