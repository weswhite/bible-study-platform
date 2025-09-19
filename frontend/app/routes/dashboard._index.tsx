import { redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await api.get('/api/auth/me', {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    return { user: response.data.user };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bible Study Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <a href="/dashboard" className="text-blue-600 hover:text-blue-700 px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 transition-colors duration-200">
                  Dashboard
                </a>
                <a href="/dashboard/groups" className="text-gray-700 hover:text-blue-600 px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200">
                  My Groups
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">
                Welcome, {user.firstName || user.username}!
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 px-4 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome to Your Dashboard</h2>
            <p className="mt-2 text-lg text-gray-600">Manage your Bible study groups and grow in faith together</p>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">My Groups</h3>
                <p className="text-gray-600 mb-6">Manage your study groups and create new ones</p>
                <a
                  href="/dashboard/groups"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  View Groups
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
              <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-3">
                  <a
                    href="/dashboard/groups"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 w-full justify-center"
                  >
                    Create new group →
                  </a>
                  <a
                    href="/dashboard/groups"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 w-full justify-center"
                  >
                    Join existing group →
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h3>
                <ol className="text-sm text-gray-600 space-y-3">
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                    Create or join a study group
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                    Start a new Bible study
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                    Add weekly content
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                    Collaborate with comments
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}