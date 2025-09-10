-- Create storage bucket for app assets (logos, covers, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app_assets', 'app_assets', true);

-- Create RLS policies for the app_assets bucket
CREATE POLICY "App assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'app_assets');

CREATE POLICY "Authenticated users can upload app assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'app_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update app assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'app_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete app assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'app_assets' AND auth.role() = 'authenticated');