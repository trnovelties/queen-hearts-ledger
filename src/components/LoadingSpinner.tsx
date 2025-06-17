
export function LoadingSpinner({ 
  title = "Loading", 
  description = "Please wait while we process your request...",
  size = "default" 
}: {
  title?: string;
  description?: string;
  size?: "small" | "default" | "large";
}) {
  const sizeClasses = {
    small: "h-8 w-8",
    default: "h-12 w-12",
    large: "h-16 w-16"
  };

  const containerClasses = {
    small: "py-8",
    default: "py-12",
    large: "py-24"
  };

  return (
    <div className={`min-h-[200px] bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50 flex flex-col items-center justify-center ${containerClasses[size]} space-y-6`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-4 border-[#A1E96C] border-t-[#1F4E4A]`}></div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-[#1F4E4A] font-inter">{title}</h3>
        <p className="text-[#132E2C]/60">{description}</p>
      </div>
    </div>
  );
}
