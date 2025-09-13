import { cn } from "@/lib/utils";
import { Loader2, Activity } from "lucide-react";

interface LoadingProps {
  variant?: "fullscreen" | "inline" | "button" | "card" | "overlay";
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

export function Loading({ 
  variant = "inline", 
  size = "md", 
  message,
  className 
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const LoadingSpinner = () => (
    <div className="relative">
      {/* Main spinner */}
      <div 
        className={cn(
          "animate-spin rounded-full border-2 border-transparent",
          "border-t-primary border-r-primary/30",
          sizeClasses[size]
        )}
      />
      {/* Inner accent dot */}
      <div 
        className={cn(
          "absolute inset-0 animate-ping rounded-full bg-primary/20",
          size === "sm" && "scale-50",
          size === "md" && "scale-75", 
          size === "lg" && "scale-90"
        )}
      />
    </div>
  );

  const LoadingPulse = () => (
    <div className="flex items-center space-x-2">
      <div className={cn("bg-primary rounded-full animate-pulse", 
        size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
      )} />
      <div className={cn("bg-primary/70 rounded-full animate-pulse delay-75", 
        size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
      )} />
      <div className={cn("bg-primary/40 rounded-full animate-pulse delay-150", 
        size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
      )} />
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        "flex flex-col items-center justify-center space-y-4",
        className
      )}>
        <div className="relative">
          <LoadingSpinner />
          <Activity className={cn(
            "absolute inset-0 m-auto text-primary animate-pulse",
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-4 w-4" : "h-6 w-6"
          )} />
        </div>
        {message && (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">{message}</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
              <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-75" />
              <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className={cn(
        "absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px]",
        "flex flex-col items-center justify-center space-y-3",
        "rounded-lg",
        className
      )}>
        <LoadingSpinner />
        {message && (
          <p className="text-sm font-medium text-muted-foreground text-center">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-8 space-y-4",
        "bg-card rounded-lg border border-border/50",
        className
      )}>
        <LoadingSpinner />
        {message && (
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        )}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {message && (
          <span className="text-sm font-medium">{message}</span>
        )}
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={cn(
      "flex items-center justify-center space-x-3 p-4",
      className
    )}>
      <LoadingSpinner />
      {message && (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// Specialized loading components for common use cases
export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <Loading 
      variant="fullscreen" 
      size="lg" 
      message={message}
      className="min-h-screen"
    />
  );
}

export function CardLoading({ message }: { message?: string }) {
  return (
    <Loading 
      variant="card" 
      size="md" 
      message={message}
      className="min-h-32"
    />
  );
}

export function InlineLoading({ message, size = "md" }: { message?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <Loading 
      variant="inline" 
      size={size} 
      message={message}
    />
  );
}

export function ButtonLoading({ message = "Loading...", size = "sm" }: { message?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <Loading 
      variant="button" 
      size={size} 
      message={message}
    />
  );
}