"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  House,
  Info,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  TentTree,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/config/site";
import { SignOutButton } from "@/components/sign-out-button";
import { MotionPage } from "@/components/motion";
import { initialState } from "@/lib/camp/fixtures";
import type { CampState, Registration } from "@/lib/camp/types";
import { defaultEvent } from "@/lib/camp/defaults";
import { campRequest } from "@/lib/camp/http-client";
import { draftPayload } from "@/lib/camp/payload";
import type { EventSettings, RegistrationStatus } from "@/lib/camp/types";

type CampContextValue = {
  data: CampState;
  preview: boolean;
  href: (path: string) => string;
  commit: (data: CampState) => Promise<boolean>;
  saveRegistration: (reg: Registration) => Promise<Registration | false>;
  submitRegistration: (reg: Registration) => Promise<Registration | false>;
  decideRegistration: (
    reg: Registration,
    status: RegistrationStatus,
    note: string,
  ) => Promise<boolean>;
  retryJob: (
    id: string,
    kind: "document" | "cards" | "email",
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  loadRegistration: (id: string) => Promise<void>;
  uploadPhoto: (
    reg: Registration,
    participantId: string,
    file: File,
    progress: (value: number) => void,
    signal: AbortSignal,
  ) => Promise<{ photoId: string; photo: string }>;
  notify: (message: string) => void;
};
const CampContext = createContext<CampContextValue | null>(null);
const subscribeHydration = () => () => {};
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("kemah-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("kemah-storage", callback);
  };
};

export function useCamp() {
  const value = useContext(CampContext);
  if (!value) throw new Error("Camp workspace is required");
  return value;
}

type WorkspaceProps = {
  children: ReactNode;
  preview?: boolean;
  user?: { id: string; name: string; email: string };
};
export function CampWorkspace(props: WorkspaceProps) {
  return props.preview ? (
    <DemoWorkspace {...props} />
  ) : (
    <LiveWorkspace {...props} />
  );
}

function DemoWorkspace({
  children,
  preview = false,
  user = {
    id: "demo",
    name: "Pembina Sekolah",
    email: "operator1@example.com",
  },
}: {
  children: ReactNode;
  preview?: boolean;
  user?: { id: string; name: string; email: string };
}) {
  const key = `kemah-frontend-v1:${preview ? "preview" : user.id}`;
  const [toast, setToast] = useState("");
  const initial = useMemo(
    () => initialState(preview, user.email),
    [preview, user.email],
  );
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) || "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const data = useMemo(() => {
    if (!raw) return initial;
    try {
      const parsed = JSON.parse(raw) as CampState;
      return parsed.schemaVersion === 1 &&
        Array.isArray(parsed.registrations) &&
        parsed.registrations.some((r) => r.id === parsed.operatorId) &&
        parsed.event
        ? parsed
        : initial;
    } catch {
      return initial;
    }
  }, [raw, initial]);
  async function commit(next: CampState) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("kemah-storage"));
      return true;
    } catch {
      setToast(
        "Penyimpanan browser gagal atau penuh. Isian tetap di halaman ini. Kurangi ukuran foto, lalu coba simpan lagi.",
      );
      return false;
    }
  }
  const href = (path: string) =>
    preview
      ? path === "/app"
        ? "/preview"
        : `/preview${path.replace(/^\/app/, "")}`
      : path;
  return (
    <CampContext.Provider
      value={{
        data,
        preview,
        href,
        commit,
        saveRegistration: async (reg) =>
          (await commit({
            ...data,
            registrations: data.registrations.map((r) =>
              r.id === reg.id ? reg : r,
            ),
          }))
            ? reg
            : false,
        submitRegistration: async () => false,
        decideRegistration: async () => false,
        retryJob: async () => false,
        refresh: async () => {},
        loadRegistration: async () => {},
        uploadPhoto: async () => {
          throw new Error("Demo photos are processed locally");
        },
        notify: setToast,
      }}
    >
      <WorkspaceShell user={user}>
        {hydrated ? (
          children
        ) : (
          <div className="workspace-loading" role="status">
            <TentTree />
            <p>Menyiapkan ruang perkemahan…</p>
            <div className="skeleton" />
          </div>
        )}
      </WorkspaceShell>
      {toast && (
        <div className="toast no-print" role="status">
          <Info size={20} />
          <p>{toast}</p>
          <button aria-label="Tutup pemberitahuan" onClick={() => setToast("")}>
            <X size={18} />
          </button>
        </div>
      )}
    </CampContext.Provider>
  );
}

