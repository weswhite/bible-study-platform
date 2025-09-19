import { useLoaderData, useParams } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { useState } from 'react';
import { AnnotatableMarkdown } from '~/components/AnnotatableMarkdown';
import api from '~/lib/api';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Get week data
    const weekResponse = await api.get(`/api/studies/${params.studyId}/weeks/${params.weekNumber}`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    // Try to get comments for this week (fallback if endpoint doesn't exist yet)
    let textAnchoredComments = [];
    let regularComments = [];

    try {
      const commentsResponse = await api.get(`/api/comments/week/${weekResponse.data.week.id}`, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
      textAnchoredComments = commentsResponse.data.textAnchoredComments || [];
      regularComments = commentsResponse.data.regularComments || [];
    } catch (commentsError) {
      // Fall back to existing comments from week data
      regularComments = weekResponse.data.week.comments || [];
    }

    return {
      ...weekResponse.data,
      textAnchoredComments,
      regularComments
    };
  } catch (error) {
    throw new Response('Week not found', { status: 404 });
  }
}

export default function StudyWeek() {
  const { week, userRole, textAnchoredComments: initialTextAnchoredComments, regularComments: initialRegularComments } = useLoaderData<typeof loader>();
  const params = useParams();
  const [textAnchoredComments, setTextAnchoredComments] = useState<any[]>(initialTextAnchoredComments);
  const [regularComments, setRegularComments] = useState<any[]>(initialRegularComments);
  const [selectedComments, setSelectedComments] = useState<any[] | null>(null);
  const [selectedTextAnchor, setSelectedTextAnchor] = useState<any | null>(null);
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle adding new text-anchored comment
  const handleAddTextAnchoredComment = async (textAnchor: any, content: string) => {
    try {
      const response = await api.post('/api/comments', {
        content,
        weekId: week.id,
        textAnchor
      });

      // Add the new comment to the state
      setTextAnchoredComments(prev => [...prev, response.data.comment]);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Handle clicking on a comment marker
  const handleCommentClick = (comments: any[], textAnchor: any) => {
    setSelectedComments(comments);
    setSelectedTextAnchor(textAnchor);
  };

  // Handle adding new regular comment
  const handleAddRegularComment = async () => {
    if (!newCommentContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/comments', {
        content: newCommentContent.trim(),
        weekId: week.id
        // No textAnchor for regular comments
      });

      // Add the new comment to the state
      setRegularComments(prev => [...prev, response.data.comment]);
      setNewCommentContent(''); // Clear the form
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex text-sm text-gray-500 mb-6">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors duration-200">Dashboard</a>
          <span className="mx-2 text-gray-400">→</span>
          <a href={`/dashboard/studies/${week.study.id}`} className="hover:text-blue-600 transition-colors duration-200">{week.study.title}</a>
          <span className="mx-2 text-gray-400">→</span>
          <span className="text-gray-900 font-medium">Week {week.weekNumber}</span>
        </nav>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Week {week.weekNumber}: {week.title}
          </h1>
          <p className="mt-2 text-lg text-blue-600 font-medium">
            {week.passage}
          </p>
          {week.scheduledDate && (
            <p className="mt-1 text-sm text-gray-500">
              Scheduled: {new Date(week.scheduledDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-12 gap-8">
          {/* Study Content - 2/3 width */}
          <div className="col-span-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Study Content</h2>
                {week.markdownContent ? (
                  <AnnotatableMarkdown
                    content={week.markdownContent}
                    comments={textAnchoredComments}
                    onAddComment={handleAddTextAnchoredComment}
                    onCommentClick={handleCommentClick}
                    className="prose max-w-none"
                  />
                ) : (
                  <p className="text-gray-500 italic">No study content available</p>
                )}
              </div>
            </div>

            {/* General Comments Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-6">
              <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  General Discussion ({regularComments.length} comments)
                </h2>

                {/* Add Comment Form */}
                <div className="mb-6">
                  <textarea
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Share your thoughts on this week's study..."
                    disabled={isSubmitting}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleAddRegularComment}
                      disabled={!newCommentContent.trim() || isSubmitting}
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                {regularComments && regularComments.length > 0 ? (
                  <div className="space-y-4">
                    {regularComments.map((comment: any) => (
                      <div key={comment.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {comment.author.firstName?.[0] || comment.author.username[0]}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {comment.author.firstName && comment.author.lastName
                                  ? `${comment.author.firstName} ${comment.author.lastName}`
                                  : comment.author.username}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
                        {comment.passage && (
                          <p className="text-sm text-gray-500 mt-1">
                            Re: {comment.passage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comments Sidebar - 1/3 width */}
          <div className="col-span-4">
            <div className="sticky top-6 space-y-6">
              {/* Text Anchored Comments */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedComments ? 'Selected Comment Thread' : 'Text Comments'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedComments ?
                      `${selectedComments.length} comment${selectedComments.length !== 1 ? 's' : ''} on selected text` :
                      `${textAnchoredComments.length} comment${textAnchoredComments.length !== 1 ? 's' : ''} on specific text`
                    }
                  </p>
                  {selectedComments && (
                    <button
                      onClick={() => {
                        setSelectedComments(null);
                        setSelectedTextAnchor(null);
                      }}
                      className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                    >
                      ← Back to all comments
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {selectedComments ? (
                    <div className="p-4">
                      {/* Selected text preview */}
                      {selectedTextAnchor && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <span className="text-gray-600">Commenting on: </span>
                          <span className="font-medium text-gray-900">
                            "{selectedTextAnchor.selectedText?.slice(0, 100)}{(selectedTextAnchor.selectedText?.length || 0) > 100 ? '...' : ''}"
                          </span>
                        </div>
                      )}

                      {/* Comment thread */}
                      <div className="space-y-4">
                        {selectedComments
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .map((comment: any, index: number) => {
                            const isFirstFromUser = index === 0 || selectedComments[index - 1].author.id !== comment.author.id;
                            return (
                              <div key={comment.id} className={`flex items-start space-x-3 ${!isFirstFromUser ? 'ml-11' : ''}`}>
                                {isFirstFromUser && (
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                    {comment.author.firstName?.[0] || comment.author.username[0]}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  {isFirstFromUser && (
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        {comment.author.firstName && comment.author.lastName
                                          ? `${comment.author.firstName} ${comment.author.lastName}`
                                          : comment.author.username}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  <div className={`p-3 rounded-lg ${isFirstFromUser ? 'bg-gray-50' : 'bg-gray-100'} border border-gray-200`}>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                    {!isFirstFromUser && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    textAnchoredComments && textAnchoredComments.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {(() => {
                          // Group comments by text anchor
                          const commentGroups = new Map<string, any[]>();
                          textAnchoredComments.forEach(comment => {
                            if (comment.position && comment.position.type === 'textAnchor') {
                              const key = `${comment.position.startOffset}-${comment.position.endOffset}`;
                              if (!commentGroups.has(key)) {
                                commentGroups.set(key, []);
                              }
                              commentGroups.get(key)!.push(comment);
                            }
                          });

                          return Array.from(commentGroups.entries()).map(([key, groupComments]) => {
                            const firstComment = groupComments[0];
                            const uniqueUsers = Array.from(
                              new Map(groupComments.map(c => [c.author.id, c.author])).values()
                            );

                            return (
                              <div key={key} className="p-4 hover:bg-gray-50 cursor-pointer"
                                   onClick={() => handleCommentClick(groupComments, firstComment.position)}>
                                {/* Selected text preview */}
                                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                  <span className="text-gray-600">On: </span>
                                  <span className="font-medium text-gray-900">
                                    "{firstComment.position?.selectedText?.slice(0, 50)}{(firstComment.position?.selectedText?.length || 0) > 50 ? '...' : ''}"
                                  </span>
                                </div>

                                {/* Comment summary */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2">
                                    {/* User avatars */}
                                    <div className="flex -space-x-1">
                                      {uniqueUsers.slice(0, 3).map(user => (
                                        <div
                                          key={user.id}
                                          className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                                        >
                                          {user.firstName?.[0] || user.username[0]}
                                        </div>
                                      ))}
                                      {uniqueUsers.length > 3 && (
                                        <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                                          +{uniqueUsers.length - 3}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {groupComments.length} comment{groupComments.length !== 1 ? 's' : ''}
                                        {uniqueUsers.length > 1 && ` from ${uniqueUsers.length} user${uniqueUsers.length !== 1 ? 's' : ''}`}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Latest: {new Date(groupComments[groupComments.length - 1].createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    →
                                  </div>
                                </div>

                                {/* Preview of latest comment */}
                                {groupComments.length > 0 && (
                                  <div className="mt-2 pl-6 border-l-2 border-gray-200">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                      {groupComments[groupComments.length - 1].content}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">No text comments yet.</p>
                        <p className="text-xs mt-1">Select text in the study content to add comments.</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Week Info */}
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Week Info</h3>
                </div>
                <div className="p-4">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Week Number</dt>
                      <dd className="text-sm text-gray-900">{week.weekNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Passage</dt>
                      <dd className="text-sm text-gray-900">{week.passage}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Study</dt>
                      <dd className="text-sm text-gray-900">{week.study.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Group</dt>
                      <dd className="text-sm text-gray-900">{week.study.group?.name || 'Unknown Group'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                      <dd className="text-sm text-gray-900">{userRole}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Navigation</h3>
                </div>
                <div className="p-4 space-y-2">
                  <a
                    href={`/dashboard/studies/${week.study.id}`}
                    className="block text-blue-600 hover:text-blue-500 text-sm"
                  >
                    ← Back to Study
                  </a>
                  {week.study.group?.id && (
                    <a
                      href={`/dashboard/groups/${week.study.group.id}`}
                      className="block text-blue-600 hover:text-blue-500 text-sm"
                    >
                      View Group →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}