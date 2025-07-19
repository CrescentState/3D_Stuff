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
      const response = await axios.post('http://localhost:5000/api/generate', {
        prompt: prompt.trim()
      });

      const htmlTemplate = `
        <html>
          <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js"></script>
          </head>
          <body style="margin:0">
            <script>
              ${response.data.code}
            </script>
          </body>
        </html>
      `;

      setSceneCode(htmlTemplate);
    } catch (error) {
      console.error('Error generating scene:', error);
      alert('Failed to generate scene. Please try again.');
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
