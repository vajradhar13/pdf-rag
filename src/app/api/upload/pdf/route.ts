import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { embeddings } from "@/lib/config/embeddings";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { extractText } from "unpdf";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX || "rag-pdf-i";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name;

    // Validate file type
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Please upload a PDF file" },
        { status: 400 },
      );
    }

    // 1. Read PDF file using unpdf
    const pdfBuffer = await file.arrayBuffer();
    const { text: pdfText, totalPages } = await extractText(
      new Uint8Array(pdfBuffer),
    );

    if (!pdfText || pdfText.length === 0) {
      return NextResponse.json(
        { error: "PDF appears to be empty or text could not be extracted" },
        { status: 400 },
      );
    }

    // 2. Split PDF text into chunks
    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitText(
      Array.isArray(pdfText) ? pdfText.join(" ") : pdfText,
    );

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text chunks could be created from PDF" },
        { status: 400 },
      );
    }

    // 3. Create document objects
    const documents = chunks.map((chunk: string, i: number) => ({
      id: `pdf-chunk-${Date.now()}-${i}`,
      text: chunk,
    }));

    // 4. Generate embeddings
    const texts = documents.map((d: { text: string }) => d.text);
    let embeddingsArray: number[][];

    try {
      embeddingsArray = await embeddings.generateMultipleEmbeddings(texts);
    } catch (error) {
      console.error("Embedding generation failed:", error);
      if (
        error instanceof Error &&
        error.message.includes("401 Unauthorized")
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid API key. Please check your COHERE_API_KEY in the .env file.",
          },
          { status: 500 },
        );
      }
      if (
        error instanceof Error &&
        error.message.includes("429 Too Many Requests")
      ) {
        return NextResponse.json(
          {
            error:
              "Rate limit exceeded. Please wait a few minutes before trying again or upgrade your Cohere API plan.",
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error:
            "Failed to generate embeddings. Please check your API configuration.",
        },
        { status: 500 },
      );
    }

    // Validate embeddings were generated successfully
    if (
      !embeddingsArray ||
      embeddingsArray.length === 0 ||
      embeddingsArray.some((emb) => emb.length === 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Failed to generate valid embeddings. Please check your API configuration.",
        },
        { status: 500 },
      );
    }

    // 5. Prepare Pinecone vectors
    const vectors = documents.map(
      (doc: { id: string; text: string }, i: number) => ({
        id: doc.id,
        values: embeddingsArray[i],
        metadata: {
          text: doc.text,
          source: filename,
          type: "pdf",
          pageCount: totalPages,
        },
      }),
    );

    // 6. Upsert to Pinecone
    const pineconeIndex = pinecone.Index(indexName);
    await pineconeIndex.upsert({
      records: vectors,
    });

    console.log("PDF processed and stored in Pinecone!");

    return NextResponse.json({
      message: "PDF uploaded and processed successfully",
      filename: filename,
      chunksProcessed: documents.length,
      pageCount: totalPages,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ error: "PDF upload failed" }, { status: 500 });
  }
}
