/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import userService from '../services/userService';
import authService from '../services/authService';
import '../styles/Profile.css';

const DEFAULT_AVATAR =
  'https://placehold.co/100x100/E0E0E0/121212?text=User';

// Avatares estilo personajes (usando DiceBear, NO imágenes oficiales)
const AVATAR_OPTIONS = [
  // Dragon Ball
  'https://api.dicebear.com/7.x/adventurer/png?seed=Goku',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Vegeta',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Gohan',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Piccolo',

  // Rick and Morty
  'https://api.dicebear.com/7.x/adventurer/png?seed=Rick',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Morty',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Summer',
  'https://api.dicebear.com/7.x/adventurer/png?seed=MrMeeseeks',

  // Avengers
  'https://api.dicebear.com/7.x/adventurer/png?seed=IronMan',
  'https://api.dicebear.com/7.x/adventurer/png?seed=CaptainAmerica',
  'https://api.dicebear.com/7.x/adventurer/png?seed=BlackWidow',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Hulk',
];

const Perfil = ({ t, user, onGoHome }) => {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
  });

  // solo la parte después de +593
  const [phoneRest, setPhoneRest] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // modal contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // modal avatares
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    setForm({
      nombre: user?.nombre || '',
      email: user?.email || '',
    });

    // procesar whatsapp para dejar solo la parte después de +593
    const whatsapp = user?.whatsapp_number || '';
    let rest = '';
    if (whatsapp.startsWith('+593')) {
      rest = whatsapp.slice(4);
    } else if (whatsapp.startsWith('+')) {
      rest = whatsapp.slice(1);
    } else {
      rest = whatsapp;
    }
    rest = (rest || '').replace(/\D/g, '');
    setPhoneRest(rest);

    setAvatarUrl(user?.foto_perfil_url || DEFAULT_AVATAR);
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Teléfono: prefijo fijo +593, solo números, y el primer dígito NO puede ser 0
  const handlePhoneRestChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // solo dígitos

    // si es el primer dígito y es 0, no lo aceptamos
    if (value.length === 1 && value[0] === '0') {
      value = '';
    }

    setPhoneRest(value);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        whatsapp_number: phoneRest ? `+593${phoneRest}` : null,
        foto_perfil_url: avatarUrl,
      };

      await userService.updateProfile(user.id, payload);

      setMessage({ type: 'success', text: t('profileUpdated') });
      // recargar para refrescar UserContext
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: t('errorProfileUpdate'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setChangingPass(true);
    setMessage(null);

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      setMessage({ type: 'success', text: t('passwordUpdated') });
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || t('errorPasswordUpdate');
      setMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="apartado-view">
      {/* migas */}
      <nav className="breadcrumbs apartado-breadcrumbs">
        <span className="crumb" onClick={onGoHome}>
          <i className="fas fa-home"></i> {t('root')}
        </span>
        <span className="separator">&gt;</span>
        <span className="crumb">{t('profile')}</span>
      </nav>

      <div className="apartado-content profile-view">
        {message && (
          <div className={`profile-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Cabecera con avatar */}
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <img
              src={avatarUrl}
              alt={form.nombre || 'User'}
              className="profile-avatar"
            />
            <button
              type="button"
              className="btn btn-secondary btn-change-avatar"
              onClick={() => setIsAvatarModalOpen(true)}
            >
              {t('uploadNewAvatar')}
            </button>
          </div>

          <div className="profile-main-info">
            <h2>{form.nombre || 'Usuario'}</h2>
            <p>{form.email}</p>
            {user?.created_at && (
              <p className="profile-created-at">
                {t('userSince')}{' '}
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Formulario de datos */}
        <form className="profile-form" onSubmit={handleSaveProfile}>
          <div className="profile-form-row">
            <div className="profile-form-group">
              <label>{t('name')}</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleInputChange}
              />
            </div>
            <div className="profile-form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="profile-form-row">
            <div className="profile-form-group">
              <label>{t('whatsapp')}</label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+593</span>
                <input
                  name="whatsapp_number"
                  value={phoneRest}
                  onChange={handlePhoneRestChange}
                  placeholder="Ej: 987654321"
                />
              </div>
              <small className="phone-help">
                El primer dígito no puede ser 0.
              </small>
            </div>
            <div className="profile-form-group">
              <label>ID</label>
              <input value={user?.id || ''} disabled />
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              {t('changePassword')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de contraseña */}
      {isPasswordModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{t('changePassword')}</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="profile-form-group">
                  <label>{t('currentPassword')}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(e.target.value)
                    }
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label>{t('newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={changingPass}
                >
                  {changingPass
                    ? t('saving')
                    : t('savePassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de selección de avatar */}
      {isAvatarModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{t('chooseAvatar') || 'Elige tu avatar'}</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body avatar-grid">
              {AVATAR_OPTIONS.map((url) => (
                <button
                  type="button"
                  key={url}
                  className={
                    'avatar-option' +
                    (avatarUrl === url ? ' selected' : '')
                  }
                  onClick={() => setAvatarUrl(url)}
                >
                  <img src={url} alt="Avatar" />
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;
