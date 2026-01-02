-- Clearhold Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  clarity_points INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_usage table for tracking authenticated user usage
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Create guest_usage table for tracking anonymous/guest usage (first free use)
CREATE TABLE IF NOT EXISTS public.guest_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, usage_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_guest_usage_session_date ON public.guest_usage(session_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can do anything on profiles" ON public.profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Daily usage policies
CREATE POLICY "Users can view own usage" ON public.daily_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.daily_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.daily_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can do anything on daily_usage" ON public.daily_usage
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Guest usage policies (more permissive for anonymous access)
CREATE POLICY "Anyone can view guest usage" ON public.guest_usage
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert guest usage" ON public.guest_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update guest usage" ON public.guest_usage
  FOR UPDATE USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create daily usage record
CREATE OR REPLACE FUNCTION public.get_or_create_daily_usage(p_user_id UUID)
RETURNS public.daily_usage AS $$
DECLARE
  result public.daily_usage;
BEGIN
  SELECT * INTO result FROM public.daily_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  IF NOT FOUND THEN
    INSERT INTO public.daily_usage (user_id, usage_date, usage_count)
    VALUES (p_user_id, CURRENT_DATE, 0)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage and return new count
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.daily_usage (user_id, usage_date, usage_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET usage_count = public.daily_usage.usage_count + 1
  RETURNING usage_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add clarity points
CREATE OR REPLACE FUNCTION public.add_clarity_points(p_user_id UUID, p_points INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE public.profiles
  SET clarity_points = clarity_points + p_points
  WHERE id = p_user_id
  RETURNING clarity_points INTO new_total;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
