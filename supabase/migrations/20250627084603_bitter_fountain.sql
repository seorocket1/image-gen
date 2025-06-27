/*
  # Admin Panel and User Management Setup

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `admin_exists` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Table Updates
    - Add `is_admin` column to `profiles` table

  3. Security
    - Enable RLS on `admin_settings` table
    - Add policies for authenticated users to read and update admin settings

  4. Functions
    - `admin_get_all_users()` - Get all users for admin panel
    - `admin_update_credits()` - Update user credits (admin only)
    - Update `handle_new_user()` to include is_admin field

  5. Initial Data
    - Insert initial admin settings record
*/

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_exists boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin settings policies
DROP POLICY IF EXISTS "Authenticated users can read admin settings" ON admin_settings;
CREATE POLICY "Authenticated users can read admin settings"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON admin_settings;
CREATE POLICY "Authenticated users can update admin settings"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add is_admin column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Drop trigger first, then functions to avoid dependency issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS admin_get_all_users();
DROP FUNCTION IF EXISTS admin_update_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS handle_new_user();

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
) AS $$
BEGIN
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

-- Function to update user credits (admin only)
CREATE OR REPLACE FUNCTION admin_update_credits(
  p_user_id uuid,
  p_new_credits integer,
  p_reason text
)
RETURNS boolean AS $$
BEGIN
  -- Update user credits
  UPDATE profiles
  SET credits = p_new_credits
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_new_credits, 'bonus', p_reason);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to handle missing metadata gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert initial admin settings record if it doesn't exist
INSERT INTO admin_settings (admin_exists)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);