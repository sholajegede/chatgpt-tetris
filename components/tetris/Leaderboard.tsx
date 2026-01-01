"use client";
import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function Leaderboard() {
  const entries = useQuery(api.leaderboards.listTop, { limit: 20 }) || [];
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <ol className="list-decimal pl-6 space-y-2">
        {entries.map((e: any) => (
          <li key={e._id} className="flex justify-between">
            <div>{e.userId ? String(e.userId) : 'Anonymous'}</div>
            <div>{e.score}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
