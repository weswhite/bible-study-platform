import { useLoaderData, redirect, Form, Link, useSubmit, Outlet } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useState, useCallback, useRef } from 'react';
import api from '~/lib/api';
import { Button } from '~/components/button';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '~/components/dialog';
import { Input } from '~/components/input';
import { Field, Label } from '~/components/fieldset';
import { Heading } from '~/components/heading';
import { Text } from '~/components/text';
import { UserGroupIcon, BookOpenIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/20/solid';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search');

    let response;
    if (searchQuery && searchQuery.trim().length >= 2) {
      // Search for specific groups
      response = await api.get(`/api/groups/search/${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
    } else {
      // Get all available groups
      response = await api.get('/api/groups/available', {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });
    }

    return { groups: response.data.groups, searchQuery: searchQuery || '' };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const groupId = formData.get('groupId') as string;
  const password = formData.get('password') as string;

  try {
    await api.post('/api/groups/join', {
      groupId,
      password
    }, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return redirect('/dashboard/groups');
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Failed to join group'
    };
  }
}

export default function JoinGroup() {
  const { groups, searchQuery: initialSearchQuery } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback((value: string) => {
    const searchParams = new URLSearchParams();
    if (value.trim()) {
      searchParams.set('search', value.trim());
    }

    // Use submit to trigger a navigation with search params
    submit(searchParams, { method: 'get' });
  }, [submit]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 500);
  };

  const handleJoinClick = (group: any) => {
    setSelectedGroup(group);
    setIsJoinModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsJoinModalOpen(false);
    setSelectedGroup(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard/groups"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to My Groups
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Join Study Group</h1>
                <p className="mt-2 text-lg text-gray-600">Search for groups and join with the group password</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-md">
            <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-2">
              Search Groups
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by group name..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <UserGroupIcon className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              {searchQuery.trim() ? 'No groups found' : 'No available groups'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchQuery.trim()
                ? 'Try adjusting your search terms or check the group name spelling.'
                : 'There are currently no groups available to join, or you are already a member of all existing groups.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group: any) => (
              <div key={group.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                      {group.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
                      {group.description || 'No description provided for this group.'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <span className="font-medium mr-1">Leader:</span>
                        {group.leader.firstName || group.leader.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <UserGroupIcon className="w-4 h-4 mr-1" />
                        {group._count.members} members
                      </span>
                      <span className="flex items-center">
                        <BookOpenIcon className="w-4 h-4 mr-1" />
                        {group._count.studies} studies
                      </span>
                    </div>
                  </div>

                  {group.userMembership ? (
                    <div className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg border border-gray-300">
                      Already a member ({group.userMembership.toLowerCase()})
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinClick(group)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Join Group
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Group Modal */}
        <Dialog open={isJoinModalOpen} onClose={handleCloseModal}>
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <UserGroupIcon aria-hidden="true" className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle>Join "{selectedGroup?.name}"</DialogTitle>
              <DialogDescription>
                Enter the group password to join this study group.
              </DialogDescription>
            </div>
          </div>

          <Form method="post" id="join-group-form" className="mt-6">
            <input type="hidden" name="groupId" value={selectedGroup?.id || ''} />
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Group Password
              </label>
              <input
                name="password"
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the group password"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              />
            </div>
          </Form>

          <DialogActions>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                form="join-group-form"
                disabled={!password.trim()}
                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:col-start-2 disabled:opacity-50"
              >
                Join Group
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
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