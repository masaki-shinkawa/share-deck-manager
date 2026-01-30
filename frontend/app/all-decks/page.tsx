import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import GroupedDeckList from "@/components/GroupedDeckList";

export default async function AllDecksPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.idToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 md:py-12 dark:bg-zinc-900">
      <div className="w-full max-w-6xl space-y-8 md:rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-gray-200 pb-6 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            All Decks
          </h1>
        </div>
        <GroupedDeckList idToken={session.idToken} />
      </div>
    </div>
  );
}
