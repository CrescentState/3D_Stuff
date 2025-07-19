// src/App.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [prompt, setPrompt] = useState('');
  const [sceneCode, setSceneCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSceneCode('');

    try {
      const res = await axios.post('http://localhost:5000/api/generate', { prompt });
      setSceneCode(res.data.code); // expecting backend to return { code: '...' }
    } catch (err) {
      console.error(err);
      setError('Failed to generate scene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>🎬 DreamSceneAI</h1>
      <textarea
        rows="4"
        cols="60"
        placeholder="Enter a scene prompt (e.g. 'a desert at sunset')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ fontSize: '16px', padding: '10px' }}
      />
      <br />
      <button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
        {loading ? 'Generating...' : 'Generate Scene'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {sceneCode && (
        <>
          <h2>Rendered Scene</h2>
          <iframe
            title="3D Scene"
            sandbox="allow-scripts"
            style={{ width: '100%', height: '500px', border: '1px solid black' }}
            srcDoc={`<html><body><script type="module">${sceneCode}</script></body></html>`}
          />
        </>
      )}
    </div>
  );
}

export default App;
