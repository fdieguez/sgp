import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState("Cargando...")

  useEffect(() => {
    fetch('/api/welcome')
      .then(response => {
        if (response.ok) return response.text();
        throw new Error("Network response was not ok.");
      })
      .then(data => setMessage(data))
      .catch(error => setMessage("Error conectando al Backend: " + error.message));
  }, [])

  return (
    <>
      <div className="card">
        <h1>Sistema de Gestión de Proyectos (SGP)</h1>
        <p>Estado del Backend:</p>
        <h2 style={{ color: '#646cff' }}>{message}</h2>
      </div>
    </>
  )
}

export default App
