"use client";

import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabaseClient";

export interface UserProfile {
  id: string;
  user_id: string;
  subscription_tier: "free" | "basic" | "premium" | "enterprise";
  role?: "user" | "admin" | "moderator";
  credits_remaining: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
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
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        // getUser() validates the token against the Supabase auth server,
        // preventing stale / revoked tokens from appearing as valid sessions.
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user && !error) {
          await fetchUserProfile(user.id);
        } else {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        if (mounted) {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    getInitialSession();

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    }, 10000); // 10 second timeout

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

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

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      let profile;
      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === "PGRST116") {
          // No rows returned
          const { data: newProfile, error: createError } = await supabase
            .from("user_profiles")
            .insert({
              user_id: userId,
              subscription_tier: "free",
              role: "user",
              credits_remaining: 5,
              subscription_status: "active",
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating user profile:", createError);
            setAuthState((prev) => ({ ...prev, loading: false }));
            return;
          }

          profile = newProfile;
        } else {
          console.error(
            "Profile fetch error:",
            error.code,
            error.message,
            error.details,
            error.hint,
          );
          setAuthState((prev) => ({ ...prev, loading: false }));
          return;
        }
      } else {
        profile = profileData;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const {
        data: { session },
      } = await supabase.auth.getSession();

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
      authState.profile.subscription_tier,
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
