import React, { useMemo, useState } from 'react';
import '../styles/AnalyticsView.css';

/**
 * AnalyticsView
 * Props:
 *  - onGoHome: () => void
 *  - t: (key: string, params?: object) => string
 *  - tasks: Array<{ id, titulo, status, created_at, updated_at }>
 *
 * Funcionalidad:
 *  - Filtros (fecha desde/hasta, búsqueda por texto)
 *  - KPIs: Total, Sin hacer, En proceso, Realizadas, % completadas
 *  - Tiempo promedio de finalización (si hay updated_at en done)
 *  - Tendencia últimos 14 días (creadas y completadas) con SVG sparkline
 *  - Descargar CSV (de los datos FILTRADOS)
 */

const AnalyticsView = ({ onGoHome, t, tasks = [] }) => {
  // Idioma simple
  const isES = (t('homeCardAnalyticsTitle') || '').toLowerCase().includes('anal');

  // Textos (fallbacks robustos)
  const TT = {
    title: isES ? 'Analítica' : 'Analytics',
    from: isES ? 'Desde' : 'From',
    to: isES ? 'Hasta' : 'To',
    search: isES ? 'Buscar' : 'Search',
    placeholder: isES ? 'Buscar por título...' : 'Search by title...',
    apply: isES ? 'Aplicar filtros' : 'Apply filters',
    clear: isES ? 'Limpiar' : 'Clear',
    kpi_total: isES ? 'Total' : 'Total',
    kpi_pending: isES ? 'Sin hacer' : 'Pending',
    kpi_inproc: isES ? 'En proceso' : 'In process',
    kpi_done: isES ? 'Realizadas' : 'Done',
    kpi_completed_rate: isES ? '% Completadas' : 'Completed %',
    kpi_avg_time: isES ? 'Tiempo prom. finalización' : 'Avg. completion time',
    download: isES ? 'Descargar CSV' : 'Download CSV',
    created_series: isES ? 'Creadas (últ. 14 días)' : 'Created (last 14 days)',
    done_series: isES ? 'Completadas (últ. 14 días)' : 'Completed (last 14 days)',
    no_data: isES ? 'Sin datos para mostrar.' : 'No data to show.',
    results: isES ? 'Resultados (filtrados)' : 'Results (filtered)',
    col_id: isES ? 'ID' : 'ID',
    col_title: isES ? 'Título' : 'Title',
    col_status: isES ? 'Estado' : 'Status',
    col_created: isES ? 'Creado' : 'Created',
    col_updated: isES ? 'Actualizado' : 'Updated',
  };

  // Filtros
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');

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

  // Lista filtrada por fecha + texto (sin filtrar por estado aquí)
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    return (tasks || []).filter((tk) => {
      const byText = q ? (tk.titulo || '').toLowerCase().includes(q) : true;
      const byDate = inRange(tk.created_at);
      return byText && byDate;
    });
  }, [tasks, query, fromDate, toDate]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    let pending = 0, in_process = 0, done = 0;

    filtered.forEach((tk) => {
      const st = tk.status || 'pending';
      if (st === 'done') done += 1;
      else if (st === 'in_process') in_process += 1;
      else pending += 1;
    });

    const completedRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Tiempo promedio de finalización: para tareas done con updated_at > created_at
    const durations = filtered
      .filter(tk => (tk.status === 'done') && tk.created_at && tk.updated_at)
      .map(tk => {
        const c = new Date(tk.created_at).getTime();
        const u = new Date(tk.updated_at).getTime();
        return (u > c) ? (u - c) : null;
      })
      .filter(x => x != null);

    const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const humanizeMs = (ms) => {
      if (!ms) return isES ? '—' : '—';
      const days = Math.floor(ms / (24*60*60*1000));
      const hours = Math.floor((ms % (24*60*60*1000)) / (60*60*1000));
      const mins = Math.floor((ms % (60*60*1000)) / (60*1000));
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    return {
      total, pending, in_process, done, completedRate,
      avgTimeText: humanizeMs(avgMs),
    };
  }, [filtered, isES]);

  // Serie últimos 14 días (creadas por día vs. completadas por día)
  const lastDays = 14;
  const daysWindow = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = lastDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ key, date: d });
    }
    return arr;
  }, []);

  const dailySeries = useMemo(() => {
    const createdMap = new Map(daysWindow.map(d => [d.key, 0]));
    const doneMap = new Map(daysWindow.map(d => [d.key, 0]));

    filtered.forEach(tk => {
      const cKey = (tk.created_at ? new Date(tk.created_at) : new Date()).toISOString().slice(0, 10);
      if (createdMap.has(cKey)) createdMap.set(cKey, createdMap.get(cKey) + 1);

      if (tk.status === 'done' && tk.updated_at) {
        const uKey = new Date(tk.updated_at).toISOString().slice(0, 10);
        if (doneMap.has(uKey)) doneMap.set(uKey, doneMap.get(uKey) + 1);
      }
    });

    const created = daysWindow.map(d => createdMap.get(d.key));
    const completed = daysWindow.map(d => doneMap.get(d.key));
    return { created, completed, categories: daysWindow.map(d => d.key) };
  }, [filtered, daysWindow]);

  // Small sparkline SVG
  const Sparkline = ({ data, height = 60, label }) => {
    const width = 240;
    const pad = 6;
    const max = Math.max(...data, 1);
    const stepX = (width - pad * 2) / (data.length - 1 || 1);
    const points = data.map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - (v / max) * (height - pad * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="chart-card" role="img" aria-label={label}>
        <div className="chart-label">{label}</div>
        <svg width={width} height={height} className="sparkline">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    );
  };

  // Descargar CSV (de lo FILTRADO)
  const handleDownloadCSV = () => {
    const header = [TT.col_id, TT.col_title, TT.col_status, TT.col_created, TT.col_updated];
    const rows = filtered.map((tk) => [
      tk.id,
      (tk.titulo || '').replace(/\r?\n/g, ' ').trim(),
      (tk.status || 'pending'),
      new Date(tk.created_at || Date.now()).toLocaleString(),
      tk.updated_at ? new Date(tk.updated_at).toLocaleString() : '',
    ]);

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
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `analitica_tareas_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {/* filtros son reactivos, conservamos botón por UX */};
  const handleClear = () => { setFromDate(''); setToDate(''); setQuery(''); };

  return (
    <div className="apartado-view analytics-view">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs apartado-breadcrumbs">
        <span className="crumb" onClick={onGoHome} role="button" tabIndex={0}>
          <i className="fas fa-home" /> {t('root')}
        </span>
        <span className="separator"> &gt; </span>
        <span className="crumb">{TT.title}</span>
      </nav>

      {/* Título + Descargar */}
      <div className="analytics-title-row">
        <h2 className="analytics-title">
          <i className="fas fa-chart-line" /> {TT.title}
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

      {/* Barra filtros */}
      <div className="analytics-toolbar">
        <div className="an-field">
          <label htmlFor="fromDate" className="an-label">{TT.from}</label>
          <input
            id="fromDate"
            type="date"
            className="an-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="an-field">
          <label htmlFor="toDate" className="an-label">{TT.to}</label>
          <input
            id="toDate"
            type="date"
            className="an-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="an-field an-search">
          <label htmlFor="q" className="an-label">{TT.search}</label>
          <input
            id="q"
            type="text"
            className="an-input"
            placeholder={TT.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="an-actions">
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            {TT.apply}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            {TT.clear}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_total}</div>
          <div className="kpi-value">{kpis.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_pending}</div>
          <div className="kpi-value">{kpis.pending}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_inproc}</div>
          <div className="kpi-value">{kpis.in_process}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_done}</div>
          <div className="kpi-value">{kpis.done}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_completed_rate}</div>
          <div className="kpi-value">{kpis.completedRate}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{TT.kpi_avg_time}</div>
          <div className="kpi-value">{kpis.avgTimeText}</div>
        </div>
      </div>

      {/* Tendencias (sparklines) */}
      <div className="charts-grid">
        <Sparkline data={dailySeries.created} label={TT.created_series} />
        <Sparkline data={dailySeries.completed} label={TT.done_series} />
      </div>

      {/* Tabla (vista rápida de filtrados) */}
      <h3 className="results-title">{TT.results}</h3>
      {filtered.length === 0 ? (
        <div className="analytics-empty">{TT.no_data}</div>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{TT.col_id}</th>
                <th>{TT.col_title}</th>
                <th>{TT.col_status}</th>
                <th>{TT.col_created}</th>
                <th>{TT.col_updated}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tk => (
                <tr key={tk.id}>
                  <td>{tk.id}</td>
                  <td className="cell-title">{tk.titulo}</td>
                  <td>{tk.status || 'pending'}</td>
                  <td>{new Date(tk.created_at || Date.now()).toLocaleString()}</td>
                  <td>{tk.updated_at ? new Date(tk.updated_at).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
