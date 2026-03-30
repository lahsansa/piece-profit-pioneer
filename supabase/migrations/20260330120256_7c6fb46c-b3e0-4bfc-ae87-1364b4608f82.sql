
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create topups table
CREATE TABLE public.topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_usdt DECIMAL NOT NULL DEFAULT 0,
  txid TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own topups" ON public.topups FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own topups" ON public.topups FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all topups" ON public.topups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create user_stores table
CREATE TABLE public.user_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_level TEXT NOT NULL DEFAULT 'Small shop',
  balance DECIMAL NOT NULL DEFAULT 0,
  total_topup DECIMAL NOT NULL DEFAULT 0,
  total_profit DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own store" ON public.user_stores FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all stores" ON public.user_stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create earnings table
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all earnings" ON public.earnings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
