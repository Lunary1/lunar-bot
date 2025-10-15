"use client";

import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabaseClient";

export interface UserProfile {
  id: string;
  user_id: string;
  subscription_tier: "free" | "basic" | "premium" | "enterprise";
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setAuthState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return;
      }

      const {
        data: { user, session },
      } = await supabase.auth.getUser();

      setAuthState({
        user,
        session,
        profile,
        loading: false,
      });
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("Error signing in with Google:", error);
  };

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("Error signing in with GitHub:", error);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.user) return;

    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", authState.user.id);

    if (error) throw error;

    // Refresh profile
    await fetchUserProfile(authState.user.id);
  };

  const hasPermission = (requiredTier: string) => {
    if (!authState.profile) return false;

    const tierHierarchy = ["free", "basic", "premium", "enterprise"];
    const userTierIndex = tierHierarchy.indexOf(
      authState.profile.subscription_tier
    );
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    return userTierIndex >= requiredTierIndex;
  };

  return {
    ...authState,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
    hasPermission,
  };
};

