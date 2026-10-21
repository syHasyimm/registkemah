import { CampWorkspace } from "@/components/camp/workspace";
import { requireRole } from "@/lib/session";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["user"]);
  return (
    <CampWorkspace user={{ id: user.id, name: user.name, email: user.email }}>
      {children}
    </CampWorkspace>
  );
}
