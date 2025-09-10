
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import trNoveliesLogo from "@/assets/tr-novelties-logo.png";

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
    <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4 lg:p-2.5">
      {/* Main Container */}
      <div className="w-full max-w-[85vw] sm:max-w-[80vw] lg:max-w-[1100px] h-auto lg:h-[680px] bg-gray-300 border-2 sm:border-[3px] border-black flex flex-col relative">
        
        {/* Header Section */}
        <div className="h-auto lg:h-[220px] flex flex-col lg:flex-row border-b border-red-600">
          {/* Logo Section */}
          <div className="w-full lg:w-[280px] h-[130px] sm:h-[170px] lg:h-full flex items-center justify-center px-4 sm:px-[35px] lg:pr-[60px] py-4 lg:py-0">
            <div className="w-[100px] sm:w-[150px] lg:w-[200px] h-[90px] sm:h-[130px] lg:h-[190px] flex items-center justify-center">
               <img 
                 src="https://isjbdwxngfrgftfannzi.supabase.co/storage/v1/object/public/app_assets/Queen%20of%20Heartts%20Image%202.png" 
                 alt="Queen of Hearts Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
          </div>
          
          {/* Title Section */}
          <div className="flex-1 flex items-start justify-end px-4 sm:px-6 lg:px-[50px] py-3 lg:py-[35px]">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-black text-right leading-tight">
              Online Organization Management
            </h1>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex-1 flex flex-col lg:flex-row border-white border-[1px]">
          {/* Login Form Section */}
          <div className="w-full lg:w-[540px] flex items-center justify-center px-2 sm:px-4 lg:px-[35px] lg:pr-[60px] py-4 lg:py-0">
            <div className="w-full max-w-[380px] sm:max-w-[460px] lg:w-[450px] h-auto lg:h-[340px] bg-red-600 shadow-[6px_10px_14px_rgba(0,0,0,0.35)] lg:shadow-[8px_12px_12px_rgba(0,0,0,0.45)]">
              {/* Form Container */}
              <div className="px-4 sm:px-6 lg:px-2.5 py-4 sm:py-6 lg:py-0">
                {/* Form Fields */}
                <div className="bg-red-600 border-white/50 px-4 sm:px-6 lg:px-2.5 py-4 sm:py-6 lg:py-2.5 pb-6 lg:pb-[17px]">
                  
                  {/* Username Field */}
                  <div className="flex flex-col lg:flex-row lg:items-center mb-4 sm:mb-6 lg:mb-5 gap-2 lg:gap-0">
                     <label className="text-white font-medium text-xs sm:text-sm lg:text-base w-full lg:w-[125px] mb-1 lg:mb-0">
                       Username:
                     </label>
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full lg:w-[300px] h-10 sm:h-12 lg:h-[48px] bg-white border-0 rounded-none text-black text-sm sm:text-base px-3 sm:px-4 focus:ring-2 focus:ring-white/50 focus:outline-none"
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col lg:flex-row lg:items-center mb-6 sm:mb-8 lg:mb-5 gap-2 lg:gap-0">
                     <label className="text-white font-medium text-xs sm:text-sm lg:text-base w-full lg:w-[125px] mb-1 lg:mb-0">
                       Password:
                     </label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full lg:w-[300px] h-10 sm:h-12 lg:h-[48px] bg-white border-0 rounded-none text-black text-sm sm:text-base px-3 sm:px-4 focus:ring-2 focus:ring-white/50 focus:outline-none"
                      required
                      placeholder="Enter your password"
                    />
                  </div>

                  {/* Login Button */}
                  <div className="flex justify-center lg:justify-end mt-4 lg:mt-0">
                    <Button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full sm:w-auto sm:min-w-[120px] lg:w-[100px] h-10 sm:h-12 lg:h-[56px] bg-gray-500 hover:bg-gray-600 active:bg-gray-700 disabled:bg-gray-400 text-white font-medium text-xs sm:text-sm lg:text-base rounded-none border-0 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      {isLoading ? "Loading..." : "Login"}
                    </Button>
                  </div>
                </div>

                {/* Information Text */}
                <div className="px-4 sm:px-6 lg:px-5 py-3 sm:py-4 lg:py-4 text-white">
                  <p className="font-medium text-xs sm:text-sm lg:text-sm leading-relaxed mb-3 lg:mb-4">
                    Don't have a username or password? Contact TR Novelties for information on how you can get signed up for this platform.
                  </p>
                  <p className="font-medium text-xs sm:text-sm lg:text-sm leading-relaxed">
                    TR Novelties gives you the opportunity to run your game from any computer with an Internet connection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Text Section */}
          <div className="flex-1 flex items-center px-4 sm:px-6 lg:px-5 lg:pr-[60px] py-4 lg:py-[40px]">
            <div className="text-black">
              <p className="font-medium text-sm sm:text-base lg:text-base leading-relaxed mb-3 sm:mb-4 lg:mb-4">
                Welcome to TR Novelties, LLC.
              </p>
              <p className="font-medium text-xs sm:text-sm lg:text-sm leading-relaxed mb-3 sm:mb-4 lg:mb-4">
                We aim to revolutionize traditional organization fundraising with a modern twist.
              </p>
              <p className="font-medium text-xs sm:text-xs lg:text-xs leading-relaxed">
                Our flagship offering is a high-quality "Lucky Draw Board (Queen of Hearts") board combined with a secure, user-friendly digital platform that tracks drawings, manages funds collected, and ensures financial transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="h-auto lg:h-[70px] flex flex-col sm:flex-row lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-[45px] lg:pr-[60px] py-3 lg:py-[20px] lg:pb-2.5 gap-2 sm:gap-4 lg:gap-0">
          <span className="text-red-600 font-medium text-xs sm:text-sm lg:text-base">Terms of Use</span>
          <span className="text-red-600 font-medium text-xs sm:text-sm lg:text-base">www.trnovelties.com</span>
        </div>

        {/* Copyright - Responsive positioning */}
        <div className="lg:absolute lg:bottom-[-60px] lg:left-1/2 lg:transform lg:-translate-x-1/2 p-4 lg:p-0">
          <p className="text-black font-bold text-xs sm:text-sm lg:text-base text-center">
            © 2026 TR Novelties LLC. All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
