async function request(path, { userId, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(userId ? { 'X-User-Id': userId } : {}),
    },
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      message = 'Resposta inválida do servidor.';
    }
    throw new Error(message);
  }

  return response;
}

export async function listDocuments(userId, signal) {
  const response = await request('/documents', { userId, signal });
  const body = await response.json();
  if (!Array.isArray(body.documents)) {
    throw new Error('A resposta do servidor não contém uma lista de documentos.');
  }
  return body.documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', {
    userId,
    method: 'POST',
    body: formData,
  });
  return response.json();
}

function getFileName(contentDisposition) {
  const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return 'documento';
    }
  }

  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] || 'documento';
}

export async function downloadDocument(userId, documentId) {
  const response = await request(
    `/documents/${encodeURIComponent(documentId)}/download`,
    { userId },
  );
  return {
    blob: await response.blob(),
    fileName: getFileName(response.headers.get('content-disposition') || ''),
  };
}

export async function deleteDocument(userId, documentId) {
  await request(`/documents/${encodeURIComponent(documentId)}`, {
    userId,
    method: 'DELETE',
  });
}