function LiveWorkspace({
  children,
  user = { id: "", name: "Operator", email: "" },
}: WorkspaceProps) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const [data, setData] = useState<CampState>({
    schemaVersion: 1,
    event: defaultEvent,
    operatorId: "",
    registrations: [],
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [toast, notify] = useState("");
  const merge = useCallback(
    (reg: Registration) =>
      setData((current) => ({
        ...current,
        registrations: [
          ...current.registrations.filter((r) => r.id !== reg.id),
          reg,
        ],
      })),
    [],
  );
  const refresh = useCallback(async () => {
    const result = await campRequest<{ data: CampState }>(
      admin ? "/api/admin/camp/workspace" : "/api/camp/workspace",
    );
    if (!admin && !result.data.operatorId) {
      await campRequest("/api/registrations", { method: "POST" });
      const created = await campRequest<{ data: CampState }>(
        "/api/camp/workspace",
      );
      result.data = created.data;
    }
    setData((current) => ({
      ...result.data,
      registrations: [
        ...result.data.registrations,
        ...current.registrations.filter(
          (r) => !result.data.registrations.some((next) => next.id === r.id),
        ),
      ],
    }));
  }, [admin]);
  const loadRegistration = useCallback(
    async (id: string) => {
      const result = await campRequest<{ data: Registration }>(
        `${admin ? "/api/admin/registrations" : "/api/registrations"}/${id}`,
      );
      merge(result.data);
    },
    [admin, merge],
  );
  useEffect(() => {
    let active = true;
    const initialLoad = setTimeout(() => {
      void refresh()
        .then(() => {
          if (active) {
            setReady(true);
            setError("");
          }
        })
        .catch((error) => {
          if (active)
            setError(
              error instanceof Error
                ? error.message
                : "Data belum dapat dimuat.",
            );
        });
    }, 0);
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 15000);
    return () => {
      active = false;
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [refresh]);
  async function mutate(path: string, method: string, body: unknown) {
    try {
      const result = await campRequest<{ data: Registration }>(path, {
        method,
        body: JSON.stringify(body),
      });
      merge(result.data);
      return result.data;
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Perubahan belum tersimpan. Coba lagi.",
      );
      return false as const;
    }
  }
  async function commit(next: CampState) {
    try {
      const result = await campRequest<{
        data: { settings: EventSettings; revision: number };
      }>("/api/admin/camp/event", {
        method: "PUT",
        body: JSON.stringify({
          revision: data.eventRevision || 0,
          settings: next.event,
        }),
      });
      setData((current) => ({
        ...current,
        event: result.data.settings,
        eventRevision: result.data.revision,
      }));
      return true;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pengaturan belum tersimpan.",
      );
      return false;
    }
  }
  async function uploadPhoto(
    reg: Registration,
    participantId: string,
    file: File,
    progress: (value: number) => void,
    signal: AbortSignal,
  ) {
    const initialized = await campRequest<{ data: { id: string } }>(
      `/api/registrations/${reg.id}/photos`,
      {
        method: "POST",
        body: JSON.stringify({ participantId, revision: reg.revision || 0 }),
      },
    );
    const endpoint = `/api/registrations/${reg.id}/photos/${initialized.data.id}`;
    try {
      return await new Promise<{ photoId: string; photo: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const abort = () => {
            xhr.abort();
            reject(
              new Error(
                "Unggahan dibatalkan. Anda dapat melanjutkan tanpa foto.",
              ),
            );
          };
          if (signal.aborted) {
            reject(new Error("Unggahan dibatalkan."));
            return;
          }
          signal.addEventListener("abort", abort, { once: true });
          xhr.open("PUT", endpoint);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.timeout = 120000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              progress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            signal.removeEventListener("abort", abort);
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(result.data);
              else
                reject(
                  new Error(
                    result.error?.message || "Unggahan belum berhasil.",
                  ),
                );
            } catch {
              reject(new Error("Balasan unggahan belum dapat dibaca."));
            }
          };
          xhr.onerror = xhr.ontimeout = () => {
            signal.removeEventListener("abort", abort);
            reject(
              new Error(
                "Unggahan gagal. Periksa koneksi lalu pilih foto kembali.",
              ),
            );
          };
          xhr.send(file);
        },
      );
    } catch (error) {
      await campRequest(endpoint, { method: "DELETE" }).catch(() => {});
      throw error;
    }
  }
  return (
    <CampContext.Provider
      value={{
        data,
        preview: false,
        href: (path) => path,
        notify,
        commit,
        saveRegistration: (reg) =>
          mutate(`/api/registrations/${reg.id}`, "PUT", draftPayload(reg)),
        submitRegistration: (reg) =>
          mutate(`/api/registrations/${reg.id}/submit`, "POST", {
            revision: reg.revision || 0,
            acknowledged: true,
          }),
        decideRegistration: async (reg, status, note) =>
          !!(await mutate(
            `/api/admin/registrations/${reg.id}/decision`,
            "POST",
            { revision: reg.revision || 0, status, note },
          )),
        retryJob: async (id, kind) =>
          !!(await mutate(`/api/admin/registrations/${id}/retry`, "POST", {
            kind,
          })),
        refresh,
        loadRegistration,
        uploadPhoto,
      }}
    >
      <WorkspaceShell user={user}>
        {!ready ? (
          <div className="workspace-loading" role={error ? "alert" : "status"}>
            <TentTree />
            <p>{error || "Memuat data dari server…"}</p>
            {error && (
              <button
                className="text-link mt-4"
                onClick={() => {
                  void refresh()
                    .then(() => {
                      setReady(true);
                      setError("");
                    })
                    .catch((error) => setError(error.message));
                }}
              >
                Coba lagi
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </WorkspaceShell>
      {toast && (
        <div className="toast no-print" role="status">
          <Info size={20} />
          <p>{toast}</p>
          <button aria-label="Tutup pemberitahuan" onClick={() => notify("")}>
            <X size={18} />
          </button>
        </div>
      )}
    </CampContext.Provider>
  );
}

export function useRegistration(id: string) {
  const { data, preview, loadRegistration } = useCamp();
  const [error, setError] = useState("");
  useEffect(() => {
    if (preview) return;
    let active = true;
    const load = () => {
      void loadRegistration(id)
        .then(() => {
          if (active) setError("");
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [preview, id, loadRegistration]);
  return { registration: data.registrations.find((r) => r.id === id), error };
}

function WorkspaceShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const { data, preview, href } = useCamp();
  const admin =
    pathname.startsWith("/admin") || pathname.startsWith("/preview/admin");
  const registration = data.registrations.find(
    (r) => r.id === data.operatorId,
  )!;
  const links = admin
    ? [
        {
          path: "/admin",
          label: "Ringkasan",
          mobileLabel: "Ringkasan",
          icon: LayoutDashboard,
        },
        {
          path: "/admin/pendaftaran",
          label: "Pendaftaran",
          mobileLabel: "Pendaftaran",
          icon: ClipboardList,
        },
        {
          path: "/admin/kegiatan",
          label: "Pengaturan kegiatan",
          mobileLabel: "Pengaturan",
          icon: Settings2,
        },
      ]
    : [
        { path: "/app", label: "Beranda", mobileLabel: "Beranda", icon: House },
        {
          path: "/app/pendaftaran",
          label: "Pendaftaran sekolah",
          mobileLabel: "Pendaftaran",
          icon: ClipboardList,
        },
        {
          path: "/app/pendaftaran/bukti",
          label: "Formulir pendaftaran",
          mobileLabel: "Formulir",
          icon: FileCheck2,
        },
      ];
  const activeLink =
    [...links]
      .reverse()
      .find(
        (link) =>
          pathname === href(link.path) ||
          (link.path !== "/app" &&
            link.path !== "/admin" &&
            pathname.startsWith(href(link.path) + "/")),
      ) || links[0];
  const pendingRegistrations = data.registrations.filter(
    (r) => r.status === "Dikirim",
  ).length;
  return (
    <div className="workspace">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <div className="event-selector">
          <span className="event-selector-icon">
            <TentTree size={19} />
          </span>
          <span>
            <strong>Perkemahan sekolah</strong>
            <small>{admin ? "Ruang panitia" : "Ruang operator"}</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">
          {admin ? "KELOLA KEGIATAN" : "RUANG SEKOLAH"}
        </p>
        <nav aria-label={admin ? "Navigasi panitia" : "Navigasi operator"}>
          {links.map((link) => {
            const active = link.path === activeLink.path;
            return (
              <Link
                key={link.path}
                href={href(link.path)}
                className={`sidebar-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <link.icon size={19} />
                {link.label}
                {link.label === "Pendaftaran" && (
                  <span className="nav-count">{pendingRegistrations}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-help">
          <BookOpen size={22} />
          <h3>Siap melangkah bersama?</h3>
          <p>Kenali alur pendaftaran sebelum menyiapkan regumu.</p>
          <Link href="/#alur">
            Baca panduan <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/" className="sidebar-link">
            <ArrowUpRight size={18} />
            Halaman kegiatan
          </Link>
          <div className="user-profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{admin ? "Panitia kegiatan" : "Operator sekolah"}</small>
            </span>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header no-print">
          <div>
            <span className="mobile-brand">
              <Brand />
            </span>
            <span className="header-breadcrumb">
              {admin ? "Panitia" : "Ruang sekolah"}
              <span>/</span>
              <strong>{activeLink.label}</strong>
            </span>
          </div>
          <div className="header-actions">
            {preview ? (
              <>
                <span className="demo-indicator">Data contoh</span>
                <Link
                  className="role-switch"
                  href={admin ? "/preview" : "/preview/admin"}
                >
                  <ShieldCheck size={15} />
                  <span>{admin ? "Lihat operator" : "Lihat panitia"}</span>
                  <ArrowUpRight size={14} />
                </Link>
              </>
            ) : (
              <SignOutButton />
            )}
          </div>
        </header>
        {preview && (
          <div className="preview-banner no-print">
            <Info size={15} />
            <p>
              <strong>Pratinjau frontend.</strong>{" "}
              {preview ? "Gunakan data contoh. " : ""}Perubahan disimpan di
              browser ini. Pengiriman, PDF resmi, dan email belum terhubung ke
              server.
            </p>
          </div>
        )}
        <main id="main-content" className="workspace-content">
          <MotionPage>{children}</MotionPage>
        </main>
        <footer className="workspace-footer no-print">
          <span>{siteConfig.name}</span>
          <a
            href="/images/participants/credits.txt"
            target="_blank"
            rel="noreferrer"
          >
            Kredit ilustrasi
          </a>
          <span>
            <Check size={13} /> Bersiap untuk cerita yang baru
          </span>
          {!admin && <span>{registration?.school.email || user.email}</span>}
        </footer>
      </div>
      <nav
        className="mobile-bottom-nav no-print"
        aria-label={
          admin ? "Navigasi utama panitia" : "Navigasi utama operator"
        }
      >
        {links.map((link) => (
          <Link
            key={link.path}
            href={href(link.path)}
            className="mobile-nav-link"
            aria-label={link.label}
            aria-current={link.path === activeLink.path ? "page" : undefined}
          >
            <span className="mobile-nav-icon">
              <link.icon size={21} aria-hidden="true" />
              {admin &&
                link.path === "/admin/pendaftaran" &&
                pendingRegistrations > 0 && (
                  <span className="mobile-nav-count" aria-hidden="true">
                    {pendingRegistrations}
                  </span>
                )}
            </span>
            <span>{link.mobileLabel}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
