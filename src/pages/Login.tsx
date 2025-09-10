
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="min-h-screen bg-white flex items-center justify-center p-2.5">
      {/* Main Container */}
      <div className="w-full max-w-[1308px] h-[800px] bg-gray-300 border-[3px] border-black flex flex-col">
        
        {/* Header Section */}
        <div className="h-[263px] flex border-b border-red-600">
          {/* Logo Section */}
          <div className="w-[337px] h-full flex items-center justify-center px-[43px] pr-[70px]">
            <div className="w-[251px] h-[239px] bg-gray-400 flex items-center justify-center text-gray-600 text-sm">
              Mail Image Placeholder
            </div>
          </div>
          
          {/* Title Section */}
          <div className="flex-1 flex items-end justify-end px-[60px] py-[40px]">
            <h1 className="text-[28px] font-bold text-black">
              Online Organization Management
            </h1>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex-1 flex border-white border-[1px]">
          {/* Login Form Section */}
          <div className="w-[640px] flex items-center justify-center px-[43px] pr-[70px]">
            <div className="w-[527px] h-[404px] bg-red-600 shadow-[10px_14px_14px_rgba(0,0,0,0.45)]">
              {/* Form Container */}
              <div className="px-2.5 py-0">
                {/* Form Fields */}
                <div className="bg-red-600 border-white/50 px-2.5 py-2.5 pb-[17px]">
                  
                  {/* Username Field */}
                  <div className="flex items-center py-2.5 mb-5">
                    <label className="text-white font-medium text-2xl w-[125px]">
                      Username:
                    </label>
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-[352px] h-[57px] bg-white border-0 rounded-none text-black"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="flex items-center py-2.5 mb-5">
                    <label className="text-white font-medium text-2xl w-[125px]">
                      Password:
                    </label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-[352px] h-[57px] bg-white border-0 rounded-none text-black"
                      required
                    />
                  </div>

                  {/* Login Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-[121px] h-[66px] bg-gray-500 hover:bg-gray-600 text-white font-medium text-2xl rounded-none border-0"
                    >
                      {isLoading ? "..." : "Login"}
                    </Button>
                  </div>
                </div>

                {/* Information Text */}
                <div className="px-5 py-8 text-white">
                  <p className="font-medium text-base leading-relaxed">
                    Don't have a username or password? Contact TR Novelties for information on how you can get signed up for this platform.
                  </p>
                  <br />
                  <p className="font-medium text-base leading-relaxed">
                    TR Novelties gives you the opportunity to run your game from any computer with an Internet connection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Text Section */}
          <div className="flex-1 flex items-center px-5 pr-[60px] py-[40px]">
            <div className="text-black">
              <p className="font-medium text-2xl leading-relaxed mb-6">
                Welcome to TR Novelties, LLC.
              </p>
              <p className="font-medium text-2xl leading-relaxed mb-6">
                We aim to revolutionize traditional organization fundraising with a modern twist.
              </p>
              <p className="font-medium text-2xl leading-relaxed">
                Our flagship offering is a high-quality "Lucky Draw Board (Queen of Hearts") board combined with a secure, user-friendly digital platform that tracks drawings, manages funds collected, and ensures financial transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="h-[82px] flex items-center justify-between px-[55px] pr-[74px] py-[25px] pb-2.5">
          <span className="text-red-600 font-medium text-xl">Terms of Use</span>
          <span className="text-red-600 font-medium text-xl">www.trnovelties.com</span>
        </div>
      </div>

      {/* Copyright */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-black font-bold text-[28px]">
          © 2026 TR Novelties LLC. All rights reserved
        </p>
      </div>
    </div>
  );
}
