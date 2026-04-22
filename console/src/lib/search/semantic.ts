"use server";

import { auth } from "@clerk/nextjs/server";

import { bffJson } from "@/lib/bff/client";
import { semanticSearchResponseSchema } from "@/lib/queries/schemas";

/**
 * Server-side semantic search (Clerk session → BFF). Empty query returns an empty payload without calling the API.
 */
export async function runSemanticSearch(query: string) {
  const q = query.trim();
  if (!q) {
    return semanticSearchResponseSchema.parse({ results: [], semantic_available: undefined });
  }

  const { getToken } = await auth();
  return bffJson({
    path: "/v1/search/semantic",
    method: "POST",
    body: { query: q },
    getToken,
    schema: semanticSearchResponseSchema,
  });
}
