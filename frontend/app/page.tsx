import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  // Sync user with backend
  let shouldRedirectToOnboarding = false;

  try {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // For server-side rendering, we need to get the NextAuth JWT token
    // We'll use the idToken from Google OAuth for now
    // TODO: Consider using a server-side API route for better security
    const token = (session as any).idToken;

    const res = await fetch(`${apiUrl}/api/v1/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        google_id: session.user.id || (session as any).sub,
        email: session.user.email,
        picture: session.user.image,
        name: session.user.name,
      }),
    });

    if (res.ok) {
        const user = await res.json();
        if (!user.nickname) {
            shouldRedirectToOnboarding = true;
        }
    } else {
        console.error("Failed to sync user", await res.text());
    }
  } catch (error) {
      console.error("Error syncing user", error);
      // In a real app, might want to show an error page or not block dashboard
  }

  if (shouldRedirectToOnboarding) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-4xl space-y-8 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-gray-200 pb-6 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <SignOutButton />
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-6">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={80}
                height={80}
                className="rounded-full border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {session.user.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {session.user.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/decks"
              className="group rounded-lg border-2 border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-700 dark:bg-zinc-800 dark:hover:border-blue-400"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Decks
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage your deck collection
                  </p>
                </div>
                <svg
                  className="h-8 w-8 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>

            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-400 dark:text-gray-500">
                    Coming Soon
                  </h3>
                  <p className="mt-2 text-gray-400 dark:text-gray-500">
                    More features in development
                  </p>
                </div>
                <svg
                  className="h-8 w-8 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
