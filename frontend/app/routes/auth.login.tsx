import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';
import { Button } from '~/components/button';
import { Input } from '~/components/input';
import { Field, Label, ErrorMessage } from '~/components/fieldset';
import { Heading } from '~/components/heading';
import { Text } from '~/components/text';
import { Link } from '~/components/link';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const response = await api.post('/api/auth/login', {
      email,
      password
    }, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    if (response.status === 200) {
      // Forward the set-cookie headers from the API response
      const headers = new Headers();
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        if (Array.isArray(setCookieHeader)) {
          setCookieHeader.forEach(cookie => headers.append('Set-Cookie', cookie));
        } else {
          headers.append('Set-Cookie', setCookieHeader);
        }
      }

      return redirect('/dashboard', { headers });
    }
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Login failed'
    };
  }

  return null;
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Sign in to your account</h2>
        </div>
        <Form className="mt-8 space-y-6" method="post">
          <div className="space-y-4">
            <Field>
              <Label htmlFor="email" className="!text-gray-900 !font-medium !block">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                className="!border-gray-300 !bg-white !text-gray-900 placeholder:!text-gray-500 focus:!border-indigo-500 focus:!ring-2 focus:!ring-indigo-500/20"
              />
            </Field>

            <Field>
              <Label htmlFor="password" className="!text-gray-900 !font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                className="!border-gray-300 !bg-white !text-gray-900 placeholder:!text-gray-500 focus:!border-indigo-500 focus:!ring-2 focus:!ring-indigo-500/20"
              />
            </Field>
          </div>

          {actionData?.error && (
            <ErrorMessage>{actionData.error}</ErrorMessage>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <a href="/auth/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Don't have an account? Register here
            </a>
          </div>
        </Form>
      </div>
    </div>
  );
}