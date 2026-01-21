import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
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
    const res = await fetch(`${apiUrl}/api/v1/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.idToken}`,
      },
      body: JSON.stringify({
        email: session.user.email,
        picture: session.user.image,
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

          <div className="rounded-lg bg-gray-100 p-6 dark:bg-zinc-700">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Session Debug Info
            </h3>
            <pre className="overflow-auto rounded bg-black p-4 text-sm text-green-400">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

