import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getReportData } from "@/lib/queries/reports";
import { generateExcel } from "@/lib/reports/excel";
import { uploadToDrive, isDriveConfigured } from "@/lib/drive";
import { z } from "zod";

const GenerateSchema = z.object({
  format: z.enum(["excel", "pdf"]),
  from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid from date"),
  to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid to date"),
  title:  z.string().min(1).max(100).optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await getSessionUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (isMember(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { format, from, to } = parsed.data;
    const title = parsed.data.title ?? `GSF Report ${from} to ${to}`;

    if (from > to) {
      return Response.json({ error: "'from' must be before 'to'" }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    const data = await getReportData(db, { from, to });

    const safeName = title.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 60);
    let content: Uint8Array;
    let mimeType: string;
    let filename: string;

    if (format === "excel") {
      content  = generateExcel(data, title);
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `${safeName}.xlsx`;
    } else {
      // Dynamic import so a PDF build failure doesn't break Excel exports
      try {
        const { generatePDF } = await import("@/lib/reports/pdf");
        content = await generatePDF(data, title);
      } catch (pdfErr) {
        console.error("PDF generation failed:", pdfErr);
        return Response.json(
          { error: "PDF generation is not available in this environment. Use Excel instead." },
          { status: 500 }
        );
      }
      mimeType = "application/pdf";
      filename = `${safeName}.pdf`;
    }

    // Upload to Google Drive if configured; otherwise stream directly
    if (isDriveConfigured(env)) {
      try {
        const url = await uploadToDrive(content, filename, mimeType, env);
        return Response.json({ ok: true, url, filename });
      } catch (driveErr) {
        console.error("Drive upload failed, falling back to direct download:", driveErr);
        // Fall through to direct download
      }
    }

    // Direct download fallback
    return new Response(content.buffer as ArrayBuffer, {
      headers: {
        "Content-Type":        mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("POST /api/reports/generate failed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
