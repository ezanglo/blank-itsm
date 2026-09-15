import { buildRequestContext } from "@/lib/auth/context";
import { AttachmentRepository } from "@/lib/repositories/attachmentRepository";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await buildRequestContext();
    const { id } = await params;
    const file = await AttachmentRepository.getForDownload(ctx, id);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.meta.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.meta.fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
