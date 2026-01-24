import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import DashboardCard from "@/components/DashboardCard";
import UserInfoCard from "@/components/UserInfoCard";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DashboardUser } from "@/types/dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  // Sync user with backend and get user info
  let shouldRedirectToOnboarding = false;
  let userData: DashboardUser | null = null;

  try {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = session.idToken;

    if (!token) {
      console.error("No idToken in session");
      redirect("/login");
    }

    // Sync user
    const syncRes = await fetch(`${apiUrl}/api/v1/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        google_id: (session as any).sub,
        email: session.user.email,
        picture: session.user.image,
        name: session.user.name,
      }),
    });

    if (syncRes.ok) {
      const user = await syncRes.json();
      if (!user.nickname) {
        shouldRedirectToOnboarding = true;
      }
    } else {
      console.error("Failed to sync user", await syncRes.text());
    }

    // Get user profile with role
    const meRes = await fetch(`${apiUrl}/api/v1/users/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (meRes.ok) {
      userData = await meRes.json();
    } else {
      console.error("Failed to fetch user profile", await meRes.text());
    }
  } catch (error) {
    console.error("Error syncing user", error);
  }

  if (shouldRedirectToOnboarding) {
    redirect("/onboarding");
  }

  // Fallback user data if API call failed
  if (!userData) {
    userData = {
      email: session.user.email || "",
      nickname: session.user.name || null,
      image: session.user.image || null,
      role: null,
    };
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <SignOutButton />
        </div>

        {/* User Info Card */}
        <UserInfoCard user={userData} />

        {/* Navigation Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <DashboardCard
            title="My Decks"
            description="Manage your deck collection"
            href="/decks"
            icon="arrow"
          />

          <DashboardCard
            title="All Decks"
            description="View all users' decks grouped by person"
            href="/all-decks"
            icon="arrow"
          />

          {userData.role === "admin" && (
            <DashboardCard
              title="Admin Page"
              description="Administrator tools and operations"
              href="/admin"
              icon="arrow"
            />
          )}

          <DashboardCard
            title="Coming Soon"
            description="More features in development"
            icon="lock"
            disabled
          />
        </div>
      </div>
    </div>
  );
}
