import express from 'express';
import { generateSceneWithGemini } from '../services/geminiService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = await generateSceneWithGemini(prompt);
    res.json(result);
  } catch (error) {
    console.error('Error during generation:', error);
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.error?.message || 'Failed to generate scene';
    res.status(status).json({ error: message });
  }
});

export default router;
