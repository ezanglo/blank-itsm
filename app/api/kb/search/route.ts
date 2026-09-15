import { NextResponse } from "next/server";
import { buildRequestContext } from "@/lib/auth/context";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";

export async function GET(request: Request) {
  try {
    const ctx = await buildRequestContext();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const articles = await KnowledgeRepository.searchPublished(ctx, q, 8);
    return NextResponse.json({
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
      })),
    });
  } catch {
    return NextResponse.json({ articles: [] }, { status: 401 });
  }
}
