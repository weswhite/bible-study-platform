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
import { PlusIcon, UserGroupIcon, BookOpenIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await api.get('/api/groups', {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return { groups: response.data.groups };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const password = formData.get('password') as string;

  try {
    await api.post('/api/groups', {
      name,
      description,
      password
    }, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return redirect('/dashboard/groups');
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Failed to create group'
    };
  }
}

export default function GroupsList() {
  const { groups } = useLoaderData<typeof loader>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Study Groups</h1>
              <p className="mt-2 text-lg text-gray-600">Connect, study, and grow together in faith</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/groups/join"
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Join Group
              </Link>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Group
              </button>
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <UserGroupIcon className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No study groups yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Start your spiritual journey by creating your first study group and inviting others to join you in exploring God's word.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusIcon className="w-6 h-6 mr-3" />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group: any) => (
              <div key={group.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                        {group.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {group.memberRole}
                        </span>
                        <span className="flex items-center">
                          <UserGroupIcon className="w-4 h-4 mr-1" />
                          {group._count.members}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {group.description || 'No description provided for this group yet.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <BookOpenIcon className="w-4 h-4 mr-1" />
                      {group._count.studies} studies
                    </div>
                    <Link
                      href={`/dashboard/groups/${group.id}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                    >
                      View Group
                      <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        <Dialog open={isCreateModalOpen} onClose={setIsCreateModalOpen}>
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <UserGroupIcon aria-hidden="true" className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle>Create Study Group</DialogTitle>
              <DialogDescription>
                Start a new community for Bible study and spiritual growth.
              </DialogDescription>
            </div>
          </div>

          <Form method="post" id="create-group-form" className="mt-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">Group Name</label>
              <input
                name="name"
                id="name"
                type="text"
                required
                placeholder="e.g., Wednesday Evening Study"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900">Description</label>
              <textarea
                name="description"
                id="description"
                rows={3}
                placeholder="What will this group study together? What are your goals and focus areas?"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">Group Password</label>
              <input
                name="password"
                id="password"
                type="password"
                required
                placeholder="Enter a password for this group"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Members will need this password to join your group. Minimum 6 characters.
              </p>
            </div>
          </Form>

          <DialogActions>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                form="create-group-form"
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
              >
                Create Group
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
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