'use client'

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue>({ activeTab: '', setActiveTab: () => {} })

interface TabsProps {
  defaultTab: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultTab, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex border-b border-gray-200 overflow-x-auto', className)} role="tablist">
      {children}
    </div>
  )
}

interface TabProps {
  id: string
  children: React.ReactNode
}

export function Tab({ id, children }: TabProps) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === id
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      onClick={() => setActiveTab(id)}
      className={cn(
        'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
        isActive
          ? 'border-[#2563eb] text-[#2563eb]'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      )}
    >
      {children}
    </button>
  )
}

interface TabPanelProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useContext(TabsContext)
  if (activeTab !== id) return null
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} className={className}>
      {children}
    </div>
  )
}
