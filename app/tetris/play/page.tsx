"use client";

import React from "react";
import GameBoard from "@/components/tetris/GameBoard";

export default function PlayPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Play Tetris in ChatGPT</h1>
      <GameBoard />
    </main>
  );
}
