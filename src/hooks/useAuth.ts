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
          // Create a simple user object without database calls
          const user: User = {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.user_metadata?.first_name || 'User',
            lastName: session.user.user_metadata?.last_name || 'Name',
            websiteUrl: session.user.user_metadata?.website_url,
            brandName: session.user.user_metadata?.brand_name,
            credits: 50, // Default credits
            isAnonymous: false,
            isAdmin: false,
            createdAt: new Date(session.user.created_at),
          };

          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
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
        const user: User = {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.user_metadata?.first_name || 'User',
          lastName: session.user.user_metadata?.last_name || 'Name',
          websiteUrl: session.user.user_metadata?.website_url,
          brandName: session.user.user_metadata?.brand_name,
          credits: 50, // Default credits
          isAnonymous: false,
          isAdmin: false,
          createdAt: new Date(session.user.created_at),
        };

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
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

    // For now, just simulate credit deduction without database calls
    // This prevents the infinite loop while keeping the app functional
    if (authState.user.credits >= amount) {
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          credits: prev.user.credits - amount
        } : null
      }));
      return true;
    }

    return false;
  };

  const refreshCredits = async () => {
    // No-op for now to prevent database calls
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