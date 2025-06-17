
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
import { Upload, Building, User, Mail, Shield, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Account() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [about, setAbout] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
      processLogoFile(file);
    }
  };

  const processLogoFile = (file: File) => {
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processLogoFile(imageFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/30 to-accent/10 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg">
            <Building className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Organization Settings</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your organization profile and customize your Queen of Hearts game experience
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Main Settings Card */}
          <div className="md:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-8">
                <CardTitle className="flex items-center space-x-3 text-2xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <span>Organization Information</span>
                </CardTitle>
                <CardDescription className="text-base">
                  Configure your organization's information and branding for the Queen of Hearts game
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Logo Upload Section */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold text-primary">Organization Logo</Label>
                    <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
                            <AvatarImage 
                              src={logoPreview} 
                              alt="Organization logo" 
                              className="object-cover" 
                            />
                            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/80 text-white">
                              {organizationName?.charAt(0) || "♥"}
                            </AvatarFallback>
                          </Avatar>
                          {logoPreview && (
                            <div className="absolute -top-2 -right-2 bg-secondary rounded-full p-1">
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200",
                            isDragOver 
                              ? "border-primary bg-primary/5 scale-105" 
                              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50"
                          )}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              {isDragOver ? "Drop your logo here" : "Drag and drop your logo here"}
                            </p>
                            <p className="text-xs text-muted-foreground">or</p>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="hidden"
                              id="logo-upload"
                            />
                            <Label
                              htmlFor="logo-upload"
                              className="inline-flex items-center space-x-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md"
                            >
                              <Upload className="h-4 w-4" />
                              <span>Choose File</span>
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4">
                            PNG, JPG up to 5MB • Recommended: Square format
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div className="grid gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="organizationName" className="text-base font-semibold text-primary">
                        Organization Name *
                      </Label>
                      <Input
                        id="organizationName"
                        placeholder="Enter your organization name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                        className="h-12 text-base border-2 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="about" className="text-base font-semibold text-primary">
                        About Organization
                      </Label>
                      <Textarea
                        id="about"
                        placeholder="Tell us about your organization, mission, and community involvement..."
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={5}
                        className="text-base border-2 focus:border-primary transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="px-8 py-3 h-auto text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Organization Settings"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Account Information Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <User className="h-5 w-5 text-primary" />
                  <span>Account Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-accent/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                      <p className="text-sm font-semibold truncate">{profile?.email || "Not available"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-accent/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Account Role</p>
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          profile?.role === 'admin' 
                            ? "bg-primary/10 text-primary" 
                            : "bg-secondary/20 text-secondary-foreground"
                        )}>
                          {profile?.role || "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {profile?.created_at && (
                    <div className="flex items-center space-x-3 p-4 bg-accent/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                        <p className="text-sm font-semibold">{formatDate(profile.created_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-primary">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Use a square logo for best results</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    <span>High contrast logos work best</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Update your organization story regularly</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
