"use client";

export default function SaveSuccess({ title }: { title?: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Game Saved</h2>
      <p className="text-gray-600">Your game replay was saved successfully{title ? `: "${title}"` : '.'}</p>
    </div>
  );
}
