import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Bible Study App" },
    { name: "description", content: "Collaborative Bible study platform" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/reflected-logo.svg"
              alt="BBLVRS"
              className="h-24 w-auto"
            />
          </div>
          <p className="text-xl text-gray-600 mb-8">
            Collaborative scripture study for small groups
          </p>
          <div className="space-y-4">
            <a
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </a>
            <a
              href="/auth/register"
              className="w-full flex justify-center py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
