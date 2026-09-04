import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profiles/me");
      setProfile(res.data);
    } catch {
      // No profile yet (e.g. mid-registration) - not an error state.
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          await loadProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // profileFields: full_name, role, experience_level, preferred_debate_topics,
  // presentation_domains, learning_goals, coaching_preferences
  const signUp = async ({ email, password, ...profileFields }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // If email confirmation is off (see SETUP.md), Supabase returns a
    // session immediately - use it just long enough to create the
    // profile, then sign back out. Registration always lands on the
    // login page, never directly in the app - "create an account" and
    // "you're logged in" stay two distinct, explicit steps.
    if (data.session) {
      await api.post("/profiles/me", profileFields);
      await supabase.auth.signOut();
    }
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
