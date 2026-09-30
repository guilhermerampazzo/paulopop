# Corretor Paulo Pop — Pacote completo v1.4 (inclui 1.1, 1.2 e 1.3)

**Versão:** 1.4 · **Data:** 30/09/2026 · **Base:** `paulopop-v1.3-completo.zip` · **Pacote único:** `corretorpaulopop-v1.4.zip`

**Novo na 1.4:** hub do corretor padronizado, compartilhar com a foto principal, preço por m² com faixa de tolerância e ajuste por imóvel no painel (cálculo automático), condição do imóvel no anúncio, ficha completa para imprimir (12 fotos + mapa), tipologias completas nos empreendimentos, **Área de Inteligência** (350 quadras de Samambaia, banco de amostras, ordem de busca quadra a quadra), **conector do Claude** (`/api/mcp`) com a aba **Pesquisa** no estudo de mercado, e importador de anúncios por link (DF Imóveis, WImóveis, OLX e outros) ou por texto colado.

Este pacote reúne as quatro versões num só código, para **uma única publicação**. As quatro migrações de banco (`20260929…_v1_1`, `20260930…_v1_2`, `20261001…_v1_3`, `20261002…_v1_4`) rodam sozinhas, em ordem, na subida do contêiner; todas só adicionam colunas e tabelas e podem ser executadas mais de uma vez sem erro.

> **Se você já está na 1.3 e vai só para a 1.4:** troque o código, não mexa no `.env` (não há variável nova) e suba. Só a migração `20261002000000_v1_4_hub_inteligencia_conector` será aplicada. Depois siga a conferência da seção 2.3.

## 1. Resumo da 1.4

| Área | Como era | Como ficou |
|---|---|---|
| Hub do corretor (1.4) | Foto redonda cortada, nome do cadastro, CRECI e imobiliária em formatos diferentes em cada tela; linhas truncadas no celular. | Cartão único (`AgentCard`) na página do imóvel, na ficha impressa e no estudo de mercado: **foto inteira, sem corte** (ajustada ao quadro), **Corretor Paulo Pop**, **(61) 98409-0968** com o ícone do WhatsApp (abre a conversa), linha **CRECI/DF Nº 12896**, linha **Corretor Associado REMAX INOVELAR**. Nada é cortado: as linhas quebram dentro do cartão. Dois campos novos em Meu perfil: "Nome que aparece no site" e "Vínculo com a imobiliária", com prévia do cartão. |
| Compartilhar imóvel (1.4) | O link ia sozinho; a prévia usava a primeira foto no tamanho original (às vezes sem imagem no WhatsApp). | A prévia do link (WhatsApp, Facebook, Telegram) mostra a **foto principal** em 1200×630 (`/api/og/imovel/{id}`). No celular, o botão Compartilhar envia a foto junto com o link quando o aparelho permite. |
| Preço por m² comparado (1.4) | Mostrava sempre "X% acima/abaixo da média". | Regra pedida pelo Paulo, com faixa de tolerância: **abaixo da referência** → mostra a referência e o percentual; **até 10% acima** → mostra só "Imóvel no preço de mercado", sem números de comparação; **mais de 10% acima** → o bloco some para o público. |
| Hub de preço/m² no painel (1.4) | Não existia; o R$/m² era digitado. | Em cada imóvel (aba Principal): R$/m² **calculado sozinho** (valor ÷ área útil/privativa; sem ela, área total) e gravado ao salvar; médias automáticas do bairro e do prédio; modo **Automática / Minha referência / Não mostrar**; valor de referência com botões −1% / +1%; rótulo público; nota interna; e a frase "O público vê: …" ao vivo. |
| Condição no anúncio (1.4) | O campo existia só no painel. | **Na planta / Novo / Usado / Em construção** aparece na página do imóvel (selo e ficha), nos cartões da lista e na ficha impressa. |
| Imprimir (1.4) | Imprimia a tela do site, cortando fotos, simulador e mapa. | Botão **Imprimir ficha** abre `/imoveis/{slug}/imprimir` (A4): 12 fotos (a primeira é a principal, todas inteiras), Detalhes do imóvel, Preço por m² comparado (mesma regra do site), Sobre este imóvel, Características, Quanto custa por mês, Localização e mapa (imagem do OpenStreetMap com marcador) e o cartão do corretor. Nenhum bloco é partido entre páginas. |
| Tipologias (1.4) | Nome, quartos, suítes, banheiros, área, vagas, posição, finais. | Acrescidos: **Andar(es)**, varandas, área total, **preço a partir de**, planta (upload) e descrição. A página do empreendimento ganhou os cartões de tipologia com todos os campos. |
| Área de Inteligência (1.4) | Não existia. | Menu **Inteligência**: **Endereços** (350 quadras de Samambaia com termos de busca e posição no mapa; editar, desativar, acrescentar quadras de outras cidades), **Banco de amostras** (todo anúncio lido fica guardado por link, com histórico de preço), **Buscas** (onde já se procurou), **Regiões** (observações internas) e **Conector do Claude**. |
| Ordem de busca (1.4) | O corretor procurava amostras à mão. | Ordem fixa: 1) o próprio site (ativos, vendidos e banco de amostras); 2) mesmo condomínio; 3) a quadra do imóvel; 4) as de mesma numeração (QR/QN/QS); 5) as vizinhas, da mais próxima para a mais distante; 6) bairro e cidade. Portais prioritários: WImóveis, DF Imóveis e OLX; os demais só se faltar amostra. Para na meta; amostra recusada reabre a busca de onde parou. |
| Estudo de mercado: aba Pesquisa (1.4) | Amostras só por link colado ou à mão; todas entravam direto no cálculo. | Aba **Pesquisa**: meta de amostras, quadra, condomínio, tolerâncias, portais e regras do corretor; botão **Buscar no meu site**; botão **Pedir pesquisa ao Claude** (gera o pedido pronto para colar); lista de **candidatas** com Aprovar / Não serve (com motivo); recusadas; histórico. **Candidata não entra no cálculo nem no relatório** até ser aprovada. Na aba Amostras: "cole o texto do anúncio" quando o portal bloqueia o link. |
| Conector do Claude (1.4) | Não existia. | `POST /api/mcp/{token}` (protocolo MCP): o Claude lê os estudos, consulta as quadras, registra candidatas com link e trecho do anúncio e cria rascunhos de anúncio. **Não aprova, não publica e não apaga.** O endereço com o token é gerado no painel, mostrado uma vez e pode ser revogado. |
| Importador de anúncios (1.4) | Só RE/MAX. | Imóveis → **Importar anúncio**, três abas: RE/MAX (como era), **Outros portais (link)** e **Colar texto**. O site lê, o corretor confere e o cadastro entra como **rascunho**. As fotos do anúncio só são copiadas, e o imóvel só pode ser publicado, depois de marcar "este anúncio é meu ou tenho autorização escrita do proprietário" (Lei 6.530/78, art. 20, III). |
| Banco de dados (1.4) | — | Migração `20261002000000_v1_4_hub_inteligencia_conector` (seção 4). Só adiciona. |

## 2. Como publicar — passo a passo único (1.1 + 1.2 + 1.3 + 1.4)

### 2.1 Backup

```bash
docker compose exec postgres pg_dump -U paulopop paulopop > backup-antes-v1.4.sql
docker compose exec app tar czf - -C /app/public/uploads . > uploads-antes-v1.4.tgz
```

### 2.2 Código e `.env`

1. Substitua o código pela pasta `paulopop-master/` do pacote `corretorpaulopop-v1.4.zip` (mantenha o `.env` do servidor e a pasta de uploads).
2. `.env`: **nenhuma variável nova na 1.4**. Continuam valendo: `NEXTAUTH_SECRET` (obrigatória), `NEXT_PUBLIC_SITE_URL=https://corretorpaulopop.com` (usada no endereço do conector e na imagem de compartilhamento), `GEMINI_API_KEY` e `GOOGLE_MAPS_SERVER_KEY` (opcionais).
3. Suba: `docker compose up -d --build`. O `scripts/docker-start.sh` aplica as migrações pendentes antes de iniciar.
4. **Saída de rede do servidor** (só se houver firewall de saída): liberar `tile.openstreetmap.org` (mapa da ficha impressa) e os portais `dfimoveis.com.br`, `wimoveis.com.br`, `olx.com.br`, `vivareal.com.br`, `zapimoveis.com.br`, `imovelweb.com.br`, `chavesnamao.com.br` e os endereços de foto deles (importador). Sem isso o site continua funcionando: a ficha avisa "mapa indisponível" e o importador pede o texto colado.
5. **Registro de acessos (importante):** o endereço do conector traz o token no caminho (`/api/mcp/ppk_…`). Se o proxy (Nginx, Traefik, Cloudflare) grava o caminho das requisições, configure para **não registrar** `/api/mcp/` ou mascarar o trecho depois de `/api/mcp/`. Exemplo em Nginx: `location /api/mcp/ { access_log off; proxy_pass …; }`.

