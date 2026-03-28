/** Maps vision/LLM category to routed department (per product spec) + UI table department. */

export type RoutedCategory = 'pothole' | 'garbage' | 'water' | 'other'

export interface RouteResult {
  department: string
  uiDepartment: string
  category: RoutedCategory
}

const UI = {
  roads: 'Roads & Transport',
  sanitation: 'Sanitation',
  water: 'Water Supply',
  publicWorks: 'Public Works',
} as const

export function routeFromCategory(raw: string): RouteResult {
  const c = raw.toLowerCase().trim()

  if (c.includes('pothole') || c.includes('road') || c.includes('street damage')) {
    return { department: 'PWD', uiDepartment: UI.roads, category: 'pothole' }
  }
  if (
    c.includes('garbage') ||
    c.includes('waste') ||
    c.includes('trash') ||
    c.includes('dumping') ||
    c.includes('litter')
  ) {
    return { department: 'Municipal Corporation', uiDepartment: UI.sanitation, category: 'garbage' }
  }
  if (c.includes('water') || c.includes('leak') || c.includes('sewage') || c.includes('drain')) {
    return { department: 'Jal Board', uiDepartment: UI.water, category: 'water' }
  }

  return {
    department: 'Municipal Corporation',
    uiDepartment: UI.publicWorks,
    category: 'other',
  }
}

export function normalizeSeverity(s: string): 'Low' | 'Medium' | 'High' | 'Critical' {
  const x = s.toLowerCase()
  if (x.includes('critical')) return 'Critical'
  if (x.includes('high')) return 'High'
  if (x.includes('low')) return 'Low'
  return 'Medium'
}
