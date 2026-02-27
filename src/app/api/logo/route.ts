import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const CONFIG_DIR = process.env.CONFIG_DIR || join(process.cwd(), "config");

const LOGO_FILES: { file: string; contentType: string }[] = [
  { file: "logo.svg", contentType: "image/svg+xml" },
  { file: "logo.png", contentType: "image/png" },
  { file: "logo.jpg", contentType: "image/jpeg" },
  { file: "logo.jpeg", contentType: "image/jpeg" },
  { file: "logo.webp", contentType: "image/webp" },
];

export async function GET() {
  for (const { file, contentType } of LOGO_FILES) {
    const logoPath = join(CONFIG_DIR, file);
    if (existsSync(logoPath) && statSync(logoPath).isFile()) {
      const data = readFileSync(logoPath);
      return new NextResponse(data, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return NextResponse.json({ error: "No logo found" }, { status: 404 });
}
