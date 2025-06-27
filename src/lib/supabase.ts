import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'seo-engine-app'
    }
  }
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          website_url: string | null;
          brand_name: string | null;
          credits: number;
          created_at: string;
          updated_at: string;
          is_admin: boolean | null;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          website_url?: string | null;
          brand_name?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
          is_admin?: boolean | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          website_url?: string | null;
          brand_name?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
          is_admin?: boolean | null;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'usage' | 'bonus';
          description: string;
          image_type: 'blog' | 'infographic' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'usage' | 'bonus';
          description: string;
          image_type?: 'blog' | 'infographic' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: 'purchase' | 'usage' | 'bonus';
          description?: string;
          image_type?: 'blog' | 'infographic' | null;
          created_at?: string;
        };
      };
      admin_settings: {
        Row: {
          id: string;
          admin_exists: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          admin_exists?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          admin_exists?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
};