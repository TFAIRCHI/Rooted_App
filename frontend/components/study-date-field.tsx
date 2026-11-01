"use client";

export function StudyDateField({ id, value, onChange, readOnly = false }: { id: string; value: string; onChange: (date: string) => void; readOnly?: boolean }) {
  return <div className="field"><label htmlFor={id}>Study date</label><input id={id} type="date" value={value} onChange={event => onChange(event.target.value)} readOnly={readOnly} required aria-describedby={readOnly ? `${id}-help` : undefined} />{readOnly && <p id={`${id}-help`} className="fine">Published dates are historical. Add a new study for another date.</p>}</div>;
}
