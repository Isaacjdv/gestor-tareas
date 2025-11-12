import React, { useMemo, useState } from 'react';
import '../styles/ReportsView.css';

/**
 * ReportsView
 * Props:
 *  - onGoHome: () => void
 *  - t: (key: string, params?: object) => string
 *  - tasks: Array<{ id, titulo, status, created_at }>
 */
const ReportsView = ({ onGoHome, t, tasks = [] }) => {
  // Detectar idioma de forma simple: si el título de la tarjeta dice "Reportes", asumimos ES.
  const isES = (t('homeCardReportsTitle') || '').toLowerCase().includes('reporte');

  // Textos con fallback seguros
  const TT = {
    title: isES ? 'Reportes' : 'Reports',
    from: isES ? 'Desde' : 'From',
    to: isES ? 'Hasta' : 'To',
    search: isES ? 'Buscar' : 'Search',
    placeholder: isES ? 'Buscar por título...' : 'Search by title...',
    all: isES ? 'Todos' : 'All',
    pending: isES ? 'Sin hacer' : 'Pending',
    in_process: isES ? 'En proceso' : 'In process',
    done: isES ? 'Realizadas' : 'Done',
    apply: isES ? 'Aplicar filtros' : 'Apply filters',
    clear: isES ? 'Limpiar' : 'Clear',
    results: isES ? 'Resultados' : 'Results',
    empty: isES ? 'Sin tareas para mostrar.' : 'No tasks to show.',
    download: isES ? 'Descargar CSV' : 'Download CSV',
    col_id: isES ? 'ID' : 'ID',
    col_title: isES ? 'Título' : 'Title',
    col_status: isES ? 'Estado' : 'Status',
    col_created: isES ? 'Creado' : 'Created',
  };

  // Filtros
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Normalizar fechas
  const parseDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const inRange = (itemDateStr) => {
    if (!itemDateStr) return true;
    const d = new Date(itemDateStr);
    if (Number.isNaN(d.getTime())) return true;

    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0)) return false;
    if (to && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)) return false;
    return true;
  };

  // Lista filtrada (lo que ves en pantalla)
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    return (tasks || []).filter((tk) => {
      const byText = q ? (tk.titulo || '').toLowerCase().includes(q) : true;
      const byStatus = statusFilter === 'all' ? true : (tk.status || 'pending') === statusFilter;
      const byDate = inRange(tk.created_at);
      return byText && byStatus && byDate;
    });
  }, [tasks, query, statusFilter, fromDate, toDate]);

  // Agrupar por estado (siempre visible aquí)
  const grouped = useMemo(() => {
    const acc = { pending: [], in_process: [], done: [] };
    filtered.forEach((tk) => {
      const st = tk.status || 'pending';
      if (st === 'done') acc.done.push(tk);
      else if (st === 'in_process') acc.in_process.push(tk);
      else acc.pending.push(tk);
    });
    return acc;
  }, [filtered]);

  // Diccionario de estado “bonito” para CSV
  const humanStatus = (st) => {
    const mapES = { pending: 'Sin hacer', in_process: 'En proceso', done: 'Realizada' };
    const mapEN = { pending: 'Pending', in_process: 'In process', done: 'Done' };
    return isES ? (mapES[st] || 'Sin hacer') : (mapEN[st] || 'Pending');
  };

  // Descargar CSV (de LO FILTRADO que estás viendo)
  const handleDownloadCSV = () => {
    // Cabecera
    const header = [TT.col_id, TT.col_title, TT.col_status, TT.col_created];
    const rows = filtered.map((tk) => [
      tk.id,
      (tk.titulo || '').replace(/\r?\n/g, ' ').trim(),
      humanStatus(tk.status || 'pending'),
      new Date(tk.created_at || Date.now()).toLocaleString(),
    ]);

    // CSV seguro (con BOM para Excel)
    const escapeCSV = (val) => {
      const s = String(val ?? '');
      if (/[",\n;]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [header, ...rows].map(r => r.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `reporte_tareas_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Acciones
  const handleApply = () => {
    // Los filtros ya son reactivos; mantenemos el botón por UX
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setQuery('');
    setStatusFilter('all');
  };

  // Chip de estado
  const StatusChips = () => (
    <div className="status-chips">
      <button
        type="button"
        className={`status-chip ${statusFilter === 'all' ? 'active' : ''}`}
        onClick={() => setStatusFilter('all')}
        aria-pressed={statusFilter === 'all'}
      >
        {TT.all}
      </button>
      <button
        type="button"
        className={`status-chip pending ${statusFilter === 'pending' ? 'active' : ''}`}
        onClick={() => setStatusFilter('pending')}
        aria-pressed={statusFilter === 'pending'}
      >
        ⛔ {TT.pending}
      </button>
      <button
        type="button"
        className={`status-chip inproc ${statusFilter === 'in_process' ? 'active' : ''}`}
        onClick={() => setStatusFilter('in_process')}
        aria-pressed={statusFilter === 'in_process'}
      >
        📝 {TT.in_process}
      </button>
      <button
        type="button"
        className={`status-chip done ${statusFilter === 'done' ? 'active' : ''}`}
        onClick={() => setStatusFilter('done')}
        aria-pressed={statusFilter === 'done'}
      >
        ✅ {TT.done}
      </button>
    </div>
  );

  return (
    <div className="apartado-view reports-view">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs apartado-breadcrumbs">
        <span className="crumb" onClick={onGoHome} role="button" tabIndex={0}>
          <i className="fas fa-home" /> {t('root')}
        </span>
        <span className="separator"> &gt; </span>
        <span className="crumb">{TT.title}</span>
      </nav>

      {/* Título + botón Descargar */}
      <div className="reports-title-row">
        <h2 className="reports-title">
          <i className="fas fa-file-alt" /> {TT.title}
        </h2>
        <button
          type="button"
          className="btn btn-download"
          onClick={handleDownloadCSV}
          title={TT.download}
          aria-label={TT.download}
        >
          <i className="fas fa-download" /> {TT.download}
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="reports-toolbar">
        <div className="report-field">
          <label htmlFor="fromDate" className="report-label">{TT.from}</label>
          <input
            id="fromDate"
            type="date"
            className="report-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="report-field">
          <label htmlFor="toDate" className="report-label">{TT.to}</label>
          <input
            id="toDate"
            type="date"
            className="report-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="report-field report-search">
          <label htmlFor="q" className="report-label">{TT.search}</label>
          <input
            id="q"
            type="text"
            className="report-input"
            placeholder={TT.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="report-actions">
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            {TT.apply}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            {TT.clear}
          </button>
        </div>
      </div>

      {/* Chips de estado */}
      <StatusChips />

      {/* Resultados agrupados */}
      <h3 className="results-title">
        {TT.results}
      </h3>

      <div className="report-columns">
        {/* Sin hacer */}
        <section className="report-col">
          <header className="report-col-header pending">
            <span>⛔ {TT.pending}</span>
            <span className="count">{grouped.pending.length}</span>
          </header>
          {grouped.pending.length === 0 ? (
            <div className="report-empty">{TT.empty}</div>
          ) : (
            <ul className="report-list">
              {grouped.pending.map((tk) => (
                <li key={tk.id} className="report-item">
                  <div className="report-item-title">{tk.titulo}</div>
                  <div className="report-item-meta">
                    <span>{new Date(tk.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* En proceso */}
        <section className="report-col">
          <header className="report-col-header inproc">
            <span>📝 {TT.in_process}</span>
            <span className="count">{grouped.in_process.length}</span>
          </header>
          {grouped.in_process.length === 0 ? (
            <div className="report-empty">{TT.empty}</div>
          ) : (
            <ul className="report-list">
              {grouped.in_process.map((tk) => (
                <li key={tk.id} className="report-item">
                  <div className="report-item-title">{tk.titulo}</div>
                  <div className="report-item-meta">
                    <span>{new Date(tk.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Realizadas */}
        <section className="report-col">
          <header className="report-col-header done">
            <span>✅ {TT.done}</span>
            <span className="count">{grouped.done.length}</span>
          </header>
          {grouped.done.length === 0 ? (
            <div className="report-empty">{TT.empty}</div>
          ) : (
            <ul className="report-list">
              {grouped.done.map((tk) => (
                <li key={tk.id} className="report-item">
                  <div className="report-item-title">{tk.titulo}</div>
                  <div className="report-item-meta">
                    <span>{new Date(tk.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReportsView;
