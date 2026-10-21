import type { Metadata } from "next";
import { CampWorkspace } from "@/components/camp/workspace";
export const metadata: Metadata = {
  title: "Pratinjau frontend",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CampWorkspace preview>{children}</CampWorkspace>;
}
