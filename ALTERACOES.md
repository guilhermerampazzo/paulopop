# Corretor Paulo Pop — Alterações v1.0

**Versão:** 1.0 · **Data:** 24/09/2026 · **Base:** código `paulopop-master` recebido em 24/09/2026 (sem número de versão)

**Novo na 1.0:** importação de anúncios da RE/MAX pelo link (com publicação automática) e página do imóvel no padrão RE/MAX, com a marca Paulo Pop.

## 1. Resumo

| Área | Como era | Como ficou |
|---|---|---|
| Painel → Imóveis (1.0) | Só dava para cadastrar à mão, campo por campo. | Botão **Importar da RE/MAX**: cola o link do anúncio e o site copia fotos, preço, custos, endereço, mapa, descrição, ficha e características, e publica. Importar o mesmo link de novo atualiza o imóvel, sem duplicar. |
| Painel → Importar (1.0) | — | Se a RE/MAX bloquear o servidor, um botão de favoritos ("Copiar para o Paulo Pop") lê o anúncio no navegador e o texto é colado no painel. |
| Página do imóvel (1.0) | Título livre, sem condomínio, IPTU e data disponível; ficha só com ícones; só as características fixas. | Mesma estrutura da RE/MAX: tipo · transação · bairro, título "Apartamento - Venda - Cidade, UF", preço e ID, endereço, caixas de Condomínio / IPTU / Data disponível, selo de mercado (ex.: "Ótimo Preço") na galeria, descrição primeiro, ficha completa (ambientes, dormitórios, banheiros, m², ano/mês de construção, pisos, uso do terreno, categoria), todas as características, mapa, aviso legal e links relacionados (faixa de preço ±25% na cidade, venda e aluguel na cidade). |
| Cadastro do imóvel (1.0) | Características limitadas a 25 opções fixas; sem mês de construção. | Campo **Outras características** (uma por linha) e **Mês de Construção**. Imóvel importado mostra a origem, o corretor captador e o link do anúncio original. |
| Banco de dados (1.0) | — | 8 colunas novas em `properties` (seção 4). |

## 2. Como publicar (passo a passo)

> A versão 1.0 inclui uma migração de banco. Ela roda sozinha na subida do contêiner (`prisma migrate deploy` no `scripts/docker-start.sh`). É só adicionar colunas: nada é apagado.

### 2.1 Backup

```bash
docker compose exec postgres pg_dump -U paulopop paulopop > backup-antes-v1.0.sql
docker compose exec app tar czf - -C /app/public/uploads . > uploads-antes-v1.0.tgz
```

### 2.2 Atualizar o código e subir

1. Substitua o código pela pasta `paulopop-master/` do pacote `paulopop-v1.0.zip` (mantenha o `.env` do servidor).
2. Nenhuma variável de ambiente nova.
3. Suba: `docker compose up -d --build`. **Nunca** use `RUN_SEED=true` em produção (o seed troca a senha do admin).
4. Se houver nginx na frente, a importação pode levar até 1 minuto em anúncios com muitas fotos. Garanta `proxy_read_timeout 120s;` no bloco do site.

### 2.3 Conferência depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/admin/imoveis/importar   # 307 para o login (ok)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://corretorpaulopop.com/api/admin/importar-remax  # 401 sem login (ok)
```

- ☐ Painel → Imóveis mostra o botão **Importar da RE/MAX**.
- ☐ Importar um anúncio de teste (ex.: `https://www.remax.com.br/pt-br/imoveis/apartamento/venda/samambaia/404-qs-120-conjunto-2/880221062-25`): aparece "Imóvel importado · publicado no site", com o número de fotos.
- ☐ Se aparecer "A RE/MAX respondeu 403" ou "proteção anti-robô", o servidor está bloqueado pela RE/MAX: use o botão de favoritos (a caixa abre sozinha) e avise o Claude para registrar.
- ☐ A página do imóvel mostra Condomínio, IPTU, Data disponível, ficha, características, mapa e links relacionados; no celular não há rolagem lateral.
- ☐ Importar o mesmo link de novo diz "Imóvel atualizado" e não cria outro imóvel.

### 2.4 Conteúdo que o Paulo preenche no painel

