
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
    <div className="min-h-screen">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-[#1F4E4A] to-[#132E2C] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold font-inter mb-4">Account Settings</h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Manage your organization profile and customize your Queen of Hearts game experience
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Left Sidebar - Profile Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Profile Card */}
              <Card className="bg-white border-[#1F4E4A]/20 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] h-20"></div>
                <CardContent className="relative px-6 pb-6">
                  <div className="flex flex-col items-center -mt-12 mb-6">
                    {logoPreview ? (
                      <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-2 ring-[#1F4E4A]/20">
                        <AvatarImage 
                          src={logoPreview} 
                          alt="Organization logo" 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-2xl bg-[#1F4E4A] text-white">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-2 ring-[#1F4E4A]/20">
                        <AvatarFallback className="text-2xl bg-[#1F4E4A] text-white">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-[#1F4E4A] mb-2">
                      {organizationName || "Your Organization"}
                    </h2>
                    <p className="text-[#132E2C]/60 font-medium">
                      Queen of Hearts Manager
                    </p>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-4">
                    <div className="border-t border-[#1F4E4A]/10 pt-4">
                      <h3 className="text-sm font-semibold text-[#132E2C] uppercase tracking-wide mb-3">
                        Account Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-[#132E2C]/60">Email Address</span>
                          <span className="text-sm font-medium text-[#1F4E4A]">
                            {profile?.email || "Not available"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-[#132E2C]/60">Account Type</span>
                          <span className="text-sm font-medium text-[#1F4E4A] capitalize">
                            {profile?.role || "Not available"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white border-[#1F4E4A]/20 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#1F4E4A] mb-4">Organization Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#132E2C]/60">Profile Complete</span>
                      <span className="text-sm font-medium text-[#1F4E4A]">
                        {organizationName && about ? "100%" : "60%"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#1F4E4A] h-2 rounded-full transition-all duration-300"
                        style={{ width: organizationName && about ? "100%" : "60%" }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Content - Settings Form */}
          <div className="lg:col-span-8">
            <Card className="bg-white border-[#1F4E4A]/20 shadow-lg">
              <CardHeader className="border-b border-[#1F4E4A]/10 bg-gray-50/50">
                <CardTitle className="flex items-center space-x-3 text-[#1F4E4A] text-2xl font-inter">
                  <Building className="h-6 w-6" />
                  <span>Organization Settings</span>
                </CardTitle>
                <CardDescription className="text-[#132E2C]/60 text-base mt-2">
                  Update your organization's information and branding for the Queen of Hearts game system
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Organization Information Section */}
                  <div className="space-y-6">
                    <div className="border-b border-[#1F4E4A]/10 pb-4">
                      <h3 className="text-lg font-semibold text-[#1F4E4A] mb-1">Basic Information</h3>
                      <p className="text-sm text-[#132E2C]/60">Essential details about your organization</p>
                    </div>
                    
                    <div className="grid gap-6 sm:grid-cols-1">
                      {/* Organization Name */}
                      <div className="space-y-3">
                        <Label htmlFor="organizationName" className="text-base font-semibold text-[#132E2C]">
                          Organization Name *
                        </Label>
                        <Input
                          id="organizationName"
                          placeholder="Enter your organization name"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          required
                          className="h-12 text-base bg-white border-[#1F4E4A]/20 focus:border-[#1F4E4A] focus:ring-[#1F4E4A]"
                        />
                        <p className="text-sm text-[#132E2C]/60">
                          This name will appear on reports and game interfaces
                        </p>
                      </div>

                      {/* About Organization */}
                      <div className="space-y-3">
                        <Label htmlFor="about" className="text-base font-semibold text-[#132E2C]">
                          About Organization
                        </Label>
                        <Textarea
                          id="about"
                          placeholder="Tell us about your organization, its mission, and activities..."
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          rows={4}
                          className="text-base bg-white border-[#1F4E4A]/20 focus:border-[#1F4E4A] focus:ring-[#1F4E4A] resize-none"
                        />
                        <p className="text-sm text-[#132E2C]/60">
                          Optional description that helps identify your organization
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Branding Section */}
                  <div className="space-y-6">
                    <div className="border-b border-[#1F4E4A]/10 pb-4">
                      <h3 className="text-lg font-semibold text-[#1F4E4A] mb-1">Branding & Logo</h3>
                      <p className="text-sm text-[#132E2C]/60">Upload your organization's logo for reports and game materials</p>
                    </div>
                    
                    <div className="bg-gray-50/50 p-6 rounded-lg border border-[#1F4E4A]/10">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
                        
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          <div className="text-center">
                            {logoPreview ? (
                              <Avatar className="h-20 w-20 border-2 border-[#1F4E4A]/30 shadow-lg mx-auto mb-3">
                                <AvatarImage 
                                  src={logoPreview} 
                                  alt="Organization logo" 
                                  className="object-cover" 
                                />
                                <AvatarFallback className="text-xl bg-[#1F4E4A]/20 text-[#1F4E4A]">
                                  {organizationName?.charAt(0) || "♥"}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <Avatar className="h-20 w-20 border-2 border-dashed border-[#1F4E4A]/30 shadow-lg mx-auto mb-3">
                                <AvatarFallback className="text-xl bg-white text-[#1F4E4A]">
                                  {organizationName?.charAt(0) || "♥"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <p className="text-sm text-[#132E2C]/60">Current Logo</p>
                          </div>
                        </div>
                        
                        {/* Upload Controls */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label className="text-base font-semibold text-[#132E2C] mb-3 block">
                              Upload New Logo
                            </Label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                                id="logo-upload"
                              />
                              <Label
                                htmlFor="logo-upload"
                                className="inline-flex items-center space-x-3 cursor-pointer bg-[#1F4E4A] text-white hover:bg-[#132E2C] px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                <Upload className="h-5 w-5" />
                                <span>Choose File</span>
                              </Label>
                              {logoFile && (
                                <span className="text-sm text-[#1F4E4A] font-medium">
                                  {logoFile.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <ul className="text-sm text-[#132E2C]/70 space-y-1">
                              <li>• Recommended size: 400x400 pixels</li>
                              <li>• Supported formats: PNG, JPG, GIF</li>
                              <li>• Maximum file size: 5MB</li>
                              <li>• Square images work best</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Section */}
                  <div className="border-t border-[#1F4E4A]/10 pt-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                      <div>
                        <p className="text-sm text-[#132E2C]/60">
                          Changes will be applied immediately to all game reports and interfaces
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {loading ? (
                          <span className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent"></div>
                            <span>Saving Changes...</span>
                          </span>
                        ) : (
                          "Save Organization Settings"
                        )}
                      </Button>
                    </div>
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
