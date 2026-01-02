"use client";

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function ReplayViewer({ replayId }: { replayId?: Id<"replays"> | string }) {
  const recent = useQuery(api.replays.getRecentReplays, {});
  
  const validReplayId = replayId as Id<"replays">;
  const replay = validReplayId ? useQuery(api.replays.getReplay, { replayId: validReplayId }) : undefined;
  
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (replay) {
      setSelected(replay);
      setIndex(0);
    }
  }, [replay]);

  if (validReplayId && !replay) return <div className="p-4">Loading replay...</div>;
  if (!validReplayId && !recent) return <div className="p-4">Loading recent replays...</div>;
  if (!validReplayId && recent && recent.length === 0) return <div className="p-4">No recent replays available.</div>;

  if (!selected && recent) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <h3 className="font-bold mb-2">Recent Replays</h3>
        <ul className="space-y-2">
          {recent.map((r) => (
            <li key={r._id}>
              <button className="underline text-blue-600" onClick={() => setSelected(r)}>
                Replay {r._id} — {r.actions?.length || 0} actions
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!selected) return <div className="p-4">No replay selected</div>;

  const actions = selected.actions || [];
  const currentAction = actions[index];

  return (
    <div className="max-w-lg mx-auto p-4">
      <h3 className="font-bold mb-2">Replay {selected._id}</h3>
      <div className="mb-2">Duration: {selected.durationMs}ms</div>
      <div className="mb-2">Actions: {actions.length}</div>
      <div className="mb-2">Current: {index + 1} / {actions.length}</div>
      <div className="flex gap-2">
        <button 
          onClick={() => setIndex(i => Math.max(0, i-1))} 
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          disabled={index === 0}
        >
          Prev
        </button>
        <button 
          onClick={() => setIndex(i => Math.min(actions.length-1, i+1))} 
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          disabled={index === actions.length - 1}
        >
          Next
        </button>
      </div>
      {currentAction && (
        <pre className="mt-3 bg-slate-900 text-white p-2 rounded text-sm overflow-auto">
          {JSON.stringify(currentAction, null, 2)}
        </pre>
      )}
    </div>
  );
}