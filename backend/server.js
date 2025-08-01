// Make sure to install the necessary packages:
// npm install express cors @google/generative-ai dotenv

require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Import the Google Generative AI library
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();

// --- SETUP ---

// Make sure you have a .env file in your project root with your API key:
// GEMINI_API_KEY="YOUR_API_KEY_HERE"
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the .env file.");
}

// Initialize the Google Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Define safety settings to be less restrictive for code generation.
// This helps prevent the model from blocking valid prompts.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- MIDDLEWARE ---

// Allow requests from any origin. For a hackathon, this is simpler than specifying ports.
app.use(cors());
app.use(express.json());

// --- HELPER FUNCTION ---

/**
 * Cleans the raw text response from the AI model.
 * Gemini often wraps JSON and code in markdown-style backticks (```),
 * which need to be removed before parsing or executing.
 * @param {string} text The raw text from the AI response.
 * @returns {string} The cleaned text.
 */
const cleanResponse = (text) => {
  return text.replace(/^```(json|javascript)?\n|```$/g, '').trim();
};

// --- API ENDPOINT ---

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'A text prompt is required.' });
  }

  console.log(`Received prompt: "${prompt}"`);

  try {
    // --- STEP 1: Convert user prompt to a structured JSON scene description ---
    console.log('Step 1: Generating scene description JSON...');
    const promptToJSON = `
      You are an expert 3D scene designer. Your task is to take a user's simple idea and expand it into a detailed, structured JSON description for a 3D scene to be built with Three.js.

      **Rules:**
      - The output MUST be only the raw JSON object. Do not include any surrounding text, explanations, or markdown formatting.
      - Be creative and add 3-5 interesting geometric objects that fit the theme.
      - Define object positions so they are visible within a standard camera view (e.g., within a -15 to +15 range on all axes).
      - Use hex colors.
      - For an object's 'type', use valid Three.js geometry class names like 'BoxGeometry', 'SphereGeometry', 'ConeGeometry', 'TorusKnotGeometry', 'PlaneGeometry', 'DodecahedronGeometry'.
      - The 'args' for a geometry should be an array of numbers in the correct order for its constructor (e.g., [radius, height, radialSegments] for a ConeGeometry).
      - Ensure the final output is a perfectly formatted, valid JSON object.

      **User's Idea:**
      "${prompt}"

      **JSON Output:**
    `;

    // Requesting JSON output directly from the model for better reliability.
    const generationConfig = {
      responseMimeType: "application/json",
    };

    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second
    let retryCount = 0;
    let jsonResult;
    
    while (retryCount < MAX_RETRIES) {
      try {
        jsonResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: promptToJSON }] }],
          generationConfig,
          safetySettings,
        });
        break;
      } catch (err) {
        if (err.message.includes('overloaded') || err.message.includes('quota')) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            throw new Error('The model is currently overloaded. Please try again later.');
          }
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.log(`Model overloaded, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    const sceneDescriptionText = jsonResult.response.text();
    const cleanedText = cleanResponse(sceneDescriptionText);
    
    let sceneDescription;
    try {
      // First clean the response thoroughly
      let parseText = cleanedText
        .replace(/^```(json)?\s*/g, '')
        .replace(/```$/g, '')
        .replace(/^```\s*/g, '')
        // Evaluate Math expressions safely
        .replace(/Math\.PI\s*\/\s*(\d+)/g, (match, divisor) => {
          return (Math.PI / parseInt(divisor)).toString();
        })
        .replace(/-?Math\.PI\b/g, (match) => {
          return match.startsWith('-') ? '-3.14159265359' : '3.14159265359';
        })
        // Clean up any invalid characters
        .replace(/[^\x20-\x7E\r\n]/g, '')
        // Handle common JSON formatting issues
        .replace(/(\w+)\s*:\s*([^,"}\]]+)(?=[,}\]])/g, '$1:"$2"')
        .trim();

      try {
        // First attempt parsing as-is
        sceneDescription = JSON.parse(parseText);
      } catch (initialError) {
        // If initial parse fails, try more flexible approach
        parseText = parseText
          .replace(/'/g, '"')
          .replace(/(\w+)\s*:\s*([^,"}\]]+)/g, '$1:"$2"');

        sceneDescription = JSON.parse(parseText, (key, value) => {
          if (typeof value === 'string') {
            // Convert numeric strings to numbers
            if (!isNaN(value)) return parseFloat(value);
            // Clean up string values
            return value.replace(/"/g, '');
          }
          return value;
        });
      }
      
      // Validate the parsed object
      if (!sceneDescription || typeof sceneDescription !== 'object') {
        throw new Error('Empty or invalid JSON response');
      }
      
      console.log('Step 1 complete. Received JSON:', sceneDescription);
    } catch (error) {
      console.error('JSON parse failed:', {
        originalText: cleanedText,
        error: error
      });
      throw new Error('The AI response could not be parsed as valid JSON. Please try a different prompt.');
    }

    // --- STEP 2: Generate Three.js code from the structured JSON ---
    // Store sceneDescription in a local constant for the template string
    const sceneDesc = sceneDescription;
    console.log('Step 2: Generating Three.js code...');
    const promptToCode = `
      You are an expert Three.js developer. Your task is to write a complete, self-contained Three.js script based on a JSON scene description.

      **Rules:**
      - The output must be ONLY the raw JavaScript code. Do not include any surrounding text, explanations, HTML, or markdown formatting.
      - The script must create its own scene, camera, and WebGLRenderer.
      - The renderer's DOM element MUST be appended to 'document.body'.
      - The script MUST include OrbitControls for camera interaction. Import it from a JSDelivr CDN.
      - The script must include an animation loop using 'requestAnimationFrame' to render the scene and update controls.
      - In the animation loop, add a simple, slow rotation to all created objects (except any 'PlaneGeometry') to make the scene dynamic and alive.
      - The script must include a window resize handler to make the scene responsive.
      - Use the specified materials and colors from the JSON. Do not import external models or textures.
      - Ensure the code is complete and runnable in a modern browser that supports ES6 modules.

      **Scene Description JSON:**
      ${JSON.stringify(sceneDescription, null, 2)}

      **Three.js Code (ES6 Module Syntax):**
    `;

    retryCount = 0;
    let codeResult;
    
    while (retryCount < MAX_RETRIES) {
      try {
        codeResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: promptToCode }] }],
          safetySettings,
        });
        break;
      } catch (err) {
        if (err.message.includes('overloaded') || err.message.includes('quota')) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            throw new Error('The model is currently overloaded. Please try again later.');
          }
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.log(`Model overloaded, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    const codeResponseText = codeResult.response.text();
    const finalCode = cleanResponse(codeResponseText);
    console.log('Step 2 complete. Code generated.');

    // --- FINAL RESPONSE ---
    res.json({ code: finalCode, sceneDescription });

  } catch (err) {
    console.error("Error during generation:", err);
    let errorMessage = 'Failed to generate scene.';
    if (err.message.includes('JSON')) {
        errorMessage = 'The AI failed to generate a valid scene description. Please try a different prompt.';
    } else if (err.response && err.response.promptFeedback) {
        errorMessage = `Request was blocked. Reason: ${err.response.promptFeedback.blockReason}`;
        console.error("Prompt feedback:", err.response.promptFeedback);
    }
    res.status(500).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
