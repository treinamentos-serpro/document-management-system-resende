# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem documentos, consultem seus próprios arquivos e baixem um documento pelo identificador, com armazenamento local.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário atual.
- Download de documento pelo identificador.
- Exclusão do arquivo e dos metadados do documento pelo identificador.
- Identificação simples do dono do documento.
- Interface web para upload, listagem e download.
- Validação dos limites e tratamento de erros de arquivo e filesystem.

### Fora do escopo

- Armazenamento em nuvem ou integração com provedores externos.
- Banco de dados; os metadados permanecem em memória.
- Autenticação, autorização baseada em contas ou gestão de credenciais.
- Versionamento, edição ou compartilhamento de documentos.
- Busca avançada, pastas, categorias e pré-visualização.
- Persistência dos metadados após reinício do backend.

## 3. Atores e identificação

Cada chamada às rotas de documentos informa o cabeçalho `X-User-Id`. O backend associa o valor ao documento e usa-o para filtrar a listagem e autorizar o download. Cabeçalho ausente ou vazio resulta em `400 Bad Request`.

Esse identificador simples não autentica o usuário e não é uma fronteira de segurança.

## 4. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo por requisição como `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema associa o documento ao usuário identificado por `X-User-Id`. |
| RF-03 | O sistema gera um identificador único para cada documento, independente do nome original. |
| RF-04 | O sistema grava o arquivo no filesystem local, em `backend/storage` por padrão. |
| RF-05 | O sistema mantém os metadados do documento em memória durante a execução do backend. |
| RF-06 | O sistema lista somente os metadados dos documentos do usuário informado. |
| RF-07 | O sistema permite baixar um documento somente se pertencer ao usuário informado. |
| RF-08 | O sistema informa erros de entrada, arquivo ausente, tamanho excedido e documento indisponível. |
| RF-09 | A interface permite informar um identificador simples de usuário. |
| RF-10 | A interface permite enviar, listar e baixar documentos e exibe estados de carregamento e erro. |
| RF-11 | O dono pode excluir um documento; o sistema remove o arquivo local e seus metadados em memória. |

## 5. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os uploads são gravados com Multer configurado com `diskStorage`. |
| RNF-02 | O armazenamento de arquivos é exclusivamente local; não usar serviços externos. |
| RNF-03 | Os metadados são mantidos em memória e podem ser perdidos ao reiniciar o backend. |
| RNF-04 | Configurações operacionais são fornecidas por variáveis de ambiente. |
| RNF-05 | Backend em Node.js, Express e CommonJS; frontend em React, Vite e ESM, sem TypeScript. |
| RNF-06 | O backend segue `routes -> controllers -> services -> repositories`. |
| RNF-07 | Erros HTTP não expõem stack traces nem caminhos locais. |
| RNF-08 | O nome físico do arquivo é gerado pelo servidor, nunca pelo cliente. |
| RNF-09 | O tamanho máximo padrão do upload é 10 MiB, configurável por ambiente. |
| RNF-10 | Os testes do backend usam `node:test`. |

## 6. Modelo de dados

### Documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | público | Identificador único gerado pelo servidor, preferencialmente UUID. |
| `originalName` | string | público | Nome original recebido no upload. |
| `size` | number | público | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | público | Data/hora UTC em formato ISO 8601. |
| `owner` | string | público | Identificador enviado em `X-User-Id`. |
| `storageName` | string | interno | Nome físico gerado para localizar o arquivo. |
| `storagePath` | string | interno | Caminho local usado pelo repositório para ler ou remover o arquivo. |

Os campos internos não são retornados pela API. O repositório mantém os metadados em memória.

## 7. Contratos de API

### Convenções

- As rotas Express não incluem `/api`; o proxy de desenvolvimento do Vite remove esse prefixo.
- Rotas de documentos exigem `X-User-Id` não vazio.
- Erros seguem `{ "error": { "code": "ERROR_CODE", "message": "Descrição" } }`.

### `POST /upload`

- Entrada: `multipart/form-data`, um arquivo no campo `file`, cabeçalho `X-User-Id`.
- Sucesso: `201 Created`, com os metadados públicos do documento criado.
- `400 Bad Request`: usuário ou arquivo ausente, ou campo de upload inválido.
- `413 Payload Too Large`: arquivo acima do limite configurado.
- `500 Internal Server Error`: falha ao gravar ou registrar o documento.
- Se o registro dos metadados falhar após a gravação, o serviço tenta remover o arquivo criado.

