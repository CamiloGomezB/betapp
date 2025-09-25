// contexts/AuthContext.tsx
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

type UserShape = {
  id: string;
  email: string | null;
};

type AuthContextProps = {
  user: UserShape | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Creates/ensures the profile row exists for the authenticated user.
  // Requires: profiles.id is UNIQUE or PRIMARY KEY and RLS allows own insert/update.
  const ensureProfile = async (u: UserShape) => {
    try {
      console.log("Creating/updating profile for user:", u);
      
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching existing profile:", fetchError);
        throw fetchError;
      }
      
      // If profile doesn't exist, create it
      if (!existingProfile) {
        console.log("Profile doesn't exist, creating new one...");
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            id: u.id,
            email: u.email,
            name: null,
            username: null,
            bio: null,
            phone: null,
          })
          .select();
        
        console.log("Profile insert result:", { data, error });
        
        if (error) {
          console.error("Profile insert error:", error);
          // Don't throw error, just log it
          console.warn("Could not create profile due to RLS policy. This is expected if RLS is enabled.");
        } else {
          console.log("Profile created successfully");
        }
      } else {
        console.log("Profile already exists:", existingProfile);
      }
      
    } catch (e) {
      // Do not break auth flow if profile creation fails due to RLS or duplicates
      console.warn("ensureProfile error:", e);
    }
  };

  // Initial load + subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const u: UserShape = {
            id: session.user.id,
            email: session.user.email ?? null,
          };
          setUser(u);
          await ensureProfile(u);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn("Auth init error:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const u: UserShape = {
          id: session.user.id,
          email: session.user.email ?? null,
        };
        setUser(u);
        await ensureProfile(u);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Login succeeded but no user returned.");

      const u: UserShape = { id: data.user.id, email: data.user.email ?? null };
      setUser(u);
      await ensureProfile(u);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);

      // If email confirmation is enabled, data.session may be null here.
      if (data.session?.user) {
        const u: UserShape = {
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        };
        setUser(u);
        await ensureProfile(u);
      } else {
        // No active session yet; the onAuthStateChange will handle the rest after verification.
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
