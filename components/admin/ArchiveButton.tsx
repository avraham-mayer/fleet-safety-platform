"use client";

// Archive/restore submit wrapper around a server action. When archiving it
// prompts for a reason (legacy "סיבת העברה לארכיון") and sends it as a hidden
// input; restoring just submits. `fields` become hidden inputs (id, table).
export default function ArchiveButton({
  action,
  fields,
  mode,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  mode: "archive" | "restore";
}) {
  const isArchive = mode === "archive";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const form = e.currentTarget;
        if (isArchive) {
          const reason = window.prompt("סיבת העברה לארכיון (רשות):", "");
          if (reason === null) {
            e.preventDefault();
            return;
          }
          (
            form.elements.namedItem("archive_reason") as HTMLInputElement
          ).value = reason;
        }
      }}
      className="inline"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="archive_reason" value="" />
      <button
        type="submit"
        className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
          isArchive
            ? "text-amber-700 hover:bg-amber-50"
            : "text-green-700 hover:bg-green-50"
        }`}
      >
        {isArchive ? "העברה לארכיון" : "שחזור מארכיון"}
      </button>
    </form>
  );
}
