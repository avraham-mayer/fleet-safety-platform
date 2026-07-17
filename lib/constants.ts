// Read-only "Structured Safety Briefing" (הדרכה מובנית) shown to the driver in
// the inspection wizard. The driver must acknowledge it before continuing.
export const SAFETY_BRIEFING = `הדרכת בטיחות מובנית לנהג

1. בצע סבב בדיקה חיצוני סביב הרכב לפני תחילת הנסיעה — צמיגים, פנסים, מראות ודליפות.
2. ודא תקינות חגורת הבטיחות והתאם את מושב הנהג והמראות.
3. שמור על מרחק עצירה בטוח והתאם את המהירות לתנאי הדרך ומזג האוויר.
4. הקפד על זמני המנוחה הנדרשים ועל מילוי יומן הנסיעה (טכוגרף).
5. בהובלת חומרים מסוכנים — ודא תיעוד תקין, שילוט וציוד חירום בהתאם לתקנות.
6. דווח מיידית על כל ליקוי בטיחותי או תקלה שהתגלו במהלך הבדיקה או הנסיעה.`;

// Driver training modules. `material` is shown read-only on screen for the
// driver to review before co-signing (Flow 4).
export const TRAINING_MODULES: { type: string; title: string; material: string }[] = [
  {
    type: "signs",
    title: "הדרכת תמרורים / Traffic signs",
    material:
      "סקירת תמרורי אזהרה, איסור והוריה. שים לב לתמרורים זמניים באתרי עבודה ולתמרור עצור ותן זכות קדימה. ציית לרמזורים ולסימוני דרך.",
  },
  {
    type: "winter",
    title: "הדרכת חורף / Winter driving",
    material:
      "נהיגה בתנאי גשם וערפל: הגדל מרחק עצירה, הדלק אורות, האט במעברי מים. בדוק מגבים, בלמים וצמיגים לפני נסיעה בחורף.",
  },
  {
    type: "summer",
    title: "הדרכת קיץ / Summer driving",
    material:
      "עומס חום: ודא תקינות מערכת קירור ומיזוג, שתה מים, הימנע מעייפות. בדוק לחץ אוויר בצמיגים בטמפרטורות גבוהות.",
  },
  {
    type: "hazmat",
    title: "הדרכת חומ״ס / Hazardous materials",
    material:
      "הובלת חומרים מסוכנים: שילוט תקין, מסמכי הובלה, ציוד חירום וכיבוי. הכר נהלי דליפה וחירום ודווח מיידית על אירוע.",
  },
];

// Document types for the renewal flow (Flow 5).
export const DOC_TYPES = [
  "רישיון רכב",
  "ביטוח",
  "טכוגרף",
  "רישיון נהיגה",
] as const;

// A document is "warning" severity within this many days of expiry.
export const EXPIRY_WARNING_DAYS = 30;
