export const dynamic = 'force-dynamic'

import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { BlogPostEditor } from '@/components/admin/BlogPostEditor'

export default async function NovoBlogPostPage() {
  const cities = await getPublishedCityLinksCached().catch(() => [])
  return <BlogPostEditor cities={cities} />
}
