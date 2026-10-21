import type { Category } from "./types";

const avatars: Record<Category, string> = {
  Putra: "/images/participants/pramuka-putra.svg",
  Putri: "/images/participants/pramuka-putri.svg",
};

/** Use the verified patrol category, never infer it from a participant's name. */
export function participantAvatar(category: Category) {
  return avatars[category];
}

export const participantAvatarCredit =
  "Ilustrasi: Akela - Haooow!, Egel / ScoutMedia; CC BY-SA 3.0; diadaptasi.";
