-- In-app notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'offer_sent', 'offer_accepted', 'offer_rejected',
    'message_received', 'payment_released', 'task_assigned',
    'project_update', 'review_received', 'milestone_ready'
  )),
  
  title TEXT NOT NULL,
  message TEXT,
  
  link TEXT, -- URL to navigate to when clicked
  metadata JSONB, -- Additional data related to the notification
  
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;
