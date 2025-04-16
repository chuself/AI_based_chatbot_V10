
import React from "react";
import { cn } from "@/lib/utils";

interface LoadingDotsProps {
  className?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="animate-bounce w-3 h-3 bg-purple-400 rounded-full delay-0" />
      <div className="animate-bounce w-3 h-3 bg-pink-400 rounded-full" style={{ animationDelay: "0.2s" }} />
      <div className="animate-bounce w-3 h-3 bg-indigo-400 rounded-full" style={{ animationDelay: "0.4s" }} />
    </div>
  );
};

export default LoadingDots;
