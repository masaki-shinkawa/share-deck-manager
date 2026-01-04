import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DeckList from "@/components/DeckList";

export default async function DecksPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.idToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-4xl space-y-8 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-gray-200 pb-6 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Decks
          </h1>
        </div>
        <DeckList idToken={session.idToken} />
      </div>
    </div>
  );
}
