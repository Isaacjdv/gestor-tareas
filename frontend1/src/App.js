import React, { createContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';

// 1. Crear el Contexto
export const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Al cargar la app, intenta obtener los datos del usuario si hay un token
    const fetchUser = async () => {
      try {
        const response = await authService.getSelf();
        setUser(response.data);
      } catch (error) {
        console.log("No hay usuario logueado.");
        authService.logout(); // Limpia un token inválido
      }
    };
    if (localStorage.getItem('user_token')) {
      fetchUser();
    }
  }, []);

  // Usamos useMemo para evitar que el contexto se recalcule innecesariamente
  const value = useMemo(() => ({ user, setUser }), [user]);

  return (
    <Router>
      {/* 2. Proveer el contexto a toda la aplicación */}
      <UserContext.Provider value={value}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } 
          /> 
        </Routes>
      </UserContext.Provider>
    </Router>
  );
}

export default App;