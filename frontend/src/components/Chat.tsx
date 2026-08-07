import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '¡Hola! Soy tu asistente financiero. ¿Qué quieres saber sobre tus gastos o inversiones?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing VITE_GEMINI_API_KEY in .env");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      
      const prompt = `Eres un asistente financiero amable y experto. El usuario pregunta: "${userMessage}". Responde de manera concisa y clara.`;
      
      const result = await model.generateContent(prompt);
      
      // Safety block check
      if (result.response.promptFeedback?.blockReason) {
        throw new Error(`Mensaje bloqueado por seguridad: ${result.response.promptFeedback.blockReason}`);
      }

      const responseText = result.response.text();
      
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      let errorMessage = 'Ups, ocurrió un error desconocido.';
      if (error.message.includes('API key')) {
        errorMessage = 'Clave API incorrecta o no configurada. Revisa VITE_GEMINI_API_KEY en tu .env';
      } else if (error.status === 403) {
        errorMessage = 'Error 403: Permisos denegados. Si restringiste la API key por HTTP referrers, permite localhost.';
      } else {
        errorMessage = `Error al consultar Gemini: ${error.message}`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble ai" style={{ opacity: 0.6 }}>
            Escribiendo...
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Pregunta algo..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button 
            className="chat-send"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}

export default Chat;
