"use client";

import { useState } from "react";

const demoMessage =
  "To jest wersja demonstracyjna. Zapisywanie pomysłów będzie dostępne po podłączeniu bazy.";

export function AddIdeaForm() {
  const [feedback, setFeedback] = useState("");

  return (
    <form className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Tytuł</span>
        <input
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          name="title"
          placeholder="Na przykład: wspólna kolacja"
          type="text"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Opis</span>
        <textarea
          className="min-h-28 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          name="description"
          placeholder="Krótko opisz pomysł dla ekipy"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Miejsce</span>
        <input
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          name="location"
          placeholder="Adres albo nazwa miejsca"
          type="text"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Cena</span>
        <input
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          name="price"
          placeholder="Na przykład: 25 zł"
          type="text"
        />
      </label>

      <button
        className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800"
        type="button"
        onClick={() => setFeedback(demoMessage)}
      >
        Dodaj pomysł
      </button>

      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-md bg-teal-50 px-4 py-3 text-sm font-medium leading-6 text-teal-900"
        >
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
