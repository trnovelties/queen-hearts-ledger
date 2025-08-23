
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await login(email, password);

      if (error) {
        throw error;
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to Queen of Hearts Manager.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error?.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Cover Image Section - Full Width */}
      <div className="h-32 bg-muted/20 flex items-center justify-center border-b">
        <div className="text-muted-foreground">
          Cover Image Area - League Leader Plus
        </div>
      </div>
      
      {/* Main Content Area - Two Columns */}
      <div className="flex-1 flex">
        {/* Left Panel - Login Form */}
        <div className="w-full lg:w-1/2 bg-primary flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="h-16 w-16 mx-auto mb-4 bg-secondary rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-secondary-foreground">TR</span>
              </div>
              <h1 className="text-2xl font-bold text-primary-foreground mb-2">
                Queen of Hearts Manager
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                Online League Management
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-primary-foreground">
                  Username:
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-primary-foreground border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-primary-foreground">
                  Password:
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-primary-foreground border-0"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-primary-foreground/70 text-sm">
                Don't have a username or password?{" "}
                <span className="text-secondary">Contact Admin</span>
                {" "}for information on how you can get signed up for Queen of Hearts Manager.
              </p>
            </div>

            <div className="mt-6 text-primary-foreground/70 text-sm">
              <p className="mb-2">
                Queen of Hearts Manager gives you the opportunity to run your leagues from any computer with an Internet connection.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Features */}
        <div className="hidden lg:flex w-1/2 bg-muted items-center justify-center p-8">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Features:</h2>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Real-time jackpot tracking and calculations
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Comprehensive financial reporting and analytics
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Automated payout calculations and winner management
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Online database lets you check on your games from virtually anywhere!
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
