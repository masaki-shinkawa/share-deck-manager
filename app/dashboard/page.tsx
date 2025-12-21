"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Plus } from "lucide-react";
import { DeckCard } from "@/components/DeckCard";
import { DeckForm, type DeckFormData } from "@/components/DeckForm";
import ConfirmModal from "@/components/ConfirmModal";

interface Group {
  id: string;
  name: string;
}

interface Deck {
  id: string;
  name: string;
  description?: string;
  group_id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    deckId: string | null;
    deckName: string;
  }>({
    isOpen: false,
    deckId: null,
    deckName: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGroups();
    }
  }, [status]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchDecks(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(data[0].id);
        } else {
          // If no groups, create default one
          createDefaultGroup();
        }
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    }
  };

  const createDefaultGroup = async () => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Workspace" }),
      });
      if (res.ok) {
        const group = await res.json();
        setGroups([group]);
        setSelectedGroupId(group.id);
      }
    } catch (error) {
      console.error("Failed to create default group", error);
    }
  };

  const fetchDecks = async (groupId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/decks`);
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch (error) {
      console.error("Failed to fetch decks", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeck = async (data: DeckFormData) => {
    if (!selectedGroupId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/decks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchDecks(selectedGroupId);
      }
    } catch (error) {
      console.error("Failed to create deck", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDeck = async (data: DeckFormData) => {
    if (!editingDeck) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/decks/${editingDeck.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingDeck(null);
        setIsModalOpen(false);
        if (selectedGroupId) fetchDecks(selectedGroupId);
      }
    } catch (error) {
      console.error("Failed to update deck", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    console.log("DEBUG: handleDeleteDeck called with deckId:", deckId);
    // デッキ名を取得
    const deck = decks.find((d) => d.id === deckId);
    setDeleteConfirm({
      isOpen: true,
      deckId: deckId,
      deckName: deck?.name || "このデッキ",
    });
  };

  const confirmDelete = async () => {
    const deckId = deleteConfirm.deckId;
    setDeleteConfirm({ isOpen: false, deckId: null, deckName: "" });
    
    if (!deckId) return;
    
    console.log("DEBUG: Sending DELETE request to /api/decks/" + deckId);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });
      console.log("DEBUG: DELETE response status:", res.status);
      if (res.ok) {
        console.log("DEBUG: Delete successful, refreshing decks");
        if (selectedGroupId) fetchDecks(selectedGroupId);
      } else {
        console.error("DEBUG: Delete failed with status:", res.status);
      }
    } catch (error) {
      console.error("Failed to delete deck", error);
    }
  };

  const cancelDelete = () => {
    console.log("DEBUG: User cancelled delete");
    setDeleteConfirm({ isOpen: false, deckId: null, deckName: "" });
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <select
              value={selectedGroupId || ""}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setEditingDeck(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            New Deck
          </button>
        </div>

        {/* Deck Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No decks found in this group.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-blue-600 hover:underline"
            >
              Create your first deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                currentUserId={session?.user?.id}
                onEdit={(d) => {
                  setEditingDeck(d);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteDeck}
              />
            ))}
          </div>
        )}
      </main>

      {/* Models */}
      {isModalOpen && (
        <DeckForm
          initialData={editingDeck || undefined}
          onSubmit={editingDeck ? handleUpdateDeck : handleCreateDeck}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingDeck(null);
          }}
          isLoading={isSaving}
        />
      )}
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="デッキの削除"
        message={`"${deleteConfirm.deckName}" を削除してもよろしいですか？この操作は取り消せません。`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
