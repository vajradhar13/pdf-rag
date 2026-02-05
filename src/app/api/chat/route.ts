import { Pinecone } from "@pinecone-database/pinecone";
import { embeddings } from "@/lib/config/embeddings";
import { NextRequest, NextResponse } from "next/server";
import { PERSONA_PROMPTS, PersonaType } from "@/lib/prompts";
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const indexName = "pdf-rag-index";
// cleaning the text because still it may encoding artifacts

const cleanText = (text: string): string => {
  return text
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII chars
    .replace(/\n+/g, "\n") // Collapse multiple newlines
    .replace(/(•|#|§|ï)/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const query: string = body.query;
    const persona = body.persona as PersonaType;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    const selectedPersona: PersonaType =
      persona && PERSONA_PROMPTS[persona] ? persona : "default";
    // 1. Generate embedding for query
    const queryEmbedding = await embeddings.generateEmbedding(query);

    console.log("Query embedding dimensions:", queryEmbedding.length);

    console.log("Index Name:", indexName);
    // 2. Query Pinecone
    const pineconeIndex = pinecone.Index(indexName);
    const results = await pineconeIndex.query({
      topK: 3, // Get top 3 most relevant chunks
      vector: queryEmbedding,
      includeMetadata: true,
    });
    //3. Clean the extra spaces and prepare context
    const context =
      results.matches
        ?.map((match) => {
          const text = match.metadata?.text;
          return cleanText(
            typeof text === "string"
              ? text
              : Array.isArray(text)
                ? text.join("\n")
                : text?.toString() || "",
          );
        })
        .filter((text) => text.length > 0) || [];

    console.log("Cleaned Context:", context);
    const SYSTEM_PROMPT = `
    ${PERSONA_PROMPTS[selectedPersona]}
    CONTEXT BLOCKS:
    ${context.map((c, i) => `--- BLOCK ${i + 1} ---\n${c}`).join("\n")}
    QUESTION: ${query}
    `;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT,
                },
              ],
            },
          ],
        }),
      },
    );

    const geminiResponse = await response.json();
    console.log("Gemini Raw Output:", JSON.stringify(geminiResponse, null, 2));

    const answer =
      geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({
      query,
      answer: answer.replace(/```/g, ""),
      context,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error: "Chat request failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