### 2.3 Conferência depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/health                        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/mcp                           # 405 (só aceita POST)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}' https://corretorpaulopop.com/api/mcp                    # 401 (sem token)
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/admin/inteligencia/quadras   # 401
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "https://corretorpaulopop.com/api/mapa-estatico?lat=-15.879&lng=-48.087"                              # 200 image/png
```

- ☐ Página de um imóvel: cartão do corretor com foto inteira, WhatsApp com ícone, "CRECI/DF Nº 12896", "Corretor Associado REMAX INOVELAR"; selo da condição (Usado, Novo…); bloco "Preço por m² comparado" conforme a regra.
- ☐ Colar o link de um imóvel no WhatsApp: a prévia mostra a foto principal (o WhatsApp guarda prévias antigas; teste com um imóvel que ainda não foi compartilhado).
- ☐ Botão **Imprimir ficha** → 12 fotos, todas as seções, mapa, nada cortado. Salvar em PDF e conferir.
- ☐ Painel → um imóvel → "Preço por m² comparado": trocar a referência e ver a frase "O público vê".
- ☐ Painel → **Meu perfil**: preencher "Nome que aparece no site" e "Vínculo com a imobiliária".
- ☐ Painel → Empreendimentos → Estrutura e unidades → tipologia com Andar(es), varandas e preço; conferir na página do prédio.
- ☐ Painel → **Inteligência** → Endereços mostra "Samambaia: 350 quadras".
- ☐ Painel → Inteligência → **Conector do Claude** → Gerar endereço → colar no Claude (Personalizar → Conectores → Adicionar conector personalizado) → pedir "liste meus estudos".
- ☐ Estudo de mercado → aba **Pesquisa** → Buscar no meu site → aprovar uma candidata e recusar outra → aba Amostras e cálculo conferem.
- ☐ Imóveis → Importar anúncio → **Colar texto** → criar rascunho → tentar "Salvar e Ativar": aparece o pedido de confirmação de autorização.
- ☐ Celular (390 px): página do imóvel, ficha, Inteligência e aba Pesquisa sem rolagem lateral.

### 2.4 Conteúdo que o Paulo preenche no painel

- **Meu perfil:** Nome que aparece no site = `Corretor Paulo Pop`; Vínculo com a imobiliária = `Corretor Associado`; Imobiliária = `REMAX INOVELAR`; CRECI = `12896/DF`; WhatsApp = `61984090968`; foto de corpo ou meio corpo na vertical (4:5).
- **Imóveis:** conferir o campo **Condição** e a **área útil** (o R$/m² é calculado a partir dela). Onde quiser, ajustar a referência do preço por m².
- **Empreendimentos:** completar as tipologias (andares, varandas, preço a partir de, planta).
- **Inteligência → Conector do Claude:** gerar o endereço e ligar no Claude (uma vez).
- **Inteligência → Regiões:** revisar as observações de Samambaia (são de uso interno).

### 2.5 Voltar atrás (rollback)

Suba o código 1.3. As tabelas e colunas novas podem ficar (o código antigo as ignora). Para remover tudo da 1.4:

```sql
DROP TABLE IF EXISTS "study_search_runs", "api_tokens", "intel_region_notes", "intel_quadras" CASCADE;
ALTER TABLE "market_study_samples" DROP COLUMN IF EXISTS "origin", DROP COLUMN IF EXISTS "candidateStatus", DROP COLUMN IF EXISTS "rejectedReason", DROP COLUMN IF EXISTS "rejectedAt", DROP COLUMN IF EXISTS "foundAtStep", DROP COLUMN IF EXISTS "foundAtQuadra", DROP COLUMN IF EXISTS "collectedAt", DROP COLUMN IF EXISTS "sourceText", DROP COLUMN IF EXISTS "altUrls", DROP COLUMN IF EXISTS "suites", DROP COLUMN IF EXISTS "bankId";
DROP TABLE IF EXISTS "sample_bank" CASCADE;
ALTER TABLE "market_studies" DROP COLUMN IF EXISTS "searchStatus", DROP COLUMN IF EXISTS "targetSamples", DROP COLUMN IF EXISTS "searchParams", DROP COLUMN IF EXISTS "searchCursor";
ALTER TABLE "properties" DROP COLUMN IF EXISTS "sqmCompareMode", DROP COLUMN IF EXISTS "sqmRefValue", DROP COLUMN IF EXISTS "sqmRefLabel", DROP COLUMN IF EXISTS "sqmRefNote", DROP COLUMN IF EXISTS "sourcePhotoUrls", DROP COLUMN IF EXISTS "publishAuthConfirmedAt", DROP COLUMN IF EXISTS "publishAuthConfirmedBy";
ALTER TABLE "users" DROP COLUMN IF EXISTS "publicName", DROP COLUMN IF EXISTS "companyRole";
ALTER TABLE "empreendimento_unit_types" DROP COLUMN IF EXISTS "floorsLabel", DROP COLUMN IF EXISTS "totalArea", DROP COLUMN IF EXISTS "balconies", DROP COLUMN IF EXISTS "priceFrom", DROP COLUMN IF EXISTS "description";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261002000000_v1_4_hub_inteligencia_conector';
```

Atenção: antes de voltar, as candidatas e recusadas ainda estão em `market_study_samples`. No código 1.3 elas entrariam no cálculo como amostras comuns. Apague-as antes (`DELETE FROM "market_study_samples" WHERE "candidateStatus" <> 'APPROVED';`) ou mantenha o código 1.4.

## 3. Mudanças por área (1.4)

### 3.1 Hub do corretor, compartilhar e condição

**Como era:** cada tela montava os dados do corretor do seu jeito; a foto usava `object-cover` num círculo; o CRECI aparecia como estava no cadastro.
**Como ficou:** `src/lib/agent-display.ts` (`formatCreci` → "CRECI/DF Nº 12896", `formatPhoneBR` → "(61) 98409-0968", `agentCompanyLine`, `agentDisplay`) e o componente `src/components/public/AgentCard.tsx` (foto com `object-contain`, sem truncar texto). Usado em `imoveis/[slug]/page.tsx`, na ficha impressa e em `StudyReport.tsx`. `og:image` e `twitter:image` do imóvel apontam para `GET /api/og/imovel/[id]` (capa em JPEG 1200×630; `?modo=foto` devolve a foto inteira para o botão Compartilhar). `src/lib/share.ts` ganhou `shareProperty` (Web Share com arquivo quando o aparelho aceita). Condição: `PropertyCard.tsx`, `section-data.ts` (`CARD_SELECT`) e a página do imóvel.
**Arquivos:** `src/lib/agent-display.ts`, `share.ts`, `upload.ts` (`readUploadFile`); `src/components/public/AgentCard.tsx`, `PropertyCard.tsx`, `PropertySummaryBar.tsx`, `StudyReport.tsx`; `src/components/ui/WhatsAppIcon.tsx`; `src/app/api/og/imovel/[id]/route.ts`; `src/app/admin/perfil/page.tsx`, `admin/corretores/page.tsx`; `src/app/api/admin/perfil/route.ts`, `admin/corretores/*`.

### 3.2 Preço por m²

**Como era:** `diffLabel` mostrava sempre o percentual; `pricePerSqm` era campo livre.
**Como ficou:** `src/lib/sqm-display.ts` — `sqmVerdict(own, avg)`: ≤ −2% "X% abaixo da referência"; até +10% "Imóvel no preço de mercado"; acima disso oculto (`SQM_TOLERANCE_PCT = 10`, um número só para mudar a faixa). `sqmPublicView` junta a média automática (bairro/prédio) ou a referência manual do imóvel. `PUT /api/imoveis/[id]` recalcula `pricePerSqm` a cada gravação. Painel: `src/components/admin/SqmHubPanel.tsx` (dentro de `PropertyForm/TabPrincipal.tsx`) e `GET /api/admin/imoveis/[id]/sqm`.
**Arquivos:** `src/lib/sqm-display.ts`, `sqm-client.ts`, `property-compare.ts`, `property-update.ts`; `src/components/admin/SqmHubPanel.tsx`, `PropertyForm/TabPrincipal.tsx`; `src/app/api/imoveis/[id]/route.ts`, `api/admin/imoveis/[id]/sqm/route.ts`; `src/app/imoveis/[slug]/page.tsx`.

### 3.3 Ficha para imprimir e tipologias

**Como era:** `window.print()` na página do anúncio, com regra de página 16:9 global (do estudo de mercado).
**Como ficou:** página própria `src/app/imoveis/[slug]/imprimir/page.tsx` (A4, `break-inside: avoid` em cada bloco, fotos com `object-contain`), `AutoPrint.tsx` (espera as imagens e abre a impressão; `?semimprimir=1` só mostra), mapa por `GET /api/mapa-estatico` (mosaico de blocos do OpenStreetMap montado com `sharp`, cache de 7 dias; se o serviço de mapas falhar, `PrintMapImage.tsx` mostra o endereço do anúncio). A regra `@page` saiu do `globals.css` e ficou em cada documento (estudo 16:9, ficha A4). Tipologias: campos novos no `EstruturaEditor.tsx` e na rota de estrutura; `TipologiasTable.tsx` na página do empreendimento.
**Arquivos:** `src/app/imoveis/[slug]/imprimir/page.tsx`; `src/components/public/AutoPrint.tsx`, `PrintMapImage.tsx`, `TipologiasTable.tsx`, `PublicShell.tsx`; `src/lib/static-map.ts`; `src/app/api/mapa-estatico/route.ts`; `src/app/globals.css`, `estudo/[token]/page.tsx`; `src/components/admin/EstruturaEditor.tsx`; `src/app/api/admin/empreendimentos/[id]/estrutura/route.ts`; `src/app/empreendimentos/[slug]/page.tsx`.

### 3.4 Área de Inteligência

**Como era:** não existia.
**Como ficou:** `src/data/samambaia-quadras.json` (350 quadras conferidas com o Mapa 15A da RA XII; posição relativa em metros para ordenar vizinhas; 11 observações de região) é carregado nas tabelas `intel_quadras` e `intel_region_notes` no primeiro acesso. `src/lib/intel/quadras.ts` (funções puras): `parseQuadraRefs`/`matchQuadra` (acha "QR 303", "Qd. 303", "QN-303" no endereço), `sisterQuadras`, `neighborQuadras`, `buildSearchPlan` e `nextSearchStep` (cursor `{tier, index, done, key}`; a `key` guarda quadra-base e condomínio: se o endereço for corrigido, a busca recomeça). `intel/candidates.ts`: `registerCandidates` (um registro por link normalizado; mesmo imóvel em outro portal é juntado em `altUrls`; trava por estudo), `rejectSample`, `sampleCounts`. `intel/site-search.ts`: passo 1 (anúncios do site e banco de amostras, na ordem do plano; valor de fechamento só quando a venda foi registrada com "mostrar valor final"). Outras cidades: acrescentar quadras em Inteligência → Endereços; sem base, a busca vai por condomínio, bairro e cidade.
**Arquivos:** `src/data/samambaia-quadras.json`; `src/lib/intel/*` (quadras, db, candidates, site-search, url-key, number, prompt); `src/app/admin/inteligencia/*`; `src/app/api/admin/inteligencia/*` (quadras, banco, buscas, regioes, tokens); `src/components/admin/AdminSidebar.tsx`, `src/app/admin/layout.tsx`.

### 3.5 Estudo de mercado: candidatas e aba Pesquisa

**Como era:** toda amostra gravada entrava no cálculo; salvar o estudo apagava as amostras que não estavam na tela.
**Como ficou:** `market_study_samples.candidateStatus` (`CANDIDATE`, `APPROVED`, `REJECTED`). `computeStudy` e o relatório público (`loadStudy(id, { approvedOnly: true })`) usam só as aprovadas. `PUT /api/admin/estudos/[id]` recebe `knownSampleIds` e só apaga a amostra que a tela conhecia e o corretor removeu — candidatas registradas pelo Claude enquanto a tela estava aberta nunca são apagadas. `StudyResearchTab.tsx` é a aba Pesquisa. Links de amostra passam a aceitar só `http(s)`.
**Arquivos:** `src/lib/market-study.ts`, `market-study-db.ts`, `study-guard.ts`, `json-body.ts`; `src/components/admin/StudyResearchTab.tsx`; `src/app/admin/estudos/[id]/page.tsx`; `src/app/api/admin/estudos/[id]/route.ts`, `pesquisa/route.ts`, `candidatas/route.ts`, `amostra-link/route.ts`; `src/app/estudo/[token]/page.tsx`.

### 3.6 Conector do Claude (MCP)

**Como era:** não existia.
**Como ficou:** servidor MCP mínimo, sem dependência nova e sem sessão: cada `POST` traz uma mensagem JSON-RPC 2.0 e recebe JSON (`initialize`, `ping`, `tools/list`, `tools/call`; versões de protocolo 2025-06-18, 2025-03-26 e 2024-11-05). Autenticação por token (`ppk_…`, 32 bytes aleatórios): no caminho (`/api/mcp/{token}`, para colar no Claude) ou no cabeçalho `Authorization: Bearer`. O banco guarda só o `sha256` e os 10 primeiros caracteres; o token aparece uma vez e pode ser revogado. Limites: 120 chamadas/min por token, 300/min por IP, corpo de 600 KB. **Não há OAuth nesta versão**: quem tiver o endereço acessa os estudos daquele corretor pelo conector — trate como senha (ver 2.2, item 5).

Ferramentas (10): `listar_estudos`, `ler_estudo`, `buscar_no_site`, `proxima_quadra`, `consultar_quadras`, `registrar_candidatas`, `registrar_busca`, `recusar_amostra`, `resumo_calculo`, `importar_anuncio`. Garantias no código: o conector só enxerga os estudos do dono do token (administrador vê todos); só cria amostra como candidata; exige link e trecho do anúncio; não tem ferramenta para aprovar, publicar ou apagar; `recusar_amostra` exige motivo; `importar_anuncio` cria rascunho sem fotos e sem autorização; links da RE/MAX não entram pelo conector.

Como ligar no Claude: Painel → Inteligência → Conector do Claude → **Gerar endereço do conector** → copiar → no Claude: **Personalizar → Conectores → Adicionar conector personalizado** → nome "Corretor Paulo Pop" + o endereço. A pesquisa nos portais é feita pelo Claude no navegador do Paulo (Claude no Chrome); o site não acessa os portais para pesquisar.
**Arquivos:** `src/lib/mcp/auth.ts`, `server.ts`, `tools.ts`, `http.ts`; `src/app/api/mcp/route.ts`, `api/mcp/[token]/route.ts`; `src/app/api/admin/inteligencia/tokens/route.ts`.

### 3.7 Importador por link e por texto colado

**Como era:** só RE/MAX (`/api/admin/importar-remax`), publicando na hora.
**Como ficou:** `src/lib/portal-reader/parse.ts` (funções puras): `parseListingHtml` combina metatags `og:*`, JSON-LD, dados embutidos (`__NEXT_DATA__`, formato VivaReal/ZAP e OLX) e padrões de texto; `parseListingText` lê anúncio colado (preço sem confundir com condomínio/IPTU, áreas, quartos, suítes, banheiros, vagas, andar, posição, endereço, cidade do DF, tipo, venda/aluguel). Campo não encontrado fica vazio. `read.ts` busca a página só nos portais da lista, por `safeFetch` (só https, sem IP, sem rede interna, redirecionamento conferido, tamanho limitado). `import.ts`: `createDraftFromListing` cria sempre `DRAFT`, com `sourcePortal`, `sourceId`, `sourceUrl` e `sourcePhotoUrls`; as fotos só são baixadas com a confirmação (`bringSourcePhotos`). Porta de autorização em `PUT /api/imoveis/[id]`, `POST /api/imoveis/bulk` e `/api/imoveis/[id]/venda`: imóvel com `sourcePortal` diferente de `remax` não passa a Ativo, Vendido ou Alugado sem `publishAuthConfirmed` (responde 409 e o painel abre a confirmação). A RE/MAX continua no importador próprio.
**Arquivos:** `src/lib/portal-reader/parse.ts`, `read.ts`, `import.ts`; `src/lib/net/safe-fetch.ts`; `src/app/api/admin/importar/route.ts`, `api/admin/imoveis/[id]/fotos-origem/route.ts`; `src/app/admin/imoveis/importar/page.tsx`, `ImportarTabs.tsx`, `ImportarPortalClient.tsx`; `src/components/admin/SourcePhotosBox.tsx`, `PropertyForm/index.tsx`, `PropertyForm/TabPrincipal.tsx`; `src/app/api/imoveis/[id]/route.ts`, `bulk/route.ts`, `[id]/venda/route.ts`.

### 3.8 Ajustes encontrados nos testes e na revisão

- Painel do imóvel no celular: a barra de botões do rodapé saía da tela (já acontecia na 1.3); agora quebra de linha.
- `src/lib/ai-vision.ts` (IA nas fotos, 1.3): endereços externos de foto passam pelo `safeFetch` (antes o servidor buscava qualquer endereço informado).
- Cabeçalho do painel mostra "Inteligência" no celular.
- Título duplicado "| Paulo Pop | Paulo Pop" (item aprovado no backlog em 29/09): corrigido em `/vender` e `/relatorio/[propertyId]`; as demais páginas públicas foram conferidas e usam um sufixo só.

## 4. Banco de dados (1.4)

Migração `prisma/migrations/20261002000000_v1_4_hub_inteligencia_conector/migration.sql` (idempotente: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).

| Tabela | Colunas | Uso |
|---|---|---|
| `users` | publicName, companyRole | Hub do corretor |
| `properties` | sqmCompareMode (AUTO/MANUAL/HIDDEN), sqmRefValue, sqmRefLabel, sqmRefNote, sourcePhotoUrls[], publishAuthConfirmedAt, publishAuthConfirmedBy | Preço/m² por imóvel; importação e autorização |
| `empreendimento_unit_types` | floorsLabel, totalArea, balconies, priceFrom, description | Tipologias |
| `market_studies` | searchStatus (NONE/REQUESTED/RUNNING/DONE), targetSamples (10), searchParams JSON, searchCursor JSON | Pesquisa de amostras |
| `market_study_samples` | origin (MANUAL/LINK/CLAUDE/SITE), candidateStatus (padrão APPROVED), rejectedReason, rejectedAt, foundAtStep, foundAtQuadra, collectedAt, sourceText, altUrls[], suites, bankId | Candidatas e prova da coleta. As amostras que já existem ficam como APPROVED. |
| `intel_quadras` (nova) | city, sector, series, quadra, prefix, number, type, searchTerms[], mapX, mapY, latitude, longitude, notes, active · único (city, quadra) | Base de endereços |
| `intel_region_notes` (nova) | city, name, series[], confirmed, market · único (city, name) | Observações internas por região |
| `sample_bank` (nova) | urlKey (único), url, portal, externalId, title, advertiser, location, city, neighborhood, quadra, price, areaPrivate, areaTotal, bedrooms, suites, bathrooms, parking, floor, condoFee, publishedAt, photoUrl, sourceText, priceHistory JSON, firstSeenAt, lastSeenAt | Banco de amostras |
| `study_search_runs` (nova) | studyId, source (MCP/PANEL), step, quadra, portal, query, found, read, registered, notes | Histórico das buscas |
| `api_tokens` (nova) | userId, name, tokenHash (único), prefix, lastUsedAt, revokedAt | Tokens do conector (só o hash) |

A base de Samambaia não está na migração: é carregada do arquivo `src/data/samambaia-quadras.json` na primeira vez que alguém abre Inteligência ou pede uma busca.

## 5. API (1.4)

| Método | Rota | Acesso | Observação |
|---|---|---|---|
| POST | `/api/mcp/{token}` · `/api/mcp` (Bearer) | Token do conector | MCP (JSON-RPC). GET/DELETE → 405. Sem token válido → 401. |
| GET/POST/DELETE | `/api/admin/inteligencia/tokens` | Login (o dono; ADMIN vê todos) | Gera (mostra o endereço uma vez), lista e revoga. Máximo 5 ativos por corretor. |
| GET/POST/PUT | `/api/admin/inteligencia/quadras` | GET: login · POST/PUT: ADMIN | Base de endereços. |
| GET/DELETE | `/api/admin/inteligencia/banco` | GET: login · DELETE: ADMIN | Banco de amostras (50 por página). |
| GET | `/api/admin/inteligencia/buscas` | Login (as suas; ADMIN todas) | Histórico. |
| GET/PUT | `/api/admin/inteligencia/regioes` | GET: login · PUT: ADMIN | Observações internas. |
| GET/PUT/POST | `/api/admin/estudos/[id]/pesquisa` | Login + dono/ADMIN | Dados da aba Pesquisa; salvar parâmetros (`request: true` pede a pesquisa); ações `site`, `restart`, `finish`. |
| POST | `/api/admin/estudos/[id]/candidatas` | Login + dono/ADMIN | `{ action: approve \| reject \| restore, sampleIds[], reason }`. Recalcula o estudo. |
| POST | `/api/admin/estudos/[id]/amostra-link` | Login + dono/ADMIN | Agora aceita `{ text }` (anúncio colado) além de `{ url }`. |
| PUT | `/api/admin/estudos/[id]` | Login + dono/ADMIN | Novo: `knownSampleIds[]`, `targetSamples`, `searchParams`, `searchStatus`. |
| POST | `/api/admin/importar` | Login | `{ step: 'ler', url?, text? }` → campos lidos; `{ step: 'criar', draft, authConfirmed }` → rascunho. |
| POST | `/api/admin/imoveis/[id]/fotos-origem` | Login + quem edita o imóvel | `{ confirm: true }` copia as fotos do anúncio de origem e registra a autorização. |
| GET | `/api/admin/imoveis/[id]/sqm` | Login + quem edita o imóvel | Médias do bairro e do prédio para o hub. |
| PUT | `/api/imoveis/[id]` · POST `/api/imoveis/bulk` · POST/DELETE `/api/imoveis/[id]/venda` | Login | Importado de portal sem confirmação: 409 `{ needsPublishAuth: true }` ao tentar Ativo/Vendido/Alugado. `pricePerSqm` calculado no servidor. |
| GET | `/api/og/imovel/[id]` | Público | Foto principal 1200×630 (JPEG) para a prévia de compartilhamento. |
| GET | `/api/mapa-estatico?lat=&lng=&w=&h=&z=` | Público (40/IP/min) | PNG do mapa com marcador. |
| GET | `/imoveis/[slug]/imprimir` | Público (noindex) | Ficha A4. |

## 6. Variáveis de ambiente

Nenhuma variável nova na 1.4. A tabela da 1.3 continua valendo (`NEXTAUTH_SECRET` obrigatória; `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `SMTP_*` opcionais).

## 7. Testes (1.4)

**Testado (30/09/2026):**
- `tsc --noEmit` limpo; `next build` completo.
- Vitest: **167 testes** (107 da 1.3 + 60 novos). Os novos cobrem: formato do hub do corretor; faixa de tolerância do preço/m²; cálculo automático; porta de autorização; mosaico do mapa (blocos simulados); candidatas fora do cálculo; base de 350 quadras, ordem de busca, avanço, parada na meta, retomada após recusa e segunda rodada de portais; chave de link; leitor de portais (HTML com JSON-LD, formato VivaReal/ZAP e OLX) e texto colado; proteção contra endereços internos e contra página malformada; servidor JSON-RPC; token.
- Com banco (PostgreSQL 16, migrações 1.0 a 1.4 aplicadas; a 1.4 duas vezes seguidas sem erro): conector de ponta a ponta (token do dono, de outro corretor e revogado; as 10 ferramentas), busca no site, candidatas, aprovação, recusa, relatório público só com aprovadas, importador em rascunho.
- Navegador (Playwright, servidor local com dados de teste), **1366 px e 390 px**: 76 verificações de tela (hub do corretor sem corte, condição, três casos do preço/m², ficha com 12 fotos e todas as seções, PDF A4 de 3 páginas, tipologias, painel do preço/m², Meu perfil, Inteligência com as 5 abas, importador, aba Pesquisa; sem rolagem lateral e sem erro de JavaScript) e 38 verificações de fluxo (buscar no site → aprovar → recusar → salvar sem perder candidatas; conector por HTTP; texto colado → rascunho → publicação recusada sem confirmação → publicada com confirmação).
- Revisão de segurança independente do código novo; os pontos encontrados foram corrigidos antes do pacote (seção 3.8 e testes acima).

**Não testado (o ambiente de desenvolvimento não tem acesso):**
- `prisma migrate deploy` pela linha de comando (o motor do Prisma não pôde ser baixado aqui). A migração foi aplicada com `psql`; o SQL é o mesmo arquivo.
- Leitura real dos portais (DF Imóveis, WImóveis, OLX e os demais). O leitor foi testado com páginas de exemplo no formato de cada um. Os portais mudam o HTML e costumam bloquear leitura por servidor: nesses casos o site pede o texto colado.
- Blocos reais do OpenStreetMap (a montagem foi testada com blocos simulados; aqui a ficha mostrou o aviso "mapa indisponível").
- Ligação real com o Claude (Personalizar → Conectores). O servidor segue o protocolo MCP e foi testado por HTTP, mas a tela do Claude só pode ser conferida com o site no ar em `https`.
- Prévia do link no WhatsApp/Facebook (precisa do domínio público).
- Gemini e Google Maps (como na 1.3).

## 8. Pendências (fora deste pacote)

- **Motor por fatores** (homogeneização: oferta 0,90, localização, área, padrão, depreciação, andar; saneamento ±30%; intervalo de confiança; campo de arbítrio ±15%; graus de fundamentação e precisão da NBR 14653-2) e **parecer em A4 (PTAM)**. Aprovados no backlog. Dependem de um caso já avaliado pelo Paulo na planilha, para conferir os números (o modelo da planilha veio em branco).
- **Botão "Buscar amostras" usando a API do Claude pelo servidor** (sem abrir a conversa). Aprovado no backlog; tem custo por uso.
- **Login do conector por OAuth** (em vez do token no endereço).
- Base de quadras das outras cidades do DF (hoje: Samambaia).
- Aviso automático quando o Claude registra candidatas (hoje: selo na aba Pesquisa).
- Limite de tamanho em campos de texto das rotas antigas do painel (1.1 a 1.3) e corpo inválido em `PUT /api/imoveis/[id]` (responde 500 em vez de 400). Só afeta usuário logado.
- Da 1.3: notificação dos alertas de preço; DNS do `www`.

## 9. Arquivos da 1.4

**Novos (52):** migração `20261002000000_v1_4_hub_inteligencia_conector`; `src/data/samambaia-quadras.json`; `src/lib/` agent-display, sqm-display, sqm-client, static-map, study-guard, json-body, `intel/` (quadras, db, candidates, site-search, url-key, number, prompt), `mcp/` (auth, server, tools, http), `net/safe-fetch`, `portal-reader/` (parse, read, import); `src/components/public/` AgentCard, AutoPrint, PrintMapImage, TipologiasTable; `src/components/ui/WhatsAppIcon`; `src/components/admin/` SqmHubPanel, SourcePhotosBox, StudyResearchTab; `src/app/imoveis/[slug]/imprimir/page`; `src/app/admin/inteligencia/` (page, InteligenciaClient); `src/app/admin/imoveis/importar/` (ImportarTabs, ImportarPortalClient); `src/app/api/` mcp/route, mcp/[token]/route, og/imovel/[id]/route, mapa-estatico/route, admin/importar/route, admin/imoveis/[id]/sqm/route, admin/imoveis/[id]/fotos-origem/route, admin/inteligencia/(quadras, banco, buscas, regioes, tokens)/route, admin/estudos/[id]/pesquisa/route, admin/estudos/[id]/candidatas/route; `tests/unit/v1_4.test.ts`, `tests/unit/v1_4.db.test.ts`.

**Alterados (41):** `package.json` (1.4.0), `prisma/schema.prisma`, `ALTERACOES.md`, `alteracoes.pdf`; `src/app/` globals.css, imoveis/[slug]/page, empreendimentos/[slug]/page, estudo/[token]/page, vender/page, relatorio/[propertyId]/page, admin/layout, admin/perfil/page, admin/corretores/page, admin/estudos/[id]/page, admin/imoveis/page, admin/imoveis/importar/page; `src/app/api/` imoveis/[id]/route, imoveis/[id]/venda/route, imoveis/bulk/route, admin/perfil/route, admin/corretores/route, admin/corretores/[id]/route, admin/empreendimentos/[id]/estrutura/route, admin/estudos/[id]/route, admin/estudos/[id]/amostra-link/route; `src/components/admin/` AdminSidebar, EstruturaEditor, PropertyForm/index, PropertyForm/TabPrincipal; `src/components/public/` PropertyCard, PropertySummaryBar, PublicShell, StudyReport; `src/lib/` ai-vision, market-study, market-study-db, property-compare, property-update, section-data, share, upload.

**Removido:** nada.

---

# Histórico — Alterações v1.3

**Versão:** 1.3 · **Data:** 29/09/2026 · **Base:** `paulopop-v1.0.zip` (site no ar, 24/09/2026) · **Pacote único:** `paulopop-v1.3-completo.zip`

Este pacote reúne as três versões (1.1, 1.2 e 1.3) num só código, para **uma única publicação**. As três migrações de banco (`20260929…_v1_1`, `20260930…_v1_2`, `20261001…_v1_3`) rodam sozinhas, em ordem, na subida do contêiner; todas só adicionam colunas e tabelas e podem ser executadas mais de uma vez sem erro. Não é preciso publicar 1.1 e 1.2 antes.

**O que o pacote traz, em uma linha por versão:**
- **1.1** — segurança das APIs e permissões por perfil, identidade visual do AcademyPop, registro de venda/locação (desconto, valor, tempo de mercado), rastreamento (GA4/Pixel/GTM) e páginas legais pelo painel, lead direto ao corretor, SEO, Meu perfil, cache. *(detalhes na seção "Histórico — 1.1")*
- **1.2** — hub de empreendimentos (blocos, tipologias, mapa de unidades ligado aos anúncios, estágio Lançamento/Em obras/Pronto) e Estudo de Mercado no padrão RE/MAX (amostras, estatística, cenários, link público, PDF em lâminas). *(seção "Histórico — 1.2")*
- **1.3** — hub Cidades do DF, hub Parceiros, editor de seções, blog moderno, "Viver aqui" (pesquisa de região por endereço), página do imóvel nova (galeria por cômodo, barra fixa, simulador, histórico de preço, alertas), home nova com busca única e busca com IA, "Vender meu imóvel" com avaliação online, URLs com bairro, PWA, IA nas fotos do estudo de mercado. *(este documento)*

## 1. Resumo da 1.3

| Área | Como era | Como ficou |
|---|---|---|
| Cidades do DF | Só links de região que filtravam imóveis. | Painel → **Cidades do DF**: página por cidade/RA (30 sugestões prontas) com dados fixos (RA, fundação, governador fundador, população + fonte, área, distância ao Plano), capa, vídeo, nomes que casam com os anúncios, SEO e **seções editáveis** no modelo pedido: história, linha do tempo, nomes importantes (governadores, administradores, deputados), números, locais para visitar, academias, escolas, supermercados/comércio, ônibus/metrô/vias, mapa, empreendimentos e imóveis da cidade (automáticos), "Quer vender ou alugar seu imóvel em {cidade}?", blog e perguntas frequentes. Botão **Gerar rascunho com IA** (Gemini) preenche história, linha do tempo, nomes, números e locais para o Paulo revisar. Site: `/cidades` (hub) e `/cidades/{slug}` com índice lateral, preço médio do m² e nº de imóveis calculados, JSON-LD Place, coluna "Cidades do DF" no rodapé e link no menu. |
| Editor de seções | Não existia. | Componente único do painel usado por Cidades, Parceiros e Blog: 13 tipos de bloco (título+texto, galeria, vídeo, lista de itens com foto/endereço/telefone, linha do tempo, pessoas, números, mapa com pontos, imóveis, empreendimentos, chamada para ação com formulário, FAQ, posts do blog), arrastar/ordenar, ocultar, duplicar, upload de imagens, "Gerar com IA" em texto/FAQ/itens. Tudo sanitizado ao salvar e ao exibir. |
| Parceiros | Não existia. | Painel → **Parceiros**: tipo (construtora, banco, cartório/despachante, reforma, mudança, seguros, outro), logo, capa, benefício para clientes do Paulo, contatos, mapa, empreendimentos ligados, seções, SEO. Site: `/parceiros` com filtro por tipo, `/parceiros/{slug}`, faixa "Parceiros que ajudam você a comprar" na página do imóvel e "Parceiros deste empreendimento" no prédio. |
| Blog | 3 posts em texto corrido, sem autor, índice, agendamento ou SEO. | Editor com abas Conteúdo / Publicação / SEO / **Escrever com IA**; categorias fixas (Guia do comprador, Guia do proprietário, Mercado, Cidades…), tags, série, cidade ligada, destaque, blocos extras (galeria, vídeo, imóvel, CTA, FAQ), **agendamento** no horário de Brasília, pré-visualização logado, duplicar, tempo de leitura. Site: hub com destaque, filtros por categoria/cidade/tag/busca, séries, aviso por WhatsApp; post com capa, autor (foto/CRECI), índice lateral gerado dos títulos, compartilhar, "Imóveis nesta região", relacionados, próximo da série, CTA, JSON-LD BlogPosting, RSS (`/blog/rss.xml`). |
| Viver aqui | Só o mapa. | Botão **Analisar região** na ficha do imóvel, no empreendimento e na cidade: geocodifica o endereço e consulta Google Places (New) e Routes: metrô/ônibus, supermercados/comércio, escolas (marcadas como públicas ou particulares pelo nome), saúde, academias/parques, com distância e minutos a pé/de carro, e trajetos no pico das 7h30 para Esplanada, Taguatinga Centro, Águas Claras e Aeroporto. Resultado em cache por 90 dias, editável (ocultar lugares, destaques, lugares à mão, resumo). Site: bloco "Viver aqui" com abas e mapa. Sem a chave do Google, funciona só com os destaques manuais. |
| Página do imóvel | Ficha em lista longa; galeria de miniaturas; sem simulador, favoritos ou histórico. | Galeria com abas Fotos / Vídeo / Tour 360 / Plantas / Mapa, fotos agrupadas por cômodo (pela legenda), mosaico no desktop e carrossel no celular, lightbox com swipe/zoom, vídeo vertical; **barra de resumo fixa** (preço, parcela estimada, quartos/vagas/área, WhatsApp, Agendar visita, favoritar, comparar, compartilhar, imprimir); "Quanto custa por mês" (simulador Price com condomínio e IPTU); preço/m² comparado com a média do bairro e do prédio; "Sobre este imóvel"; características agrupadas; "Publicado em / há N dias / preço reduzido em R$ X"; "Avise-me se baixar o preço" (alerta gravado; painel → Alertas de imóveis); Viver aqui; Conheça o prédio; parceiros. JSON-LD RealEstateListing. |
| Home | H1 só para proprietário, busca depois, várias seções repetidas. | Busca grande (bairro, quadra, prédio ou código) com abas Comprar / Alugar / Empreendimentos, chips de região e **Buscar com IA** (frase livre → filtros, Gemini); bloco "Quer vender? Avaliação grátis"; números (anos, vendidos, disponíveis); vitrine única com chips (Todos / Apartamentos / Casas / Lançamentos / Preço reduzido) e cards ricos (carrossel de fotos, R$/m², código, vagas, selos, favorito, WhatsApp); vendidos; prédios; "Onde eu atuo no DF" (cidades publicadas com R$/m²); como funciona (comprador/proprietário); depoimentos; sobre; blog; contato. Barra fixa inferior no celular (WhatsApp, Ligar, Buscar). |
| Busca | Só filtros. | `/imoveis?busca=` procura em código, título, bairro, cidade, endereço e nome do prédio (código exato primeiro); `/empreendimentos?busca=`; `GET /api/imoveis?q=` para o painel; `POST /api/busca-ia`. |
| Vender meu imóvel | Frase na home. | `/vender`: formulário em 4 etapas (onde fica com autocomplete de prédio, o imóvel, fotos, contato) → **faixa de preço na hora** com base no R$/m² dos anúncios do site (prédio → bairro → cidade, mínimo 2, ajuste por estado de conservação) + relatório do prédio (negociados, tempo médio, R$/m² vendido); lead gravado com todos os dados e e-mail ao admin; botão para enviar o resumo pelo WhatsApp. "Como o Paulo vende", depoimentos e FAQ. |
| URLs dos imóveis | `apartamento-residencial-245856515-098`. | Slug `tipo-transação-bairro-cidade-código` na criação e ao editar bairro/cidade (slug antigo guardado e redirecionado de forma permanente). Script `scripts/reslug-imoveis.ts` para converter os existentes. |
| Estudo de mercado | Acabamentos digitados. | Botão **Analisar fotos com IA** (Gemini com visão) no imóvel avaliado e em cada amostra: piso, forro, pintura, armários, esquadrias, estado geral, reforma, resumo e confiança; preenche os campos vazios. |
| PWA / desempenho | — | `manifest.webmanifest` (instalar como app, ícones 192/512/maskable, atalhos Imóveis e Vender), `theme-color`, `next/image` com tamanhos por tela, fotos além das 5 primeiras em lazy, CSS de impressão da ficha. |
| Banco de dados | — | Migração `20261001000000_v1_3_cidades_parceiros_viver_aqui` (seção 4). Só adiciona. |

## 2. Como publicar — passo a passo único (1.1 + 1.2 + 1.3)

### 2.1 Backup

```bash
docker compose exec postgres pg_dump -U paulopop paulopop > backup-antes-v1.3.sql
docker compose exec app tar czf - -C /app/public/uploads . > uploads-antes-v1.3.tgz
```

### 2.2 Código e `.env`

1. Substitua o código pela pasta `paulopop-master/` do pacote `paulopop-v1.3-completo.zip` (mantenha o `.env` do servidor e a pasta de uploads).
2. Confira o `.env` do servidor:
   - `NEXTAUTH_SECRET` com 32+ caracteres (`openssl rand -base64 32`). **Obrigatório** — o compose não sobe sem ele.
   - `NEXT_PUBLIC_SITE_URL=https://corretorpaulopop.com`.
   - `GEMINI_API_KEY` (já usada pela IA de descrições): habilita Gerar com IA, rascunho de cidade, Escrever com IA no blog, Buscar com IA e a IA nas fotos do estudo. Sem ela, esses botões avisam "indisponível" e o resto funciona.
   - **Nova (opcional):** `GOOGLE_MAPS_SERVER_KEY` — chave de servidor da Google Maps Platform com *Geocoding API*, *Places API (New)* e *Routes API* ativadas, para o "Viver aqui". Só é consultada quando o corretor clica em "Analisar região" (cache de 90 dias). Sem ela, o bloco funciona com os destaques preenchidos à mão.
   - Só na primeira instalação: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 8), `ADMIN_NAME` com `RUN_SEED=true`.
3. Suba: `docker compose up -d --build` — o `scripts/docker-start.sh` aplica as três migrações antes de iniciar.
4. Opcional, uma vez: converter os endereços antigos dos imóveis: `docker compose exec app npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' scripts/reslug-imoveis.ts --dry` (mostra o que mudaria) e depois sem `--dry`. Os endereços antigos continuam redirecionando.

### 2.3 Conferência depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/leads                 # 401
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/politica-de-privacidade     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/empreendimentos             # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/cidades                     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/parceiros                   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/vender                      # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/manifest.webmanifest        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/admin/estudos           # 401
curl -s https://corretorpaulopop.com/robots.txt                                                   # Disallow: /estudo/ e Sitemap com o domínio certo
```

- ☐ Home nova: busca grande com abas, chips de região, "Buscar com IA" (com `GEMINI_API_KEY`), vitrine com chips, barra inferior no celular.
- ☐ Página de um imóvel: galeria com abas, barra fixa, simulador, "Avise-me se baixar o preço".
- ☐ Painel: menus **Cidades do DF**, **Parceiros**, **Estudos de mercado**, **Alertas de imóveis**, **Meu perfil**; Empreendimentos → aba Estrutura e unidades; Imóveis → seletor de unidade e painel "Viver aqui".
- ☐ Criar a cidade Samambaia (Nova cidade → sugestão) → Gerar rascunho com IA → revisar → Publicada → `/cidades/samambaia`.
- ☐ `/vender`: preencher e ver a faixa (precisa de pelo menos 2 anúncios ativos do mesmo tipo na cidade/bairro; senão mostra "avaliar pessoalmente" e grava o lead).
- ☐ Ficha de um imóvel → botão Vendido → registro; Admin → Relatórios com o resumo (1.1).
- ☐ Estudos de mercado → novo → amostras → Publicar → Baixar PDF (1.2).
- ☐ Celular (390 px): home, imóvel, cidade, blog, vender sem rolagem lateral.

### 2.4 Conteúdo que o Paulo preenche no painel

- **Meu perfil** (CRECI, foto, WhatsApp, RE/MAX Inovelar) — usado nos anúncios, e-mails, blog e estudo de mercado.
- **Configurações**: Rastreamento (GA4/Pixel/GTM), Páginas legais, SEO (imagem 1200×630), horário e mapa do contato.
- **Cidades do DF**: criar as cidades onde atua (Samambaia, Taguatinga, Águas Claras…), revisar o rascunho da IA, subir fotos, publicar.
- **Parceiros**: construtoras dos empreendimentos, correspondente bancário, despachante, etc.
- **Empreendimentos**: estágio, construtora, tipologias e blocos; ligar os anúncios às unidades; "Analisar região".
- **Imóveis**: registrar as vendas antigas; legendas nas fotos (Sala, Cozinha, Suíte…) para a galeria agrupar; "Analisar região".
- **Blog**: revisar os posts existentes no editor novo (categoria, capa, cidade); usar "Escrever com IA" para as séries Guia do comprador / Guia do proprietário.

### 2.5 Voltar atrás (rollback)

Suba o código 1.0. As tabelas e colunas novas podem ficar (o código antigo as ignora). Para remover tudo: os comandos de rollback de cada versão estão nas seções "Histórico" (1.1 e 1.2) e, para a 1.3: `DROP TABLE "property_alerts", "partners", "city_pages", "area_insights" CASCADE; ALTER TABLE "blog_posts" DROP COLUMN "sections", DROP COLUMN "seoTitle", DROP COLUMN "seoDescription", DROP COLUMN "ogImageUrl", DROP COLUMN "readingMinutes", DROP COLUMN "citySlug", DROP COLUMN "series", DROP COLUMN "featured"; ALTER TABLE "properties" DROP COLUMN "priceHistory", DROP COLUMN "previousSlugs", DROP COLUMN "areaInsightId"; ALTER TABLE "empreendimentos" DROP COLUMN "areaInsightId"; ALTER TABLE "market_study_samples" DROP COLUMN "aiAnalysis";` e apagar as três linhas de `_prisma_migrations`.

## 3. Mudanças por área (1.3)

### 3.1 Editor de seções, Cidades e Parceiros
`src/lib/sections.ts` (tipos, modelos de página `cityTemplate`/`partnerTemplate`), `sections-sanitize.ts`, `section-data.ts` (consultas de imóveis/empreendimentos/blog por cidade), `city-pages.ts`, `partners.ts`, `df-cities.ts`, `ai-sections.ts` (Gemini). Painel: `src/components/admin/sections/*` (editor), `src/app/admin/cidades/**`, `src/app/admin/parceiros/**`. API: `/api/admin/cidades`, `/api/admin/cidades/[id]`, `/api/admin/cidades/[id]/rascunho-ia`, `/api/admin/parceiros`, `/api/admin/parceiros/[id]`, `/api/admin/ia/secao` (ADMIN/SUPER_ADMIN). Público: `src/components/public/SectionRenderer.tsx`, `GalleryLightbox.tsx`, `PartnersStrip.tsx`, `src/app/cidades/**`, `src/app/parceiros/**`; `Header.tsx` (links), `Footer.tsx`/`PublicShell.tsx`/`layout.tsx` (coluna de cidades).

### 3.2 Blog
`src/lib/blog.ts` (visibilidade rascunho/agendado/publicado, índice a partir dos títulos, tempo de leitura, datas de Brasília, Markdown legado), `ai-blog.ts`; API `/api/admin/blog` (GET/POST), `[id]` (GET/PUT/DELETE), `[id]/duplicar`, `ia`; painel `BlogPostEditor.tsx` (abas), `BlogListClient.tsx`; público `src/app/blog/page.tsx`, `[slug]/page.tsx`, `rss.xml/route.ts`, `BlogCard.tsx`, `BlogShare.tsx`, `BlogToc.tsx`. `BlogContent.tsx` removido (renderização passou para o servidor).

### 3.3 Viver aqui
`src/lib/area-insight.ts` (Geocoding, Places New `searchNearby` por categoria, raio 1,5 km, Routes `computeRoutes` com trânsito no pico, cache 90 dias) e `area-insight-shared.ts` (tipos, categorias, escola pública/particular, minutos, junção com ajustes manuais); API `POST /api/admin/regiao`, `GET/PUT /api/admin/regiao/[id]`; painel `AreaInsightPanel.tsx` (inserido em `PropertyForm/TabPrincipal.tsx`, `admin/empreendimentos/[id]`, `admin/cidades/[id]`); público `AreaInsightBlock.tsx` + `AreaInsightTabs.tsx` (imóvel, empreendimento e cidade). Modelo `AreaInsight` compartilhado por endereço.

### 3.4 Página do imóvel, home, busca, slugs, PWA
`src/lib/finance.ts`, `property-slug.ts`, `price-history.ts`, `property-search.ts`, `property-compare.ts`, `property-features.ts`, `gallery-groups.ts`, `favorites.ts`, `share.ts`, `youtube.ts`; componentes `PropertyGallery.tsx` (reescrita), `PropertySummaryBar.tsx`, `FinanceSimulator.tsx`, `FeatureGroups.tsx`, `PriceDropAlert.tsx`, `HomeSearch.tsx`, `HomeShowcase.tsx`, `HomeSections.tsx`, `MobileActionBar.tsx`, `PropertyCard.tsx` (carrossel, selos, código e vagas sempre visíveis; card virou `<article>` com link de cobertura para não aninhar links); páginas `src/app/page.tsx`, `imoveis/page.tsx`, `imoveis/[slug]/page.tsx`, `empreendimentos/page.tsx`; API `/api/imoveis` (`q`, slug novo na criação), `/api/imoveis/[id]` (histórico de preço, troca de slug com redirecionamento), `/api/alertas`, `/api/busca-ia`; `src/app/manifest.ts`, `public/icons/*`, `scripts/gen-pwa-icons.ts`, `scripts/reslug-imoveis.ts`; `src/app/admin/alertas/page.tsx`.

### 3.5 Vender meu imóvel e IA nas fotos
`src/lib/valuation.ts` (faixa por escopo prédio/bairro/cidade, média aparada, ajuste por conservação), `src/app/api/vender/route.ts`, `src/app/vender/page.tsx`, `SellWizard.tsx`; `src/lib/ai-vision.ts` e rotas `/api/admin/estudos/[id]/analisar-fotos` e `/api/admin/estudos/[id]/amostras/[sampleId]/analisar-fotos`; botões no editor do estudo.

## 4. Banco de dados (1.3)

Migração `prisma/migrations/20261001000000_v1_3_cidades_parceiros_viver_aqui/migration.sql` (idempotente).

| Tabela | Colunas | Uso |
|---|---|---|
| `city_pages` (nova) | slug, name, tagline, summary, coverUrl, videoUrl, status, order, raNumber, foundedAt, founderGovernor, population, populationSource, areaKm2, distanceKm, latitude, longitude, matchNames[], sections JSON, seoTitle, seoDescription, ogImageUrl, areaInsightId | Páginas de cidade |
| `partners` (nova) | slug, name, type, tagline, summary, logoUrl, coverUrl, benefit, website, phone, whatsapp, email, address, mapEmbedUrl, instagram, status, order, featured, sections JSON, seoTitle, seoDescription, empreendimentoIds[] | Parceiros |
| `area_insights` (nova) | addressKey (único), address, latitude, longitude, data JSON, manual JSON, provider, fetchedAt | Viver aqui (cache por endereço) |
| `property_alerts` (nova) | name, phone, email, criteria JSON, source, active, lastNotifiedAt | Alertas do site |
| `blog_posts` | sections JSON, seoTitle, seoDescription, ogImageUrl, readingMinutes, citySlug, series, featured | Blog moderno |
| `properties` | priceHistory JSON, previousSlugs[], areaInsightId | Histórico de preço, redirecionamento, região |
| `empreendimentos` | areaInsightId | Região |
| `market_study_samples` | aiAnalysis JSON | IA nas fotos |

## 5. API (1.3)

| Método | Rota | Acesso | Observação |
|---|---|---|---|
| GET/POST | `/api/admin/cidades` · GET/PUT/DELETE `/api/admin/cidades/[id]` · POST `.../rascunho-ia` | ADMIN | Páginas de cidade; rascunho por IA não grava (o painel mescla). |
| GET/POST | `/api/admin/parceiros` · GET/PUT/DELETE `/api/admin/parceiros/[id]` | ADMIN | Parceiros. |
| POST | `/api/admin/ia/secao` | Login | `{ type, title?, context? }` → conteúdo de seção (503 sem chave). |
| GET/POST | `/api/admin/blog` · GET/PUT/DELETE `[id]` · POST `[id]/duplicar` · POST `ia` | Login | Blog (status `SCHEDULED` no filtro; `publishedAt` no horário de Brasília). |
| POST | `/api/admin/regiao` · GET/PUT `/api/admin/regiao/[id]` | Login (imóvel: quem pode editá-lo; cidade/prédio: ADMIN) | Viver aqui. |
| POST | `/api/admin/estudos/[id]/analisar-fotos` · `.../amostras/[sampleId]/analisar-fotos` | Login + dono/admin | IA nas fotos (503 sem chave). |
| GET | `/api/imoveis?q=` | Público/painel | Busca por texto. |
| POST | `/api/alertas` | Público (5/IP/h) | `{ name?, phone, email?, criteria }`. |
| POST | `/api/busca-ia` | Público (20/IP/h) | `{ text }` → `{ filters, url }`; 503 sem chave. |
| POST | `/api/vender` | Público (5/IP/h) | Dados do imóvel + contato → faixa, relatório do prédio; grava lead. |
| GET | `/blog/rss.xml`, `/manifest.webmanifest`, `/cidades`, `/cidades/[slug]`, `/parceiros`, `/parceiros/[slug]`, `/vender` | Público | Páginas novas (no sitemap). |

## 6. Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `NEXTAUTH_SECRET` | **Sim** | Sessão do painel (desde a 1.1). |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | Domínio real. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Não (recomendada) | Todos os botões de IA. |
| `GOOGLE_MAPS_SERVER_KEY` | Não | Viver aqui (Geocoding + Places New + Routes). **Nova na 1.3.** |
| `SMTP_*`, `NOTIFICATION_EMAIL` | Não | E-mails de lead e avaliação online. |

## 7. Testes (1.3)

**Testado (29/09/2026):** `tsc` limpo; `next build` completo; Vitest **104 testes** (51 anteriores + seções, blog, finanças, slug, histórico de preço, Viver aqui, avaliação); migração 1.3 aplicada sobre 1.0 + 1.1 + 1.2 (PostgreSQL 16); Playwright em 1366 px e 390 px: criação de cidade (Samambaia, 15 seções, publicada), parceiro (banco, publicado), post do blog (série, cidade), painel "Viver aqui" (sem chave → modo manual, destaques e lugares salvos e exibidos na página do imóvel), páginas home, busca, imóvel, cidades, cidade, parceiros, parceiro, blog, post e vender — todas 200, sem erros de console e sem rolagem lateral; formulário "Vender meu imóvel" de ponta a ponta (lead gravado; sem amostras suficientes no banco de teste → mensagem "avaliar pessoalmente").

**Não testado (ambiente sem chaves/internet):** consultas reais ao Google Maps (Viver aqui), Gemini (rascunho de cidade, Escrever com IA, Buscar com IA, IA nas fotos), envio de e-mail. Conferir no servidor com as chaves.

## 8. Pendências (fora deste pacote)

- Busca automática de amostras nos portais para o estudo (hoje: colar link) e notificação automática dos alertas de preço (hoje: lista no painel para retorno manual).
- Modo mapa com desenho de área na busca (precisa de SDK de mapas pago); tour 360 de provedores fora do YouTube/Google precisa do domínio na CSP.
- DNS do `www.corretorpaulopop.com` (fora do código).

## 9. Arquivos da 1.3

**Novos (88):** migração `20261001000000_v1_3_cidades_parceiros_viver_aqui`; `public/icons/*`; `scripts/gen-pwa-icons.ts`, `scripts/reslug-imoveis.ts`; `src/lib/` sections, sections-sanitize, section-data, city-pages, partners, df-cities, ai-sections, ai-blog, ai-vision, blog, area-insight, area-insight-shared, valuation, finance, property-slug, price-history, property-search, property-compare, property-features, gallery-groups, favorites, share, youtube; `src/app/admin/` cidades, parceiros, alertas; `src/app/api/admin/` cidades, parceiros, ia/secao, regiao, blog/[id]/duplicar, blog/ia, blog/shared.ts, estudos/[id]/analisar-fotos, estudos/[id]/amostras/[sampleId]/analisar-fotos; `src/app/api/` alertas, busca-ia, vender; `src/app/` cidades, parceiros, vender, blog/rss.xml, manifest.ts; `src/components/admin/` SectionEditor, sections/*, AreaInsightPanel; `src/components/public/` SectionRenderer, GalleryLightbox, PartnersStrip, BlogCard, BlogShare, BlogToc, AreaInsightBlock, AreaInsightTabs, FeatureGroups, FinanceSimulator, HomeSearch, HomeSections, HomeShowcase, MobileActionBar, PriceDropAlert, PropertySummaryBar, SellWizard; testes `sections`, `blog`, `finance`, `property-slug`, `price-history`, `v1_3`.

**Alterados (34):** `package.json` (1.3.0), `prisma/schema.prisma`, `.env.example`, `ALTERACOES.md`; `src/app/` layout, page, sitemap, globals.css, imoveis/page, imoveis/[slug]/page, empreendimentos/page, empreendimentos/[slug]/page, blog/page, blog/[slug]/page, admin/layout, admin/blog/*, admin/empreendimentos/[id]/page, admin/estudos/[id]/page; `src/app/api/` imoveis/route, imoveis/[id]/route, admin/blog/route, admin/blog/[id]/route; `src/components/admin/` AdminSidebar, BlogPostEditor, PropertyForm/TabPrincipal; `src/components/public/` Header, Footer, PublicShell, ContactForm, PropertyCard, PropertyCarousel, PropertyFilters, PropertyGallery, WhatsAppButton.

**Removido:** `src/app/blog/[slug]/BlogContent.tsx`.

---

# Histórico — Alterações v1.2

**Versão:** 1.2 · **Data:** 29/09/2026 · **Base:** `paulopop-v1.1.zip` · **Pacote:** `paulopop-v1.2.zip`

**Novo na 1.2:** hub de empreendimentos (blocos, andares, tipologias e mapa de unidades gerados no painel; anúncios ligados à unidade aparecem na página do prédio como disponíveis, vendidos ou alugados; estágio Lançamento / Em obras / Pronto para morar) e o **Estudo de Mercado refeito no padrão RE/MAX** (amostras dos portais, estatística, cenários competitivo/mercado/otimista, parecer, link público e PDF em lâminas 16:9 com os dados do corretor logado). Publique depois da 1.1: a migração desta versão roda sozinha na subida do contêiner.

> Esta versão faz parte da sequência 1.1 → 1.2 → 1.3. As três podem ser publicadas uma após a outra no mesmo dia; cada uma tem a sua migração e nenhuma depende de preencher conteúdo antes da próxima. O histórico da 1.1 continua no fim deste arquivo.

## 1. Resumo

| Área | Como era | Como ficou |
|---|---|---|
| Empreendimentos — cadastro | Só nome, endereço, descrição, fotos, faixas de quartos/área e lista solta de anúncios. | Campos novos: **estágio** (Lançamento, Em obras, Pronto para morar), ano de entrega, construtora, elevadores por bloco, condomínio médio, aceita pets, regras. Nova aba **Estrutura e unidades**: tipologias (nome, quartos, suítes, banheiros, área, vagas, posição solar, planta, finais de apartamento) e blocos (andares, unidades por andar, primeiro andar, numeração andar+sequência ou sequencial). O painel gera a matriz de unidades (ex.: 101…104, 201…204) e atribui a tipologia pelo final; unidades já ligadas a um anúncio nunca são apagadas ao regenerar. |
| Empreendimentos — anúncio ligado à unidade | Anúncio só apontava para o empreendimento. | Na ficha do imóvel (aba Principal) escolhe-se **bloco e unidade**; ao escolher, o anúncio herda empreendimento, andar e, se estiverem vazios, quartos/suítes/banheiros/área/vagas da tipologia. Cada unidade aceita um anúncio ativo por vez. |
| Página pública do prédio | Descrição, galeria e carrossel de anúncios. | Hub novo antes da galeria: "Este prédio em números" (estágio, à venda agora, para alugar agora, preço médio do m² dos anúncios ou vendidos), **Unidades disponíveis** (carrossel dos anúncios ativos), **Negociados neste prédio** (vendidos/alugados com tempo médio de venda), **Mapa de unidades** por bloco e andar (verde = anunciado, clicável; vermelho = vendido; laranja = alugado; cinza = sem anúncio) e dois CTAs de WhatsApp: "Avise-me quando surgir unidade" e "Tem apartamento neste prédio? Avalie grátis". Selo do estágio e fatos (construtora, elevadores, condomínio) no topo. Lista `/empreendimentos` ordenada por estágio (lançamentos primeiro) com contagem de unidades à venda. A página do imóvel ganhou o bloco "Conheça o prédio" com link para o hub. |
| Estudo de mercado | Tela "Análise de Mercado" com cálculo simples em memória, sem amostras salvas, sem PDF e sem dados do corretor. | Menu **Estudos de mercado** (`/admin/estudos`): lista com busca; novo estudo em branco ou a partir de um imóvel cadastrado (copia endereço, áreas, quartos, fotos e proprietário). Editor em abas: **Estudo** (para quem, data, raio, textos de introdução e metodologia já preenchidos no padrão RE/MAX), **Imóvel avaliado** (endereço, áreas, quartos, suítes, banheiros, vagas, andar, posição solar, idade, condomínio, elevador, conservação, acabamentos: piso, forro, pintura, esquadrias, armários…, fotos), **Amostras** (colar o link do anúncio — DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb, Chaves na Mão — e o sistema tenta ler preço, área, quartos, foto e portal; ou preencher à mão; mesmo condomínio, distância, dias anunciado, reforma, acabamentos, válida/descartada com motivo), **Cálculo e parecer** (média/mediana/desvio padrão/coeficiente de variação do R$/m², desvio de cada amostra com aviso de discrepante ±30 % e de anúncio antigo > 180 dias; valores competitivo −15 %, mercado e otimista +10 % — percentuais ajustáveis; cenário escolhido e ajuste manual com justificativa) e **Publicar / PDF** (link público com validade, botão Baixar PDF). Os dados do corretor (nome, CRECI, foto, telefones, imobiliária, CRECI-J) saem do **usuário logado** (Meu perfil). Corretor comum vê só os próprios estudos; admin vê todos. |
| Relatório do estudo | — | `/estudo/[token]`: 14+ lâminas 16:9 no modelo do PDF RE/MAX (capa com "preparado para", imóvel e data; preço × tempo de venda; metodologia; imóvel avaliado com valor de mercado e média do m²; registro fotográfico; uma lâmina por amostra com selo válida/descartada/mesmo condomínio/anúncio antigo e botão "Ver anúncio no portal"; resumo comparativo; análise estatística; comparativo final com barras e valor sugerido; contracapa com os dados do corretor e RE/MAX). Página sem cabeçalho/rodapé do site, `noindex`, fora do robots; "Baixar PDF" usa a impressão do navegador com página 297 × 167 mm, uma lâmina por página. |
| Banco de dados | — | Migração `20260930000000_v1_2_empreendimentos_estudo` (seção 4): 7 colunas em `empreendimentos`, tabelas `empreendimento_blocks`, `empreendimento_unit_types`, `empreendimento_units`, `market_studies`, `market_study_samples`, coluna `properties.unitId`. Só adiciona; idempotente. |

## 2. Como publicar (passo a passo)

> Pré-requisito: a 1.1 já publicada (ou publique a 1.1 e logo em seguida a 1.2 — as migrações rodam em ordem). Nenhuma variável de ambiente nova.

### 2.1 Backup

```bash
docker compose exec postgres pg_dump -U paulopop paulopop > backup-antes-v1.2.sql
```

### 2.2 Atualizar o código

1. Substitua o código pela pasta `paulopop-master/` do pacote `paulopop-v1.2.zip` (mantenha o `.env` do servidor).
2. `docker compose up -d --build` — o `scripts/docker-start.sh` aplica a migração da 1.2 antes de subir.

### 2.3 Conferência depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/empreendimentos            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/admin/estudos         # 401 (sem login)
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/estudo/qualquercoisa      # 404
curl -s https://corretorpaulopop.com/robots.txt | grep estudo                                    # Disallow: /estudo/
```

- ☐ Painel → Empreendimentos → abrir um → aba **Estrutura e unidades** → cadastrar 1 tipologia (finais "1,2,3,4") e 1 bloco (4 andares × 4 por andar) → **Salvar estrutura** → aparece a matriz 101…404.
- ☐ Painel → Imóveis → um apartamento desse prédio → aba Principal → escolher **Bloco/Unidade** → salvar. No site, a página do prédio mostra o apartamento em "Unidades disponíveis" e a unidade em verde no mapa.
- ☐ Painel → **Estudos de mercado** → Novo estudo a partir de um imóvel → aba Amostras → colar 3 links de anúncios (ou preencher à mão) → aba Cálculo mostra média, cenários e valor sugerido → **Publicar** → abrir o link → **Baixar PDF** (Chrome: destino "Salvar como PDF", margens padrão, "Gráficos de fundo" ligado).
- ☐ Meu perfil com CRECI, foto, WhatsApp e RE/MAX Inovelar preenchidos — a capa e a contracapa do estudo usam esses dados.
- ☐ Celular (390 px): `/empreendimentos/[slug]` e `/estudo/[token]` sem rolagem lateral.

### 2.4 Conteúdo que o Paulo preenche no painel

- **Empreendimentos:** estágio, construtora, ano de entrega, condomínio médio; tipologias e blocos dos prédios que ele mais trabalha (Parque Riacho 21 etc.); ligar os anúncios às unidades.
- **Estudos de mercado:** os estudos antigos feitos em PDF pela Remarkt podem ser recadastrados; os novos saem direto do painel.

### 2.5 Voltar atrás (rollback)

Suba o código 1.1. As tabelas novas podem ficar (o código 1.1 as ignora). Para remover: `ALTER TABLE "properties" DROP COLUMN "unitId"; DROP TABLE "market_study_samples", "market_studies", "empreendimento_units", "empreendimento_unit_types", "empreendimento_blocks"; ALTER TABLE "empreendimentos" DROP COLUMN "stage", DROP COLUMN "deliveryYear", DROP COLUMN "builder", DROP COLUMN "elevators", DROP COLUMN "condoFeeAvg", DROP COLUMN "petsAllowed", DROP COLUMN "rules";` e apague a linha `20260930000000_v1_2_empreendimentos_estudo` de `_prisma_migrations`.

## 3. Mudanças por área

### 3.1 Hub de empreendimentos (1.2)

**Como era:** empreendimento era só uma "etiqueta" com fotos; os apartamentos não tinham relação com bloco/andar/unidade.

**Como ficou:** modelos `EmpreendimentoBlock`, `EmpreendimentoUnitType` e `EmpreendimentoUnit` (única por bloco + número) e `Property.unitId`. `src/lib/empreendimento-units.ts` gera a numeração (`generateUnitNumbers`), extrai o final (`unitFinal`) e escolhe a tipologia (`pickUnitType`); limites de 200 andares × 60 unidades. Rota `PUT /api/admin/empreendimentos/[id]/estrutura` salva tipologias e blocos numa transação, gera/regenera a matriz sem apagar unidades ligadas a anúncio e atualiza `totalUnits`. `GET /api/empreendimentos/[id]/unidades` alimenta o seletor da ficha do imóvel. `PUT /api/imoveis/[id]` valida a unidade (pertence ao empreendimento, não está ocupada por outro anúncio ativo) e herda os campos da tipologia. Componente público `EmpreendimentoHub` (server component, consultas em paralelo) e `EstruturaEditor` no painel. Lista e página do prédio com selo de estágio (`STAGE_LABEL`/`STAGE_ORDER`).

**Arquivos:** `prisma/schema.prisma`, `src/lib/empreendimento-units.ts` (novo), `src/app/api/admin/empreendimentos/[id]/estrutura/route.ts` (novo), `src/app/api/empreendimentos/[id]/unidades/route.ts` (novo), `src/app/api/empreendimentos/[id]/route.ts`, `src/app/api/imoveis/[id]/route.ts`, `src/lib/property-update.ts`, `src/components/admin/EstruturaEditor.tsx` (novo), `src/app/admin/empreendimentos/[id]/page.tsx`, `src/components/admin/PropertyForm/TabPrincipal.tsx`, `src/components/public/EmpreendimentoHub.tsx` (novo), `src/app/empreendimentos/page.tsx`, `src/app/empreendimentos/[slug]/page.tsx`, `src/app/imoveis/[slug]/page.tsx`.

### 3.2 Estudo de mercado no padrão RE/MAX (1.2)

**Como era:** `/admin/analise-mercado` calculava uma média em memória a partir dos imóveis cadastrados; nada era salvo nem impresso.

**Como ficou:** modelos `MarketStudy` (imóvel avaliado, textos, parâmetros, cenário, resultados em JSON, token público com validade) e `MarketStudySample` (uma linha por anúncio de portal, com status válida/descartada). `src/lib/market-study.ts` faz a estatística (`computeStudy`: média, mediana, desvio padrão, CV, mín/máx, desvio de cada amostra, discrepantes, anúncios antigos, valores por cenário e valor sugerido com ajuste), `distanceKm` (Haversine), `portalFromUrl`, textos padrão. Rotas: `GET/POST /api/admin/estudos`, `GET/PUT/DELETE /api/admin/estudos/[id]` (PUT substitui as amostras e recalcula numa transação), `POST /api/admin/estudos/[id]/amostra-link` (baixa a página do anúncio e lê Open Graph, JSON-LD e padrões de texto; se o portal bloquear, cria a amostra só com o link e o portal), `POST/DELETE /api/admin/estudos/[id]/publicar` (token de 16 caracteres, validade padrão 60 dias, status Concluído). Página `/estudo/[token]` com `StudyReport` (lâminas) e `PrintButton`; CSS de impressão em `globals.css` (`@page 297mm 167mm`, `.study-slide` = 1 página). `PublicShell` não renderiza cabeçalho/rodapé em `/estudo/`. A antiga `/admin/analise-mercado` redireciona para `/admin/estudos`; os botões "Análise" da ficha do imóvel e de Relatórios abrem "Novo estudo" já com o imóvel selecionado (`/admin/estudos?propertyId=`).

**Arquivos:** `prisma/schema.prisma`, `src/lib/market-study.ts` (novo), `src/lib/market-study-db.ts` (novo), `src/app/api/admin/estudos/**` (novos), `src/app/admin/estudos/page.tsx` e `[id]/page.tsx` (novos), `src/app/estudo/[token]/page.tsx` (novo), `src/components/public/StudyReport.tsx` (novo), `src/components/public/PrintButton.tsx` (novo), `src/components/public/PublicShell.tsx`, `src/app/globals.css`, `src/app/robots.ts`, `src/app/admin/analise-mercado/page.tsx` (agora só redireciona; `MarketAnalysisClient.tsx` removido), `src/components/admin/AdminSidebar.tsx`, `src/app/admin/layout.tsx`, `src/components/admin/PropertyForm/index.tsx`, `src/app/admin/relatorios/page.tsx`.

## 4. Banco de dados

Migração `prisma/migrations/20260930000000_v1_2_empreendimentos_estudo/migration.sql` (idempotente: `IF NOT EXISTS` e bloco `DO` para a chave estrangeira).

| Tabela | Colunas | Uso |
|---|---|---|
| `empreendimentos` | `stage` TEXT (padrão `ENTREGUE`), `deliveryYear` INT, `builder` TEXT, `elevators` INT, `condoFeeAvg` DECIMAL(10,2), `petsAllowed` BOOLEAN, `rules` TEXT | Estágio e fatos do prédio |
| `empreendimento_blocks` (nova) | `name`, `floors`, `unitsPerFloor`, `firstFloor`, `numbering`, `order` | Blocos |
| `empreendimento_unit_types` (nova) | `name`, `bedrooms`, `suites`, `bathrooms`, `area`, `parking`, `sunPosition`, `floorPlanUrl`, `finals`, `order` | Tipologias |
| `empreendimento_units` (nova) | `blockId`, `floor`, `number`, `unitTypeId`, `notes`; única (`blockId`,`number`) | Matriz de unidades |
| `properties` | `unitId` TEXT → `empreendimento_units` (ON DELETE SET NULL) | Anúncio ligado à unidade |
| `market_studies` (nova) | corretor, imóvel opcional, status, textos, campos do imóvel avaliado, `finishes`/`photos`/`results` JSON, percentuais, cenário, ajuste, `publicToken` único, `tokenExpiresAt` | Estudo |
| `market_study_samples` (nova) | portal, link, anunciante, local, mesmo condomínio, preço, áreas, quartos, banheiros, vagas, andar, posição, reforma, condomínio, idade, distância, publicado em, dias, foto, acabamentos, observações, status, motivo, lat/lng | Amostras |

Índices: `empreendimento_units_empreendimentoId_idx`, `market_studies_agentId_status_idx`, `market_study_samples_studyId_idx`. As migrações da 1.0 e 1.1 continuam no pacote.

## 5. API

| Método | Rota | Acesso | Observação |
|---|---|---|---|
| GET/PUT | `/api/admin/empreendimentos/[id]/estrutura` | Login | PUT `{ unitTypes[], blocks[], regenerate? }` → devolve blocos, tipologias e unidades (com o anúncio ligado). **Novo.** |
| GET | `/api/empreendimentos/[id]/unidades` | Login | Unidades com bloco, tipologia e anúncio atual (para o seletor). **Novo.** |
| PUT | `/api/empreendimentos/[id]` | Login | Aceita `stage`, `deliveryYear`, `builder`, `elevators`, `condoFeeAvg`, `petsAllowed`, `rules`. |
| PUT | `/api/imoveis/[id]` | Login + permissão | Aceita `unitId` (valida e herda campos da tipologia). |
| GET/POST | `/api/admin/estudos` | Login (corretor: só os seus) | `?q=` busca; POST `{ propertyId?, title?, preparedFor? }`. **Novo.** |
| GET/PUT/DELETE | `/api/admin/estudos/[id]` | Login + dono ou admin | PUT com todos os campos + `samples[]` (substitui e recalcula). **Novo.** |
| POST | `/api/admin/estudos/[id]/amostra-link` | Login + dono ou admin | `{ url }` → amostra criada com o que foi possível ler. **Novo.** |
| POST/DELETE | `/api/admin/estudos/[id]/publicar` | Login + dono ou admin | `{ days? }` (1–365, padrão 60) → `{ token, url, expiresAt }`; DELETE revoga. **Novo.** |
| GET | `/estudo/[token]` | Público com o link | Página do relatório; expira na data; `noindex`. **Novo.** |

## 6. Variáveis de ambiente

Nenhuma nova. A leitura de links de portais (`amostra-link`) precisa de saída HTTPS do contêiner para os portais; sem isso, a amostra é criada só com o link.

## 7. Testes

**Testado (29/09/2026):**
- `npx tsc --noEmit` sem erros e `next build` completo.
- Vitest: 51 testes (45 da 1.1 + 6 novos em `tests/unit/v1_2.test.ts`: matriz de unidades, finais/tipologia, estatística do estudo, cenários e ajuste, discrepantes/anúncios antigos, utilitários).
- Migração aplicada sobre um banco com 1.0 + 1.1 (PostgreSQL 16).
- Playwright (Chromium, 1366 px e 390 px): criação de empreendimento com 2 tipologias e 2 blocos (32 unidades) pela API, 3 anúncios ligados a unidades (2 ativos, 1 vendido), página do prédio com números, unidades disponíveis, negociados e mapa colorido; estudo criado a partir de um imóvel, 5 amostras (1 descartada) → média R$ 4.297,46/m², mercado R$ 268.591, competitivo R$ 228.303, otimista R$ 295.450, sugerido com ajuste −2 %; link publicado; `/estudo/[token]` sem rolagem lateral; impressão em PDF com 14 páginas (1 lâmina por página); painel: editor do empreendimento (aba Estrutura), lista e editor de estudos (5 abas), ficha do imóvel com seletor de unidade — tudo sem erros de console.

**Não testado:**
- Leitura real de anúncios dos portais (ambiente sem acesso aos portais): conferir no servidor colando um link do DF Imóveis e outro da OLX; se vier só o link, preencher à mão.
- Envio do link do estudo por e-mail/WhatsApp (o link é copiado do painel).

## 8. Pendências (não incluídas nesta versão)

- v1.3: hub Cidades do DF, Parceiros, blog moderno, bloco "Viver aqui" por endereço (chave Google Maps Platform), página do imóvel e galeria novas, home nova, busca por mapa/IA, PWA, página "Vender meu imóvel", endereços com bairro, editor de seções reutilizável.
- Estudo de mercado: busca automática de amostras nos portais (hoje é por link colado) e leitura de piso/forro/pintura pelas fotos (IA) — dependem de serviço externo e ficam para uma versão seguinte.
- Fora do código: DNS do `www.corretorpaulopop.com`.

## 9. Arquivos

**Novos**
- `prisma/migrations/20260930000000_v1_2_empreendimentos_estudo/migration.sql`
- `src/lib/empreendimento-units.ts`, `src/lib/market-study.ts`, `src/lib/market-study-db.ts`
- `src/app/api/admin/empreendimentos/[id]/estrutura/route.ts`, `src/app/api/empreendimentos/[id]/unidades/route.ts`
- `src/app/api/admin/estudos/route.ts`, `src/app/api/admin/estudos/[id]/route.ts`, `.../[id]/amostra-link/route.ts`, `.../[id]/publicar/route.ts`
- `src/app/admin/estudos/page.tsx`, `src/app/admin/estudos/[id]/page.tsx`, `src/app/estudo/[token]/page.tsx`
- `src/components/admin/EstruturaEditor.tsx`, `src/components/public/EmpreendimentoHub.tsx`, `src/components/public/StudyReport.tsx`, `src/components/public/PrintButton.tsx`
- `tests/unit/v1_2.test.ts`

**Alterados**
- `package.json` (1.2.0), `prisma/schema.prisma`, `ALTERACOES.md`
- `src/app/globals.css`, `src/app/robots.ts`, `src/app/admin/layout.tsx`, `src/app/admin/analise-mercado/page.tsx`, `src/app/admin/empreendimentos/[id]/page.tsx`, `src/app/admin/relatorios/page.tsx`
- `src/app/api/empreendimentos/[id]/route.ts`, `src/app/api/imoveis/[id]/route.ts`, `src/lib/property-update.ts`
- `src/app/empreendimentos/page.tsx`, `src/app/empreendimentos/[slug]/page.tsx`, `src/app/imoveis/[slug]/page.tsx`
- `src/components/admin/AdminSidebar.tsx`, `src/components/admin/PropertyForm/index.tsx`, `src/components/admin/PropertyForm/TabPrincipal.tsx`, `src/components/public/PublicShell.tsx`

**Removidos**
- `src/app/admin/analise-mercado/MarketAnalysisClient.tsx`

---

# Histórico — Alterações v1.1

**Versão:** 1.1 · **Data:** 29/09/2026 · **Base:** `paulopop-v1.0.zip` (24/09/2026) · **Pacote:** `paulopop-v1.1.zip`

**Novo na 1.1:** segurança do painel e das APIs, identidade visual do AcademyPop (azul-marinho + laranja, fonte Inter), registro de venda/locação com desconto e tempo de mercado, rastreamento (GA4, Meta Pixel, GTM) e páginas legais editáveis pelo painel, lead direto para o corretor do imóvel, SEO (domínio real, canonical, títulos, og:image), Meu perfil, cache das páginas públicas e várias correções do diagnóstico de 24/09.

> **Versão 1.0 (24/09/2026):** importação de anúncios da RE/MAX pelo link e página do imóvel no padrão RE/MAX. As mudanças da 1.0 continuam descritas na seção 3 (itens marcados com 1.0).

## 1. Resumo

| Área | Como era | Como ficou |
|---|---|---|
| Segurança das APIs (1.1) | `GET /api/leads` e `GET /api/imoveis?admin=true` respondiam sem login (lista de contatos e imóveis com comissões e proprietário). `GET /api/imoveis/[id]` trazia proprietário (CPF), leads e atividades. `limit` sem teto. | Login obrigatório; corretor comum vê só os próprios imóveis e leads. Sem login, o detalhe do imóvel sai no formato público (sem comissões, proprietário, documentos internos, financeiro). `limit` máximo 50. |
| Permissões por perfil (1.1) | Qualquer usuário logado criava administradores, mudava o próprio papel e editava/apagava imóveis dos outros. | `requireRole()`/`canManageProperty()` em `src/lib/authz.ts`: só ADMIN/SUPER_ADMIN gerenciam corretores e configurações; AGENT edita só os próprios imóveis (lista, ficha, ações em lote); menu do painel esconde Corretores e Configurações para AGENT; só SUPER_ADMIN cria outro SUPER_ADMIN; ninguém desativa a si mesmo; senha mínima de 8 caracteres. |
| Relatório do proprietário (1.1) | Qualquer senha de 5 caracteres abria o relatório; o envio por e-mail não pedia login e enviava para qualquer endereço. | Senha gerada pelo corretor logado, gravada como hash (`reportPasswordHash`), enviada por e-mail; o GET só devolve os campos do relatório; corretor com acesso ao imóvel abre sem senha; 20 tentativas por IP a cada 15 min. |
| HTML do blog e e-mails (1.1) | Conteúdo do blog gravado e exibido sem limpeza; dados do formulário entravam direto no HTML do e-mail. | `sanitizeHtml()` com lista de tags/atributos (mantém links, imagens e tabelas do editor), aplicado ao salvar e ao exibir; `escapeHtml()` em todos os campos dos e-mails; depoimentos públicos sem HTML e com limite de 3 por IP/hora. |
| Senhas e login (1.1) | Segredo de sessão padrão no código, seed que redefinia a senha do admin para `admin123` a cada execução, banco exposto na porta 5432, login sem limite de tentativas. | `NEXTAUTH_SECRET` obrigatório (o compose não sobe sem ele); seed cria o admin só se não existir, com `ADMIN_PASSWORD`; banco só em `127.0.0.1:65432` (variável `POSTGRES_EXPOSE_PORT`); 5 tentativas por IP e por e-mail a cada 15 min, com aviso na tela de login. |
| Identidade visual (1.1) | Azul `#0D2F5E`/`#2E86DE`, títulos em Playfair (serif) e DM Sans via Google Fonts. | Paleta do AcademyPop: azul-marinho `#1e3a8a` (tema), azul `#2563eb` (links), laranja `#ea580c` (botões de ação), fonte Inter servida pelo próprio site (`@fontsource-variable/inter`), classes `.btn-primary`, `.card`, `.section-title` iguais às do AcademyPop. Build não depende mais do Google Fonts. |
| Venda / locação concluída (1.1) | Só existia o status Vendido/Alugado, sem data, valor final, desconto ou tempo. | Botão **Vendido/Alugado** na ficha do imóvel: data, valor final, desconto em % e R$ (calculado), origem do comprador, observação, opção de mostrar o valor no site. Tempo de mercado calculado da publicação até a venda e exibido como "23 dias" ou "1 ano, 2 meses e 5 dias". Selo "Vendido em X" nos cards, seção "Vendidos e alugados recentemente" na home, carrossel de vendidos na página do imóvel, resumo em Admin → Relatórios (ticket médio, desconto médio, tempo médio, por cidade). |
| Rastreamento (1.1) | Só GTM por variável de ambiente; CSP bloqueava o Pixel. | Configurações → **Rastreamento**: GA4, Meta Pixel e GTM. Eventos `page_view`, `view_item` (imóvel), `generate_lead` (formulário), `whatsapp_click` (qualquer link do WhatsApp). Nada carrega em /admin. CSP liberada para GA4/Pixel. |
| Lead para o corretor (1.1) | Todo contato ia para um e-mail fixo, sem link do imóvel. | E-mail vai para o corretor do imóvel (admin em cópia) com link do anúncio, código e botão "Responder no WhatsApp"; o lead grava `agentId`; corretor comum vê só os seus leads. |
| Páginas legais e contato (1.1) | `/politica-de-privacidade` e `/termos-de-uso` davam 404. | Páginas criadas com texto editável em Configurações → **Páginas legais** (texto padrão com nome, CRECI e e-mail quando em branco); aviso LGPD no formulário; Contato com horário de atendimento, link do perfil no Google e mapa incorporado (todos pelo painel). |
| SEO (1.1) | robots apontava para `paulopop.com.br`; og:image com `localhost`; sem canonical; título "Imóveis \| Paulo Pop \| Paulo Pop"; textos sem acento. | `src/lib/site.ts` com o domínio real; `metadataBase`, canonical em todas as páginas públicas, título/descrição do painel na home, og:image padrão (`/og-default.jpg`, trocável no painel), títulos sem repetição, acentos corrigidos, `/relatorio/` fora do robots. |
| Cards e ficha (1.1) | Cards sem varandas; capa em branco quando ninguém marcava a foto de capa. | Campo **Varandas**; cards mostram m² útil, suítes, vagas e varandas; capa = foto marcada ou a primeira; ao salvar, a primeira foto vira capa se nenhuma estiver marcada. |
| Empreendimentos (1.1) | Vídeo, tour virtual e suítes não eram salvos pela tela de edição. | Rota `/api/empreendimentos/[id]` grava `youtubeUrl`, `virtualTourUrl`, `virtualTourType`, `suitesMin/Max`. |
| Salvar imóvel (1.1) | Fotos, vídeos e características gravados um a um, sem transação. | `prisma.$transaction` + `createMany`; erro no meio não deixa o imóvel pela metade. |
| Cache e velocidade (1.1) | Tudo gerado do zero a cada visita; script do Elfsight em todas as páginas. | Configuração, cidades e consultas da home em cache de 60 s (`unstable_cache`), renovado na hora ao salvar no painel (`revalidateSite`); Elfsight só nas páginas com o widget e depois do carregamento. |
| Home e rodapé (1.1) | Telefones cortados ("(61) 9..."); "Área do Corretor" no rodapé público; cidade duplicada ("Samambaia" e "Samambaia - DF"); filtro com 27 estados. | Telefones completos e clicáveis; link do painel removido do rodapé; cidades unificadas; filtro por cidade e bairro a partir dos imóveis publicados; depoimentos aprovados exibidos na home e no Sobre; logomarca do painel no cabeçalho. |
| Meu perfil (1.1) | Corretor não editava os próprios dados. | Painel → **Meu perfil**: nome, CRECI, foto, telefones, imobiliária, apresentação, redes e troca de senha. Usado nos anúncios, e-mails e relatórios (e no estudo de mercado da v1.2). |
| Banco de dados (1.1) | — | Migração `20260929000000_v1_1_seguranca_vendas` (seção 4). |

## 2. Como publicar (passo a passo)

> A versão 1.1 inclui uma migração de banco (só adiciona colunas; roda sozinha na subida do contêiner) e **exige** as variáveis `NEXTAUTH_SECRET` e, na primeira instalação, `ADMIN_PASSWORD`. Se você já está na 1.0 e vai só para a 1.1: substitua o código, confira o `.env` (passo 2.2) e suba.

### 2.1 Backup

```bash
docker compose exec postgres pg_dump -U paulopop paulopop > backup-antes-v1.1.sql
docker compose exec app tar czf - -C /app/public/uploads . > uploads-antes-v1.1.tgz
```

### 2.2 Atualizar o código e o .env

1. Substitua o código pela pasta `paulopop-master/` do pacote `paulopop-v1.1.zip` (mantenha o `.env`/`.env.local` do servidor).
2. No `.env` do servidor, confira:
   - `NEXTAUTH_SECRET` com pelo menos 32 caracteres (`openssl rand -base64 32`). **Sem ele o `docker compose up` para com erro** (proposital).
   - `NEXT_PUBLIC_SITE_URL=https://corretorpaulopop.com` (usado nas metatags, e-mails e sitemap).
   - Opcional: `POSTGRES_PASSWORD` (padrão antigo `paulopop123`; se mudar, mude também no volume do banco), `POSTGRES_EXPOSE_PORT=127.0.0.1:5432` se algum programa externo acessa o banco (padrão novo: só `127.0.0.1:65432`).
   - Só na primeira instalação (`RUN_SEED=true`): `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 8) e `ADMIN_NAME`. O seed **não** mexe em administrador que já existe.
3. Suba: `docker compose up -d --build`.

### 2.3 Conferência depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/api/leads              # 401 (antes era 200)
curl -s -o /dev/null -w "%{http_code}\n" "https://corretorpaulopop.com/api/imoveis?admin=true" # 401
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/politica-de-privacidade  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://corretorpaulopop.com/termos-de-uso            # 200
curl -s https://corretorpaulopop.com/robots.txt                                                # Sitemap: https://corretorpaulopop.com/sitemap.xml
curl -s https://corretorpaulopop.com/ | grep -o 'og:image" content="[^"]*"'                    # https://corretorpaulopop.com/og-default.jpg (ou a imagem do painel)
```

- ☐ Home com as cores novas (azul-marinho e botões laranja) e fonte Inter; telefones completos no bloco do corretor; sem "Área do Corretor" no rodapé.
- ☐ Painel → Meu perfil abre e salva; Configurações tem as abas Rastreamento e Páginas legais (só para administrador).
- ☐ Ficha de um imóvel → botão **Vendido** → registrar com valor final: a ficha mostra "Vendido · em N dias · desconto X%", a home ganha a seção "Vendidos e alugados recentemente" e Admin → Relatórios mostra o resumo. Depois, se quiser, **Registro da venda → Desfazer e reativar**.
- ☐ Formulário de contato de um imóvel: o e-mail chega ao corretor do imóvel com link e botão de WhatsApp (precisa de SMTP configurado).
- ☐ Login com senha errada 6 vezes mostra "Muitas tentativas".
- ☐ Celular (390 px): home, lista, imóvel e contato sem rolagem lateral.

### 2.4 Conteúdo que o Paulo preenche no painel

- **Configurações → Rastreamento:** ID do GA4 (G-…), ID do Meta Pixel e/ou GTM.
- **Configurações → Páginas legais:** revisar os textos padrão de Política de Privacidade e Termos de Uso; horário de atendimento; link do perfil no Google; mapa incorporado.
- **Configurações → SEO:** imagem de compartilhamento 1200×630 (senão o site usa `/og-default.jpg`).
- **Meu perfil:** CRECI, foto, WhatsApp, RE/MAX Inovelar e CRECI-J.
- **Imóveis já vendidos:** abrir cada um e registrar a venda (data, valor, origem) para alimentar os números.
- **Depoimentos:** aprovar em Admin → Depoimentos os que devem aparecer na home e no Sobre.

### 2.5 Voltar atrás (rollback)

Suba o código anterior (1.0). As colunas novas podem ficar no banco (o código antigo as ignora). Para remover: `ALTER TABLE "properties" DROP COLUMN "balconies", DROP COLUMN "soldAt", DROP COLUMN "listPriceAtSale", DROP COLUMN "salePrice", DROP COLUMN "saleDiscountPct", DROP COLUMN "saleDiscountValue", DROP COLUMN "saleSource", DROP COLUMN "saleNotes", DROP COLUMN "showSalePrice", DROP COLUMN "daysOnMarket", DROP COLUMN "reportPasswordHash", DROP COLUMN "reportPasswordSetAt"; ALTER TABLE "site_config" DROP COLUMN "ga4Id", DROP COLUMN "metaPixelId", DROP COLUMN "gtmId", DROP COLUMN "privacyPolicy", DROP COLUMN "termsOfUse", DROP COLUMN "businessHours", DROP COLUMN "googleBusinessUrl", DROP COLUMN "mapEmbedUrl";` e apague a linha `20260929000000_v1_1_seguranca_vendas` de `_prisma_migrations`. O código 1.0 volta a aceitar `NEXTAUTH_SECRET` padrão, então mantenha o segredo no `.env` mesmo assim.

## 3. Mudanças por área

### 3.1 Segurança (1.1)

**Como era:** rotas do painel só checavam se havia alguém logado; várias rotas públicas devolviam dados internos.

**Como ficou:** helper `src/lib/authz.ts` (`getSessionUser`, `requireSession`, `requireRole`, `canManageProperty`, `propertyScope`) usado em `/api/leads` (GET), `/api/imoveis` (GET admin, POST), `/api/imoveis/[id]` (GET/PUT/DELETE), `/api/imoveis/bulk`, `/api/admin/corretores/*`, `/api/admin/configuracoes`, `/api/relatorio/[propertyId]`, `/api/imoveis/[id]/venda`, `/api/admin/perfil`. Formato público do imóvel em `src/lib/property-public.ts`. Menu e redirecionamento por papel em `src/app/admin/layout.tsx` e `AdminSidebar.tsx`. Lista de imóveis do painel filtrada por corretor (`admin/imoveis/page.tsx`). `sanitize.ts` reescrito (tags e atributos permitidos, `escapeHtml`). `auth.ts` com segredo obrigatório e limite de tentativas; `docker-compose.yml` e `prisma/seed.ts` sem senhas padrão; `src/lib/seed.ts` (antigo, com senha fixa) removido.

**Arquivos:** `src/lib/authz.ts` (novo), `src/lib/property-public.ts` (novo), `src/lib/sanitize.ts`, `src/lib/auth.ts`, `src/lib/email.ts`, `src/app/api/**` citados, `src/app/admin/layout.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/app/admin/login/page.tsx`, `src/app/blog/[slug]/BlogContent.tsx`, `docker-compose.yml`, `prisma/seed.ts`.

### 3.2 Identidade visual do AcademyPop (1.1)

**Como era:** paleta própria e fontes do Google.

**Como ficou:** `tailwind.config.ts` com as escalas `primary` (azul) e `accent` (laranja) iguais às do AcademyPop, `globals.css` com as variáveis e classes de componente, fonte Inter pelo pacote npm, `Button` primário laranja, todas as cores fixas trocadas (71 arquivos): `#0D2F5E→#1e3a8a`, `#081E3F→#172554`, `#1A4A8A→#1e40af`, `#2E86DE→#2563eb`, `#1B6EC2→#1d4ed8`, `#5BA4F5→#60a5fa`. O vermelho RE/MAX fica só onde a marca aparece.

**Arquivos:** `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/Button.tsx`, `package.json` (`@fontsource-variable/inter`), e os arquivos recoloridos em `src/`.

### 3.3 Venda e locação concluída (1.1)

**Como era:** status SOLD/RENTED sem dados.

**Como ficou:** `src/lib/sales.ts` (`daysOnMarket`, `discount`, `formatDuration`), rota `POST/DELETE /api/imoveis/[id]/venda`, modal `SaleModal` chamado pelo botão na ficha, atividade `PROPERTY_SOLD` registrada, campos protegidos contra edição direta pelo formulário. Exibição: `PropertyCard` (selo "Vendido em …", valor final só se liberado), home (seção "Vendidos e alugados recentemente"), página do imóvel (carrossel de vendidos/alugados da cidade), Admin → Relatórios (resumo e tabela). "Salvar Alterações" em imóvel vendido mantém o status.

**Arquivos:** `src/lib/sales.ts` (novo), `src/app/api/imoveis/[id]/venda/route.ts` (novo), `src/components/admin/SaleModal.tsx` (novo), `src/components/admin/PropertyForm/index.tsx`, `src/components/public/PropertyCard.tsx`, `src/components/public/PropertyCarousel.tsx`, `src/app/page.tsx`, `src/app/imoveis/[slug]/page.tsx`, `src/app/admin/relatorios/page.tsx`, `src/lib/property-update.ts`.

### 3.4 Rastreamento, leads e e-mail (1.1)

**Como ficou:** `components/public/Analytics.tsx` (GA4/Pixel/GTM pelos IDs do painel, `trackEvent`, clique em links do WhatsApp), eventos em `ContactForm` e `ViewCounter`; CSP em `next.config.mjs`; `/api/leads` acha o corretor do imóvel e envia o e-mail para ele (`sendLeadNotificationToAgent` com `agentEmail`, `propertyUrl` e botão de WhatsApp); aviso LGPD e código do imóvel no formulário.

**Arquivos:** `src/components/public/Analytics.tsx` (novo), `src/components/public/ContactForm.tsx`, `src/components/public/ViewCounter.tsx`, `src/components/public/GoogleReviews.tsx`, `src/app/api/leads/route.ts`, `src/lib/email.ts`, `next.config.mjs`, `src/app/admin/configuracoes/page.tsx`, `src/app/api/admin/configuracoes/route.ts`.

### 3.5 SEO, páginas legais, contato e home (1.1)

**Como ficou:** `src/lib/site.ts` (`SITE_URL`, `absUrl`), `generateMetadata` no layout raiz (metadataBase, título/descrição do painel, og:image padrão), canonical e títulos nas páginas públicas, `robots.ts` e `sitemap.ts` com o domínio real; páginas `/politica-de-privacidade` e `/termos-de-uso` (`LegalText`, textos padrão em `legal-defaults.ts`); contato com horário, Google e mapa; home com telefones completos, seção de depoimentos (`Testimonials`), acentos corrigidos; rodapé sem link do painel e cidades unificadas; cabeçalho com a logomarca do painel; filtro de imóveis por cidade/bairro; cards com m² útil, suítes, vagas e varandas; capa automática.

**Arquivos:** `src/lib/site.ts` (novo), `src/lib/legal-defaults.ts` (novo), `src/components/public/LegalText.tsx` (novo), `src/components/public/Testimonials.tsx` (novo), `src/app/politica-de-privacidade/page.tsx` (novo), `src/app/termos-de-uso/page.tsx` (novo), `public/og-default.jpg` (novo), `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/page.tsx`, `src/app/imoveis/page.tsx`, `src/app/imoveis/[slug]/page.tsx`, `src/app/contato/page.tsx`, `src/app/sobre/page.tsx`, `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/empreendimentos/page.tsx`, `src/app/empreendimentos/[slug]/page.tsx`, `src/components/public/Header.tsx`, `Footer.tsx`, `PublicShell.tsx`, `SearchBar.tsx`, `PropertyFilters.tsx`, `PropertyCard.tsx`, `src/components/admin/PropertyForm/TabPrincipal.tsx`.

### 3.6 Cache, empreendimentos, salvar imóvel e Meu perfil (1.1)

**Como ficou:** `src/lib/cache.ts` (`getSiteConfigCached`, `getActiveCitiesCached`, `revalidateSite`), consultas da home em `unstable_cache`, `revalidateSite()` em todas as rotas de gravação; `/api/empreendimentos/[id]` grava vídeo, tour e suítes; `PUT /api/imoveis/[id]` em transação com `createMany`; `/admin/perfil` + `/api/admin/perfil`.

**Arquivos:** `src/lib/cache.ts` (novo), `src/app/admin/perfil/page.tsx` (novo), `src/app/api/admin/perfil/route.ts` (novo), `src/app/api/empreendimentos/[id]/route.ts`, `src/app/api/imoveis/[id]/route.ts`, rotas de gravação em `src/app/api/**`.

### 3.7 Importador da RE/MAX (1.0)

**Como era:** todo imóvel da RE/MAX era redigitado no painel.

**Como ficou:**
- O site da RE/MAX é montado no navegador; os dados vêm do índice de busca público `POST https://www.remax.com.br/search/listing-search/docs/search` (procura pelo ID entre aspas) e os rótulos em português de `/locales_v2/pt-BR/lookups.json` e `/locales_v2/pt-BR/translate.json` (guardados em memória por 24 h). O nome do corretor captador vem de `/search/agent-search/docs/search`.
- Mapeamento: tipo, transação (Venda/Alugar), status (Ativo, Vendido, Alugado), contrato exclusivo, status de mercado, categoria, uso do terreno, preço, condomínio e período, IPTU, data disponível, validade, ano e mês de construção, ambientes, dormitórios, banheiros, pisos, m², endereço completo, UF, CEP, latitude/longitude, título e descrição (HTML convertido em texto), características (as 25 fixas viram as opções do cadastro; as demais vão para "Outras características", em português), vídeo do YouTube e tour, quando houver.
- Fotos: baixadas de `cdn.gryphtech.com/userimages/{região}/LargeWM/…` (com a marca d'água RE/MAX, por decisão do Paulo), 4 por vez, até 60, gravadas como WebP + miniatura no mesmo lugar das fotos enviadas pelo painel. Foto com erro é pulada e avisada.
- O imóvel fica com o corretor que importou, ref = ID da RE/MAX, slug `tipo-venda-bairro-ID`, e guarda origem, link original, corretor captador e imobiliária. Uma atividade é registrada no histórico do imóvel.
- Reimportar o mesmo anúncio atualiza tudo e troca as fotos (as antigas são apagadas do disco).
- Plano B (botão de favoritos): o script roda na página da RE/MAX, lê os mesmos dados e mostra uma caixa com o texto para copiar; o painel aceita esse texto em "Importar dados colados".

**Arquivos:** `src/lib/remax/map.ts`, `src/lib/remax/client.ts`, `src/lib/remax/import.ts`, `src/lib/remax/bookmarklet.ts`, `src/app/api/admin/importar-remax/route.ts`, `src/app/admin/imoveis/importar/page.tsx`, `src/app/admin/imoveis/importar/ImportarRemaxClient.tsx`, `src/app/admin/imoveis/page.tsx`, `src/lib/upload.ts` (`saveImageBuffer`).

### 3.8 Página do imóvel no padrão RE/MAX (1.0)

**Como era:** título livre como H1, sem condomínio/IPTU/data disponível, ficha só com ícones, descrição depois dos ícones, sem links relacionados.

**Como ficou:** cabeçalho com tipo · transação · bairro; H1 "Tipo - Transação - Cidade, UF"; preço (ou "Consulte o valor" se o preço estiver oculto) e ID; endereço completo só quando "Mostrar endereço completo" estiver marcado; caixas de custos; selo de mercado na galeria; descrição primeiro; ficha em tabela; características fixas + livres; aviso legal; links relacionados. O formulário com o corretor continua à direita, e os imóveis similares continuam abaixo.

**Arquivos:** `src/app/imoveis/[slug]/page.tsx`.

### 3.9 Cadastro (1.0)

**Como era:** sem campo livre de características e sem mês de construção.

**Como ficou:** aba Principal com **Mês de Construção**, **Outras características** e o quadro "Importado da RE/MAX" (captador + link original). Os campos de origem não podem ser alterados pelo formulário.

**Arquivos:** `src/components/admin/PropertyForm/TabPrincipal.tsx`, `src/lib/property-update.ts`.

## 4. Banco de dados

Migração `prisma/migrations/20260929000000_v1_1_seguranca_vendas/migration.sql` (idempotente, `IF NOT EXISTS`):

| Tabela | Coluna | Tipo | Uso |
|---|---|---|---|
| `properties` | `balconies` | `INTEGER` | Varandas |
| `properties` | `soldAt` | `TIMESTAMP(3)` | Data da venda/locação |
| `properties` | `listPriceAtSale`, `salePrice`, `saleDiscountValue` | `DECIMAL(15,2)` | Valor anunciado, valor final e desconto em R$ |
| `properties` | `saleDiscountPct` | `DECIMAL(6,2)` | Desconto em % |
| `properties` | `saleSource`, `saleNotes` | `TEXT` | Origem do comprador e observação |
| `properties` | `showSalePrice` | `BOOLEAN` (false) | Mostrar o valor final no site |
| `properties` | `daysOnMarket` | `INTEGER` | Dias entre publicação e venda |
| `properties` | `reportPasswordHash`, `reportPasswordSetAt` | `TEXT`, `TIMESTAMP(3)` | Senha (hash) do relatório do proprietário |
| `site_config` | `ga4Id`, `metaPixelId`, `gtmId` | `TEXT` | Rastreamento |
| `site_config` | `privacyPolicy`, `termsOfUse` | `TEXT` | Páginas legais |
| `site_config` | `businessHours`, `googleBusinessUrl`, `mapEmbedUrl` | `TEXT` | Contato |

Índice novo: `properties_status_soldAt_idx`. A migração da 1.0 (`20260924000000_remax_import`) continua no pacote.

## 5. API

| Método | Rota | Acesso | Observação |
|---|---|---|---|
| GET | `/api/leads` | Login (admin: todos; corretor: os seus) | Antes era público. Até 500 registros. |
| GET | `/api/imoveis?admin=true` | Login | Corretor comum vê só os próprios; `limit` ≤ 50. |
| GET | `/api/imoveis/[id]` | Público (só ACTIVE, formato público) / Login (completo, só quem pode editar) | 403 para corretor de outro imóvel. |
| PUT/DELETE | `/api/imoveis/[id]` | Login + permissão no imóvel | Gravação em transação; capa automática. |
| POST | `/api/imoveis/bulk` | Login | Ações restritas ao escopo do corretor. |
| POST | `/api/imoveis/[id]/venda` | Login + permissão | `{ soldAt, salePrice, listPrice?, source, notes, showSalePrice, kind }` → marca vendido/alugado. **Novo.** |
| DELETE | `/api/imoveis/[id]/venda` | Login + permissão | Desfaz a venda (volta a ACTIVE). **Novo.** |
| GET/POST/PUT/DELETE | `/api/admin/corretores*` | ADMIN/SUPER_ADMIN (PUT do próprio perfil: qualquer logado, sem `role`/`active`/`email`) | 403 sem permissão. |
| GET/PUT | `/api/admin/configuracoes` | ADMIN/SUPER_ADMIN | Campos novos de rastreamento e páginas legais; renova o cache. |
| GET/PUT | `/api/admin/perfil` | Login | Próprio perfil; troca de senha exige a senha atual. **Novo.** |
| GET | `/api/relatorio/[propertyId]?senha=` | Senha gravada ou corretor logado | 401 senha errada, 403 sem senha gerada, 429 excesso. |
| POST | `/api/relatorio/[propertyId]` | Login + permissão | Gera senha nova, grava hash e envia e-mail; devolve `{ password, reportUrl, emailed }`. |
| POST | `/api/depoimentos` | Público | 3 por IP/hora, sem HTML. |

## 6. Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `NEXTAUTH_SECRET` | **Sim** (≥ 16 caracteres; use 32+) | O compose e o servidor recusam subir sem ela. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | Domínio real nas metatags, e-mails e sitemap (padrão: `https://corretorpaulopop.com`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Só com `RUN_SEED=true` | Administrador inicial (nunca sobrescreve um existente). |
| `POSTGRES_PASSWORD` | Não | Senha do banco (padrão mantido para não quebrar o volume atual). |
| `POSTGRES_EXPOSE_PORT` | Não | Padrão novo `127.0.0.1:65432`. |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID` | Não | Reserva; o painel tem prioridade. |

## 7. Testes

**Testado (29/09/2026):**
- `npx tsc --noEmit` sem erros e `next build` completo (sem acesso ao Google Fonts, agora desnecessário).
- Vitest: 45 testes passando (os mesmos da 1.0).
- Migração aplicada num banco criado com as migrações da 1.0 (PostgreSQL 16) e seed novo com `ADMIN_PASSWORD`.
- Sem login: `/api/leads` → 401, `/api/imoveis?admin=true` → 401, `/api/imoveis/[id]` público sem comissões/proprietário, `/api/relatorio/[id]?senha=12345` → 403.
- Navegador (Playwright, Chromium, 1366 px e 390 px): home, lista, página de imóvel, contato, sobre, política e termos sem rolagem lateral e sem erros de console; login → Meu perfil, Configurações (abas Rastreamento e Páginas legais), Relatórios, ficha do imóvel → **Vendido** → registro com valor final → ficha mostra "Vendido · em 9 meses e 1 dia · desconto 58,82%", Relatórios com o resumo e home com a seção "Vendidos e alugados recentemente".

**Não testado:**
- Envio real de e-mail (SMTP) e disparo real de GA4/Pixel (ambiente sem internet): conferir no site com os IDs do painel e o relatório Tempo real do GA4.
- Importação da RE/MAX (inalterada desde a 1.0).
- Perfil AGENT de ponta a ponta no navegador (as regras foram testadas nas rotas).

## 8. Pendências (não incluídas nesta versão)

- v1.2 (próxima): hub de empreendimentos com blocos, unidades e tipologias ligados aos anúncios; estudo de mercado refeito no padrão RE/MAX (amostras, estatística, PDF) usando o corretor logado; editor de seções reutilizável; empreendimentos com status Lançamento/Em obras/Entregue.
- v1.3: hub Cidades do DF, Parceiros, blog moderno, bloco "Viver aqui" por endereço (precisa da chave Google Maps Platform), página do imóvel e galeria novas, home nova, busca por mapa/IA, PWA, página "Vender meu imóvel", endereços dos imóveis com bairro.
- Fora do código: DNS do `www.corretorpaulopop.com` (não resolve); preencher Rastreamento, Páginas legais, Meu perfil e registrar as vendas antigas; aprovar depoimentos.
- 2FA opcional no login; envio de e-mail em fila.

## 9. Arquivos

**Novos**
- `prisma/migrations/20260929000000_v1_1_seguranca_vendas/migration.sql`
- `public/og-default.jpg`
- `src/lib/authz.ts`, `src/lib/property-public.ts`, `src/lib/site.ts`, `src/lib/cache.ts`, `src/lib/sales.ts`, `src/lib/legal-defaults.ts`
- `src/app/api/imoveis/[id]/venda/route.ts`, `src/app/api/admin/perfil/route.ts`
- `src/app/admin/perfil/page.tsx`, `src/app/politica-de-privacidade/page.tsx`, `src/app/termos-de-uso/page.tsx`
- `src/components/admin/SaleModal.tsx`, `src/components/public/Analytics.tsx`, `src/components/public/LegalText.tsx`, `src/components/public/Testimonials.tsx`

**Alterados**
- Raiz: `package.json`, `package-lock.json`, `tailwind.config.ts`, `next.config.mjs`, `docker-compose.yml`, `prisma/schema.prisma`, `prisma/seed.ts`, `ALTERACOES.md`
- `src/lib/`: `auth.ts`, `email.ts`, `sanitize.ts`, `property-update.ts`
- `src/app/`: `layout.tsx`, `globals.css`, `page.tsx`, `robots.ts`, `sitemap.ts`, `imoveis/page.tsx`, `imoveis/[slug]/page.tsx`, `contato/page.tsx`, `sobre/page.tsx`, `blog/page.tsx`, `blog/[slug]/page.tsx`, `blog/[slug]/BlogContent.tsx`, `empreendimentos/page.tsx`, `empreendimentos/[slug]/page.tsx`, `relatorio/[propertyId]/ReportClient.tsx`, `admin/layout.tsx`, `admin/login/page.tsx`, `admin/imoveis/page.tsx`, `admin/configuracoes/page.tsx`, `admin/relatorios/page.tsx`
- `src/app/api/`: `leads/route.ts`, `imoveis/route.ts`, `imoveis/[id]/route.ts`, `imoveis/bulk/route.ts`, `relatorio/[propertyId]/route.ts`, `depoimentos/route.ts`, `empreendimentos/route.ts`, `empreendimentos/[id]/route.ts`, `admin/corretores/route.ts`, `admin/corretores/[id]/route.ts`, `admin/configuracoes/route.ts`, `admin/blog/route.ts`, `admin/blog/[id]/route.ts`, `admin/depoimentos/route.ts`, `admin/depoimentos/[id]/route.ts`, `admin/empreendimentos/route.ts`, `admin/empreendimentos/[id]/route.ts`, `admin/importar-remax/route.ts`
- `src/components/`: `admin/AdminSidebar.tsx`, `admin/PropertyForm/index.tsx`, `admin/PropertyForm/TabPrincipal.tsx`, `public/Header.tsx`, `public/Footer.tsx`, `public/PublicShell.tsx`, `public/ContactForm.tsx`, `public/ViewCounter.tsx`, `public/GoogleReviews.tsx`, `public/PropertyCard.tsx`, `public/PropertyCarousel.tsx`, `public/PropertyFilters.tsx`, `public/SearchBar.tsx`, `ui/Button.tsx`

**Removido**
- `src/lib/seed.ts` (seed antigo com senha fixa; o seed oficial é `prisma/seed.ts`)
