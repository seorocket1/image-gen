import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test the connection
supabase.from('profiles').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful');
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