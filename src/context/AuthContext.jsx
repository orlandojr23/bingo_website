"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // onAuthStateChange fires immediately with the current session on mount,
    // which is more reliable than a separate getSession() call. We use it as
    // the single source of truth for both initial load and live changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      if (isMounted) {
        setUser(currentUser);
        setRole(currentUser?.user_metadata?.role ?? null);
      }

      if (currentUser) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
          
        if (isMounted) {
          if (!error && data) {
            setProfile(data);
            if (data.role) setRole(data.role);
          } else {
            setProfile(null);
          }
        }
      } else {
        if (isMounted) setProfile(null);
      }
      
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    }
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();
    if (data) {
      setProfile(data);
      if (data.role) setRole(data.role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signOut, setProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
