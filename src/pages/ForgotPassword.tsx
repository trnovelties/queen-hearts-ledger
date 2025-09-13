import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Please check your email for the password reset link.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4 lg:p-2.5">
        <div className="w-full max-w-[85vw] sm:max-w-[80vw] lg:max-w-[500px] bg-gray-300 border-2 sm:border-[3px] border-black p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Email Sent!</h1>
          <p className="text-black mb-6">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-[#CC2136] hover:bg-[#AA1B2E] text-white px-6 py-2 rounded-none"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4 lg:p-2.5">
      <div className="w-full max-w-[85vw] sm:max-w-[80vw] lg:max-w-[500px] bg-gray-300 border-2 sm:border-[3px] border-black">
        
        {/* Header */}
        <div className="h-[100px] flex items-center justify-center border-b border-red-600 px-4">
          <h1 className="text-xl lg:text-2xl font-bold text-black text-center">
            Reset Your Password
          </h1>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <div className="bg-[#CC2136] shadow-[6px_10px_14px_rgba(0,0,0,0.35)] p-6">
            <form onSubmit={handleForgotPassword}>
              <div className="mb-6">
                <label className="block text-white font-medium text-sm mb-2">
                  Email Address:
                </label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-white border-0 rounded-none text-black text-base px-4 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#999999] hover:bg-[#888888] active:bg-[#777777] disabled:bg-[#CCCCCC] text-white font-medium text-base rounded-none border-0 transition-colors duration-200"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
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
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}