-- =============================================================================
-- Phase 1: Database Schema Changes
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- Step 1.1: Add user_id column to all tables
-- After running this, sign up in the app, then UPDATE existing rows with your user ID.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE workout_days ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE day_exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE subscription_reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_user_id ON workout_days(user_id);
CREATE INDEX IF NOT EXISTS idx_day_exercises_user_id ON day_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_reminders_user_id ON subscription_reminders(user_id);

-- Step 1.2: Enable RLS and create policies

-- exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own exercises" ON exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exercises" ON exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exercises" ON exercises FOR DELETE USING (auth.uid() = user_id);

-- workout_days
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workout_days" ON workout_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_days" ON workout_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout_days" ON workout_days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout_days" ON workout_days FOR DELETE USING (auth.uid() = user_id);

-- day_exercises
ALTER TABLE day_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own day_exercises" ON day_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own day_exercises" ON day_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own day_exercises" ON day_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own day_exercises" ON day_exercises FOR DELETE USING (auth.uid() = user_id);

-- workout_sessions
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workout_sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout_sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout_sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- workout_logs
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workout_logs" ON workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_logs" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout_logs" ON workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout_logs" ON workout_logs FOR DELETE USING (auth.uid() = user_id);

-- accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- subscription_reminders
ALTER TABLE subscription_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription_reminders" ON subscription_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription_reminders" ON subscription_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription_reminders" ON subscription_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscription_reminders" ON subscription_reminders FOR DELETE USING (auth.uid() = user_id);

-- Step 1.4: Add set_number column to workout_logs (for multi-set tracking)
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;

-- Step 1.5: Add duration_minutes column to workout_sessions (for stats)
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- =============================================================================
-- AFTER SIGNUP: Run this to assign existing data to your user
-- Replace 'YOUR_USER_ID_HERE' with your actual user UUID from auth.users
-- =============================================================================
-- UPDATE exercises SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE workout_days SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE day_exercises SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE workout_sessions SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE workout_logs SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE accounts SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE transactions SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE subscription_reminders SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- =============================================================================
-- Phase 2: Credit Card Account Fields
-- =============================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit NUMERIC;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS available_credit NUMERIC;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_date INTEGER;
