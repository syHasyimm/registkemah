import { redirectToRoleHome } from "@/lib/session";

export default async function Page() {
  await redirectToRoleHome();
}
