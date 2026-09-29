import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/imoveis', label: 'Imóveis' },
  { href: '/sobre', label: 'Sobre Mim' },
  { href: '/contato', label: 'Contato' },
]

const institutionalLinks = [
  { href: '/imoveis?transacao=comprar', label: 'Imóveis para Comprar' },
  { href: '/imoveis?transacao=alugar', label: 'Imóveis para Alugar' },
  { href: '/empreendimentos', label: 'Empreendimentos' },
  { href: '/parceiros', label: 'Parceiros' },
  { href: '/contato', label: 'Atendimento Personalizado' },
]

interface FooterProps {
  ownerName?: string
  ownerCompany?: string
  cities?: string[]
  /** v1.3: páginas de cidade publicadas (até 8), vindas do layout via PublicShell */
  cityPages?: Array<{ slug: string; name: string }>
}

export function Footer({ ownerName = 'Paulo Pop', ownerCompany, cities = [], cityPages = [] }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#1e3a8a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${cityPages.length > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <div className="lg:col-span-1">
            <p className="font-display text-2xl font-bold mb-2">{ownerName}</p>
            {ownerCompany && (
              <p className="text-blue-300 text-sm mb-4">{ownerCompany}</p>
            )}
            <p className="text-blue-200 text-sm leading-relaxed">
              Corretor de imóveis RE/MAX em Samambaia, Taguatinga e Águas Claras: compra, venda, locação e avaliação gratuita do seu imóvel.
              Atendimento consultivo para encontrar o imóvel certo em cada momento.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-blue-300 mb-4">
              Institucional
            </h3>
            <ul className="space-y-2">
              {institutionalLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-blue-200 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {navLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-blue-200 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {cities.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-widest text-blue-300 mb-4">
                Regiões de Atendimento
              </h3>
              <ul className="grid grid-cols-2 gap-1">
                {cities.map(city => (
                  <li key={city}>
                    <Link
                      href={`/imoveis?cidade=${encodeURIComponent(city)}`}
                      className="text-blue-200 hover:text-white text-sm transition-colors"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cityPages.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-widest text-blue-300 mb-4">
                Cidades do DF
              </h3>
              <ul className="space-y-2">
                {cityPages.slice(0, 8).map(c => (
                  <li key={c.slug}>
                    <Link href={`/cidades/${c.slug}`} className="text-blue-200 hover:text-white text-sm transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/cidades" className="text-white/90 hover:text-white text-sm font-medium transition-colors">
                    Todas as cidades →
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-blue-300 mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/politica-de-privacidade"
                  className="text-blue-200 hover:text-white text-sm transition-colors"
                >
                  Politica de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/termos-de-uso"
                  className="text-blue-200 hover:text-white text-sm transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-300">
          <p>© {currentYear} {ownerName}. Todos os direitos reservados.</p>
          <p>Desenvolvido com Next.js</p>
        </div>
      </div>
    </footer>
  )
}
