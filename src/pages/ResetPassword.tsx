import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      toast({
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [searchParams, navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password updated!",
        description: "Your password has been successfully updated. You can now log in.",
      });
      
      navigate("/login");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4 lg:p-2.5">
      <div className="w-full max-w-[85vw] sm:max-w-[80vw] lg:max-w-[500px] bg-gray-300 border-2 sm:border-[3px] border-black">
        
        {/* Header */}
        <div className="h-[100px] flex items-center justify-center border-b border-red-600 px-4">
          <h1 className="text-xl lg:text-2xl font-bold text-black text-center">
            Set New Password
          </h1>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <div className="bg-[#CC2136] shadow-[6px_10px_14px_rgba(0,0,0,0.35)] p-6">
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-white font-medium text-sm mb-2">
                  New Password:
                </label>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-white border-0 rounded-none text-black text-base px-4 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  required
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>

              <div className="mb-6">
                <label className="block text-white font-medium text-sm mb-2">
                  Confirm Password:
                </label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 bg-white border-0 rounded-none text-black text-base px-4 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  required
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#999999] hover:bg-[#888888] active:bg-[#777777] disabled:bg-[#CCCCCC] text-white font-medium text-base rounded-none border-0 transition-colors duration-200"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
                
                <Button
                  type="button"
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full h-12 bg-transparent border-2 border-white text-white font-medium text-base rounded-none hover:bg-white/10"
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </div>

          <div className="text-black mt-4 px-3">
            <p className="font-medium text-sm leading-relaxed">
              Please enter your new password. Make sure it's at least 6 characters long.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}