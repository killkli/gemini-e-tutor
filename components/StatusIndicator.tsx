
import React from 'react';
import { AppStatus } from '../types';

interface StatusIndicatorProps {
  status: AppStatus;
}

const statusConfig = {
  idle: { text: '準備就緒', color: '#78716c', pulse: false },
  connecting: { text: '連接中...', color: '#f59e0b', pulse: true },
  live: { text: '對話進行中', color: '#10b981', pulse: true },
  stopping: { text: '停止中...', color: '#f59e0b', pulse: false },
  error: { text: '連接錯誤', color: '#ef4444', pulse: false },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-full"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="relative">
        <span
          className="block w-3 h-3 rounded-full"
          style={{ background: config.color }}
        ></span>
        {config.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: config.color, opacity: 0.6 }}
          ></span>
        )}
      </div>
      <span className="text-base font-medium" style={{ fontFamily: 'var(--font-body)' }}>
        {config.text}
      </span>
    </div>
  );
};

export default StatusIndicator;
