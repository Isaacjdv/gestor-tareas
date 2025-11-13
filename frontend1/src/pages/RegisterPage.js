import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const PHONE_PREFIX = '+593';
const MAX_DIGITS = 9; // solo 9 números después del prefijo
const WHATS_LINK = 'https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+dress-burn&type=phone_number&app_absent=0';

const RegisterPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(PHONE_PREFIX);
  const [message, setMessage] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const phoneRef = useRef(null);
  const navigate = useNavigate();

  // Sanitiza y normaliza lo que va después de +593
  const normalizeDigits = (rawDigits) => {
    let d = (rawDigits || '').replace(/\D/g, ''); // solo dígitos
    // Primer dígito NO puede ser 0
    if (d.length > 0 && d[0] === '0') {
      d = d.slice(1);
    }
    if (d.length > MAX_DIGITS) d = d.slice(0, MAX_DIGITS);
    return d;
  };

  // Evita editar/borrar el prefijo con Backspace/Delete o con selección que lo incluya
  const handlePhoneKeyDown = (e) => {
    const input = e.target;
    const { selectionStart, selectionEnd, value } = input;
    const withinPrefix = selectionStart <= PHONE_PREFIX.length;
    const selectionTouchesPrefix = selectionStart < PHONE_PREFIX.length || selectionEnd <= PHONE_PREFIX.length;

    // Bloquear Backspace si el cursor está en/antes del prefijo
    if (e.key === 'Backspace' && withinPrefix) {
      e.preventDefault();
      input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    // Bloquear Delete si la selección afecta el prefijo
    if (e.key === 'Delete' && selectionTouchesPrefix) {
      e.preventDefault();
      input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    // Bloquear mover cursor a antes del prefijo con Home
    if (e.key === 'Home') {
      e.preventDefault();
      input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    // Permitir solo dígitos (además de teclas de control) cuando el cursor está después del prefijo
    const allowedControl = [
      'Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End','Escape','Enter'
    ];
    if (!allowedControl.includes(e.key)) {
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      // Si ya hay 9 dígitos, evitar más
      const digits = value.slice(PHONE_PREFIX.length).replace(/\D/g, '');
      if (digits.length >= MAX_DIGITS) {
        e.preventDefault();
        return;
      }
      // Evitar que el primer dígito sea 0
      if (digits.length === 0 && e.key === '0') {
        e.preventDefault();
        return;
      }
    }
  };

  // Mantiene siempre el prefijo fijo y sanea lo pegado/tecleado
  const handlePhoneChange = (e) => {
    const v = e.target.value || '';
    // Si el usuario intentó editar el prefijo, lo restauramos
    let after = '';
    if (v.startsWith(PHONE_PREFIX)) {
      after = v.slice(PHONE_PREFIX.length);
    } else {
      // Si borró parte del prefijo, tomamos lo que venga después y lo saneamos
      const extracted = v.replace(/^\+?593?/, ''); // quita variantes del prefijo si las hay
      after = extracted;
    }
    const normalized = normalizeDigits(after);
    setWhatsappNumber(PHONE_PREFIX + normalized);
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
    // Quita cualquier cosa que no sea dígito, extrae lo posterior al prefijo si venía
    const cleaned = pasted.replace(/[^\d]/g, '');
    let after = cleaned;
    if (cleaned.startsWith('593')) after = cleaned.slice(3);
    if (cleaned.startsWith('0593')) after = cleaned.slice(4); // por si pegan con 0 inicial
    const normalized = normalizeDigits(after);
    setWhatsappNumber(PHONE_PREFIX + normalized);
    // Mueve el cursor al final
    requestAnimationFrame(() => {
      const el = phoneRef.current;
      if (el) el.setSelectionRange(whatsappNumber.length, whatsappNumber.length);
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Debe ser +593 y exactamente 9 dígitos que NO empiecen con 0
    const validPhone = /^\+593(?!0)\d{9}$/.test(whatsappNumber);
    if (!validPhone) {
      setMessage('El número debe ser +593 y 9 dígitos que NO inicien con 0. Ej: +593987654321');
      return;
    }

    try {
      await authService.register(nombre, email, password, whatsappNumber);
      setMessage('');
      setShowModal(true); // mostrar modal de éxito
      // No navegamos de inmediato; dejamos que el usuario pulse el botón del modal
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Error al registrar.');
    }
  };

  const goToLogin = () => {
    setShowModal(false);
    navigate('/login');
  };

  return (
    <>
      {/* ====== ESTILOS EMBEBIDOS (tema pro + modal) ====== */}
      <style>{`
        :root{
          --bg:#0F1115;
          --panel:#12141B;
          --card:#171A22;
          --muted:#B0B4C0;
          --text:#E7EAF2;
          --brand:#007AFF;
          --brand-2:#5AA9FF;
          --border:rgba(255,255,255,0.08);
          --ring:rgba(0,122,255,0.18);
          --ok:#22C55E;
        }

        html,body{height:100%;background:var(--bg);color:var(--text);overflow-x:hidden;}
        *,*::before,*::after{box-sizing:border-box;}

        /* ======= LAYOUT ======= */
        .reg-shell{
          min-height:100vh;
          display:grid;
          grid-template-columns: 1.1fr 1fr;
          position:relative;
          isolation:isolate;
        }

        /* Fondo “mesh gradient” + patrón sutil */
        .reg-shell::before{
          content:"";
          position:fixed;
          inset:0;
          z-index:-2;
          background:
            radial-gradient(1400px 800px at -10% -20%, rgba(90,169,255,0.14), transparent 60%),
            radial-gradient(900px 600px at 110% 10%, rgba(0,122,255,0.18), transparent 60%),
            radial-gradient(700px 500px at 50% 120%, rgba(140, 92, 255,0.16), transparent 60%),
            linear-gradient(180deg, #0C0F14 0%, #0F1115 100%);
        }
        .reg-shell::after{
          content:"";
          position:fixed;
          inset:0;
          z-index:-1;
          background-image:
            radial-gradient(circle at 25% 15%, rgba(255,255,255,0.04) 0 1px, transparent 1px),
            radial-gradient(circle at 75% 85%, rgba(255,255,255,0.03) 0 1px, transparent 1px);
          background-size: 40px 40px, 56px 56px;
          mask-image: linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent);
          pointer-events:none;
        }

        /* ======= PANEL IZQUIERDO ======= */
        .reg-left{
          position:relative;
          padding: clamp(28px, 4vw, 48px);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        .left-content{ max-width: 620px; }
        .eyebrow{
          display:inline-flex; align-items:center; gap:8px;
          font-weight:700; letter-spacing:.08em; font-size:.78rem;
          text-transform:uppercase; color: var(--brand-2);
          background: rgba(0,122,255,0.12); border:1px solid var(--border);
          padding:8px 12px; border-radius:999px; backdrop-filter: blur(6px);
        }
        .title{
          margin:14px 0 8px; font-size: clamp(2rem, 4vw, 2.6rem);
          line-height:1.12; font-weight:800; letter-spacing:-0.02em;
        }
        .subtitle{ color:var(--muted); font-size: clamp(1rem, 1.6vw, 1.05rem); line-height:1.65; max-width: 56ch; }
        .benefits{ margin-top:24px; display:grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap:14px 16px; }
        .chip{
          display:flex; align-items:center; gap:10px; padding:10px 12px;
          border:1px solid var(--border); border-radius:12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
          backdrop-filter: blur(6px); color:#DDE3F1; font-size:.96rem;
        }
        .dot{ width:8px;height:8px;border-radius:50%;
          background: radial-gradient(circle at 30% 30%, #9ACEFF, #3C91FF);
          box-shadow: 0 0 0 3px rgba(0,122,255,0.18);
        }

        /* ======= PANEL DERECHO (Card) ======= */
        .reg-right{ display:flex; align-items:center; justify-content:center; padding: clamp(24px, 4vw, 48px); }
        .card{
          width:100%; max-width: 440px; border-radius: 18px; padding: 34px;
          background: linear-gradient(180deg, rgba(27,31,41,0.82), rgba(23,26,34,0.78));
          border: 1px solid var(--border);
          box-shadow: 0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
        }
        .card h2{ margin:0 0 6px; font-size: 1.9rem; font-weight: 700; text-align:center; }
        .card .hint{ margin:0 0 18px; color: var(--muted); font-size: .98rem; text-align:center; }

        .field{ margin: 12px 0; }
        .input-wrap{ position:relative; }
        .icon{ position:absolute; left:14px; top:50%; transform:translateY(-50%); opacity:.6; font-size: 1rem; }
        .input{
          width:100%; padding: 14px 14px 14px 44px; border-radius: 12px;
          border:1px solid #2C313C; background:#1C2029; color:var(--text);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          transition: border-color .2s, box-shadow .2s, background-color .2s; font-size: 1rem;
        }
        .input:focus{ outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--ring); background:#171A22; }
        .small{ display:block; color:var(--muted); font-size:.85rem; margin-top:6px; }

        .pwd-wrap{ position:relative; }
        .toggle{ position:absolute; right:10px; top:50%; transform:translateY(-50%); background:transparent; border:0; color:#AEB4C2; cursor:pointer; font-size:.92rem; }
        .toggle:hover{ color:#DDE3F1; }

        .btn{
          width:100%; margin-top: 10px; border:0; border-radius:12px;
          background: linear-gradient(180deg, var(--brand), #0866D9);
          color:white; font-weight:700; letter-spacing:.02em; padding: 14px 16px; cursor:pointer;
          box-shadow: 0 10px 28px rgba(0,122,255,.25);
          transition: transform .15s ease, filter .15s ease, box-shadow .2s ease;
        }
        .btn:hover{ filter: brightness(1.05); box-shadow: 0 12px 32px rgba(0,122,255,.28); }
        .btn:active{ transform: translateY(1px) scale(.99); }

        .msg{ text-align:center; margin-top:12px; color:#FF5C5C; font-weight:600; }
        .alt{ margin-top: 22px; text-align:center; color:var(--muted); }
        .alt a{ color: var(--brand-2); text-decoration:none; }
        .alt a:hover{ text-decoration:underline; }

        /* ======= MODAL ======= */
        .modal-backdrop{
          position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
          display:flex; align-items:center; justify-content:center; z-index: 9999;
          animation: fadeIn .2s ease;
        }
        .modal{
          width: min(92vw, 520px); background: #141922; border: 1px solid var(--border);
          border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,.5);
          padding: 22px; text-align:center;
        }
        .wapp-icon{
          width: 64px; height: 64px; margin: 6px auto 10px; display:grid; place-items:center;
          border-radius: 16px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25);
        }
        .wapp-emoji{ font-size: 34px; }
        .modal h3{ margin: 6px 0 4px; font-size: 1.4rem; font-weight: 800; }
        .modal p{ margin: 0 0 14px; color: var(--muted); }

        .row-btns{
          display:flex; gap:10px; justify-content:center; margin-top: 6px;
          flex-wrap: wrap;
        }
        .btn-wapp, .btn-ok{
          border: 0; border-radius: 12px; padding: 12px 16px; cursor:pointer; font-weight: 800;
        }
        .btn-wapp{
          background: linear-gradient(180deg, #25D366, #1EBE5A); color: #05230F;
          box-shadow: 0 10px 24px rgba(37,211,102,.22);
        }
        .btn-wapp:hover{ filter: brightness(1.04); }
        .btn-ok{
          background: #222833; color: var(--text); border: 1px solid var(--border);
        }
        .btn-ok:hover{ background: #252C39; }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* ======= RESPONSIVE ======= */
        @media (max-width: 1024px){ .benefits{ grid-template-columns: 1fr; } }
        @media (max-width: 900px){
          .reg-shell{ grid-template-columns: 1fr; }
          .reg-left{ order:1; padding-top:48px; padding-bottom:8px; }
          .reg-right{ order:2; padding-top:8px; padding-bottom:48px; }
          .left-content{ text-align:center; }
          .benefits{ justify-content:center; }
        }
        @media (max-width: 480px){
          .card{ padding: 22px; border-radius:16px; }
          .title{ font-size: 1.9rem; }
        }

        a:focus, button:focus, input:focus{ outline: 2px solid var(--brand-2); outline-offset: 2px; }
        @supports (-webkit-touch-callout:none){ input,select,textarea,button{ font-size:16px; } }
      `}</style>

      <div className="reg-shell">
        {/* IZQUIERDA */}
        <section className="reg-left" aria-label="Presentación de la plataforma">
          <div className="left-content">
            <span className="eyebrow">Gestor IA</span>
            <h1 className="title">Crea tu cuenta y organiza tu mundo digital</h1>
            <p className="subtitle">
              Sincroniza documentos y notas, obtén resúmenes con IA y mantén todo
              bajo control desde un solo lugar.
            </p>
            <div className="benefits" role="list">
              <div className="chip" role="listitem"><span className="dot" /> Sincronización con WhatsApp</div>
              <div className="chip" role="listitem"><span className="dot" /> Transcripción de audios</div>
              <div className="chip" role="listitem"><span className="dot" /> Carpetas & subcarpetas seguras</div>
              <div className="chip" role="listitem"><span className="dot" /> Resúmenes e informes con IA</div>
            </div>
          </div>
        </section>

        {/* DERECHA */}
        <section className="reg-right" aria-label="Formulario de registro">
          <form className="card" onSubmit={handleRegister}>
            <h2>Crear cuenta</h2>
            <p className="hint">Completa tus datos para empezar</p>

            <div className="field">
              <label className="input-wrap" htmlFor="nombre">
                <span className="icon">👤</span>
                <input
                  id="nombre"
                  className="input"
                  type="text"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
            </div>

            <div className="field">
              <label className="input-wrap" htmlFor="email">
                <span className="icon">✉️</span>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
            </div>

            <div className="field">
              <label className="input-wrap" htmlFor="phone">
                <span className="icon">📱</span>
                <input
                  ref={phoneRef}
                  id="phone"
                  className="input"
                  type="tel"
                  value={whatsappNumber}
                  onKeyDown={handlePhoneKeyDown}
                  onChange={handlePhoneChange}
                  onPaste={handlePhonePaste}
                  required
                  inputMode="numeric"
                  pattern="^\+593(?!0)\d{9}$"
                  title="Formato: +593 seguido de 9 dígitos (el primero NO puede ser 0). Ej: +593987654321"
                />
              </label>
              <small className="small">
                Ingresa los 9 dígitos de tu celular (sin el 0 inicial). Ej: +593<strong>987654321</strong>
              </small>
            </div>

            <div className="field pwd-wrap">
              <label className="input-wrap" htmlFor="pwd">
                <span className="icon">🔒</span>
                <input
                  id="pwd"
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <button type="submit" className="btn">Registrarse</button>

            {message && <p className="msg">{message}</p>}

            <p className="alt">
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </form>
        </section>
      </div>

      {/* MODAL DE ÉXITO */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="wapp-icon">
              <span className="wapp-emoji">💬</span>
            </div>
            <h3>¡Listo! Tu cuenta fue creada</h3>
            <p>Ahora puedes activar la integración con WhatsApp para empezar a usar Gestor IA.</p>
            <div className="row-btns">
              <a
                className="btn-wapp"
                href={WHATS_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                Activar en WhatsApp
              </a>
              <button className="btn-ok" onClick={goToLogin}>
                Ir a iniciar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegisterPage;
