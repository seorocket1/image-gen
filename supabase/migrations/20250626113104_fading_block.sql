/*
  # Admin System Setup

  1. New Tables
    - Add `is_admin` column to profiles table
    - Add `admin_settings` table to track if admin exists
  
  2. Security
    - Admin policies for user management
    - Admin can manage all users and credits
    
  3. Functions
    - Check if admin exists
    - Admin user creation function
    - Credit management functions
*/

-- Add is_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create admin_settings table to track if admin exists
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_exists boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert initial admin_settings record if it doesn't exist
INSERT INTO admin_settings (admin_exists)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Enable RLS on admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin settings policies (only admins can read/update)
DROP POLICY IF EXISTS "Admins can read admin settings" ON admin_settings;
CREATE POLICY "Admins can read admin settings"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update admin settings" ON admin_settings;
CREATE POLICY "Admins can update admin settings"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Add admin policies for profiles (admins can manage all users)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = true
    )
  );

-- Add admin policies for credit transactions
DROP POLICY IF EXISTS "Admins can read all transactions" ON credit_transactions;
CREATE POLICY "Admins can read all transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert all transactions" ON credit_transactions;
CREATE POLICY "Admins can insert all transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = true
    )
  );

-- Function to check if admin exists
CREATE OR REPLACE FUNCTION admin_exists()
RETURNS boolean AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE is_admin = true;
  
  RETURN admin_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create first admin or regular user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user (admin)
  SELECT NOT admin_exists() INTO is_first_user;
  
  INSERT INTO profiles (id, first_name, last_name, website_url, brand_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    NEW.raw_user_meta_data->>'website_url',
    NEW.raw_user_meta_data->>'brand_name',
    is_first_user
  );
  
  -- Update admin_settings if this is the first user
  IF is_first_user THEN
    UPDATE admin_settings SET admin_exists = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admin to create users
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_website_url text DEFAULT NULL,
  p_brand_name text DEFAULT NULL,
  p_credits integer DEFAULT 50
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
  is_admin_user boolean;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO is_admin_user
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT is_admin_user THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can create users');
  END IF;
  
  -- This would typically be handled by Supabase Auth API
  -- For now, return success with instructions
  RETURN json_build_object(
    'success', true, 
    'message', 'User creation request processed. Use Supabase Auth API to complete.',
    'user_data', json_build_object(
      'email', p_email,
      'first_name', p_first_name,
      'last_name', p_last_name,
      'website_url', p_website_url,
      'brand_name', p_brand_name,
      'credits', p_credits
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admin to update user credits
CREATE OR REPLACE FUNCTION admin_update_credits(
  p_user_id uuid,
  p_new_credits integer,
  p_reason text DEFAULT 'Admin adjustment'
)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
  old_credits integer;
  credit_diff integer;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO is_admin_user
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT is_admin_user THEN
    RETURN false;
  END IF;
  
  -- Get current credits
  SELECT credits INTO old_credits
  FROM profiles
  WHERE id = p_user_id;
  
  IF old_credits IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate difference
  credit_diff := p_new_credits - old_credits;
  
  -- Update credits
  UPDATE profiles
  SET credits = p_new_credits
  WHERE id = p_user_id;
  
  -- Log transaction if there's a change
  IF credit_diff != 0 THEN
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (
      p_user_id, 
      credit_diff, 
      CASE WHEN credit_diff > 0 THEN 'bonus' ELSE 'usage' END,
      p_reason
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (admin only)
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
) AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if current user is admin
  SELECT profiles.is_admin INTO is_admin_user
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can view all users';
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
    p.is_admin,
    p.created_at,
    p.updated_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;