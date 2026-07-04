-- Messenger/Chat module with Supabase Realtime support
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  
  title TEXT,
  type TEXT NOT NULL DEFAULT 'project' CHECK (type IN ('project', 'offer', 'direct')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_offer ON conversations(offer_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file', 'image')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see conversations they participate in
CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));

-- Users can create conversations
CREATE POLICY "conversations_insert_authenticated"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update conversations they participate in
CREATE POLICY "conversations_update_participants"
  ON conversations FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));

-- Users can see their participant records
CREATE POLICY "conversation_participants_select_own"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can be added to conversations
CREATE POLICY "conversation_participants_insert_authenticated"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own participant records
CREATE POLICY "conversation_participants_update_own"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can see messages in conversations they participate in
CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  TO authenticated
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));

-- Users can send messages in conversations they participate in
CREATE POLICY "messages_insert_participants"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
