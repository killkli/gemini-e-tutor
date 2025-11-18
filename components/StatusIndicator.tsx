
import React from 'react';
import { AppStatus } from '../types';

interface StatusIndicatorProps {
  status: AppStatus;
}

const statusConfig = {
  idle: { text: 'Ready', color: 'bg-gray-400' },
  connecting: { text: 'Connecting...', color: 'bg-yellow-400 animate-pulse' },
  live: { text: 'Live', color: 'bg-green-500 animate-pulse' },
  stopping: { text: 'Stopping...', color: 'bg-yellow-400' },
  error: { text: 'Error', color: 'bg-red-500' },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, color } = statusConfig[status];

  return (
    <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      <span>{text}</span>
    </div>
  );
};

export default StatusIndicator;
