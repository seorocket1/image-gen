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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          await loadUserProfile(session.user.id);
        } else if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && mounted) {
        await loadUserProfile(session.user.id);
      } else if (mounted) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const { data: authUser } = await supabase.auth.getUser();

      const user: User = {
        id: profile.id,
        email: authUser.user?.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        websiteUrl: profile.website_url,
        brandName: profile.brand_name,
        credits: profile.credits,
        isAnonymous: false,
        isAdmin: profile.is_admin || false,
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const deductCredits = async (amount: number, imageType: 'blog' | 'infographic'): Promise<boolean> => {
    if (!authState.user) {
      return false;
    }

    try {
      console.log('Deducting credits:', { amount, imageType, userId: authState.user.id });
      
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: authState.user.id,
        p_amount: amount,
        p_image_type: imageType,
      });

      if (error) {
        console.error('Credit deduction error:', error);
        throw error;
      }

      if (data) {
        // Reload user profile to get updated credits
        await loadUserProfile(authState.user.id);
        console.log('Credits deducted successfully, new balance:', authState.user.credits - amount);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };

  const refreshCredits = async () => {
    if (authState.user) {
      await loadUserProfile(authState.user.id);
    }
  };

  return {
    ...authState,
    signUp,
    signInWithEmail,
    signOut,
    deductCredits,
    refreshCredits,
  };
};