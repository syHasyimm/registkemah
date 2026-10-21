import { requirePermission } from "@/lib/session";
import { CampWorkspace } from "@/components/camp/workspace";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePermission({ registrations: ["read-any"] });
  return (
    <CampWorkspace user={{ id: user.id, name: user.name, email: user.email }}>
      {children}
    </CampWorkspace>
  );
}
