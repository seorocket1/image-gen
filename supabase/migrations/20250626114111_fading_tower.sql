/*
  # Fix Credit Transactions RLS Policies

  1. Problem
    - Credit transaction policies also reference profiles table for admin checks
    - This can cause similar recursion issues

  2. Solution
    - Simplify policies to avoid cross-table admin checks
    - Keep basic user access controls
    - Handle admin operations through service role when needed

  3. Security
    - Users can only access their own transactions
    - Admin operations handled separately to avoid recursion
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can read all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can insert all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin operations will be handled through service role key
-- to avoid RLS policy recursion issues