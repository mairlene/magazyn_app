import React, { useState } from "react";
import { BASE } from "../../services/api";
import "./authForm.css";

function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isStrongPassword = (pwd) =>
    pwd.length >= 8 && /[A-Z]/i.test(pwd) && /\d/.test(pwd);

  // ✅ Funkcja oceny siły hasła
  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return "";
    if (pwd.length < 6) return "Słabe";
    if (pwd.length < 8) return "Średnie";
    if (isStrongPassword(pwd)) return "Mocne";
    return "Średnie";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) newErrors.name = "Podaj nazwę użytkownika.";
    if (!validateEmail(email)) newErrors.email = "Wpisz poprawny adres e-mail.";
    if (!isStrongPassword(password))
      newErrors.password =
        "Podaj silniejsze hasło.";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Hasła muszą być identyczne.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    const data = await res.json();

    if (data.success && data.user && data.user.id) {
      // delegate session persistence to App via onRegister
      onRegister({ id: data.user.id, token: data.token });
    } else {
      setErrors({ form: data.error || data.message || "Błąd rejestracji." });
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
          type="text"
          placeholder="Nazwa użytkownika"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] ${errors.name ? "error" : ""}`}
          autoComplete="off"
        />
        {errors.name && <small className="error-text">{errors.name}</small>}

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] ${errors.email ? "error" : ""}`}
          autoComplete="off"
        />
        {errors.email && <small className="error-text">{errors.email}</small>}

        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] ${errors.password ? "error" : ""}`}
          autoComplete="new-password"
        />
        {errors.password && <small className="error-text">{errors.password}</small>}
        {password && (
          <div className={`password-strength ${getPasswordStrength(password)}`}>
            Siła hasła: {getPasswordStrength(password)}
          </div>
        )}

        <input
          type="password"
          placeholder="Powtórz hasło"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`border border-[#e5e7eb] bg-[#f5f6fa] text-[#2a3b6e] rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] ${errors.confirmPassword ? "error" : ""}`}
        />
        {errors.confirmPassword && (
          <small className="error-text">{errors.confirmPassword}</small>
        )}

      {errors.form && <p className="error-text">{errors.form}</p>}

      <button className="submit bg-[#2a3b6e] text-white font-bold rounded-lg py-2 mt-2 shadow hover:bg-[#1d294f] transition" type="submit">Zarejestruj się</button>
    </form>

    <button className="switch-button mt-4 bg-[#e5e7eb] focus:bg-[#2a3b6e]" onClick={onSwitchToLogin}>
      Masz już konto? <span className="underline">Zaloguj się</span>
    </button>
  </div>
  );
}

export default RegisterForm;