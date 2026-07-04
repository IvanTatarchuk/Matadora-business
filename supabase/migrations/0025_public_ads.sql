-- Public Ads Module Migration
-- Дозволяє звичайним користувачам розміщувати оголошення про ремонт

-- Таблиця оголошень
CREATE TABLE IF NOT EXISTS public_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('apartment', 'house', 'office', 'commercial')),
  area_size DECIMAL(10,2),
  address TEXT,
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  photos TEXT[] DEFAULT '{}',
  phone VARCHAR(20),
  preferred_contact VARCHAR(50) DEFAULT 'phone' CHECK (preferred_contact IN ('phone', 'email', 'chat')),
  work_type VARCHAR(50)[] DEFAULT '{}',
  start_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'suspended')),
  views_count INTEGER DEFAULT 0,
  responses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблиця відповідей на оголошення
CREATE TABLE IF NOT EXISTS ad_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES public_ads(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  estimated_price DECIMAL(12,2),
  estimated_days INTEGER,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблиця відгуків на підрядників
CREATE TABLE IF NOT EXISTS contractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES public_ads(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, author_id, ad_id)
);

-- Таблиця підписок підрядників
CREATE TABLE IF NOT EXISTS contractor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('basic', 'professional', 'premium')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  responses_allowed INTEGER DEFAULT 5,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Індекси для оптимізації пошуку
CREATE INDEX IF NOT EXISTS idx_public_ads_city ON public_ads(city);
CREATE INDEX IF NOT EXISTS idx_public_ads_status ON public_ads(status);
CREATE INDEX IF NOT EXISTS idx_public_ads_budget ON public_ads(budget_min, budget_max);
CREATE INDEX IF NOT EXISTS idx_public_ads_work_type ON public_ads USING GIN(work_type);
CREATE INDEX IF NOT EXISTS idx_public_ads_created_at ON public_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_responses_ad_id ON ad_responses(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_responses_contractor_id ON ad_responses(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_reviews_contractor_id ON contractor_reviews(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_contractor_id ON contractor_subscriptions(contractor_id);

-- RLS (Row Level Security) для public_ads
ALTER TABLE public_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all active ads"
  ON public_ads FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can view their own ads"
  ON public_ads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create ads"
  ON public_ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads"
  ON public_ads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ads"
  ON public_ads FOR DELETE
  USING (auth.uid() = user_id);

-- RLS для ad_responses
ALTER TABLE ad_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to their ads"
  ON ad_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public_ads 
      WHERE public_ads.id = ad_responses.ad_id 
      AND public_ads.user_id = auth.uid()
    )
    OR auth.uid() = contractor_id
  );

CREATE POLICY "Contractors can create responses"
  ON ad_responses FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

CREATE POLICY "Ad owners can update responses"
  ON ad_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public_ads 
      WHERE public_ads.id = ad_responses.ad_id 
      AND public_ads.user_id = auth.uid()
    )
  );

-- RLS для contractor_reviews
ALTER TABLE contractor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view reviews"
  ON contractor_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON contractor_reviews FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- RLS для contractor_subscriptions
ALTER TABLE contractor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON contractor_subscriptions FOR SELECT
  USING (auth.uid() = contractor_id);

CREATE POLICY "Users can create subscriptions"
  ON contractor_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

-- Функція оновлення updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Тригери для оновлення updated_at
CREATE TRIGGER update_public_ads_updated_at
  BEFORE UPDATE ON public_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_responses_updated_at
  BEFORE UPDATE ON ad_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Функція оновлення лічильників
CREATE OR REPLACE FUNCTION increment_ad_responses_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public_ads 
  SET responses_count = responses_count + 1 
  WHERE id = NEW.ad_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_responses_count
  AFTER INSERT ON ad_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_ad_responses_count();

-- RPC функція для збільшення лічильника переглядів
CREATE OR REPLACE FUNCTION increment_views_count(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public_ads 
  SET views_count = views_count + 1 
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
