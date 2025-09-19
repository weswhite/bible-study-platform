import { useLoaderData, Form, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useState } from 'react';
import api from '~/lib/api';
import { Button } from '~/components/button';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '~/components/dialog';
import { Input } from '~/components/input';
import { Textarea } from '~/components/textarea';
import { Field, Label } from '~/components/fieldset';
import { Heading } from '~/components/heading';
import { Text } from '~/components/text';
import { Link } from '~/components/link';
import { PlusIcon, UserGroupIcon, BookOpenIcon, ChevronRightIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/20/solid';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const response = await api.get(`/api/groups/${params.groupId}`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return { group: response.data.group };
  } catch (error) {
    throw redirect('/dashboard/groups');
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'create-study') {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const focusType = formData.get('focusType') as string;
    const focusReference = formData.get('focusReference') as string;

    try {
      const response = await api.post(`/api/studies?groupId=${params.groupId}`, {
        title,
        description,
        focusType,
        focusReference
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
      return redirect(`/dashboard/studies/${response.data.study.id}`);
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to create study'
      };
    }
  }

  if (intent === 'add-member') {
    const email = formData.get('email') as string;

    try {
      await api.post(`/api/groups/${params.groupId}/members`, {
        email
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
      return redirect(`/dashboard/groups/${params.groupId}`);
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to add member'
      };
    }
  }

  return null;
}

export default function GroupDetail() {
  const { group } = useLoaderData<typeof loader>();
  const canManage = ['LEADER', 'MODERATOR'].includes(group.currentUserRole);
  const [isCreateStudyModalOpen, setIsCreateStudyModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              href="/dashboard/groups"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mr-4"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-1" />
              Back to Groups
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="mb-6 sm:mb-0">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{group.name}</h1>
                  <p className="text-lg text-gray-600 mb-4 max-w-2xl leading-relaxed">
                    {group.description || 'No description provided for this group yet.'}
                  </p>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Your Role: {group.currentUserRole}
                    </span>
                    <span className="flex items-center">
                      <UserGroupIcon className="w-4 h-4 mr-1" />
                      {group.members.length} members
                    </span>
                    <span className="flex items-center">
                      <BookOpenIcon className="w-4 h-4 mr-1" />
                      {group.studies.length} studies
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Led by {group.leader.firstName} {group.leader.lastName} (@{group.leader.username})
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      <UserIcon className="w-5 h-5 mr-2" />
                      Add Member
                    </button>
                    <button
                      onClick={() => setIsCreateStudyModalOpen(true)}
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Create Study
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900">
                Members ({group.members.length})
              </h2>
              <p className="text-gray-600 mt-1">People who are part of this study group</p>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.members.map((member: any) => (
                  <div key={member.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {member.user.firstName?.[0] || member.user.username[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500 truncate">
                            @{member.user.username}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Studies Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Studies ({group.studies.length})
                  </h2>
                  <p className="text-gray-600 mt-1">Bible studies and learning materials for this group</p>
                </div>
                {canManage && group.studies.length > 0 && (
                  <button
                    onClick={() => setIsCreateStudyModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Study
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {group.studies.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                    <BookOpenIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No studies yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">Start your group's spiritual journey by creating your first Bible study together.</p>
                  {canManage && (
                    <button
                      onClick={() => setIsCreateStudyModalOpen(true)}
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Create First Study
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.studies.map((study: any) => (
                    <div key={study.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                      <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                            {study.title}
                          </h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {study.focusType}
                            </span>
                            <span>{study._count.weeks} weeks</span>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                            {study.description || 'No description provided for this study yet.'}
                          </p>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Focus:</span> {study.focusReference}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Study series
                          </div>
                          <Link
                            href={`/dashboard/studies/${study.id}`}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          >
                            View Study
                            <ChevronRightIcon className="w-4 h-4 ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Member Modal */}
        <Dialog open={isAddMemberModalOpen} onClose={setIsAddMemberModalOpen} size="sm">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <UserIcon aria-hidden="true" className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle>Add Member to Group</DialogTitle>
              <DialogDescription>
                Invite someone to join this study group by entering their email address.
              </DialogDescription>
            </div>
          </div>

          <Form method="post" id="add-member-form" className="mt-6">
            <input type="hidden" name="intent" value="add-member" />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
              <input
                name="email"
                id="email"
                type="email"
                required
                placeholder="Enter user's email address"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              />
            </div>
          </Form>

          <DialogActions>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                form="add-member-form"
                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:col-start-2"
              >
                Add Member
              </button>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
              >
                Cancel
              </button>
            </div>
          </DialogActions>
        </Dialog>

        {/* Create Study Modal */}
        <Dialog open={isCreateStudyModalOpen} onClose={setIsCreateStudyModalOpen}>
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <BookOpenIcon aria-hidden="true" className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle>Create New Study</DialogTitle>
              <DialogDescription>
                Start a new Bible study for your group. Define the focus and content that will guide your spiritual journey together.
              </DialogDescription>
            </div>
          </div>

          <Form method="post" id="create-study-form" className="mt-6 space-y-6">
            <input type="hidden" name="intent" value="create-study" />
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900">Study Title</label>
              <input
                name="title"
                id="title"
                type="text"
                required
                placeholder="e.g., Romans Study, Prayer & Fasting"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900">Description</label>
              <textarea
                name="description"
                id="description"
                rows={3}
                placeholder="Describe the focus, goals, and what participants can expect..."
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="focusType" className="block text-sm font-medium text-gray-900">Focus Type</label>
              <select
                name="focusType"
                id="focusType"
                required
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="BOOK">Book Study</option>
                <option value="THEME">Thematic Study</option>
              </select>
            </div>

            <div>
              <label htmlFor="focusReference" className="block text-sm font-medium text-gray-900">Focus Reference</label>
              <input
                name="focusReference"
                id="focusReference"
                type="text"
                required
                placeholder="e.g., Genesis, Prayer, Discipleship"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </Form>

          <DialogActions>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                form="create-study-form"
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
              >
                Create Study
              </button>
              <button
                type="button"
                onClick={() => setIsCreateStudyModalOpen(false)}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
              >
                Cancel
              </button>
            </div>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}