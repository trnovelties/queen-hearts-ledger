
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, ArrowLeft, Building, Users, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";

type Organization = {
  id: string;
  email: string;
  organization_name: string | null;
  logo_url: string | null;
  about: string | null;
  role: string;
  created_at: string;
};

export function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { switchToOrganization, returnToAdminView, viewingOrganization, isViewingOtherOrganization } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, organization_name, logo_url, about, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrganization = (org: Organization) => {
    switchToOrganization({
      id: org.id,
      email: org.email,
      organization_name: org.organization_name,
      logo_url: org.logo_url,
      about: org.about,
      role: org.role
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-6 h-6" />
            Organization Management
          </h2>
          <p className="text-gray-600 mt-1">
            {isViewingOtherOrganization 
              ? `Currently viewing: ${viewingOrganization?.organization_name || viewingOrganization?.email}`
              : "Select an organization to view and manage their data"
            }
          </p>
        </div>
        {isViewingOtherOrganization && (
          <Button 
            onClick={returnToAdminView}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin View
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={org.logo_url || ''} alt={org.organization_name || org.email} />
                    <AvatarFallback className="bg-[#A1E96C] text-[#132E2C]">
                      {(org.organization_name || org.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {org.organization_name || 'Unnamed Organization'}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      {org.email}
                    </div>
                  </div>
                </div>
                <Badge variant={org.role === 'admin' ? 'destructive' : 'secondary'}>
                  {org.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {org.about && (
                <p className="text-sm text-gray-600 line-clamp-2">{org.about}</p>
              )}
              
              <div className="text-xs text-gray-500">
                Joined: {new Date(org.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => handleViewOrganization(org)}
                  className="flex-1 bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Organizations Found</h3>
            <p className="text-gray-600 text-center">
              There are no organizations in the system yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
