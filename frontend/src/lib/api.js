import axios from "axios";
import { supabase } from "./supabaseClient";

// Every future page imports this instead of creating its own axios
// instance. Backend base URL comes from .env (VITE_API_URL).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Every request automatically carries the current Supabase session
// token, if one exists - individual pages never touch auth headers.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
