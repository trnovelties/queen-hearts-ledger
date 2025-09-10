
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
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1308px] h-auto lg:h-[800px] bg-gray-300 border-2 sm:border-[3px] border-black flex flex-col relative">
        
        {/* Header Section */}
        <div className="h-auto lg:h-[263px] flex flex-col lg:flex-row border-b border-red-600">
          {/* Logo Section */}
          <div className="w-full lg:w-[337px] h-[150px] sm:h-[200px] lg:h-full flex items-center justify-center px-4 sm:px-[43px] lg:pr-[70px] py-4 lg:py-0">
            <div className="w-[120px] sm:w-[180px] lg:w-[251px] h-[110px] sm:h-[160px] lg:h-[239px] flex items-center justify-center">
              <img 
                src={trNoveliesLogo} 
                alt="TR Novelties Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          {/* Title Section */}
          <div className="flex-1 flex items-center lg:items-end justify-center lg:justify-end px-4 sm:px-8 lg:px-[60px] py-4 lg:py-[40px]">
            <h1 className="text-base sm:text-xl lg:text-[28px] font-bold text-black text-center lg:text-right leading-tight">
              Online Organization Management
            </h1>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex-1 flex flex-col lg:flex-row border-white border-[1px]">
          {/* Login Form Section */}
          <div className="w-full lg:w-[640px] flex items-center justify-center px-2 sm:px-4 lg:px-[43px] lg:pr-[70px] py-4 lg:py-0">
            <div className="w-full max-w-[400px] sm:max-w-[500px] lg:w-[527px] h-auto lg:h-[404px] bg-red-600 shadow-[5px_7px_7px_rgba(0,0,0,0.45)] lg:shadow-[10px_14px_14px_rgba(0,0,0,0.45)]">
              {/* Form Container */}
              <div className="px-2 sm:px-2.5 py-2 lg:py-0">
                {/* Form Fields */}
                <div className="bg-red-600 border-white/50 px-2 sm:px-2.5 py-2 sm:py-2.5 pb-3 sm:pb-[17px]">
                  
                  {/* Username Field */}
                  <div className="flex flex-col sm:flex-row lg:items-center py-1.5 sm:py-2.5 mb-3 sm:mb-5 gap-1 sm:gap-2 lg:gap-0">
                    <label className="text-white font-medium text-sm sm:text-lg lg:text-2xl w-full sm:w-auto lg:w-[125px]">
                      Username:
                    </label>
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full lg:w-[352px] h-10 sm:h-12 lg:h-[57px] bg-white border-0 rounded-none text-black text-sm sm:text-base"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col sm:flex-row lg:items-center py-1.5 sm:py-2.5 mb-3 sm:mb-5 gap-1 sm:gap-2 lg:gap-0">
                    <label className="text-white font-medium text-sm sm:text-lg lg:text-2xl w-full sm:w-auto lg:w-[125px]">
                      Password:
                    </label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full lg:w-[352px] h-10 sm:h-12 lg:h-[57px] bg-white border-0 rounded-none text-black text-sm sm:text-base"
                      required
                    />
                  </div>

                  {/* Login Button */}
                  <div className="flex justify-center lg:justify-end">
                    <Button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-[100px] sm:w-[121px] h-12 sm:h-16 lg:h-[66px] bg-gray-500 hover:bg-gray-600 text-white font-medium text-sm sm:text-lg lg:text-2xl rounded-none border-0"
                    >
                      {isLoading ? "..." : "Login"}
                    </Button>
                  </div>
                </div>

                {/* Information Text */}
                <div className="px-2 sm:px-5 py-4 sm:py-6 lg:py-8 text-white">
                  <p className="font-medium text-xs sm:text-sm lg:text-base leading-relaxed">
                    Don't have a username or password? Contact TR Novelties for information on how you can get signed up for this platform.
                  </p>
                  <br />
                  <p className="font-medium text-xs sm:text-sm lg:text-base leading-relaxed">
                    TR Novelties gives you the opportunity to run your game from any computer with an Internet connection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Text Section */}
          <div className="flex-1 flex items-center px-4 sm:px-6 lg:px-5 lg:pr-[60px] py-4 lg:py-[40px]">
            <div className="text-black">
              <p className="font-medium text-sm sm:text-base lg:text-2xl leading-relaxed mb-3 sm:mb-4 lg:mb-6">
                Welcome to TR Novelties, LLC.
              </p>
              <p className="font-medium text-sm sm:text-base lg:text-2xl leading-relaxed mb-3 sm:mb-4 lg:mb-6">
                We aim to revolutionize traditional organization fundraising with a modern twist.
              </p>
              <p className="font-medium text-sm sm:text-base lg:text-2xl leading-relaxed">
                Our flagship offering is a high-quality "Lucky Draw Board (Queen of Hearts") board combined with a secure, user-friendly digital platform that tracks drawings, manages funds collected, and ensures financial transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="h-auto lg:h-[82px] flex flex-col sm:flex-row lg:flex-row items-center justify-between px-4 sm:px-8 lg:px-[55px] lg:pr-[74px] py-4 lg:py-[25px] lg:pb-2.5 gap-2 sm:gap-4 lg:gap-0">
          <span className="text-red-600 font-medium text-sm sm:text-base lg:text-xl">Terms of Use</span>
          <span className="text-red-600 font-medium text-sm sm:text-base lg:text-xl">www.trnovelties.com</span>
        </div>

        {/* Copyright - Responsive positioning */}
        <div className="lg:absolute lg:bottom-[-60px] lg:left-1/2 lg:transform lg:-translate-x-1/2 p-4 lg:p-0">
          <p className="text-black font-bold text-sm sm:text-base lg:text-[28px] text-center">
            © 2026 TR Novelties LLC. All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
