import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const fileInput = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const file = fileInput.current?.files[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    setError('');
    try {
      const document = await uploadDocument(userId, file);
      fileInput.current.value = '';
      onUploaded(document);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <span className="panel-mark" aria-hidden="true">+</span>
        <div>
          <h2>Adicionar documento</h2>
          <p>Selecione um arquivo para enviar</p>
        </div>
      </div>
      <label className="file-picker" htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">↑</span>
        <span>Escolher arquivo</span>
        <input
          ref={fileInput}
          id="document-file"
          name="file"
          type="file"
          required
          disabled={isUploading}
        />
      </label>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="primary-button upload-button" type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}