import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';
import { Button } from '~/components/button';
import { Field, Label } from '~/components/fieldset';
import { Heading } from '~/components/heading';
import { Link } from '~/components/link';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  console.log('=== REGISTRATION DEBUG v4 ===');
  console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('All env vars:', import.meta.env);
  console.log('Request data:', { username, email, firstName, lastName });
  console.log('Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');

  try {
    console.log('Making API request to:', '/api/auth/register');
    const response = await api.post('/api/auth/register', {
      username,
      email,
      password,
      firstName,
      lastName
    });

    console.log('API Response:', { status: response.status, data: response.data });
    if (response.status === 201) {
      return redirect('/dashboard');
    }
  } catch (error: any) {
    console.error('=== REGISTRATION ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response);
    console.error('Error request:', error.request);
    console.error('Error config:', error.config);
    if (error.response) {
      // Server responded with error status
      return {
        error: error.response.data?.message || error.response.data?.error || 'Registration failed',
        details: error.response.data?.details || []
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        error: 'Unable to connect to server. Please try again.',
        details: []
      };
    } else {
      // Something else happened
      return {
        error: 'An unexpected error occurred. Please try again.',
        details: []
      };
    }
  }

  return null;
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <Heading level={2} className="!text-gray-900 !font-bold text-center">Create your account</Heading>
        </div>
        <Form className="mt-8 space-y-6" method="post">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label htmlFor="firstName" className="!text-gray-900 !font-medium">First Name</Label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </Field>
              <Field>
                <Label htmlFor="lastName" className="!text-gray-900 !font-medium">Last Name</Label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="username" className="!text-gray-900 !font-medium">Username</Label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </Field>

            <Field>
              <Label htmlFor="email" className="!text-gray-900 !font-medium">Email Address</Label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </Field>

            <Field>
              <Label htmlFor="password" className="!text-gray-900 !font-medium">Password</Label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </Field>
          </div>

          {actionData?.error && (
            <div className="text-red-600 text-sm font-medium">
              <p>{actionData.error}</p>
              {actionData.details && actionData.details.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm">
                  {actionData.details.map((detail: any, index: number) => (
                    <li key={index}>{detail.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <a href="/auth/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Already have an account? Sign in here
            </a>
          </div>
        </Form>
      </div>
    </div>
  );
}