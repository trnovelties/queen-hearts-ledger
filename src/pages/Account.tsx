
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Account Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your organization profile and preferences</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Profile Summary Sidebar */}
          <div className="lg:col-span-4">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  {/* Logo Display */}
                  <div className="relative inline-block">
                    {logoPreview ? (
                      <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg">
                        <AvatarImage 
                          src={logoPreview} 
                          alt="Organization logo" 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-20 w-20 border-4 border-dashed border-muted-foreground/30">
                        <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Organization Name */}
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      {organizationName || "Your Organization"}
                    </h2>
                    <p className="text-sm text-muted-foreground">Queen of Hearts Manager</p>
                  </div>

                  {/* Account Info */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
                    <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Account Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium text-foreground truncate ml-2">{profile?.email || "Not available"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Role:</span>
                        <span className="font-medium text-foreground capitalize">{profile?.role || "Not available"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Organization Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Organization Information
                </CardTitle>
                <CardDescription>
                  Configure your organization's profile and branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Organization Name */}
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="text-sm font-medium">
                      Organization Name *
                    </Label>
                    <Input
                      id="organizationName"
                      placeholder="Enter your organization name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      className="focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* About Organization */}
                  <div className="space-y-2">
                    <Label htmlFor="about" className="text-sm font-medium">
                      About Organization
                    </Label>
                    <Textarea
                      id="about"
                      placeholder="Tell us about your organization..."
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={4}
                      className="focus:ring-primary focus:border-primary resize-none"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Organization Logo</Label>
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 bg-muted/20">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center space-x-4">
                          {logoPreview ? (
                            <Avatar className="h-16 w-16 border-2 border-primary/20">
                              <AvatarImage 
                                src={logoPreview} 
                                alt="Organization logo preview" 
                                className="object-cover" 
                              />
                              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                {organizationName?.charAt(0) || "♥"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground/30">
                              <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                                {organizationName?.charAt(0) || "♥"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className="flex-1 space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="hidden"
                              id="logo-upload"
                            />
                            <Label
                              htmlFor="logo-upload"
                              className="inline-flex items-center gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                              <Upload className="h-4 w-4" />
                              Choose Logo
                            </Label>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground text-center">
                          Upload a square image (PNG, JPG) up to 5MB. Recommended size: 400x400px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="min-w-[200px]"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
