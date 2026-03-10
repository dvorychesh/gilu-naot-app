import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key present:', !!apiKey);

const client = new GoogleGenAI({ apiKey });

async function test() {
  try {
    console.log('Calling Gemini API...');
    const stream = await client.models.generateContentStream({
      model: 'gemini-2.0-flash',
      config: { maxOutputTokens: 100 },
      contents: [{
        role: 'user',
        parts: [{ text: 'Say hello' }]
      }]
    });

    console.log('Stream created');
    let count = 0;
    for await (const chunk of stream) {
      if (chunk.text) {
        console.log('Chunk:', chunk.text.substring(0, 30));
        count++;
      }
    }
    console.log(`✅ Done: ${count} chunks`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
