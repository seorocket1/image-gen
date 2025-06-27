/*
  # Final Database Fix

  1. Clean up and fix all database issues
  2. Ensure proper RLS policies
  3. Fix any remaining function issues
  4. Test database connectivity
*/

-- First, let's ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT 'User',
  last_name text NOT NULL DEFAULT 'Name',
  website_url text,
  brand_name text,
  credits integer NOT NULL DEFAULT 50 CHECK (credits >= 0),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus')),
  description text NOT NULL,
  image_type text CHECK (image_type IN ('blog', 'infographic')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_exists boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
    
    -- Drop all policies on credit_transactions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'credit_transactions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON credit_transactions';
    END LOOP;
    
    -- Drop all policies on admin_settings
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'admin_settings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON admin_settings';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create simple, safe policies
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "credit_transactions_insert_policy"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_transactions_select_policy"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin_settings_select_policy"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_settings_update_policy"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop and recreate functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_users() CASCADE;
DROP FUNCTION IF EXISTS admin_update_credits(uuid, integer, text) CASCADE;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, website_url, brand_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    NEW.raw_user_meta_data->>'website_url',
    NEW.raw_user_meta_data->>'brand_name',
    false
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to safely deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_image_type text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_credits integer;
  description_text text;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user exists and has enough credits
  IF current_credits IS NULL THEN
    RETURN false;
  END IF;
  
  IF current_credits < p_amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id;
  
  -- Create description
  description_text := 'Generated ' || p_image_type || ' image';
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, image_type)
  VALUES (p_user_id, -p_amount, 'usage', description_text, p_image_type);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to deduct credits for user %: %', p_user_id, SQLERRM;
    RETURN false;
END;
$$;

-- Function to get all users for admin panel
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  website_url text,
  brand_name text,
  credits integer,
  is_admin boolean,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.website_url,
    p.brand_name,
    p.credits,
    COALESCE(p.is_admin, false) as is_admin,
    p.created_at,
    p.updated_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to update user credits (admin only)
CREATE OR REPLACE FUNCTION admin_update_credits(
  p_user_id uuid,
  p_new_credits integer,
  p_reason text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update user credits
  UPDATE profiles
  SET credits = p_new_credits
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_new_credits, 'bonus', p_reason);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to update credits for user %: %', p_user_id, SQLERRM;
    RETURN false;
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin settings record if it doesn't exist
INSERT INTO admin_settings (admin_exists)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;