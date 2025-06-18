
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Eye } from 'lucide-react';

export const AdminViewingIndicator = () => {
  const { isAdmin } = useAuth();
  const { viewingOrganization, isViewingOtherOrganization, returnToAdminView } = useAdmin();

  if (!isAdmin || !isViewingOtherOrganization || !viewingOrganization) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="h-5 w-5 text-blue-600" />
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                {viewingOrganization.logo_url ? (
                  <AvatarImage src={viewingOrganization.logo_url} alt="Organization logo" />
                ) : null}
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                  {viewingOrganization.organization_name?.charAt(0) || viewingOrganization.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-blue-900">
                  Viewing: {viewingOrganization.organization_name || 'Unnamed Organization'}
                </p>
                <p className="text-sm text-blue-700">{viewingOrganization.email}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={returnToAdminView}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Admin View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
