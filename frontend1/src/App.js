import React, { createContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';

export const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Añadido para evitar parpadeos

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getSelf();
        setUser(response.data);
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
    return <div>Cargando...</div>; // O un componente de spinner
  }

  return (
    <Router>
      <UserContext.Provider value={value}>
        <Routes>
          {/* AHORA LA PÁGINA DE INICIO ES EL LOGIN/LANDING */}
          <Route path="/" element={<LoginPage />} /> 
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
