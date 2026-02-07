import React, { useState } from "react";
import { BASE } from "../../services/api";
import "./authForm.css";

function LoginForm({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email || !password) {
      setMessage("Podaj email i hasło");
      return;
    }
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      // delegate session persistence to App via onLogin
      onLogin({ id: data.user.id, token: data.token });
    } else {
      setMessage(data.error || "Błąd logowania");
    }
  };

  return (
    <div className="auth-container shadow-xl rounded-xl bg-[#f7f8fa] border border-[#e5e7eb] p-8 max-w-md mx-auto mt-16">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-white rounded-full flex items-center justify-center w-20 h-20 mb-2 border border-[#e5e7eb]">
          <img src="/MagazynLogo.png" alt="Magazyn app" className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold tracking-wide mb-1" style={{fontFamily: 'inherit'}}>Magazyn app</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e]"
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e]"
        />
        <button className="submit bg-[#2a3b6e] text-white font-bold rounded-lg py-2 mt-2 shadow hover:bg-[#1d294f] transition" type="submit">Zaloguj</button>
      </form>
      {message && <p className="error-text mt-2">{message}</p>}
      <button className="switch-button mt-4" onClick={onSwitchToRegister}>
        Nie masz konta? <span className="underline">Zarejestruj się</span>
      </button>
    </div>
  );
}

export default LoginForm;