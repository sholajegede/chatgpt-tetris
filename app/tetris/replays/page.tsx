import React from "react";
import ReplayViewer from "@/components/tetris/ReplayViewer";

export default function ReplaysPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Replays</h1>
      <ReplayViewer />
    </main>
  );
}
