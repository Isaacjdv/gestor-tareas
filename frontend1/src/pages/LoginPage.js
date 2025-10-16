import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/AuthForm.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await authService.login(email, password);
            navigate('/dashboard');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error al iniciar sesión.');
        }
    };

    return (
        <div className="login-page-container">
            <div 
                className="login-panel left-panel"
                style={{ backgroundImage: `url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXp2OHZmNDJta2FjNDhnZWZoZzhqcXJjY3UzZ3dtOGs2bTc0bjlhbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/C4kCmHt3iCENE0qk8W/giphy.gif')` }}
            >
                {/* --- DIV AÑADIDO PARA EL CONTENIDO --- */}
                <div className="left-panel-content">
                    <h1>Bienvenido a tu Gestor</h1>
                    <p>Organiza tus tareas, gestiona tus archivos y mantén todo bajo control de forma sencilla e inteligente.</p>
                </div>
            </div>

            <div className="login-panel right-panel">
                <form onSubmit={handleLogin} className="auth-form">
                    <h2>Login</h2>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo" required/>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="contraseña" required/>
                    <div className="form-options">
                        <label>
                            <input type="checkbox" /> Remember
                        </label>
                        <a href="#">Forgot password?</a>
                    </div>
                    <button type="submit">LOGIN</button>
                    {message && <p className="message">{message}</p>}
                    <p style={{textAlign: 'center', marginTop: '30px'}}>
                        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;