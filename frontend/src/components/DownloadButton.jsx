import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ userId, documentId, fileName }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) return;

    setIsDownloading(true);
    setError('');
    try {
      const download = await downloadDocument(userId, documentId);
      const objectUrl = URL.createObjectURL(download.blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = download.fileName || fileName;
      link.style.display = 'none';
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-control">
      <button
        className="download-button"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${fileName}`}
      >
        <span aria-hidden="true">↓</span>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </span>
  );
}