-- Add unique_link_id and fb_group_link to batches table
ALTER TABLE public.batches 
ADD COLUMN unique_link_id TEXT NOT NULL DEFAULT '',
ADD COLUMN fb_group_link TEXT;