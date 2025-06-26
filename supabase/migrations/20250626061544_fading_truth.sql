/*
  # User Management and Credits System

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `website_url` (text, optional)
      - `brand_name` (text, optional)
      - `credits` (integer, default 50)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `amount` (integer, can be negative for usage)
      - `type` (text: 'purchase', 'usage', 'bonus')
      - `description` (text)
      - `image_type` (text, optional: 'blog', 'infographic')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add triggers for automatic profile creation and credit tracking
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  website_url text,
  brand_name text,
  credits integer DEFAULT 50 NOT NULL CHECK (credits >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus')),
  description text NOT NULL,
  image_type text CHECK (image_type IN ('blog', 'infographic')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Credit transactions policies
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    50
  );
  
  -- Add welcome bonus transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (
    NEW.id,
    50,
    'bonus',
    'Welcome bonus - 50 free credits'
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_image_type text,
  p_description text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_credits integer;
  final_description text;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user has enough credits
  IF current_credits < p_amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id;
  
  -- Create transaction record
  final_description := COALESCE(
    p_description,
    CASE p_image_type
      WHEN 'blog' THEN 'Generated blog featured image (5 credits)'
      WHEN 'infographic' THEN 'Generated infographic image (10 credits)'
      ELSE 'Credit usage'
    END
  );
  
  INSERT INTO credit_transactions (user_id, amount, type, description, image_type)
  VALUES (p_user_id, -p_amount, 'usage', final_description, p_image_type);
  
  RETURN true;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Credits added'
)
RETURNS void AS $$
BEGIN
  -- Add credits
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id;
  
  -- Create transaction record
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'purchase', p_description);
END;
$$ language 'plpgsql' SECURITY DEFINER;