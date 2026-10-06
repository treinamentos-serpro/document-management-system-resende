import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState(() => window.localStorage.getItem('dms-user-id') || '');
  const [activeUserId, setActiveUserId] = useState(userId.trim());
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeUserId) {
      setDocuments([]);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    listDocuments(activeUserId, controller.signal)
      .then(setDocuments)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [activeUserId, refreshKey]);

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextUserId = userId.trim();
    if (!nextUserId) return;

    window.localStorage.setItem('dms-user-id', nextUserId);
    setUserId(nextUserId);
    setActiveUserId(nextUserId);
    setNotice('');
    setError('');
    if (nextUserId === activeUserId) {
      setRefreshKey((currentKey) => currentKey + 1);
    }
  }

  function handleUploaded(document) {
    setNotice(`Documento "${document.originalName}" enviado.`);
    setRefreshKey((currentKey) => currentKey + 1);
  }

  function handleDeleted(documentId) {
    const deletedDocument = documents.find((document) => document.id === documentId);
    setDocuments((currentDocuments) => currentDocuments.filter((document) => document.id !== documentId));
    setNotice(`Documento "${deletedDocument?.originalName || 'documento'}" excluído.`);
    setError('');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS - início">
          <span className="brand-symbol" aria-hidden="true">D</span>
          <span>DMS<span className="brand-period">.</span></span>
        </a>
        <span className="storage-status"><span /> ARQUIVOS LOCAIS</span>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">ARQUIVO PESSOAL</p>
            <h1>Documentos</h1>
            <p className="page-subtitle">Acesse e organize seus arquivos.</p>
          </div>
          <form className="identity-form" onSubmit={handleUserSubmit}>
            <label htmlFor="user-id">Identificador do usuário</label>
            <div className="identity-controls">
              <input
                id="user-id"
                name="userId"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Ex.: usuario-1"
                autoComplete="username"
                required
              />
              <button className="primary-button" type="submit">Acessar</button>
            </div>
          </form>
        </section>

        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {notice && <p className="notice notice-success" role="status">{notice}</p>}

        {activeUserId ? (
          <>
            <section className="upload-section" aria-label="Envio de documentos">
              <UploadComponent userId={activeUserId} onUploaded={handleUploaded} />
              <aside className="summary-panel">
                <span className="summary-label">USUÁRIO ATIVO</span>
                <strong className="active-user">{activeUserId}</strong>
                <span className="summary-divider" />
                <span className="summary-label">DOCUMENTOS</span>
                <strong className="document-count">{documents.length}</strong>
              </aside>
            </section>

            <section className="documents-section" aria-labelledby="documents-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BIBLIOTECA</p>
                  <h2 id="documents-title">Seus documentos</h2>
                </div>
                <button
                  className="refresh-button"
                  type="button"
                  onClick={() => setRefreshKey((currentKey) => currentKey + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Atualizando...' : 'Atualizar lista'}
                </button>
              </div>
              {isLoading ? (
                <p className="empty-state" role="status">Carregando documentos...</p>
              ) : (
                <DocumentList
                  documents={documents}
                  userId={activeUserId}
                  onDeleted={handleDeleted}
                />
              )}
            </section>
          </>
        ) : (
          <div className="identity-empty-state">
            <span className="empty-mark" aria-hidden="true">D</span>
            <p>Informe um identificador para abrir sua biblioteca.</p>
          </div>
        )}
      </main>

      <footer className="page-footer">
        <span>Document Management System</span>
        <span>Versão inicial</span>
      </footer>
    </div>
  );
}
