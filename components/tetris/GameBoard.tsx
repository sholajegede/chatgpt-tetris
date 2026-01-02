"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCallTool, useSendMessage } from "@/app/hooks";
import { Id } from "@/convex/_generated/dataModel";

const WIDTH = 10;
const HEIGHT = 20;

const PIECES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const PIECE_COLORS: Record<string, string> = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
};

const PIECE_TYPES = Object.keys(PIECES);

function emptyBoard() {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => 0)
  );
}

function rotate(shape: number[][]) {
  const h = shape.length;
  const w = shape[0].length;
  const out = Array.from({ length: w }, () =>
    Array.from({ length: h }, () => 0)
  );
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[c][h - 1 - r] = shape[r][c];
    }
  }
  return out;
}

function canPlace(board: number[][], shape: number[][], x: number, y: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const br = y + r;
      const bc = x + c;
      if (bc < 0 || bc >= WIDTH || br < 0 || br >= HEIGHT) return false;
      if (board[br][bc]) return false;
    }
  }
  return true;
}

export default function GameBoard() {
  const [board, setBoard] = useState<number[][]>(emptyBoard());
  const [current, setCurrent] = useState<{
    type: string;
    shape: number[][];
    x: number;
    y: number;
  } | null>(null);
  const [next, setNext] = useState<string>(
    () => PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]
  );
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const actionsRef = useRef<any[]>([]);
  const tickRef = useRef<number | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const clearSoundRef = useRef<HTMLAudioElement | null>(null);

  const callTool = useCallTool();
  const sendMessage = useSendMessage();
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio(
      "https://cdn.freesound.org/previews/612/612091_3283808-lq.mp3"
    );
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    bgMusicRef.current.addEventListener("error", (e) =>
      console.error("Background music load error:", e)
    );
    bgMusicRef.current.addEventListener("canplay", () =>
      console.log("Background music ready")
    );

    clearSoundRef.current = new Audio(
      "https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3"
    );
    clearSoundRef.current.volume = 0.5;
    clearSoundRef.current.addEventListener("error", (e) =>
      console.error("Clear sound load error:", e)
    );

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
      if (clearSoundRef.current) {
        clearSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (running && musicEnabled && bgMusicRef.current) {
      if (bgMusicRef.current.paused) {
        bgMusicRef.current.currentTime = 0;
        bgMusicRef.current
          .play()
          .catch((e) => console.log("Background music play failed:", e));
      }
    } else if (bgMusicRef.current && !bgMusicRef.current.paused) {
      bgMusicRef.current.pause();
    }
  }, [running, musicEnabled]);

  useEffect(() => {
    function drop() {
      if (!current) return;
      move(0, 1);
    }
    if (running) {
      const interval = Math.max(200, 1000 - (level - 1) * 100);
      tickRef.current = window.setInterval(drop, interval);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
  }, [running, current, level]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1, 0, "L");
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1, 0, "R");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(0, 1, "D");
      }
      if (e.key === " ") {
        e.preventDefault();
        rotateCurrent("ROT");
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        rotateCurrent("ROT");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, current]);

  function spawnNext(boardParam?: number[][]) {
    const currentBoard = boardParam ?? board;
    const type = next;
    const shape = PIECES[type].map((r) => [...r]);
    const x = Math.floor((WIDTH - shape[0].length) / 2);
    const y = 0;
    if (!canPlace(currentBoard, shape, x, y)) {
      finish();
      return;
    }
    setCurrent({ type, shape, x, y });
    setNext(PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]);
  }

  function mergeCurrentToBoard(brd: number[][], cur: any) {
    const copy = brd.map((r) => [...r]);
    if (!cur) return copy;
    for (let r = 0; r < cur.shape.length; r++) {
      for (let c = 0; c < cur.shape[0].length; c++) {
        if (cur.shape[r][c]) {
          const rr = cur.y + r;
          const cc = cur.x + c;
          if (rr >= 0 && rr < HEIGHT && cc >= 0 && cc < WIDTH) {
            copy[rr][cc] = PIECE_TYPES.indexOf(cur.type) + 10;
          }
        }
      }
    }
    return copy;
  }

  function clearLines(brd: number[][]) {
    let cleared = 0;
    const out: number[][] = [];
    for (let r = 0; r < HEIGHT; r++) {
      if (brd[r].every((v) => v !== 0)) {
        cleared++;
      } else {
        out.push(brd[r]);
      }
    }
    while (out.length < HEIGHT)
      out.unshift(Array.from({ length: WIDTH }, () => 0));
    return { board: out, cleared };
  }

  function move(dx: number, dy: number, actionCode?: string) {
    if (!current) return;
    const nx = current.x + dx;
    const ny = current.y + dy;
    if (canPlace(board, current.shape, nx, ny)) {
      setCurrent({ ...current, x: nx, y: ny });
      if (actionCode) actionsRef.current.push({ t: Date.now(), a: actionCode });
    } else {
      if (dy === 1) {
        const merged = mergeCurrentToBoard(board, current);
        const normalized = merged.map((r) =>
          r.map((v) => (v >= 10 ? v - 9 : v))
        );

        const { board: newBoard, cleared } = clearLines(normalized);
        if (cleared > 0) {
          if (clearSoundRef.current && musicEnabled) {
            clearSoundRef.current.currentTime = 0;
            clearSoundRef.current
              .play()
              .catch((e) => console.log("Sound play failed:", e));
          }

          const clearingRowIndices: number[] = [];
          for (let r = 0; r < HEIGHT; r++) {
            if (normalized[r].every((v) => v !== 0)) {
              clearingRowIndices.push(r);
            }
          }
          setClearingRows(clearingRowIndices);

          setScore((s) => s + cleared * 100);
          setLines((prev) => {
            const newLines = prev + cleared;
            setLevel(Math.floor(newLines / 10) + 1);
            return newLines;
          });

          setTimeout(() => {
            setBoard(newBoard);
            setCurrent(null);
            setClearingRows([]);
            setTimeout(() => spawnNext(newBoard), 50);
          }, 300);
        } else {
          setBoard(newBoard);
          setCurrent(null);
          setTimeout(() => spawnNext(newBoard), 50);
        }
      }
    }
  }

  function rotateCurrent(actionCode?: string) {
    if (!current) return;
    const newShape = rotate(current.shape);
    if (canPlace(board, newShape, current.x, current.y)) {
      setCurrent({ ...current, shape: newShape });
      if (actionCode) actionsRef.current.push({ t: Date.now(), a: actionCode });
    }
  }

  async function start() {
    const b = emptyBoard();
    setBoard(b);
    setScore(0);
    setLines(0);
    setLevel(1);
    actionsRef.current = [];
    setRunning(true);

    startTimeRef.current = Date.now();

    (async () => {
      try {
        const toolRes = await callTool?.("start_game", {});
        console.log("start_game tool response:", toolRes);

        if (toolRes) {
          const response = toolRes as any;

          if (response.structuredContent?.gameId) {
            const gameIdToUse = response.structuredContent.gameId;
            setGameId(gameIdToUse);
            console.log("Game ID captured:", gameIdToUse);
          } else {
            console.warn(
              "No game ID found in structuredContent. Full response:",
              response
            );
          }
        }
      } catch (err) {
        console.error("Failed to create game record:", err);
      }
    })();

    setTimeout(() => spawnNext(b), 10);
  }

  async function finish() {
    setRunning(false);

    const durationMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : undefined;
    const replayActions = actionsRef.current.slice();

    console.log("Finishing game:", {
      gameId,
      score,
      level,
      lines,
      durationMs,
      actionCount: replayActions.length,
    });

    if (gameId && callTool) {
      try {
        console.log("Calling finish_game tool with:", {
          gameId,
          score,
          level,
          linesCleared: lines,
          replayActionsCount: replayActions.length,
          durationMs,
        });

        const result = await callTool("finish_game", {
          gameId,
          score,
          level,
          linesCleared: lines,
          replayActions,
          durationMs,
        });

        console.log("finish_game result:", result);

        const response = result as any;
        let message = `🎮 Game finished! Score: ${score}, Level: ${level}, Lines: ${lines}`;

        if (response?.content?.[0]?.text) {
          message = response.content[0].text;
        }

        await sendMessage?.(message);
      } catch (err) {
        console.error("Error finishing game via MCP:", err);
        await sendMessage?.(
          `Game finished locally — Score: ${score}, Level: ${level}, Lines: ${lines} (Could not save: ${
            err instanceof Error ? err.message : String(err)
          })`
        );
      }
    } else {
      console.warn("Cannot finish game:", {
        hasGameId: !!gameId,
        hasCallTool: !!callTool,
      });
      await sendMessage?.(
        `Game finished locally — Score: ${score}, Level: ${level}, Lines: ${lines} (No game ID to save)`
      );
    }

    setBoard(emptyBoard());
    setCurrent(null);
    setNext(PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]);
    setScore(0);
    setLines(0);
    setLevel(1);
    actionsRef.current = [];
    setGameId(null);
    startTimeRef.current = null;
  }

  function renderNextPiece() {
    const shape = PIECES[next];
    const color = PIECE_COLORS[next];
    const gridSize = 4;
    const miniCellSize = 16;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, ${miniCellSize}px)`,
          gap: 1,
          justifyContent: "center",
        }}
      >
        {Array.from({ length: gridSize }).map((_, r) =>
          Array.from({ length: gridSize }).map((_, c) => {
            const inShape = shape[r] && shape[r][c];
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: miniCellSize,
                  height: miniCellSize,
                  background: inShape ? color : "transparent",
                  border: inShape ? "1px solid rgba(0,0,0,0.3)" : "none",
                  borderRadius: 2,
                }}
              />
            );
          })
        )}
      </div>
    );
  }
  const display = mergeCurrentToBoard(board, current);
  const cellPx = Math.max(18, Math.min(32, Math.floor(360 / WIDTH)));
  const boardWidth = cellPx * WIDTH;

  function getCellColor(value: number): string {
    if (value === 0) return "#0f172a";
    if (value >= 10) {
      const typeIndex = value - 10;
      return PIECE_COLORS[PIECE_TYPES[typeIndex]];
    }
    const typeIndex = value - 1;
    return PIECE_COLORS[PIECE_TYPES[typeIndex]];
  }

  return (
    <div className="mx-auto p-4" style={{ maxWidth: 720 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>Score:</strong> {score}
        </div>
        <div>
          <strong>Level:</strong> {level}
        </div>
        <div>
          <strong>Lines:</strong> {lines}
        </div>
        <button
          onClick={() => setMusicEnabled(!musicEnabled)}
          style={{
            background: musicEnabled
              ? "linear-gradient(145deg, #10b981, #059669)"
              : "linear-gradient(145deg, #6b7280, #4b5563)",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {musicEnabled ? "🔊 Music On" : "🔇 Music Off"}
        </button>
      </div>
      <div className="flex gap-6 items-start">
        <div className="border bg-slate-900 p-2" style={{ width: boardWidth }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${WIDTH}, ${cellPx}px)`,
              gap: 0,
            }}
          >
            {display.flatMap((row, r) =>
              row.map((cell, c) => {
                const isClearing = clearingRows.includes(r);
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      boxSizing: "border-box",
                      border: "1px solid rgba(100,116,139,0.3)",
                      background: getCellColor(cell),
                      opacity: isClearing ? 0.5 : 1,
                      transform: isClearing ? "scale(1.05)" : "scale(1)",
                      transition: "all 0.2s ease-in-out",
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="mt-2">
          <div className="mb-2">
            <strong>Next</strong>
          </div>
          <div className="bg-slate-800 p-3 rounded">
            <div
              style={{
                width: 80,
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderNextPiece()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="btn"
          onClick={start}
          style={{
            background: "linear-gradient(145deg, #f59e0b, #d97706)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          ▶ Start
        </button>
        <button
          className="btn"
          onClick={() => setRunning((s) => !s)}
          style={{
            background: "linear-gradient(145deg, #3b82f6, #2563eb)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button
          className="btn"
          onClick={() => {
            rotateCurrent();
          }}
          style={{
            background: "linear-gradient(145deg, #10b981, #059669)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          ↻ Rotate
        </button>
        <button
          className="btn"
          onClick={() => move(0, 1, "D")}
          style={{
            background: "linear-gradient(145deg, #ec4899, #db2777)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          ↓ Drop
        </button>
        <button
          className="btn"
          onClick={() => finish()}
          style={{
            background: "linear-gradient(145deg, #ef4444, #dc2626)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          ✕ End
        </button>
      </div>
    </div>
  );
}