import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey });

const models = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

async function test(modelName) {
  try {
    console.log(`\n📡 Testing ${modelName}...`);
    const stream = await client.models.generateContentStream({
      model: modelName,
      config: { maxOutputTokens: 50 },
      contents: [{
        role: 'user',
        parts: [{ text: 'Say "Hello"' }]
      }]
    });

    let count = 0;
    for await (const chunk of stream) {
      if (chunk.text) count++;
    }
    console.log(`✅ ${modelName} works! Got chunks.`);
    return true;
  } catch (err) {
    console.log(`❌ ${modelName}: ${err.message.substring(0, 100)}`);
    return false;
  }
}

async function main() {
  for (const model of models) {
    await test(model);
  }
}

main();
