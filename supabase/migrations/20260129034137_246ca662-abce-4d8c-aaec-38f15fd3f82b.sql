-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view question images (public bucket)
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow authenticated users to upload question images
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete question images
CREATE POLICY "Authenticated users can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');