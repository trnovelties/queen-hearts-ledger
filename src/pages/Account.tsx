
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Building, Camera, Check, X, Crown, User, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Account() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [about, setAbout] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
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
        title: "Success!",
        description: "Your organization settings have been saved successfully.",
      });
      
      setLogoFile(null);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: "Update failed",
        description: error?.message || "Failed to update organization settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/30 to-background">
      {/* Header Section */}
      <div className="bg-white border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your Queen of Hearts organization profile</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Profile Card */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-24 h-24">
                    {logoPreview ? (
                      <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
                        <AvatarImage 
                          src={logoPreview} 
                          alt="Organization logo" 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {organizationName?.charAt(0) || "♥"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-24 h-24 border-4 border-dashed border-primary/30 rounded-full flex items-center justify-center bg-primary/5">
                        <Building className="h-8 w-8 text-primary/60" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-foreground">
                      {organizationName || "Your Organization"}
                    </h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <Shield className="w-3 h-3 mr-1" />
                      {profile?.role || "Member"}
                    </Badge>
                  </div>

                  <div className="pt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{profile?.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Account Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Building className="h-5 w-5" />
                  <span>Organization Information</span>
                </CardTitle>
                <CardDescription className="text-base">
                  Configure your organization's profile for the Queen of Hearts game management
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Organization Details */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="about" className="text-sm font-medium">
                        About Organization
                      </Label>
                      <Textarea
                        id="about"
                        placeholder="Tell us about your organization and its mission..."
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Logo Upload Section */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Organization Logo</Label>
                    
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                        isDragOver 
                          ? 'border-primary bg-primary/5 scale-[1.02]' 
                          : 'border-border hover:border-primary/50 hover:bg-primary/2'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        {logoPreview ? (
                          <div className="relative">
                            <Avatar className="w-20 h-20 border-2 border-primary/20 shadow-md">
                              <AvatarImage 
                                src={logoPreview} 
                                alt="Organization logo preview" 
                                className="object-cover" 
                              />
                              <AvatarFallback>
                                {organizationName?.charAt(0) || "♥"}
                              </AvatarFallback>
                            </Avatar>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                              onClick={clearLogo}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 border-2 border-dashed border-primary/30 rounded-full flex items-center justify-center bg-primary/5">
                            <Camera className="w-8 h-8 text-primary/60" />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">
                            {logoPreview ? 'Logo uploaded successfully!' : 'Drop your logo here or click to browse'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            PNG, JPG up to 5MB • Recommended: 200x200px square image
                          </p>
                        </div>

                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                          id="logo-upload"
                        />
                        
                        <div className="flex space-x-3">
                          <Label
                            htmlFor="logo-upload"
                            className="inline-flex items-center space-x-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                          </Label>
                          
                          {logoPreview && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearLogo}
                              className="flex items-center space-x-2"
                            >
                              <X className="w-4 h-4" />
                              <span>Remove</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-border/60">
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-2 h-11 font-medium"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Check className="w-4 h-4" />
                            <span>Save Organization Settings</span>
                          </div>
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
