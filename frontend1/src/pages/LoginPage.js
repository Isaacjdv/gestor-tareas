import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { UserContext } from '../App'; // Importa el contexto de usuario
import '../styles/AuthForm.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { setUser } = useContext(UserContext); // Obtiene la función para guardar el usuario

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // 1. Inicia sesión
            await authService.login(email, password);
            
            // 2. Obtiene los datos del usuario logueado
            const userResponse = await authService.getSelf();
            
            // 3. Guarda los datos del usuario en el contexto global
            setUser(userResponse.data);
            
            // 4. Navega al dashboard
            navigate('/dashboard');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error al iniciar sesión.');
        }
    };

    return (
        <div 
            className="login-page-container" 
            style={{ 
                backgroundImage: `url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXp2OHZmNDJta2FjNDhnZWZoZzhqcXJjY3UzZ3dtOGs2bTc0bjlhbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/C4kCmHt3iCENE0qk8W/giphy.gif')` 
            }}
        >
            {/* --- Panel Izquierdo --- */}
            <div className="login-panel left-panel">
                <div className="left-panel-content">
                    <h1>Bienvenido a tu Gestor</h1>
                    <p>Organiza tus tareas, gestiona tus archivos y mantén todo bajo control de forma sencilla e inteligente.</p>
                </div>
            </div>

            {/* --- Panel Derecho --- */}
            <div className="login-panel right-panel">
                <form onSubmit={handleLogin} className="auth-form">
                    <h2>Login</h2>
                    
                    <div className="input-container">
                        <i className="fas fa-user"></i>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Correo" 
                            required
                        />
                    </div>
                    
                    <div className="input-container">
                        <i className="fas fa-lock"></i>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Contraseña" 
                            required
                        />
                    </div>
                    
                    <div className="form-options">
                        <label>
                            <input type="checkbox" /> Remember
                        </label>
                        <a href="/forgot-password">Forgot password?</a>
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