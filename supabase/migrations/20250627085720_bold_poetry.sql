/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Security
    - Drop and recreate all RLS policies to fix infinite recursion
    - Use proper auth.uid() references without circular dependencies
    - Ensure policies don't reference the same table they're protecting

  2. Changes
    - Fix profiles table policies
    - Fix credit_transactions table policies
    - Fix admin_settings table policies
*/

-- First, disable RLS temporarily to avoid conflicts
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;

DROP POLICY IF EXISTS "Authenticated users can read admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON admin_settings;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create new, safe policies for profiles
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

-- Create new policies for credit_transactions
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

-- Create new policies for admin_settings
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

-- Update the admin_get_all_users function to be more secure
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
  -- Only allow admin users to call this function
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

-- Update the admin_update_credits function to be more secure
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
  -- Only allow admin users to call this function
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
END;
$$;

-- Ensure the handle_new_user function is properly set up
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
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure admin_settings has a record
INSERT INTO admin_settings (admin_exists)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);