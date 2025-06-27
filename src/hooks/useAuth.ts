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
        console.log('Initializing auth...');
        
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 30000)
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Session error:', error);
          throw error;
        }

        console.log('Session retrieved:', !!session);

        if (session?.user && mounted) {
          console.log('Loading user profile...');
          await loadUserProfile(session.user.id);
        } else if (mounted) {
          console.log('No session found, setting unauthenticated state');
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
      console.log('Auth state changed:', event, !!session);
      
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
      console.log('Loading profile for user:', userId);
      
      // Add timeout for profile loading
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 30000)
      );

      const { data: profile, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Profile load error:', error);
        
        // If profile doesn't exist, create a basic one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating basic profile...');
          const { data: authUser } = await supabase.auth.getUser();
          
          const user: User = {
            id: userId,
            email: authUser.user?.email,
            firstName: 'User',
            lastName: 'Name',
            websiteUrl: undefined,
            brandName: undefined,
            credits: 50,
            isAnonymous: false,
            isAdmin: false,
            createdAt: new Date(),
          };

          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
        
        throw error;
      }

      const { data: authUser } = await supabase.auth.getUser();

      const user: User = {
        id: profile.id,
        email: authUser.user?.email,
        firstName: profile.first_name || 'User',
        lastName: profile.last_name || 'Name',
        websiteUrl: profile.website_url,
        brandName: profile.brand_name,
        credits: profile.credits || 50,
        isAnonymous: false,
        isAdmin: profile.is_admin || false,
        createdAt: new Date(profile.created_at),
      };

      console.log('Profile loaded successfully:', user);

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Fallback: create a basic authenticated state
      const { data: authUser } = await supabase.auth.getUser();
      
      if (authUser.user) {
        const user: User = {
          id: userId,
          email: authUser.user.email,
          firstName: 'User',
          lastName: 'Name',
          websiteUrl: undefined,
          brandName: undefined,
          credits: 50,
          isAnonymous: false,
          isAdmin: false,
          createdAt: new Date(),
        };

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    }
  };

  const signUp = async (signUpData: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Signing up user...');
      
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

      console.log('User signed up successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Signing in user...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('User signed in successfully');
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const signOut = async () => {
    console.log('Signing out user...');
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const deductCredits = async (amount: number, imageType: 'blog' | 'infographic'): Promise<boolean> => {
    if (!authState.user) {
      console.error('No user found for credit deduction');
      return false;
    }

    try {
      console.log('Deducting credits:', { amount, imageType, userId: authState.user.id });
      
      // Simple credit deduction without RPC function
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', authState.user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current credits:', fetchError);
        return false;
      }

      if (currentProfile.credits < amount) {
        console.error('Insufficient credits');
        return false;
      }

      // Update credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: currentProfile.credits - amount })
        .eq('id', authState.user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return false;
      }

      // Log transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: authState.user.id,
          amount: -amount,
          type: 'usage',
          description: `Generated ${imageType} image`,
          image_type: imageType,
        });

      if (transactionError) {
        console.error('Error logging transaction:', transactionError);
        // Don't fail the whole operation for logging errors
      }

      // Reload user profile to get updated credits
      await loadUserProfile(authState.user.id);
      console.log('Credits deducted successfully');
      return true;
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