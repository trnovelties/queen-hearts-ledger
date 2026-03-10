import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Mail, Link2 } from "lucide-react";

export function InviteOrganization() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = () => {
    if (!email.trim()) {
      toast({ title: "Error", description: "Please enter an email address.", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/signup/${encodeURIComponent(email.trim())}`;
    setInviteLink(link);
    setCopied(false);
    toast({ title: "Signup Link Generated", description: `Link created for ${email.trim()}.` });
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Signup link copied to clipboard." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <CardTitle>Invite Organization</CardTitle>
        </div>
        <CardDescription>
          Generate a signup link for a new organization. Copy and send the link manually via email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="inviteEmail">Organization Email</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="organization@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInviteLink(null);
                setCopied(false);
              }}
            />
          </div>
          <Button onClick={handleGenerateLink} disabled={!email.trim()}>
            <Link2 className="w-4 h-4 mr-2" />
            Generate Link
          </Button>
        </div>

        {inviteLink && (
          <div className="space-y-2">
            <Label>Signup Link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="text-xs font-mono bg-muted"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this link and send it to the organization. They'll use it to create their account.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
