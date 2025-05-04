
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";

export default function Account() {
  const { profile, updateProfile, uploadLogo } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: profile?.organization_name || '',
    about: profile?.about || ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile?.logo_url || null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let logoUrl = profile?.logo_url;
      
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      await updateProfile({
        organization_name: formData.organization_name,
        about: formData.about,
        logo_url: logoUrl
      });
      
      toast({
        title: "Profile Updated",
        description: "Your organization profile has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organization Profile</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} alt="Organization Logo" />
                  ) : (
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {formData.organization_name?.charAt(0) || profile?.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="logo" className="text-center">Logo</Label>
                  <div className="flex justify-center">
                    <Button
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('logo')?.click()}
                      className="flex gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </Button>
                    <Input 
                      id="logo" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile?.email || ''} 
                    disabled 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="organization_name">Organization Name</Label>
                  <Input 
                    id="organization_name" 
                    name="organization_name"
                    value={formData.organization_name} 
                    onChange={handleInputChange} 
                    placeholder="Enter your organization name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="about">About</Label>
                  <Textarea 
                    id="about" 
                    name="about"
                    value={formData.about || ''} 
                    onChange={handleInputChange} 
                    placeholder="Tell us about your organization" 
                    rows={4} 
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
