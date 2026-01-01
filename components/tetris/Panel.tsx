"use client";

import React from "react";
import HomeWidget from "@/components/tetris/Home";
import GameBoard from "@/components/tetris/GameBoard";
import Leaderboard from "@/components/tetris/Leaderboard";

export default function Panel() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <HomeWidget />
      <div className="mt-6">
        <GameBoard />
      </div>
      <div className="mt-6">
        <Leaderboard />
      </div>
    </div>
  );
}
