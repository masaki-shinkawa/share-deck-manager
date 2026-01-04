import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NicknameForm from "@/components/NicknameForm";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.idToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please choose a nickname to continue.
          </p>
        </div>
        <NicknameForm idToken={session.idToken} />
      </div>
    </div>
  );
}

