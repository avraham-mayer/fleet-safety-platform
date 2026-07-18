"use client";

// Small confirm-before-delete submit wrapper around a server action form.
// `fields` become hidden inputs (e.g. { id, table }).
export default function DeleteButton({
  action,
  fields,
  label = "מחיקה",
  confirmText = "למחוק לצמיתות?",
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        {label}
      </button>
    </form>
  );
}
