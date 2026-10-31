import "server-only";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  companionPhotos,
  patrolCompanions,
  patrols,
  registrations,
} from "@/db/schema";
import { assertEditable, lockRegistration } from "./camp.service";
import { readPrivateFile, writePrivateFile } from "@/lib/private-storage";
import { ServiceError } from "@/lib/service-error";
const notFound = () =>
  new ServiceError(404, "NOT_FOUND", "Foto tidak ditemukan.");

export async function beginCompanionPhotoUpload(
  userId: string,
  registrationId: string,
  companionId: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    const reg = await lockRegistration(tx, registrationId, userId);
    assertEditable(reg, revision);
    const [member] = await tx
      .select({ id: patrolCompanions.id })
      .from(patrolCompanions)
      .innerJoin(patrols, eq(patrols.id, patrolCompanions.patrolId))
      .where(
        and(
          eq(patrolCompanions.id, companionId),
          eq(patrols.registrationId, registrationId),
        ),
      );
    if (!member) throw notFound();
    await tx
      .update(companionPhotos)
      .set({ status: "Cancelled" })
      .where(
        and(
          eq(companionPhotos.registrationId, registrationId),
          eq(companionPhotos.companionId, companionId),
          eq(companionPhotos.status, "Pending"),
        ),
      );
    const [photo] = await tx
      .insert(companionPhotos)
      .values({
        registrationId,
        companionId,
        expiresAt: new Date(Date.now() + 20 * 60_000),
      })
      .returning({ id: companionPhotos.id });
    return photo;
  });
}
export async function completeCompanionPhotoUpload(
  userId: string,
  registrationId: string,
  photoId: string,
  bytes: Buffer,
) {
  const [owned] = await db
    .select({ photo: companionPhotos })
    .from(companionPhotos)
    .innerJoin(
      registrations,
      eq(registrations.id, companionPhotos.registrationId),
    )
    .where(
      and(
        eq(companionPhotos.id, photoId),
        eq(companionPhotos.registrationId, registrationId),
        eq(registrations.ownerId, userId),
      ),
    );
  if (!owned) throw notFound();
  if (owned.photo.status !== "Pending" || owned.photo.expiresAt <= new Date())
    throw new ServiceError(
      409,
      "UPLOAD_EXPIRED",
      "Unggahan berakhir atau dibatalkan. Pilih foto kembali.",
    );
  try {
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
      throw new ServiceError(
        413,
        "PHOTO_TOO_LARGE",
        "Ukuran foto maksimal 5 MB.",
      );
    const image = sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "error",
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages || 1) > 1
    )
      throw new ServiceError(
        415,
        "INVALID_IMAGE",
        "Gunakan foto JPG, PNG, atau WebP yang tidak bergerak.",
      );
    const output = await image
      .autoOrient()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    const key = await writePrivateFile(output.data, "webp");
    await db.transaction(async (tx) => {
      const reg = await lockRegistration(tx, registrationId, userId);
      assertEditable(reg, reg.revision);
      const [current] = await tx
        .select()
        .from(companionPhotos)
        .where(
          and(
            eq(companionPhotos.id, photoId),
            eq(companionPhotos.registrationId, registrationId),
          ),
        )
        .for("update");
      const [member] = await tx
        .select({ id: patrolCompanions.id })
        .from(patrolCompanions)
        .innerJoin(patrols, eq(patrols.id, patrolCompanions.patrolId))
        .where(
          and(
            eq(patrolCompanions.id, current.companionId),
            eq(patrols.registrationId, registrationId),
          ),
        );
      if (
        !member ||
        current.status !== "Pending" ||
        current.expiresAt <= new Date()
      )
        throw new ServiceError(
          409,
          "UPLOAD_CANCELLED",
          "Unggahan tidak lagi aktif. Pilih foto kembali jika masih diperlukan.",
        );
      await tx
        .update(companionPhotos)
        .set({
          status: "Ready",
          fileKey: key,
          width: output.info.width,
          height: output.info.height,
          bytes: output.data.length,
        })
        .where(eq(companionPhotos.id, photoId));
    });
    return {
      photoId,
      photo: `/api/registrations/${registrationId}/companion-photos/${photoId}`,
    };
  } catch (error) {
    await db
      .update(companionPhotos)
      .set({ status: "Failed" })
      .where(
        and(
          eq(companionPhotos.id, photoId),
          eq(companionPhotos.registrationId, registrationId),
          eq(companionPhotos.status, "Pending"),
        ),
      );
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      422,
      "UNREADABLE_PHOTO",
      "Foto tidak dapat diproses. Pilih gambar lain atau lanjutkan tanpa foto.",
    );
  }
}
export async function cancelCompanionPhotoUpload(
  userId: string,
  registrationId: string,
  photoId: string,
) {
  await db.transaction(async (tx) => {
    const reg = await lockRegistration(tx, registrationId, userId);
    assertEditable(reg, reg.revision);
    const [photo] = await tx
      .select()
      .from(companionPhotos)
      .where(
        and(
          eq(companionPhotos.id, photoId),
          eq(companionPhotos.registrationId, registrationId),
        ),
      )
      .for("update");
    if (!photo) throw notFound();
    if (photo.status === "Pending")
      await tx
        .update(companionPhotos)
        .set({ status: "Cancelled" })
        .where(eq(companionPhotos.id, photoId));
  });
}
async function readPhoto(
  registrationId: string,
  photoId: string,
  ownerId?: string,
) {
  const [row] = await db
    .select({ fileKey: companionPhotos.fileKey })
    .from(companionPhotos)
    .innerJoin(
      registrations,
      eq(registrations.id, companionPhotos.registrationId),
    )
    .where(
      and(
        eq(companionPhotos.id, photoId),
        eq(companionPhotos.registrationId, registrationId),
        eq(companionPhotos.status, "Ready"),
        ownerId ? eq(registrations.ownerId, ownerId) : undefined,
      ),
    );
  if (!row?.fileKey) throw notFound();
  try {
    return await readPrivateFile(row.fileKey);
  } catch {
    throw new ServiceError(
      503,
      "PHOTO_UNAVAILABLE",
      "Foto sementara tidak dapat dibaca. Coba lagi atau hubungi panitia.",
    );
  }
}
export function getCompanionPhoto(
  userId: string,
  registrationId: string,
  photoId: string,
) {
  return readPhoto(registrationId, photoId, userId);
}
export function getCompanionPhotoAny(registrationId: string, photoId: string) {
  return readPhoto(registrationId, photoId);
}