- Nada obrigatório. Nos imóveis já cadastrados, dá para preencher **Mês de Construção** e **Outras características** na aba Principal.

### 2.5 Voltar atrás (rollback)

Suba o código anterior. As colunas novas podem ficar no banco (o código antigo as ignora). Para remover: `ALTER TABLE properties DROP COLUMN "extraFeatures", DROP COLUMN "constructionMonth", DROP COLUMN "sourcePortal", DROP COLUMN "sourceId", DROP COLUMN "sourceUrl", DROP COLUMN "sourceAgentName", DROP COLUMN "sourceOfficeName", DROP COLUMN "importedAt";` e apague a linha `20260924000000_remax_import` da tabela `_prisma_migrations`.

## 3. Mudanças por área

### 3.1 Importador da RE/MAX (1.0)

**Como era:** todo imóvel da RE/MAX era redigitado no painel.

**Como ficou:**
- O site da RE/MAX é montado no navegador; os dados vêm do índice de busca público `POST https://www.remax.com.br/search/listing-search/docs/search` (procura pelo ID entre aspas) e os rótulos em português de `/locales_v2/pt-BR/lookups.json` e `/locales_v2/pt-BR/translate.json` (guardados em memória por 24 h). O nome do corretor captador vem de `/search/agent-search/docs/search`.
- Mapeamento: tipo, transação (Venda/Alugar), status (Ativo, Vendido, Alugado), contrato exclusivo, status de mercado, categoria, uso do terreno, preço, condomínio e período, IPTU, data disponível, validade, ano e mês de construção, ambientes, dormitórios, banheiros, pisos, m², endereço completo, UF, CEP, latitude/longitude, título e descrição (HTML convertido em texto), características (as 25 fixas viram as opções do cadastro; as demais vão para "Outras características", em português), vídeo do YouTube e tour, quando houver.
- Fotos: baixadas de `cdn.gryphtech.com/userimages/{região}/LargeWM/…` (com a marca d'água RE/MAX, por decisão do Paulo), 4 por vez, até 60, gravadas como WebP + miniatura no mesmo lugar das fotos enviadas pelo painel. Foto com erro é pulada e avisada.
- O imóvel fica com o corretor que importou, ref = ID da RE/MAX, slug `tipo-venda-bairro-ID`, e guarda origem, link original, corretor captador e imobiliária. Uma atividade é registrada no histórico do imóvel.
- Reimportar o mesmo anúncio atualiza tudo e troca as fotos (as antigas são apagadas do disco).
- Plano B (botão de favoritos): o script roda na página da RE/MAX, lê os mesmos dados e mostra uma caixa com o texto para copiar; o painel aceita esse texto em "Importar dados colados".

**Arquivos:** `src/lib/remax/map.ts`, `src/lib/remax/client.ts`, `src/lib/remax/import.ts`, `src/lib/remax/bookmarklet.ts`, `src/app/api/admin/importar-remax/route.ts`, `src/app/admin/imoveis/importar/page.tsx`, `src/app/admin/imoveis/importar/ImportarRemaxClient.tsx`, `src/app/admin/imoveis/page.tsx`, `src/lib/upload.ts` (`saveImageBuffer`).

### 3.2 Página do imóvel no padrão RE/MAX (1.0)

**Como era:** título livre como H1, sem condomínio/IPTU/data disponível, ficha só com ícones, descrição depois dos ícones, sem links relacionados.

**Como ficou:** cabeçalho com tipo · transação · bairro; H1 "Tipo - Transação - Cidade, UF"; preço (ou "Consulte o valor" se o preço estiver oculto) e ID; endereço completo só quando "Mostrar endereço completo" estiver marcado; caixas de custos; selo de mercado na galeria; descrição primeiro; ficha em tabela; características fixas + livres; aviso legal; links relacionados. O formulário com o corretor continua à direita, e os imóveis similares continuam abaixo.

**Arquivos:** `src/app/imoveis/[slug]/page.tsx`.

### 3.3 Cadastro (1.0)

**Como era:** sem campo livre de características e sem mês de construção.

**Como ficou:** aba Principal com **Mês de Construção**, **Outras características** e o quadro "Importado da RE/MAX" (captador + link original). Os campos de origem não podem ser alterados pelo formulário.

**Arquivos:** `src/components/admin/PropertyForm/TabPrincipal.tsx`, `src/lib/property-update.ts`.

## 4. Banco de dados

Migração `prisma/migrations/20260924000000_remax_import/migration.sql` (idempotente, com `IF NOT EXISTS`), tabela `properties`:

| Coluna | Tipo | Uso |
|---|---|---|
| `extraFeatures` | `TEXT[]` (padrão vazio) | Características livres |
| `constructionMonth` | `INTEGER` | Mês de construção |
| `sourcePortal` | `TEXT` | "remax" |
| `sourceId` | `TEXT` único | "remax:880221062-25" (evita duplicar) |
| `sourceUrl` | `TEXT` | Link do anúncio original |
| `sourceAgentName`, `sourceOfficeName` | `TEXT` | Corretor captador e imobiliária |
| `importedAt` | `TIMESTAMP(3)` | Data da última importação |

## 5. API

| Método | Rota | Acesso | Observação |
|---|---|---|---|
| POST | `/api/admin/importar-remax` | Usuário logado e ativo | Corpo `{ url }` ou `{ payload }` (texto do botão de favoritos) e `publish` (padrão `true`). Responde 201 (criado), 200 (atualizado), 400 (link/dados inválidos), 401 (sem login), 502 (RE/MAX indisponível ou bloqueando; `blocked: true`). |

## 6. Variáveis de ambiente

Nenhuma nova.

## 7. Testes

**Testado:**
- `npx tsc --noEmit` sem erros e `next build` completo (com as fontes do Google trocadas só na cópia de teste, porque o ambiente de teste não acessa o Google Fonts).
- Vitest: 45 testes passando, incluindo `tests/unit/remax-import.test.ts` (mapeamento com os dados reais do anúncio 880221062-25) e `tests/unit/remax-import.db.test.ts` (com PostgreSQL 16: cria e publica, reimporta sem duplicar, rascunho, fotos gravadas em disco, foto quebrada pulada). O teste de banco só roda com `DATABASE_URL`.
- Migração aplicada num banco criado com as migrações anteriores e rodada 2 vezes (idempotente).
- Navegador (Playwright, 1366 px e 390 px): login, botão na lista, tela de importação, erro de link inválido, caixa do plano B abrindo sozinha quando o servidor é bloqueado, importação pelos dados colados (publicada, captador exibido), quadro de origem no cadastro, página pública com ficha, custos, 28 características e links relacionados, sem rolagem lateral no celular e sem erros no console.

**Não testado:**
- Busca direta na RE/MAX pelo servidor e download das fotos do CDN: o ambiente de teste não tem acesso à internet. A RE/MAX usa Cloudflare; se ela bloquear o IP do servidor, use o botão de favoritos.
- O botão de favoritos rodando dentro de remax.com.br (a leitura dos dados foi validada manualmente no navegador do Paulo em 24/09/2026, com as mesmas chamadas).

## 8. Pendências (não incluídas nesta versão)

- As 18 sugestões do diagnóstico de 24/09/2026 (backlog), principalmente segurança: `/api/leads` e `/api/imoveis?admin=true` abertos sem login, permissões por perfil, senha do relatório, páginas de Privacidade/Termos, og:image com `localhost`.
- Atualização automática periódica dos imóveis importados (hoje é reimportando o link).
- Importar direto do iList (precisa de acesso oficial à API da Gryphtech).

## 9. Arquivos

**Novos**
- `prisma/migrations/20260924000000_remax_import/migration.sql`
- `src/lib/remax/map.ts`, `src/lib/remax/client.ts`, `src/lib/remax/import.ts`, `src/lib/remax/bookmarklet.ts`
- `src/app/api/admin/importar-remax/route.ts`
- `src/app/admin/imoveis/importar/page.tsx`, `src/app/admin/imoveis/importar/ImportarRemaxClient.tsx`
- `tests/unit/remax-import.test.ts`, `tests/unit/remax-import.db.test.ts`
- `ALTERACOES.md`

**Alterados**
- `prisma/schema.prisma`
- `src/app/imoveis/[slug]/page.tsx`, `src/app/admin/imoveis/page.tsx`
- `src/components/admin/PropertyForm/TabPrincipal.tsx`
- `src/lib/property-update.ts`, `src/lib/upload.ts`
