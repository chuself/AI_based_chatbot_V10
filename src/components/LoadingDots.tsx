
import React from "react";
import { cn } from "@/lib/utils";

interface LoadingDotsProps {
  className?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full delay-0" />
      <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full delay-100" style={{ animationDelay: "0.2s" }} />
      <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full delay-200" style={{ animationDelay: "0.4s" }} />
    </div>
  );
};

export default LoadingDots;
