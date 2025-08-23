
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, signup } = useAuth();

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signup(email, password);

      if (error) {
        throw error;
      }

      toast({
        title: "Account created!",
        description: "Welcome to Queen of Hearts Manager.",
      });
      
      // Auto-login after signup is handled by the AuthContext
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error?.message || "There was an issue creating your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 bg-primary flex items-center justify-center p-8">
        <div className="w-full max-w-md">
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

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6 bg-primary-foreground/10">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-primary-foreground data-[state=active]:text-primary"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="data-[state=active]:bg-primary-foreground data-[state=active]:text-primary"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
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
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-primary-foreground">
                    Email:
                  </Label>
                  <Input 
                    id="signup-email" 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-primary-foreground border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-primary-foreground">
                    Password:
                  </Label>
                  <Input 
                    id="signup-password" 
                    type="password" 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-primary-foreground border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-primary-foreground">
                    Confirm Password:
                  </Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-primary-foreground border-0"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-primary-foreground/70 text-sm">
              Don't have a username or password?{" "}
              <button 
                type="button"
                className="text-secondary underline hover:no-underline"
                onClick={() => setActiveTab("register")}
              >
                Contact Admin
              </button>
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

          <div className="mt-8">
            <h3 className="font-semibold mb-2 text-foreground">Queen of Hearts Manager requires:</h3>
            <ul className="space-y-1 text-sm text-foreground/70">
              <li>• Modern web browser (Chrome, Firefox, Safari, Edge)</li>
              <li>• Internet connection for real-time sync</li>
              <li>• Mobile-friendly responsive design</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
