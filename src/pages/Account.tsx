
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F4E4A] font-inter">Account Settings</h1>
          <p className="text-[#132E2C]/60 text-lg">Manage your organization profile and game settings</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Overview Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {logoPreview ? (
                    <Avatar className="h-24 w-24 border-4 border-[#1F4E4A]/30 shadow-lg">
                      <AvatarImage 
                        src={logoPreview} 
                        alt="Organization logo" 
                        className="object-cover" 
                      />
                      <AvatarFallback className="text-3xl bg-[#1F4E4A]/20 text-white">
                        {organizationName?.charAt(0) || "♥"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-24 w-24 border-4 border-dashed border-[#1F4E4A]/30 shadow-lg">
                      <AvatarFallback className="text-3xl bg-[#F7F8FC] text-[#1F4E4A]">
                        {organizationName?.charAt(0) || "♥"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <CardTitle className="text-[#1F4E4A] font-inter">
                  {organizationName || "Your Organization"}
                </CardTitle>
                <CardDescription className="text-[#132E2C]/60">
                  Queen of Hearts Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#F7F8FC] p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-[#132E2C] text-sm uppercase tracking-wide">Account Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#132E2C]/60">Email:</span>
                      <span className="font-medium text-[#1F4E4A]">{profile?.email || "Not available"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#132E2C]/60">Role:</span>
                      <span className="font-medium text-[#1F4E4A] capitalize">{profile?.role || "Not available"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Settings Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-[#1F4E4A] font-inter">
                  <Building className="h-5 w-5" />
                  <span>Organization Information</span>
                </CardTitle>
                <CardDescription className="text-[#132E2C]/60">
                  Configure your organization's information and branding for the Queen of Hearts game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-1">
                    {/* Organization Name */}
                    <div className="space-y-2">
                      <Label htmlFor="organizationName" className="text-sm font-semibold text-[#132E2C]">
                        Organization Name *
                      </Label>
                      <Input
                        id="organizationName"
                        placeholder="Enter your organization name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                        className="bg-white border-[#1F4E4A]/20 focus:border-[#1F4E4A] focus:ring-[#1F4E4A]"
                      />
                    </div>

                    {/* About Organization */}
                    <div className="space-y-2">
                      <Label htmlFor="about" className="text-sm font-semibold text-[#132E2C]">
                        About Organization
                      </Label>
                      <Textarea
                        id="about"
                        placeholder="Tell us about your organization..."
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={4}
                        className="bg-white border-[#1F4E4A]/20 focus:border-[#1F4E4A] focus:ring-[#1F4E4A] resize-none"
                      />
                    </div>

                    {/* Logo Upload Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-[#132E2C]">Organization Logo</Label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 bg-[#F7F8FC] rounded-lg">
                        <div className="flex-shrink-0">
                          {logoPreview ? (
                            <Avatar className="h-16 w-16 border-2 border-[#1F4E4A]/30">
                              <AvatarImage 
                                src={logoPreview} 
                                alt="Organization logo" 
                                className="object-cover" 
                              />
                              <AvatarFallback className="text-xl bg-[#1F4E4A]/20 text-white">
                                {organizationName?.charAt(0) || "♥"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <Avatar className="h-16 w-16 border-2 border-dashed border-[#1F4E4A]/30">
                              <AvatarFallback className="text-xl bg-white text-[#1F4E4A]">
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
                              className="inline-flex items-center space-x-2 cursor-pointer bg-[#1F4E4A] text-white hover:bg-[#132E2C] px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                              <Upload className="h-4 w-4" />
                              <span>Upload Logo</span>
                            </Label>
                          </div>
                          <p className="text-sm text-[#132E2C]/60">
                            Upload a square image (PNG, JPG) up to 5MB for your organization
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6 border-t border-[#1F4E4A]/10">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white px-8 py-2 font-medium"
                    >
                      {loading ? "Saving..." : "Save Organization Settings"}
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
