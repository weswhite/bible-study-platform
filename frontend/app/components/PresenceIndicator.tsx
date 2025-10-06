import { useState, useEffect } from 'react';
import { getUserColor, getUserInitials } from '~/utils/userColors';

interface User {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface PresenceIndicatorProps {
  activeUsers: User[];
  currentUserId?: string;
  isConnected: boolean;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
}

export function PresenceIndicator({
  activeUsers,
  currentUserId,
  isConnected,
  maxVisible = 5,
  size = 'md',
  showNames = false
}: PresenceIndicatorProps) {
  const [pulseUsers, setPulseUsers] = useState<Set<string>>(new Set());

  // Filter out current user and get unique users
  const otherUsers = activeUsers.filter(user => user.userId !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'w-6 h-6', text: 'text-xs', offset: '-ml-1' },
    md: { avatar: 'w-8 h-8', text: 'text-sm', offset: '-ml-2' },
    lg: { avatar: 'w-10 h-10', text: 'text-base', offset: '-ml-3' }
  };

  const config = sizeConfig[size];

  // Add pulse effect when user joins
  useEffect(() => {
    const newUserIds = new Set(otherUsers.map(u => u.userId));
    const prevUserIds = new Set(Array.from(pulseUsers));

    newUserIds.forEach(userId => {
      if (!prevUserIds.has(userId)) {
        setPulseUsers(prev => new Set(prev).add(userId));
        setTimeout(() => {
          setPulseUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }, 2000);
      }
    });
  }, [otherUsers.length]);

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`${config.avatar} rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        {showNames && (
          <span className={`${config.text} text-gray-500`}>
            {isConnected ? 'Just you' : 'Offline'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {/* Avatar Stack */}
      <div className="flex items-center">
        {visibleUsers.map((user, index) => {
          const color = getUserColor(user.userId);
          const initials = getUserInitials(user.firstName, user.lastName, user.username);
          const isPulsing = pulseUsers.has(user.userId);

          return (
            <div
              key={user.userId}
              className={`relative ${index > 0 ? config.offset : ''}`}
              style={{ zIndex: visibleUsers.length - index }}
            >
              <div
                className={`
                  ${config.avatar} rounded-full border-2 border-white shadow-sm
                  flex items-center justify-center font-medium ${config.text}
                  ${color.accent} text-white
                  ${isPulsing ? 'animate-pulse' : ''}
                  transition-all duration-200 hover:scale-110
                `}
                title={user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName} (@${user.username})`
                  : `@${user.username}`
                }
              >
                {initials}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
          );
        })}

        {/* Overflow indicator */}
        {hiddenCount > 0 && (
          <div
            className={`
              ${config.avatar} rounded-full border-2 border-white shadow-sm
              flex items-center justify-center font-medium ${config.text}
              bg-gray-100 text-gray-600 ${config.offset}
            `}
            title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Names list (optional) */}
      {showNames && otherUsers.length > 0 && (
        <div className="ml-3">
          <div className={`${config.text} text-gray-700 font-medium`}>
            {otherUsers.length === 1
              ? 'Also viewing:'
              : `${otherUsers.length} others viewing:`
            }
          </div>
          <div className={`${config.text} text-gray-500`}>
            {visibleUsers.map(user =>
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username
            ).join(', ')}
            {hiddenCount > 0 && ` and ${hiddenCount} more`}
          </div>
        </div>
      )}
    </div>
  );
}

// Floating header version for top of page
export function FloatingPresenceHeader({ activeUsers, currentUserId, isConnected }: Omit<PresenceIndicatorProps, 'maxVisible' | 'size' | 'showNames'>) {
  const otherUsers = activeUsers.filter(user => user.userId !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center space-x-2">
        <PresenceIndicator
          activeUsers={activeUsers}
          currentUserId={currentUserId}
          isConnected={isConnected}
          maxVisible={3}
          size="sm"
        />
        <span className="text-sm text-gray-600">
          {otherUsers.length === 1
            ? `${otherUsers[0].firstName || otherUsers[0].username} is also here`
            : `${otherUsers.length} others here`
          }
        </span>
      </div>
    </div>
  );
}