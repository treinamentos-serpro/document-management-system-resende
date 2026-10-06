import DownloadButton from './DownloadButton.jsx';
import DeleteButton from './DeleteButton.jsx';

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({ documents, userId, onDeleted }) {
  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento encontrado.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Enviado em</th>
            <th scope="col">Tamanho</th>
            <th scope="col"><span className="visually-hidden">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td data-label="Nome">
                <span className="document-name">{document.originalName}</span>
              </td>
              <td data-label="Enviado em">{formatDate(document.uploadedAt)}</td>
              <td data-label="Tamanho">{formatSize(document.size)}</td>
              <td className="action-cell">
                <div className="document-actions">
                  <DownloadButton
                    userId={userId}
                    documentId={document.id}
                    fileName={document.originalName}
                  />
                  <DeleteButton
                    userId={userId}
                    documentId={document.id}
                    fileName={document.originalName}
                    onDeleted={onDeleted}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}