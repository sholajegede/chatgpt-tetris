"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function Leaderboard() {
  const entries = useQuery(api.leaderboards.listTop, { limit: 20 }) || [];
  
  const userIds = entries.map((e: any) => e.userId).filter(Boolean);
  const users = useQuery(
    api.users.getMultipleById, 
    userIds.length > 0 ? { userIds } : "skip"
  );

  const userMap = new Map();
  if (users) {
    users.forEach((user: any) => {
      if (user) userMap.set(user._id, user);
    });
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <ol className="list-decimal pl-6 space-y-2">
        {entries.map((e: any, idx: number) => {
          const user = userMap.get(e.userId);
          const displayName = user 
            ? (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email)
            : 'Anonymous';
          
          return (
            <li key={e._id} className="flex justify-between">
              <div>{displayName}</div>
              <div>{e.score}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}