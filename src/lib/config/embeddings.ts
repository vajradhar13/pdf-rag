export class EmbeddingService {
  private readonly cohereApiKey: string;

  constructor() {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error("COHERE_API_KEY is not set in environment");
    }
    this.cohereApiKey = apiKey;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const trimmedText =
      text.length > 2000 ? text.substring(0, 2000) + "..." : text;

    try {
      const resp = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.cohereApiKey}`,
          "Content-Type": "application/json",
          "Cohere-Version": "2022-12-06",
        },
        body: JSON.stringify({
          texts: [trimmedText],
          model: "embed-english-light-v3.0",
          input_type: "search_document",
          embedding_types: ["float"],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(
          `Cohere API error: ${resp.status} ${resp.statusText} - ${errText}`,
        );
      }

      const data = await resp.json();

      if (
        !data.embeddings ||
        !data.embeddings.float ||
        !data.embeddings.float.length
      ) {
        throw new Error("Invalid embedding structure from Cohere API");
      }

      const embedding = data.embeddings.float[0];

      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(
          `Invalid embedding dimensions: expected 384, got ${embedding.length}`,
        );
      }

      return embedding;
    } catch (error) {
      console.error("Cohere embedding generation failed:", error);
      throw error;
    }
  }

  async generateMultipleEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Increased batch size to 100 as requested
    const batchSize = 10;
    const results: number[][] = [];

    console.log(`Processing ${texts.length} texts in batches of ${batchSize}`);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const trimmedBatch = batch.map((text) =>
        text.length > 2000 ? text.substring(0, 2000) + "..." : text,
      );

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`,
      );

      try {
        const resp = await fetch("https://api.cohere.ai/v1/embed", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.cohereApiKey}`,
            "Content-Type": "application/json",
            "Cohere-Version": "2022-12-06",
          },
          body: JSON.stringify({
            texts: trimmedBatch,
            model: "embed-english-light-v3.0",
            input_type: "search_document",
            embedding_types: ["float"],
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(
            `Cohere API error: ${resp.status} ${resp.statusText} - ${errText}`,
          );
        }

        const data = await resp.json();

        if (data.embeddings?.float) {
          results.push(...data.embeddings.float);
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          console.log(
            "Waiting 2 seconds before next batch to respect rate limits...",
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(
          `Error processing batch ${Math.floor(i / batchSize) + 1}:`,
          error,
        );
        // Don't push empty arrays as they cause dimension mismatches
        // Instead, throw the error to stop processing
        throw error;
      }
    }

    return results;
  }
}

// Export a singleton instance
export const embeddings = new EmbeddingService();
