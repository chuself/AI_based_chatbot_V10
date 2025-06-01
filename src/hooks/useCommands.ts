
import { useState, useEffect } from "react";
import { loadCommands, Command } from "@/services/commandsService";

export const useCommands = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCommandsData = async () => {
      try {
        setIsLoading(true);
        const loadedCommands = await loadCommands();
        setCommands(loadedCommands);
      } catch (error) {
        console.error("Error loading commands:", error);
        setCommands([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommandsData();
  }, []);

  return {
    commands,
    isLoading,
    refetch: () => {
      loadCommands().then(setCommands);
    }
  };
};
