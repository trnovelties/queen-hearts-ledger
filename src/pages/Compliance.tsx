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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Regulatory Documentation</CardTitle>
            <CardDescription>
              Maintain required permits and licenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Store and track gaming permits, organizational licenses, and compliance certificates.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Audit Trail</CardTitle>
            <CardDescription>
              Track all game transactions and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically generated audit logs for all financial transactions and game modifications.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Reporting Dashboard</CardTitle>
            <CardDescription>
              Generate compliance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create detailed reports for regulatory authorities and internal compliance reviews.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Tax Documentation</CardTitle>
            <CardDescription>
              Prepare tax-ready financial summaries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automated tax forms and documentation for gaming revenue and charitable donations.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Winner Verification</CardTitle>
            <CardDescription>
              Identity and eligibility checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tools to verify winner identity and ensure compliance with local gaming regulations.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Policy Management</CardTitle>
            <CardDescription>
              Maintain organizational policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Store and manage game rules, payout policies, and compliance procedures.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}