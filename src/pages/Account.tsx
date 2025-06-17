
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Building } from "lucide-react";

export default function Account() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [about, setAbout] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setOrganizationName(profile.organization_name || "");
      setAbout(profile.about || "");
      setLogoPreview(profile.logo_url || null);
    }
  }, [profile]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      
      // Check if bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const brandImageBucket = buckets?.find(bucket => bucket.name === 'brand_image');
      
      if (!brandImageBucket) {
        const { error: bucketError } = await supabase.storage.createBucket('brand_image', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
          throw bucketError;
        }
      }
      
      const { data, error } = await supabase.storage
        .from('brand_image')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand_image')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setLoading(true);
    try {
      let logoUrl = profile.logo_url;
      
      // Upload new logo if file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          throw new Error("Failed to upload logo");
        }
      }

      const { error } = await supabase.rpc('update_user_profile', {
        p_user_id: profile.id,
        p_organization_name: organizationName,
        p_about: about,
        p_logo_url: logoUrl
      });

      if (error) throw error;

      toast({
        title: "Organization updated",
        description: "Your organization information has been saved successfully.",
      });
      
      setLogoFile(null);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: "Update failed",
        description: error?.message || "Failed to update organization.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Manage your organization profile and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Organization Information</span>
          </CardTitle>
          <CardDescription>
            Configure your organization's information and branding for the Queen of Hearts game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  placeholder="Enter your organization name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About Organization</Label>
                <Textarea
                  id="about"
                  placeholder="Tell us about your organization..."
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <Label>Organization Logo</Label>
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarImage 
                          src={logoPreview} 
                          alt="Organization logo" 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-2xl">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-20 w-20 border-2 border-dashed border-border">
                        <AvatarFallback className="text-2xl">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label
                        htmlFor="logo-upload"
                        className="inline-flex items-center space-x-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Logo</span>
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload a square image (PNG, JPG) up to 5MB for your organization
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Email:</span> {profile?.email || "Not available"}
                  </div>
                  <div>
                    <span className="font-medium">Role:</span> {profile?.role || "Not available"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Organization Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
