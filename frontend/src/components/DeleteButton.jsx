import { useState } from 'react';
import { deleteDocument } from '../services/documentApi.js';

export default function DeleteButton({ userId, documentId, fileName, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (isDeleting || !window.confirm(`Excluir "${fileName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await deleteDocument(userId, documentId);
      onDeleted(documentId);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <span className="delete-control">
      <button
        className="delete-button"
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Excluir ${fileName}`}
      >
        {isDeleting ? 'Excluindo...' : 'Excluir'}
      </button>
      {error && <span className="delete-error" role="alert">{error}</span>}
    </span>
  );
}