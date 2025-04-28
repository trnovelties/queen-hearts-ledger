
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="text-8xl font-bold text-primary mb-2">404</div>
          <h1 className="text-2xl font-semibold text-primary mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find the page you're looking for.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button onClick={handleGoHome} className="min-w-[150px]">
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NotFound;
