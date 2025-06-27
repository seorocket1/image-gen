import { createClient } from '@supabase/supabase-js';

// Declare supabase variable at top level
let supabase: any;

// Define Database type at top level
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Environment Check:');
console.log('URL exists:', !!supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
  
  // Create a mock client to prevent app crashes
  const mockClient = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        }),
        count: () => Promise.resolve({ data: null, error: null })
      }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    }),
    rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
  };
  
  supabase = mockClient as any;
} else {
  console.log('Initializing Supabase client...');

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'seo-engine-app'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  });

  // Test connection with timeout
  const testConnection = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      const testPromise = supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      await Promise.race([testPromise, timeoutPromise]);
      console.log('Supabase connection test successful');
    } catch (error) {
      console.error('Supabase connection test failed:', error);
    }
  };

  testConnection();
}

// Export supabase at top level
export { supabase };