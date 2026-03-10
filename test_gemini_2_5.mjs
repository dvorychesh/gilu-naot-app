import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey });

async function test(modelName) {
  try {
    console.log(`\n📡 Testing ${modelName}...`);
    const stream = await client.models.generateContentStream({
      model: modelName,
      config: { maxOutputTokens: 50 },
      contents: [{
        role: 'user',
        parts: [{ text: 'Say "Hello world"' }]
      }]
    });

    let text = '';
    for await (const chunk of stream) {
      if (chunk.text) text += chunk.text;
    }
    console.log(`✅ Works!\nResponse: ${text.substring(0, 100)}`);
    return true;
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.log(`❌ Error: ${msg.substring(0, 200)}`);
    return false;
  }
}

async function main() {
  await test('gemini-2.5-flash');
  await test('gemini-2.0-flash');
}

main();
