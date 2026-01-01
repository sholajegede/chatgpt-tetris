"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Film, Trophy } from "lucide-react";
import { useWidgetProps } from "./hooks";

export default function Home() {
  const router = useRouter();
  const toolOutput = useWidgetProps<{
    name?: string;
    result?: { structuredContent?: { name?: string } };
  }>();

  const name = toolOutput?.result?.structuredContent?.name || toolOutput?.name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-3">Tetris</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">{name ? `Hi ${name}, ready to play?` : 'Play classic Tetris in your browser — save replays and climb the leaderboard.'}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
                <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Play</CardTitle>
              <CardDescription>Start a new Tetris game and save replays when you finish.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                <Film className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Replays</CardTitle>
              <CardDescription>View recent replays and replay your best runs.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 mb-4">
                <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>See the top scores and compete for the highest rank.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center space-y-6">
          <div className="flex justify-center gap-4">
            <Link href="/tetris/play">
              <Button size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Play Now
              </Button>
            </Link>
            <Link href="/tetris/replays">
              <Button size="lg" variant="outline" className="gap-2">
                <Film className="w-5 h-5" />
                Replays
              </Button>
            </Link>
            <Link href="/tetris/leaderboard">
              <Button size="lg" variant="ghost" className="gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-16 py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 text-center text-slate-500 dark:text-slate-400">
          <p>Play Tetris — save replays and compete on the leaderboard</p>
        </div>
      </footer>
    </div>
  );
}