Exemplo de resposta:

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 12345,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-1"
}
```

### `GET /documents`

- Entrada: cabeçalho `X-User-Id`.
- Sucesso: `200 OK`, com `{ "documents": [...] }`; lista vazia retorna array vazio.
- `400 Bad Request`: cabeçalho ausente ou vazio.
- `500 Internal Server Error`: falha inesperada na consulta.

### `GET /documents/:id/download`

- Entrada: identificador na URL e cabeçalho `X-User-Id`.
- Sucesso: `200 OK`, corpo binário e `Content-Disposition: attachment` com nome seguro baseado no nome original.
- `400 Bad Request`: cabeçalho ausente ou vazio.
- `404 Not Found`: documento inexistente, de outro usuário ou arquivo local indisponível. As situações usam a mesma resposta para não revelar a existência de documentos alheios.
- `500 Internal Server Error`: falha inesperada de leitura.

### `DELETE /documents/:id`

- Entrada: identificador na URL e cabeçalho `X-User-Id`.
- Sucesso: `204 No Content`; remove o arquivo local e os metadados em memória.
- `400 Bad Request`: cabeçalho ausente ou vazio.
- `404 Not Found`: documento inexistente ou pertencente a outro usuário.
- `500 Internal Server Error`: falha ao remover o arquivo. Nesse caso, os metadados devem permanecer disponíveis.

## 8. Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite por arquivo em bytes (10 MiB). |

O diretório é criado quando necessário. Caminhos de armazenamento não podem ser derivados de valores fornecidos pelo cliente.

## 9. Decisões arquiteturais

- `routes/`: define endpoints e middleware de upload com Multer.
- `controllers/`: valida entrada HTTP e monta status e respostas.
- `services/`: coordena casos de uso e regras de negócio.
- `repositories/`: encapsula metadados em memória e acesso aos arquivos locais.
- A exclusão verifica o dono, remove o arquivo local e só então apaga os metadados em memória.
- Camadas internas não dependem de Express.
- O frontend usa componentes React e serviço `fetch` no prefixo `/api`, enviando `X-User-Id`.
- Reiniciar o backend perde os metadados; arquivos podem permanecer sem referência. Persistência e reconciliação estão fora do escopo.

## 10. Plano de execução

As etapas abaixo são planejamento futuro. Nesta entrega, deve ser salvo somente este documento; arquivos de implementação de backend e frontend não fazem parte do escopo.

1. **Especificação**
   - Documento: `docs/specs/dms-spec.md`.
   - Aceite: requisitos, modelo de dados, contratos, decisões e etapas documentados.

2. **Repositório e serviço do backend**
   - Arquivos futuros: `backend/src/repositories/documentRepository.js` e `backend/src/services/documentService.js`.
   - Aceite: metadados em memória, arquivo em disco local, isolamento por dono e tentativa de rollback do arquivo quando necessário.

3. **Rotas e controllers do backend**
   - Arquivos futuros: `backend/src/routes/documentRoutes.js`, `backend/src/controllers/documentController.js` e integração em `backend/src/app.js`.
   - Aceite: os três endpoints respeitam contratos, erros são sanitizados e Multer usa `diskStorage` com limite configurável.

4. **Testes do backend**
   - Arquivos futuros: `backend/test/app.test.js` e testes adicionais em `backend/test/` quando necessário.
   - Aceite: `node --test` cobre upload, listagem, download, validações, limite e isolamento por usuário.

5. **Interface e integração frontend**
   - Arquivos futuros: `frontend/src/App.jsx`, componentes em `frontend/src/components/` e serviço em `frontend/src/services/`.
   - Aceite: usuário identifica-se, envia arquivos, consulta lista e baixa documentos; a interface apresenta carregamento, sucesso e erros.

6. **Execução e documentação**
   - Arquivo futuro: `README.md`.
   - Aceite: comandos locais, variáveis de ambiente e limitações de identidade/metadados estão documentados; os fluxos completos passam pela API via proxy `/api`.