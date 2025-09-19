import { useLoaderData, Form, useNavigation } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useEffect, useState } from 'react';
import api from '~/lib/api';
import { connectToStudy, joinStudy, leaveStudy, onActiveUsers, onUserJoined, onUserLeft, disconnectSocket } from '~/lib/socket';
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '~/components/dialog';
import { CalendarDaysIcon, PlusIcon, BookOpenIcon, ChatBubbleLeftIcon, UserGroupIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const response = await api.get(`/api/studies/${params.studyId}`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return { study: response.data.study, userRole: response.data.userRole };
  } catch (error) {
    throw new Response('Study not found', { status: 404 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'add-week') {
    const title = formData.get('title') as string;
    const passage = formData.get('passage') as string;
    const markdownContent = formData.get('markdownContent') as string;

    try {
      await api.post(`/api/studies/${params.studyId}/weeks`, {
        title,
        passage,
        markdownContent
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
      return { success: true };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to add week'
      };
    }
  }

  return null;
}

export default function StudyDetail() {
  const { study, userRole } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const canManage = ['LEADER', 'MODERATOR'].includes(userRole);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);

  useEffect(() => {
    // Get access token from cookie or localStorage
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];

    if (accessToken) {
      // Connect to socket
      const socket = connectToStudy(accessToken);

      socket.on('connect', () => {
        setIsConnected(true);
        joinStudy(study.id);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Set up real-time event listeners
      onActiveUsers((users) => {
        setActiveUsers(users);
      });

      onUserJoined((user) => {
        setActiveUsers(prev => {
          if (!prev.find(u => u.userId === user.userId)) {
            return [...prev, user];
          }
          return prev;
        });
      });

      onUserLeft((user) => {
        setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
      });
    }

    // Cleanup on unmount
    return () => {
      leaveStudy();
      disconnectSocket();
    };
  }, [study.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{study.title}</h1>
              <p className="mt-2 text-lg text-gray-600">{study.description}</p>
              <p className="mt-1 text-sm text-gray-500">
                {study.focusType}: {study.focusReference} • {study.group.name}
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setIsAddWeekModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Week
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">

          {/* Study Weeks */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Study Weeks</h2>
                <p className="mt-1 text-sm text-gray-600">{study.weeks?.length || 0} weeks available</p>
              </div>
            </div>

            {!study.weeks || study.weeks.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <BookOpenIcon className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">No study weeks yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Get started by adding your first week of study content with discussion questions and reflection materials.</p>
                {canManage && (
                  <button
                    onClick={() => setIsAddWeekModalOpen(true)}
                    className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <CalendarDaysIcon className="w-6 h-6 mr-3" />
                    Add Your First Week
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {study.weeks.map((week: any) => (
                  <div key={week.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                            Week {week.weekNumber}: {week.title}
                          </h3>
                          <p className="text-sm text-blue-600 font-medium mb-3">
                            {week.passage}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                              {week._count?.comments || 0}
                            </span>
                            <span className="flex items-center">
                              <UserGroupIcon className="w-4 h-4 mr-1" />
                              {week._count?.responses || 0}
                            </span>
                          </div>
                          {week.scheduledDate && (
                            <p className="text-xs text-gray-400 mt-2">
                              Scheduled: {new Date(week.scheduledDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <BookOpenIcon className="w-4 h-4 mr-1" />
                          Week {week.weekNumber}
                        </div>
                        <a
                          href={`/dashboard/studies/${study.id}/weeks/${week.weekNumber}`}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        >
                          View Week
                          <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Users */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              {activeUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No active users</p>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((user) => (
                    <div key={user.userId} className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.firstName?.[0] || user.username[0]}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Study Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Info</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Group</dt>
                <dd className="text-sm text-gray-900">{study.group.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Focus</dt>
                <dd className="text-sm text-gray-900">
                  {study.focusType}: {study.focusReference}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                <dd className="text-sm text-gray-900">{userRole}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Comments</dt>
                <dd className="text-sm text-gray-900">{study._count?.comments || 0}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Responses</dt>
                <dd className="text-sm text-gray-900">{study._count?.responses || 0}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href={`/dashboard/groups/${study.group.id}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 w-full justify-center"
                >
                  View Group
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </a>
                {canManage && (
                  <button
                    onClick={() => setIsAddWeekModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200 w-full justify-center"
                  >
                    Add Week
                    <PlusIcon className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Week Modal */}
      {canManage && (
        <Dialog open={isAddWeekModalOpen} onClose={setIsAddWeekModalOpen} size="2xl">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <CalendarDaysIcon aria-hidden="true" className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle>Add Study Week</DialogTitle>
              <DialogDescription>
                Create a new week of study content with discussion questions and reflection materials.
              </DialogDescription>
            </div>
          </div>

          <Form method="post" id="add-week-form" className="mt-6 space-y-6">
            <input type="hidden" name="intent" value="add-week" />
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900">
                Week Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Introduction to Genesis"
              />
            </div>
            <div>
              <label htmlFor="passage" className="block text-sm font-medium text-gray-900">
                Bible Passage
              </label>
              <input
                type="text"
                name="passage"
                id="passage"
                required
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Genesis 1:1-31"
              />
            </div>
            <div>
              <label htmlFor="markdownContent" className="block text-sm font-medium text-gray-900">
                Study Content (Markdown)
              </label>
              <textarea
                name="markdownContent"
                id="markdownContent"
                rows={8}
                required
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm font-mono"
                placeholder="# Study Questions&#10;&#10;1. What does this passage teach us about...&#10;2. How can we apply this to our lives?&#10;&#10;## Discussion Points&#10;&#10;- Key themes&#10;- Important verses"
              />
            </div>
          </Form>

          <DialogActions>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                form="add-week-form"
                disabled={navigation.state === 'submitting'}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2 disabled:opacity-50"
              >
                {navigation.state === 'submitting' ? 'Adding...' : 'Add Week'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddWeekModalOpen(false)}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
              >
                Cancel
              </button>
            </div>
          </DialogActions>
        </Dialog>
      )}
    </div>
    </div>
    </div>
  );
}