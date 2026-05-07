import { AddIdeaForm } from "./add-idea-form";

export const runtime = "nodejs";

export default function AddPage() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Dodaj pomysł
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Zapisz propozycję dla ekipy. Do dodania prawdziwego pomysłu trzeba
          się zalogować.
        </p>
      </div>

      <AddIdeaForm />
    </section>
  );
}
