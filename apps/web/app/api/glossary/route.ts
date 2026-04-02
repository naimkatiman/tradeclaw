import { NextResponse } from "next/server";
import { glossaryTerms, CATEGORIES } from "@/app/lib/glossary-data";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(
    { terms: glossaryTerms, categories: CATEGORIES, count: glossaryTerms.length },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
