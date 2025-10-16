import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('user_token');

    // Si no hay token, redirige a la página de login
    if (!token) {
        return <Navigate to="/login" />;
    }

    // Si hay token, muestra el contenido de la ruta protegida
    return children;
};

export default PrivateRoute;