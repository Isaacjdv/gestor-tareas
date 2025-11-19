import React, { createContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';
import AboutPage from './pages/AboutPage';

export const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Evita parpadeos

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getSelf();
        setUser(response.data);   // 👈 aquí ya viene foto_perfil_url, whatsapp_number, etc.
      } catch (error) {
        authService.logout(); // Limpia token inválido
      }
      setIsLoading(false);
    };

    if (localStorage.getItem('user_token')) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({ user, setUser }), [user]);

  if (isLoading) {
    return <div>Cargando...</div>; // Puedes reemplazar por un Spinner
  }

  return (
    <Router>
      <UserContext.Provider value={value}>
        <Routes>
          {/* Página de inicio: Login */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
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
