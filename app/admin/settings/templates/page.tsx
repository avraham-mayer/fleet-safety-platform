import { createClient } from "@/lib/supabase/server";
import { saveTemplate, toggleTemplate } from "@/lib/actions/templates";
import { Card, Field, inputCls, submitCls } from "@/components/admin/ui";
import type { ChecklistTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

// Checklist-template management: each template drives the inspection wizard
// (items are default-Pass). type='monthly' keeps the monthly-cycle semantics.
export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_templates")
    .select("*")
    .order("name");
  const templates = (data ?? []) as ChecklistTemplate[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">תבניות בדיקה</h1>
        <p className="text-sm text-slate-500">
          סעיף בכל שורה. תבנית מסוג monthly נספרת למחזור החודשי; כל סוג אחר
          זמין לתזמון בדיקות ייעודיות.
        </p>
      </div>

      <Card title="תבנית חדשה">
        <TemplateForm />
      </Card>

      {templates.map((tpl) => (
        <Card
          key={tpl.id}
          title={`${tpl.name} (${tpl.type})${tpl.active ? "" : " — מושבתת"}`}
          action={
            <form action={toggleTemplate}>
              <input type="hidden" name="id" value={tpl.id} />
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {tpl.active ? "השבתה" : "הפעלה"}
              </button>
            </form>
          }
        >
          <TemplateForm template={tpl} />
        </Card>
      ))}
    </div>
  );
}

function TemplateForm({ template }: { template?: ChecklistTemplate }) {
  return (
    <form action={saveTemplate} className="space-y-3">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="flex flex-wrap gap-2">
        <Field label="שם" className="min-w-48 flex-1">
          <input
            name="name"
            required
            defaultValue={template?.name}
            className={inputCls}
          />
        </Field>
        <Field label="סוג (monthly / winter / …)" className="min-w-48 flex-1">
          <input
            name="type"
            required
            defaultValue={template?.type}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="סעיפי הבדיקה — סעיף בכל שורה">
        <textarea
          name="items"
          required
          rows={Math.max(6, (template?.items.length ?? 0) + 2)}
          defaultValue={template?.items.map((i) => i.label).join("\n")}
          className={`${inputCls} font-mono`}
        />
      </Field>
      <button type="submit" className={submitCls}>
        {template ? "שמירה" : "+ יצירה"}
      </button>
    </form>
  );
}
