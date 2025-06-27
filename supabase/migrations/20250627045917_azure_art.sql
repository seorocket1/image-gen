-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  website_url text,
  brand_name text,
  credits integer NOT NULL DEFAULT 50 CHECK (credits >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus')),
  description text NOT NULL,
  image_type text CHECK (image_type IN ('blog', 'infographic')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

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

-- Credit transactions policies
CREATE POLICY "Users can insert own transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, website_url, brand_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    NEW.raw_user_meta_data->>'website_url',
    NEW.raw_user_meta_data->>'brand_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to safely deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_image_type text
)
RETURNS boolean AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();