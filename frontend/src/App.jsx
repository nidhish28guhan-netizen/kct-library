import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, RequireRole } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import BookDetail from './pages/BookDetail';
import MyLibrary from './pages/MyLibrary';
import CirculationDesk from './pages/CirculationDesk';
import Members from './pages/Members';
import BooksAdmin from './pages/BooksAdmin';
import Policies from './pages/Policies';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';

const STAFF = ['LIBRARIAN', 'ADMIN'];

function Shell({ children }) {
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  const staff = STAFF.includes(user.role);
  const admin = user.role === 'ADMIN';
  const link = (to, label) => <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>CLMS</h1>
          <small>College Library</small>
        </div>
        <nav className="nav">
          <div className="nav-section">Workspace</div>
          {link('/', 'Dashboard')}
          {link('/catalogue', 'Catalogue')}
          {!staff && link('/my-library', 'My Library')}
          {staff && <><div className="nav-section">Circulation</div>{link('/desk', 'Circulation Desk')}</>}
          {staff && <><div className="nav-section">Administration</div>
            {link('/members', 'Members')}
            {link('/books-admin', 'Books & Copies')}
            {admin && link('/policies', 'Policies')}
            {link('/reports', 'Reports')}
            {admin && link('/audit', 'Audit Log')}
          </>}
        </nav>
        <div className="sidebar-foot">24CSI015 · Software Engineering<br />with Agile Practices</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h2>&nbsp;</h2>
          <div className="user-chip">
            <div className="who">
              <strong>{user.name}</strong>
              <span>{user.role === 'STUDENT' || user.role === 'FACULTY' ? user.memberId : user.username} · {user.role}</span>
            </div>
            <div className="avatar">{(user.name || '?').trim().charAt(0)}</div>
            <button className="btn ghost small" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
          </div>
        </header>
        <div className="page-in" key={location.pathname}>{children}</div>
      </div>
    </div>
  );
}

const page = (el, roles) => <RequireRole roles={roles}>{el}</RequireRole>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<RequireRole>{<h2 style={{ padding: 40 }}>This area is outside your role's permissions. <a href="/">Back to dashboard</a></h2>}</RequireRole>} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/catalogue" element={<Shell><Catalogue /></Shell>} />
      <Route path="/catalogue/:id" element={<Shell><BookDetail /></Shell>} />
      <Route path="/my-library" element={<Shell><RequireRole roles={['STUDENT', 'FACULTY']}><MyLibrary /></RequireRole></Shell>} />
      <Route path="/desk" element={<Shell><RequireRole roles={STAFF}><CirculationDesk /></RequireRole></Shell>} />
      <Route path="/members" element={<Shell><RequireRole roles={STAFF}><Members /></RequireRole></Shell>} />
      <Route path="/books-admin" element={<Shell><RequireRole roles={STAFF}><BooksAdmin /></RequireRole></Shell>} />
      <Route path="/policies" element={<Shell><RequireRole roles={['ADMIN']}><Policies /></RequireRole></Shell>} />
      <Route path="/reports" element={<Shell><RequireRole roles={STAFF}><Reports /></RequireRole></Shell>} />
      <Route path="/audit" element={<Shell><RequireRole roles={['ADMIN']}><AuditLog /></RequireRole></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
