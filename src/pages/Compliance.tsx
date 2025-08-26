import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Construction } from "lucide-react";

export default function Compliance() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Compliance Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage compliance requirements for your organization's gaming activities.
        </p>
      </div>

      <Alert>
        <Construction className="h-4 w-4" />
        <AlertDescription>
          <strong>Upcoming Feature:</strong> This section is currently under development. 
          Compliance management tools will be available soon to help you maintain regulatory requirements 
          and documentation for your Queen of Hearts games.
        </AlertDescription>
      </Alert>

      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground italic">Upcoming feature</p>
      </div>
    </div>
  );
}