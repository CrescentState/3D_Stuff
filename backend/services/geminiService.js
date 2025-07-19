import 'dotenv/config';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Use from .env

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set. Please check your .env file.');
}

const generateSceneWithGemini = async prompt => {
  const systemPrompt = `
You're a creative 3D scene designer using Three.js.
Generate an HTML document containing a 3D scene based on the user prompt.
The code must be minimal, self-contained, and use Three.js via CDN.
Return only valid HTML/JS. No extra explanations or markdown.

Example prompt: "A sci-fi space station with spinning satellites"
`;

  const userPrompt = `Prompt: ${prompt}\nRespond with complete Three.js code.`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  const code = raw
    .replace(/```(html|js)?/g, '')
    .replace(/```/g, '')
    .trim();

  return { code };
};

export { generateSceneWithGemini };
