"use client";
import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function ReplayViewer({ replayId }: { replayId?: string }) {
  const recent = useQuery(api.replays.getRecentReplays, {}) as any[] | undefined;
  const replay = replayId ? (useQuery(api.replays.getReplay, { replayId: replayId as any }) as any) : undefined;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<any | null>(replay ?? null);

  useEffect(() => {
    if (replay) {
      setSelected(replay);
      setIndex(0);
    }
  }, [replay]);

  if (replayId && !replay) return <div className="p-4">Loading replay...</div>;

  if (!replayId && !recent) return <div className="p-4">Loading recent replays...</div>;

  if (!replayId && recent && recent.length === 0) return <div className="p-4">No recent replays available.</div>;

  if (!selected) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <h3 className="font-bold mb-2">Recent Replays</h3>
        <ul className="space-y-2">
          {recent!.map((r) => (
            <li key={r._id}>
              <button className="underline text-blue-600" onClick={() => setSelected(r)}>
                Replay {r._id} — {r.actions.length} actions
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h3 className="font-bold mb-2">Replay {selected._id}</h3>
      <div className="mb-2">Duration: {selected.durationMs}ms</div>
      <div className="mb-2">Actions: {selected.actions.length}</div>
      <div className="flex gap-2">
        <button onClick={() => setIndex(i => Math.max(0, i-1))} className="btn">Prev</button>
        <button onClick={() => setIndex(i => Math.min(selected.actions.length-1, i+1))} className="btn">Next</button>
      </div>
      <pre className="mt-3 bg-slate-900 p-2 rounded text-sm">{JSON.stringify(selected.actions[index], null, 2)}</pre>
    </div>
  );
}
