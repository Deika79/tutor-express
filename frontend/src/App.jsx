import { useRef, useState, useEffect } from "react";
import "./App.css";

function App() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [resultadoTexto, setResultadoTexto] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("");

  // ⏱️ contador
  useEffect(() => {
    let interval;

    if (recording) {
      interval = setInterval(() => {
        setTiempo((t) => t + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [recording]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setEstado("Audio grabado ✅");
    };

    mediaRecorder.start();
    setRecording(true);
    setTiempo(0);
    setEstado("🔴 Grabando...");
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
    setEstado("⏹️ Grabación detenida");
  };

  const enviarAudio = async () => {
    if (!audioBlob) return alert("No hay audio");

    setLoading(true);
    setEstado("⏳ Procesando tutoría...");

    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    const res = await fetch("https://tutor-express-backend.onrender.com", {
      method: "POST",
      body: formData
    });

    const blob = await res.blob();

    // convertir blob a texto para email
    const text = await blob.text();
    setResultadoTexto(text);

    // descargar
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tutoria.txt";
    a.click();

    setLoading(false);
    setEstado("✅ Tutoría generada");
  };

  const enviarEmail = async () => {
    if (!email || !resultadoTexto) {
      return alert("Falta email o tutoría");
    }

    setEstado("📩 Enviando email...");

    await fetch("https://tutor-express-backend.onrender.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contenido: resultadoTexto
      })
    });

    setEstado("✅ Email enviado");
  };

  return (
    <div className="container">
      
      <img src="/banner.png" alt="Banner" className="banner" />

      <div className="controls">
        <button className="btn record" onClick={startRecording} disabled={recording}>
          🔴 Grabar
        </button>

        <button className="btn stop" onClick={stopRecording} disabled={!recording}>
          ⏹️ Detener
        </button>
      </div>

      {/* ⏱️ CONTADOR */}
      {recording && <p>⏱️ {tiempo}s grabando...</p>}

      <button className="btn process" onClick={enviarAudio}>
        🧠 Procesar tutoría
      </button>

      {/* 📩 EMAIL */}
      <input
        type="email"
        placeholder="Introduce email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />

      <button className="btn email" onClick={enviarEmail}>
        📩 Enviar por email
      </button>

      {/* 📢 ESTADO */}
      <p className="estado">{estado}</p>

      {loading && <p className="loading">⏳ Procesando...</p>}
    </div>
  );
}

export default App;