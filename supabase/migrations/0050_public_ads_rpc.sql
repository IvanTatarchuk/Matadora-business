-- Add RPC function for incrementing view count
CREATE OR REPLACE FUNCTION increment_views_count(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public_ads 
  SET views_count = views_count + 1 
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
