"use client";
import React from 'react';
import Link from 'next/link';

export default function HomeWidget() {
  return (
    <div className="p-6 max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Tetris</h1>
      <p className="mb-6">Play Tetris directly from your chat or in this app. Start a game, view replays, and see the leaderboard.</p>
      <div className="flex justify-center gap-4">
        <Link href="/tetris/play"><a className="btn">Play</a></Link>
        <Link href="/tetris/replays"><a className="btn">Replays</a></Link>
        <Link href="/tetris/leaderboard"><a className="btn">Leaderboard</a></Link>
      </div>
    </div>
  );
}
