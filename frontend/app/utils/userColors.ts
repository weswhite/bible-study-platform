// Utility for generating consistent user colors
const USER_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', accent: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', accent: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', accent: 'bg-purple-500' },
  { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', accent: 'bg-red-500' },
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', accent: 'bg-yellow-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', accent: 'bg-indigo-500' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', accent: 'bg-pink-500' },
  { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', accent: 'bg-gray-500' },
];

// Simple hash function to get consistent color for user
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getUserColor(userId: string): typeof USER_COLORS[0] {
  const index = hashString(userId) % USER_COLORS.length;
  return USER_COLORS[index];
}

export function getUserInitials(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return 'U';
}