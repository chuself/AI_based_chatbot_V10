
import React from 'react';
import { useSupabaseSync } from '@/services/supabaseService';
import { Cloud } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SupabaseSyncStatusProps {
  showLabel?: boolean;
  className?: string;
}

const SupabaseSyncStatus: React.FC<SupabaseSyncStatusProps> = ({ 
  showLabel = false,
  className = ''
}) => {
  const { syncStatus } = useSupabaseSync();

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced': return 'text-green-500';
      case 'syncing': return 'text-amber-500';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced': return 'Data synced to cloud';
      case 'syncing': return 'Syncing data...';
      case 'offline': return 'Offline - using local data';
      default: return 'Sync status unknown';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center ${className}`}>
          <Cloud 
            className={`h-4 w-4 ${getStatusColor()}`} 
          />
          {showLabel && (
            <span className="ml-1 text-xs text-gray-500">
              {getStatusText()}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{getStatusText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SupabaseSyncStatus;
