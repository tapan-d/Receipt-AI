const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error: ${err}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const embeddings = await embedTexts([text]);
  return embeddings[0];
}

export function buildItemEmbedText(
  storeName: string,
  date: string,
  itemName: string,
  category: string,
  unitPrice: number
): string {
  return `store: ${storeName} | date: ${date} | item: ${itemName} | category: ${category} | price: $${unitPrice.toFixed(2)}`;
}
