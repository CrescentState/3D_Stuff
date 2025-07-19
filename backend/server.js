require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  try {
    // STEP 1: Expand the user prompt into a detailed 3D scene description
    const expandedPrompt = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a creative scene designer for 3D graphics using Three.js.' },
        { role: 'user', content: `User prompt: "${prompt}".\nExpand it into a highly detailed scene description with camera angle, lighting, environment, colors, and objects.` },
      ],
      temperature: 0.9,
    });

    const detailedScene = expandedPrompt.choices[0].message.content;

    // STEP 2: Generate the actual Three.js code from the detailed description
    const codeGen = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a senior Three.js developer. Write only working JavaScript (ES6 module style) that renders a 3D scene using Three.js. Do not include any explanation.' },
        { role: 'user', content: `Here is the scene description:\n${detailedScene}\n\nWrite a complete Three.js scene.` },
      ],
      temperature: 0.7,
    });

    const code = codeGen.choices[0].message.content;

    res.json({ code, detailedScene });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate scene.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
