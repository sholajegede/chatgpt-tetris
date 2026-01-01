import React from "react";
import Leaderboard from "@/components/tetris/Leaderboard";

export default function LeaderboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <Leaderboard />
    </main>
  );
}
