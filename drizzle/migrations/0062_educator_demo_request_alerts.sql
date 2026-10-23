-- New educator demo requests now email the owner. The notify-demo-request function claims a row by
-- setting notified_at (only while it is still NULL), so each request emails at most once no matter
-- how often the public function is called. submit_educator_demo_request already returns the new id.
ALTER TABLE public.educator_demo_requests ADD COLUMN IF NOT EXISTS notified_at timestamptz;
