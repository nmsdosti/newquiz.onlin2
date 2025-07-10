ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

COMMENT ON COLUMN contact_messages.status IS 'Status of the message: pending, won, loss, under_process';

alter publication supabase_realtime add table contact_messages;
