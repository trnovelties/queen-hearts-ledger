
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Eye, Shield } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { OrganizationSelector } from "./OrganizationSelector";
import { GameManagement } from "../GameManagement";

export function AdminDashboard() {
  const { isViewingOtherOrganization, viewingOrganization } = useAdmin();

  if (isViewingOtherOrganization && viewingOrganization) {
    return (
      <div className="space-y-6">
        {/* Organization Info Header */}
        <Card className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Viewing Organization: {viewingOrganization.organization_name || 'Unnamed Organization'}
                  </CardTitle>
                  <p className="text-white/80 mt-1">
                    {viewingOrganization.email} • {viewingOrganization.role}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Admin View
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Organization's Game Management */}
        <GameManagement />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Welcome Header */}
      <Card className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Admin Dashboard</CardTitle>
              <p className="text-white/80 mt-1">
                Manage and view all organizations in the system
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Organization Selector */}
      <OrganizationSelector />
    </div>
  );
}
