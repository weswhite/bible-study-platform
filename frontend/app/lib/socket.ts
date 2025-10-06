import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectToStudy(accessToken: string) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/study` : 'http://localhost:3001/study', {
    auth: {
      token: accessToken
    },
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Connected to study namespace');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from study namespace');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
}

export function joinStudy(studyId: string) {
  if (socket) {
    socket.emit('join-study', studyId);
  }
}

export function leaveStudy() {
  if (socket) {
    socket.emit('leave-study');
  }
}

export function addComment(commentData: any) {
  if (socket) {
    socket.emit('add-comment', commentData);
  }
}

export function updateComment(commentId: string, content: string) {
  if (socket) {
    socket.emit('update-comment', { commentId, content });
  }
}

export function trackUserActivity(activityData: any) {
  if (socket) {
    socket.emit('user-activity', activityData);
  }
}

export function onUserJoined(callback: (user: any) => void) {
  if (socket) {
    socket.on('user-joined', callback);
  }
}

export function onUserLeft(callback: (user: any) => void) {
  if (socket) {
    socket.on('user-left', callback);
  }
}

export function onCommentAdded(callback: (data: any) => void) {
  if (socket) {
    socket.on('comment-added', callback);
  }
}

export function onCommentUpdated(callback: (comment: any) => void) {
  if (socket) {
    socket.on('comment-updated', callback);
  }
}

export function onActiveUsers(callback: (users: any[]) => void) {
  if (socket) {
    socket.on('active-users', callback);
  }
}

export function onUserPresence(callback: (presence: any) => void) {
  if (socket) {
    socket.on('user-presence', callback);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { socket };