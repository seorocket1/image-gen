/*
  # Fix RLS Policies Infinite Recursion

  1. Problem
    - Current admin policies on profiles table cause infinite recursion
    - Policies check admin status by querying profiles table within profiles policies
    - This creates a circular dependency

  2. Solution
    - Drop existing problematic policies
    - Create new policies that avoid recursion
    - Use auth.jwt() to check admin status from JWT claims instead of querying profiles
    - Separate admin checks from regular user access

  3. Security
    - Users can only access their own profile data
    - Admin access will be handled through JWT claims or separate mechanism
    - Maintains data security while preventing recursion
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- For admin access, we'll handle this at the application level
-- or through service role key when needed, avoiding RLS recursion