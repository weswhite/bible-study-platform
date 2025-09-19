import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';
import { Button } from '~/components/button';
import { Input } from '~/components/input';
import { Field, Label, ErrorMessage, Description } from '~/components/fieldset';
import { Heading } from '~/components/heading';
import { Link } from '~/components/link';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  try {
    const response = await api.post('/api/auth/register', {
      username,
      email,
      password,
      firstName,
      lastName
    });

    if (response.status === 201) {
      return redirect('/dashboard');
    }
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Registration failed',
      details: error.response?.data?.details || []
    };
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
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </Field>
              <Field>
                <Label htmlFor="lastName" className="!text-gray-900 !font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="username" className="!text-gray-900 !font-medium">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </Field>

            <Field>
              <Label htmlFor="email" className="!text-gray-900 !font-medium">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </Field>

            <Field>
              <Label htmlFor="password" className="!text-gray-900 !font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <Description>
                Must contain uppercase, lowercase, number, and special character
              </Description>
            </Field>
          </div>

          {actionData?.error && (
            <ErrorMessage>
              <p>{actionData.error}</p>
              {actionData.details && actionData.details.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm">
                  {actionData.details.map((detail: any, index: number) => (
                    <li key={index}>{detail.message}</li>
                  ))}
                </ul>
              )}
            </ErrorMessage>
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