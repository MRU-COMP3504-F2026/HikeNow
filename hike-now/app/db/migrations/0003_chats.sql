CREATE TABLE IF NOT EXISTS conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiker_low uuid NOT NULL REFERENCES hiker(id) ON DELETE CASCADE,
  hiker_high uuid NOT NULL REFERENCES hiker(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_ordered_pair CHECK (hiker_low < hiker_high)
);
CREATE UNIQUE INDEX IF NOT EXISTS conversation_pair_unique ON conversation(hiker_low, hiker_high);

CREATE TABLE IF NOT EXISTS conversation_member (
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  hiker_id uuid NOT NULL REFERENCES hiker(id) ON DELETE CASCADE,
  accepted boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  PRIMARY KEY (conversation_id, hiker_id)
);
CREATE INDEX IF NOT EXISTS conversation_member_hiker_idx ON conversation_member(hiker_id);

CREATE TABLE IF NOT EXISTS chat_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES hiker(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_message_conversation_idx ON chat_message(conversation_id, created_at);

ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON conversation, conversation_member, chat_message FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON conversation, conversation_member, chat_message FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON conversation, conversation_member, chat_message FROM authenticated;
  END IF;
END $$;
