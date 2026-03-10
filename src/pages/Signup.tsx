import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const { email: encodedEmail } = useParams<{ email: string }>();
  const invitedEmail = decodeURIComponent(encodedEmail || "");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!invitedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Signup Link</CardTitle>
            <CardDescription>
              This signup link is invalid. Please contact your administrator for a valid link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSignup = async () => {
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Your organization account has been created successfully. You can now log in.",
      });
      navigate("/login");
    } catch (err: any) {
      console.error("Signup error:", err);
      toast({
        title: "Signup Failed",
        description: err.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/placeholder.svg"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-2"
          />
          <CardTitle className="text-2xl font-bold text-[#1F4E4A]">
            Create Your Account
          </CardTitle>
          <CardDescription>
            You've been invited to join Queen of Hearts Manager. Set up your organization account below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button className="w-full" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Log in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
