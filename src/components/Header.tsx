
import React from "react";

interface HeaderProps {
  modelName?: string;
}

const Header: React.FC<HeaderProps> = ({ modelName }) => {
  return (
    <header className="bg-gemini-primary text-white py-3 px-4 fixed top-0 left-0 right-0 z-10 shadow-md">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold">Gemini Chat</h1>
        {modelName && (
          <span className="text-xs opacity-80">
            Model: {modelName.split("/").pop()}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
