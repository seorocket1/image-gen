import { useState, useEffect } from 'react';
import { User, AuthState, SignUpData } from '../types/auth';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const user: User = {
        id: profile.id,
        email: (await supabase.auth.getUser()).data.user?.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        websiteUrl: profile.website_url,
        brandName: profile.brand_name,
        credits: profile.credits,
        isAnonymous: false,
        createdAt: new Date(profile.created_at),
      };

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signUp = async (signUpData: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            website_url: signUpData.websiteUrl,
            brand_name: signUpData.brandName,
          }
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const signInAnonymously = async (): Promise<boolean> => {
    try {
      // For demo purposes, create a temporary user
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        firstName: 'Anonymous',
        lastName: 'User',
        credits: 10, // Limited credits for anonymous users
        isAnonymous: true,
        createdAt: new Date(),
      };

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return true;
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      return false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const deductCredits = async (amount: number, imageType: 'blog' | 'infographic'): Promise<boolean> => {
    if (!authState.user || authState.user.isAnonymous) {
      // For anonymous users, just update local state
      if (authState.user && authState.user.credits >= amount) {
        setAuthState(prev => ({
          ...prev,
          user: prev.user ? { ...prev.user, credits: prev.user.credits - amount } : null,
        }));
        return true;
      }
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: authState.user.id,
        p_amount: amount,
        p_image_type: imageType,
      });

      if (error) throw error;

      if (data) {
        // Reload user profile to get updated credits
        await loadUserProfile(authState.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };

  const refreshCredits = async () => {
    if (authState.user && !authState.user.isAnonymous) {
      await loadUserProfile(authState.user.id);
    }
  };

  return {
    ...authState,
    signUp,
    signInWithEmail,
    signInAnonymously,
    signOut,
    deductCredits,
    refreshCredits,
  };
};