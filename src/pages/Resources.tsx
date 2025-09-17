import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { OrganizationRules } from "@/components/OrganizationRules";

const taxForms = [
  {
    id: "5754",
    title: "Form 5754",
    fullTitle: "Statement by Person(s) Receiving Gambling Winnings",
    description: "Required when multiple people receive gambling winnings that must be reported to the IRS",
    url: "https://www.irs.gov/pub/irs-pdf/f5754.pdf",
    type: "Direct PDF"
  },
  {
    id: "1096",
    title: "Form 1096", 
    fullTitle: "Annual Summary and Transmittal of U.S. Information Returns",
    description: "Summary form used to transmit Forms W-2G and other information returns to the IRS",
    url: "https://www.irs.gov/forms-pubs/about-form-1096",
    type: "Information Page"
  },
  {
    id: "w2g",
    title: "Form W-2G",
    fullTitle: "Certain Gambling Winnings", 
    description: "Required for gambling winnings over $599. Must be ordered from IRS or office suppliers - downloads not accepted",
    url: "https://www.irs.gov/forms-pubs/about-form-w-2-g",
    type: "Information Page",
    special: "Must be ordered as original forms (7 copies required)"
  }
];

export default function Resources() {
  return (
    <div className="space-y-8">
      {/* Organization Rules Section */}
      <div className="space-y-4">
        <OrganizationRules />
      </div>

      <Separator className="my-8" />

      {/* Tax Forms & Compliance Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-2">Tax Forms & Compliance</h2>
          <p className="text-muted-foreground">
            Resources and forms for organizations conducting Queen of Hearts games in Florida
          </p>
        </div>

        {/* Disclaimer */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important Disclaimer:</strong> This information is provided as a helpful tool only. 
            This is not tax advice or legal guidance. Please consult a professional tax advisor or attorney 
            for assistance with your specific situation.
          </AlertDescription>
        </Alert>

        {/* Winning Threshold Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              When Forms Are Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tax forms are typically required when individual gambling winnings exceed <strong>$599.00</strong>. 
              Organizations should be prepared to complete the appropriate paperwork for qualifying winners.
            </p>
          </CardContent>
        </Card>

        {/* Tax Forms Grid */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {taxForms.map((form) => (
            <Card key={form.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  {form.title}
                </CardTitle>
                <CardDescription className="font-medium">
                  {form.fullTitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {form.description}
                </p>
                
                {form.special && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Special Note:</strong> {form.special}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {form.type}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(form.url, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Additional resources for tax compliance and form ordering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                className="justify-start h-auto p-3"
                onClick={() => window.open('https://www.irs.gov/businesses/small-businesses-self-employed/gambling-tax-law-for-organizations', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">IRS Gambling Tax Guidelines</div>
                  <div className="text-xs text-muted-foreground">Official IRS guidance for organizations</div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-auto p-3"
                onClick={() => window.open('https://www.irs.gov/forms-pubs/forms-and-publications-pdf-files', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">IRS Forms & Publications</div>
                  <div className="text-xs text-muted-foreground">Browse all IRS forms and publications</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}