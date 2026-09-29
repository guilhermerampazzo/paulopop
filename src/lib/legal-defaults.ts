/** v1.1 — textos padrão das páginas legais, usados quando o painel está em branco. */
interface LegalVars { name: string; creci?: string | null; email?: string | null; company?: string | null; site: string }

export function defaultPrivacyPolicy(v: LegalVars): string {
  const resp = `${v.name}${v.creci ? `, corretor de imóveis inscrito no CRECI ${v.creci}` : ''}${v.company ? `, integrante da ${v.company}` : ''}`
  return `## Quem somos
Este site (${v.site}) é mantido por ${resp}. Esta política explica quais dados pessoais coletamos, para que usamos e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

## Quais dados coletamos
- Dados que você informa nos formulários: nome, telefone, e-mail e mensagem.
- Dados de navegação: páginas visitadas, dispositivo e origem do acesso, por meio de cookies e ferramentas de medição (Google Analytics e Meta Pixel), quando ativas.
- Dados enviados pelo WhatsApp, quando você escolhe esse canal.

## Para que usamos
- Responder ao seu contato e apresentar imóveis compatíveis com o que você procura.
- Avaliar e anunciar o seu imóvel, quando você solicita.
- Entender como o site é usado e melhorar a experiência de navegação.
- Cumprir obrigações legais e regulatórias da atividade de corretagem.

## Compartilhamento
Seus dados não são vendidos. Podem ser compartilhados apenas com prestadores de serviço necessários à operação do site (hospedagem, e-mail, medição de audiência) e com a rede imobiliária à qual o corretor está vinculado, sempre para as finalidades acima.

## Por quanto tempo guardamos
Os contatos ficam armazenados enquanto houver relacionamento comercial ou pelo prazo exigido por lei. Você pode pedir a exclusão a qualquer momento.

## Seus direitos
Você pode solicitar confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, e revogar consentimentos. Para isso, escreva para ${v.email ?? 'o e-mail informado na página de contato'}.

## Cookies
Utilizamos cookies essenciais ao funcionamento do site e, quando ativos, cookies de medição de audiência. Você pode bloqueá-los nas configurações do seu navegador.

## Atualizações
Esta política pode ser atualizada. A versão vigente é sempre a publicada nesta página.`
}

export function defaultTermsOfUse(v: LegalVars): string {
  return `## Aceitação
Ao usar o site ${v.site}, você concorda com estes termos. Se não concordar, não utilize o site.

## Finalidade do site
O site apresenta imóveis para venda e locação, empreendimentos e conteúdo informativo sobre o mercado imobiliário do Distrito Federal, intermediados por ${v.name}${v.creci ? ` (CRECI ${v.creci})` : ''}.

## Informações dos anúncios
- Os dados dos imóveis (preço, área, características e disponibilidade) são fornecidos pelos proprietários e podem mudar sem aviso.
- Fotos e plantas são ilustrativas. Medidas e valores devem ser confirmados na visita e na documentação.
- Nenhuma informação do site constitui proposta vinculante; a negociação se formaliza por contrato.

## Uso do conteúdo
Textos, fotos, marcas e layout pertencem aos seus titulares. É proibido copiar, reproduzir ou usar o conteúdo para fins comerciais sem autorização.

## Responsabilidades
O site é disponibilizado como está. Fazemos o possível para mantê-lo no ar e atualizado, mas não garantimos ausência de erros ou interrupções.

## Privacidade
O tratamento dos seus dados segue a nossa Política de Privacidade.

## Foro
Estes termos são regidos pelas leis brasileiras. Fica eleito o foro de Brasília, Distrito Federal, para resolver eventuais controvérsias.`
}
