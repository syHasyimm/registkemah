import type { Registration } from "./types";
export function draftPayload(reg: Registration) {
  const school = Object.fromEntries(
    Object.entries(reg.school).filter(([key]) => key !== "email"),
  );
  return {
    revision: reg.revision || 0,
    school,
    patrols: reg.patrols.map((p) => ({
      ...p,
      leaderId: p.leaderId || null,
      participants: p.participants.map((m) => ({
        id: m.id,
        name: m.name,
        base: m.base,
        className: m.className,
        photoId: m.photoId || null,
        zoom: m.zoom,
        x: m.x,
        y: m.y,
      })),
    })),
  };
}
