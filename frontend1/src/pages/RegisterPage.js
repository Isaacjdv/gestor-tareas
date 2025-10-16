import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/AuthForm.css'; // Importamos el mismo CSS que el login

const RegisterPage = () => {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('+593');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (!value.startsWith('+593')) { return; }
        if (value.length > 13) { return; }
        const digits = value.substring(4);
        if (/^\d*$/.test(digits)) { setWhatsappNumber(value); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (whatsappNumber.length !== 13) {
            setMessage('El número de WhatsApp debe tener 9 dígitos después del +593.');
            return;
        }
        try {
            await authService.register(nombre, email, password, whatsappNumber);
            setMessage('¡Registro exitoso! Redirigiendo...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setMessage(error.response.data.message || 'Error al registrar.');
        }
    };

    return (
        <div className="login-page-container">
            {/* --- Panel Izquierdo con Imagen y Texto (igual que en el Login) --- */}
            <div 
                className="login-panel left-panel"
                style={{ backgroundImage: `url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXp2OHZmNDJta2FjNDhnZWZoZzhqcXJjY3UzZ3dtOGs2bTc0bjlhbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/C4kCmHt3iCENE0qk8W/giphy.gif')` }}
            >
                <div className="left-panel-content">
                    <h1>Crea tu Cuenta</h1>
                    <p>Únete a nuestra plataforma para empezar a organizar tus archivos de manera eficiente y segura.</p>
                </div>
            </div>

            {/* --- Panel Derecho con el Formulario de Registro --- */}
            <div className="login-panel right-panel">
                <form onSubmit={handleRegister} className="auth-form">
                    <h2>Crear Cuenta</h2>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre Completo" required />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                    
                    <input 
                        type="tel" 
                        value={whatsappNumber} 
                        onChange={handlePhoneChange} 
                        required 
                    />
                    <small className="small-text">
                        Ingresa los 9 dígitos de tu celular (sin el 0 inicial).
                    </small>

                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required />
                    <button type="submit">Registrarse</button>

                    {message && <p className="message">{message}</p>}

                    <p style={{textAlign: 'center', marginTop: '30px'}}>
                        ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;