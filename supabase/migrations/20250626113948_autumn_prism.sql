/*
  # Fix User Signup Trigger

  1. Database Functions
    - Create or replace `handle_new_user()` function to automatically create profile records
    - Function extracts user metadata and creates profile with initial credits

  2. Triggers
    - Create trigger on `auth.users` table to call function after user creation
    - Ensures every new user gets a corresponding profile record

  3. Security
    - Function runs with SECURITY DEFINER to have proper permissions
    - Handles potential null values in metadata gracefully
*/

-- Create or replace the function to handle new user sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    website_url, 
    brand_name, 
    credits, 
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'website_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'brand_name', ''),
    50, -- Initial credits
    FALSE, -- Not an admin by default
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and create it fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that calls the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;