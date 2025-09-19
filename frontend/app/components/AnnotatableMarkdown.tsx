import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getUserColor } from '~/utils/userColors';

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
  textAnchor?: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
    context: string; // surrounding text for better matching
  };
}


interface CommentMarker {
  id: string;
  comments: Comment[];
  textAnchor: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
    context: string;
  };
  position: { top: number; left: number };
}

interface AnnotatableMarkdownProps {
  content: string;
  comments: Comment[];
  onAddComment: (textAnchor: Comment['textAnchor'], content: string) => void;
  onCommentClick?: (comments: Comment[], textAnchor: any) => void;
  className?: string;
}

export function AnnotatableMarkdown({
  content,
  comments,
  onAddComment,
  onCommentClick,
  className = ''
}: AnnotatableMarkdownProps) {
  const [commentMarkers, setCommentMarkers] = useState<CommentMarker[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; right: number } | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);

  // Group comments by text anchor and calculate positions
  useEffect(() => {
    const markersMap = new Map<string, CommentMarker>();

    comments.forEach(comment => {
      if (comment.position && comment.position.type === 'textAnchor') {
        const textAnchor = {
          selectedText: comment.position.selectedText,
          startOffset: comment.position.startOffset,
          endOffset: comment.position.endOffset,
          context: comment.position.context
        };

        const key = `${textAnchor.startOffset}-${textAnchor.endOffset}`;

        if (markersMap.has(key)) {
          markersMap.get(key)!.comments.push(comment);
        } else {
          markersMap.set(key, {
            id: key,
            comments: [comment],
            textAnchor,
            position: { top: 0, left: 0 }
          });
        }
      }
    });

    const markers = Array.from(markersMap.values());

    // Calculate positions for each marker after content is rendered
    setTimeout(() => {
      if (markdownRef.current) {
        const updatedMarkers = markers.map(marker => {
          const position = calculatePositionForTextAnchor(marker.textAnchor);
          return {
            ...marker,
            position: position || { top: 0, left: 0 }
          };
        });
        setCommentMarkers(updatedMarkers);
      } else {
        setCommentMarkers(markers);
      }
    }, 100);
  }, [comments]);

  // Calculate position for a text anchor
  const calculatePositionForTextAnchor = (textAnchor: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
    context: string;
  }): { top: number; left: number } | null => {
    if (!markdownRef.current || !contentRef.current) return null;

    const fullText = markdownRef.current.textContent || '';
    const { startOffset, endOffset, selectedText } = textAnchor;

    // Try to find the text using the exact offsets first
    const targetText = fullText.slice(startOffset, endOffset);
    if (targetText === selectedText) {
      // Create a temporary range to find the position
      const walker = document.createTreeWalker(
        markdownRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentOffset = 0;
      let startNode: Text | null = null;
      let startNodeOffset = 0;

      // Find the start position
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const nodeLength = node.textContent?.length || 0;

        if (currentOffset + nodeLength >= endOffset) {
          startNode = node;
          startNodeOffset = endOffset - currentOffset;
          break;
        }
        currentOffset += nodeLength;
      }

      if (startNode) {
        try {
          const range = document.createRange();
          range.setStart(startNode, Math.min(startNodeOffset, startNode.textContent?.length || 0));
          range.setEnd(startNode, Math.min(startNodeOffset, startNode.textContent?.length || 0));

          const rect = range.getBoundingClientRect();
          const containerRect = contentRef.current.getBoundingClientRect();

          return {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left + 5
          };
        } catch (error) {
          console.warn('Error creating range for text anchor:', error);
        }
      }
    }

    // Fallback: search for the selected text in the document
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      markdownRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    for (const node of textNodes) {
      const nodeText = node.textContent || '';
      const index = nodeText.indexOf(selectedText);
      if (index !== -1) {
        try {
          const range = document.createRange();
          range.setStart(node, index + selectedText.length);
          range.setEnd(node, index + selectedText.length);

          const rect = range.getBoundingClientRect();
          const containerRect = contentRef.current.getBoundingClientRect();

          return {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left + 5
          };
        } catch (error) {
          console.warn('Error creating range for fallback text search:', error);
        }
      }
    }

    return null;
  };

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    // Get the range and its position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();

    // Calculate position relative to content container
    const position = {
      top: rect.top - containerRect.top,
      right: containerRect.width - (rect.right - containerRect.left) + 10
    };

    setSelectedText(selectedText);
    setSelectionPosition(position);
    setShowCommentForm(true);
  }, []);

  // Handle adding a new comment
  const handleAddComment = useCallback((content: string) => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    const fullText = contentRef.current.textContent || '';

    // Calculate text offsets
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preCaretRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    // Get context (50 chars before and after)
    const contextStart = Math.max(0, startOffset - 50);
    const contextEnd = Math.min(fullText.length, endOffset + 50);
    const context = fullText.slice(contextStart, contextEnd);

    const textAnchor = {
      selectedText,
      startOffset,
      endOffset,
      context
    };

    onAddComment(textAnchor, content);

    // Clear selection and form
    selection.removeAllRanges();
    setShowCommentForm(false);
    setSelectedText('');
    setSelectionPosition(null);
    setNewCommentContent('');
  }, [selectedText, onAddComment]);


  return (
    <div ref={contentRef} className={`relative ${className}`}>
      {/* Markdown content */}
      <div
        ref={markdownRef}
        onMouseUp={handleMouseUp}
        className="prose max-w-none select-text"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>

      {/* Comment markers */}
      {commentMarkers.map(marker => {
        const uniqueUsers = Array.from(
          new Map(marker.comments.map(comment => [comment.author.id, comment.author])).values()
        );

        return (
          <div
            key={marker.id}
            className="absolute cursor-pointer z-10"
            style={{
              top: marker.position.top - 8,
              left: marker.position.left,
              transform: 'translateY(-50%)'
            }}
            onClick={() => onCommentClick?.(marker.comments, marker.textAnchor)}
          >
            <div className="relative flex items-center">
              {/* Stacked user avatars */}
              <div className="flex -space-x-2">
                {uniqueUsers.slice(0, 4).map((user, index) => {
                  const color = getUserColor(user.id);
                  const userComments = marker.comments.filter(c => c.author.id === user.id);
                  return (
                    <div
                      key={user.id}
                      className={`relative w-6 h-6 ${color.accent} rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm hover:shadow-md transition-all hover:z-10 hover:scale-110`}
                      style={{ zIndex: 10 - index }}
                      title={`${userComments.length} comment${userComments.length !== 1 ? 's' : ''} by ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}`}
                    >
                      {user.firstName?.[0] || user.lastName?.[0] || user.username[0]}
                      {userComments.length > 1 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          {userComments.length}
                        </div>
                      )}
                    </div>
                  );
                })}
                {uniqueUsers.length > 4 && (
                  <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm">
                    +{uniqueUsers.length - 4}
                  </div>
                )}
              </div>

              {/* Total comment count if more than one user or multiple comments */}
              {(uniqueUsers.length > 1 || marker.comments.length > uniqueUsers.length) && (
                <div className="ml-2 px-1.5 py-0.5 bg-gray-700 text-white text-xs rounded-full font-medium shadow-sm">
                  {marker.comments.length}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Comment form for new selection */}
      {showCommentForm && selectionPosition && (
        <div
          className="absolute z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          style={{ top: selectionPosition.top, right: selectionPosition.right }}
        >
          <div className="mb-3">
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <span className="text-gray-600">Commenting on: </span>
              <span className="font-medium text-gray-900">"{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"</span>
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (newCommentContent.trim()) {
              handleAddComment(newCommentContent.trim());
            }
          }}>
            <textarea
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="Add your comment..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-3"
              rows={3}
              autoFocus
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCommentForm(false);
                  setSelectedText('');
                  setSelectionPosition(null);
                  setNewCommentContent('');
                  window.getSelection()?.removeAllRanges();
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCommentContent.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}