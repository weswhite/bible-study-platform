import React, { useState } from 'react';
import { getUserColor, getUserInitials } from '~/utils/userColors';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

interface InlineCommentThreadProps {
  comments: Comment[];
  selectedText: string;
  position: { top: number; right: number };
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAddComment: (content: string) => void;
  onClose: () => void;
}

export function InlineCommentThread({
  comments,
  selectedText,
  position,
  isExpanded,
  onToggleExpanded,
  onAddComment,
  onClose
}: InlineCommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
      setIsAddingComment(false);
    }
  };

  // Get unique users and their colors
  const uniqueUsers = Array.from(
    new Map(comments.map(comment => [comment.author.id, comment.author])).values()
  );

  return (
    <div
      className="absolute z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
      style={{ top: position.top, right: position.right }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* User color indicators */}
            <div className="flex -space-x-1">
              {uniqueUsers.slice(0, 3).map(user => {
                const color = getUserColor(user.id);
                return (
                  <div
                    key={user.id}
                    className={`w-6 h-6 ${color.accent} rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white`}
                    title={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                  >
                    {getUserInitials(user.firstName, user.lastName, user.username)}
                  </div>
                );
              })}
              {uniqueUsers.length > 3 && (
                <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                  +{uniqueUsers.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleExpanded}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selected text preview */}
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <span className="text-gray-600">Commenting on: </span>
          <span className="font-medium text-gray-900">"{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"</span>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {/* Comments list */}
          <div className="p-3 space-y-3">
            {comments.map(comment => {
              const color = getUserColor(comment.author.id);
              return (
                <div key={comment.id} className={`p-3 rounded-lg ${color.bg} ${color.border} border`}>
                  <div className="flex items-start space-x-2">
                    <div className={`w-8 h-8 ${color.accent} rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                      {getUserInitials(comment.author.firstName, comment.author.lastName, comment.author.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${color.text}`}>
                          {comment.author.firstName && comment.author.lastName
                            ? `${comment.author.firstName} ${comment.author.lastName}`
                            : comment.author.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm ${color.text}`}>{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add comment form */}
          <div className="p-3 border-t border-gray-200">
            {!isAddingComment ? (
              <button
                onClick={() => setIsAddingComment(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200"
              >
                Add a comment...
              </button>
            ) : (
              <form onSubmit={handleSubmitComment} className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingComment(false);
                      setNewComment('');
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Comment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}