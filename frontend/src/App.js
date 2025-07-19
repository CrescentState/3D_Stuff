import React, { useState } from 'react';
import './App.css'; // Assuming you have some basic styles in App.css


function App() {
  const [prompt, setPrompt] = useState('');
  const [sceneCode, setSceneCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSceneCode('');

    // TODO: replace this with actual API call to backend
    setTimeout(() => {
      const fakeResponse = `
  <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body style="margin:0">
      <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        camera.position.z = 5;

        function animate() {
          requestAnimationFrame(animate);
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          renderer.render(scene, camera);
        }
        animate();
      </script>
    </body>
  </html>
`;

      setSceneCode(fakeResponse);
      setIsLoading(false);
    }, 2000);
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
