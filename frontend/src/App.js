import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Assuming you have some basic styles in App.css


function App() {
  const [prompt, setPrompt] = useState('');
  const [sceneCode, setSceneCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a scene description');
      return;
    }

    setIsLoading(true);
    setSceneCode('');

    try {
      const controller = new AbortController();
      const timeoutDuration = 30000; // 30 seconds
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`Request timed out after ${timeoutDuration/1000} seconds`);
      }, timeoutDuration);
      
      let response;
      try {
        response = await axios.post('http://localhost:5000/api/generate', {
          prompt: prompt.trim()
        }, {
          signal: controller.signal,
          timeout: timeoutDuration
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (axios.isCancel(error)) {
          console.error('Request canceled:', error.message);
          throw new Error(`Request timed out after ${timeoutDuration/1000} seconds. The scene may be too complex.`);
        }
        throw error;
      }

      const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>3D Scene Viewer</title>
          <style>
            body {
              margin: 0;
              overflow: hidden;
              background: #1a1a1a;
            }
            canvas {
              display: block;
              width: 100%;
              height: 100%;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: white;
              font-family: Arial, sans-serif;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js"></script>
        </head>
        <body>
          <div id="loading" class="loading">Loading 3D scene...</div>
          <script>
            const loadingEl = document.getElementById('loading');
            try {
              console.log('Executing generated Three.js code...');
              ${response.data.code}
              loadingEl.style.display = 'none';
              console.log('Scene initialized successfully');
            } catch (error) {
              console.error('Scene initialization failed:', error);
              loadingEl.innerHTML =
                '&lt;div style="color: #ff6b6b; max-width: 80%; margin: 0 auto;"&gt;' +
                '&lt;h3&gt;Error loading scene&lt;/h3&gt;' +
                '&lt;p&gt;' + error.message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '&lt;/p&gt;' +
                '&lt;p&gt;Check browser console for details&lt;/p&gt;' +
                '&lt;/div&gt;';
              
              // Log the full generated code for debugging
              console.log('Generated Three.js code:', \`${response.data.code}\`);
            }
          </script>
        </body>
        </html>
      `;

      console.log('Setting scene template...');
      setSceneCode(htmlTemplate);
      console.log('Scene template set successfully');
    } catch (error) {
      console.error('Error generating scene:', {
        error: error,
        response: error.response?.data
      });
      alert(`Failed to generate scene: ${error.message}\nCheck console for details`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
    <div style={{ padding: '2rem' }}>
      <h1>DreamSceneAI</h1>
      <input
        type="text"
        placeholder="Describe your scene..."
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        style={{ width: '300px', padding: '0.5rem' }}
      />
      <button
        onClick={handleGenerate}
        style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
      >
        Generate Scene
      </button>

      {isLoading && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Generating your scene...</p>
        </div>
      )}

      {sceneCode && (
        <iframe
          srcDoc={sceneCode}
          title="Generated Scene"
          sandbox="allow-scripts"
          width="100%"
          height="500px"
          style={{ marginTop: '2rem', border: '1px solid #ccc' }}
        ></iframe>
      )}
    </div>
  );
}

export default App;
