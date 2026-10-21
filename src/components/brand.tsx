import Link from "next/link";
import { TentTree } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link
      href="/"
      className="brand"
      aria-label={`${siteConfig.name}, halaman utama`}
    >
      <span className="brand-symbol">
        <TentTree aria-hidden="true" />
      </span>
      <span>
        <span className="brand-name">{siteConfig.name}</span>
        <span className="brand-subtitle">
          Kemah Besar Penggalang
          <br />
          Gelora Pahlawan
        </span>
      </span>
    </Link>
  );
}
