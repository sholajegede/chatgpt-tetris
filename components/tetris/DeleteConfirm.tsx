"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmProps {
  title: string;
  gameId: Id<"games">;
  onDeleted: () => void;
  onCancel: () => void;
}

export default function DeleteConfirm({ 
  title, 
  gameId,
  onDeleted,
  onCancel
}: DeleteConfirmProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteGame = useMutation(api.games.deleteGame);
  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGame({ gameId });
      onDeleted();
    } catch (err) {
      // Optionally handle error
    }
    setIsDeleting(false);
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Game
            </h3>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete the game:
            </p>
            <p className="text-gray-900 font-medium mb-4">
              "{title}"?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={onCancel}
                disabled={isDeleting}
                variant={"outline"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant={"destructive"}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
