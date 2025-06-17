
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
import { Upload, Building, User, Mail, Shield, Heart, Camera, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Account() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [about, setAbout] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (profile) {
      setOrganizationName(profile.organization_name || "");
      setAbout(profile.about || "");
      setLogoPreview(profile.logo_url || null);
    }
  }, [profile]);

  const handleLogoChange = (file: File) => {
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

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoChange(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoChange(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
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
        title: "Success!",
        description: "Your organization information has been saved successfully.",
        action: <CheckCircle className="h-4 w-4" />,
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
    <div className="min-h-screen bg-gradient-to-br from-accent via-white to-accent/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Organization Settings</h1>
              <p className="text-muted-foreground">Manage your Queen of Hearts game organization</p>
            </div>
          </div>
          <Separator className="mt-4" />
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Account Info Sidebar */}
          <div className="md:col-span-1">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4">
                  {logoPreview ? (
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage 
                        src={logoPreview} 
                        alt="Organization logo" 
                        className="object-cover" 
                      />
                      <AvatarFallback className="text-2xl bg-primary text-white">
                        {organizationName?.charAt(0) || "♥"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-24 w-24 border-4 border-dashed border-muted-foreground/30 bg-muted/50">
                      <AvatarFallback className="text-2xl text-muted-foreground">
                        {organizationName?.charAt(0) || "♥"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <CardTitle className="text-lg text-primary">
                  {organizationName || "Your Organization"}
                </CardTitle>
                <CardDescription>
                  Queen of Hearts Game Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile?.email || "Not available"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Role</p>
                      <Badge variant="secondary" className="mt-1">
                        {profile?.role || "Not available"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="md:col-span-2">
            <Card className="shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Organization Information</span>
                </CardTitle>
                <CardDescription className="text-primary-foreground/90">
                  Configure your organization's details and branding
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Organization Name */}
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="text-base font-medium">
                      Organization Name *
                    </Label>
                    <Input
                      id="organizationName"
                      placeholder="Enter your organization name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      className="h-12 text-base"
                    />
                  </div>

                  {/* About Organization */}
                  <div className="space-y-2">
                    <Label htmlFor="about" className="text-base font-medium">
                      About Organization
                    </Label>
                    <Textarea
                      id="about"
                      placeholder="Tell us about your organization and its mission..."
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={4}
                      className="text-base resize-none"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Organization Logo</Label>
                    
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                        dragOver 
                          ? 'border-primary bg-primary/5 scale-105' 
                          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <Camera className="h-8 w-8 text-primary" />
                        </div>
                        
                        <div className="text-center">
                          <p className="text-lg font-medium text-primary">
                            Drop your logo here
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse files
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            PNG, JPG up to 5MB • Square images work best
                          </p>
                        </div>
                        
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileInput}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        
                        <Button
                          type="button"
                          variant="outline"
                          className="pointer-events-none"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    </div>

                    {logoPreview && (
                      <div className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">
                          Logo updated successfully
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button 
                      type="submit" 
                      disabled={loading || !organizationName.trim()}
                      className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Save Organization Settings</span>
                        </div>
                      )}
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
