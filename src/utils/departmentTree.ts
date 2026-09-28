export interface DepartmentTreeSource {
  deptId: string
  deptName: string
  deptPath: string
  parentPath: string | null
}

export interface DepartmentTreeNode<T extends DepartmentTreeSource> {
  node: T
  children: DepartmentTreeNode<T>[]
}

export function buildDepartmentTree<T extends DepartmentTreeSource>(
  departments: T[]
): DepartmentTreeNode<T>[] {
  const nodes = new Map<string, DepartmentTreeNode<T>>()
  for (const department of departments) {
    nodes.set(department.deptPath, { node: department, children: [] })
  }

  const roots: DepartmentTreeNode<T>[] = []
  for (const node of nodes.values()) {
    const parent = node.node.parentPath ? nodes.get(node.node.parentPath) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function collectSearchPaths<T extends DepartmentTreeSource>(
  departments: T[],
  keyword: string
): Set<string> {
  const needle = keyword.trim()
  if (!needle) return new Set()

  const byPath = new Map(departments.map((department) => [department.deptPath, department]))
  const keep = new Set<string>()
  for (const department of departments) {
    if (!department.deptName.includes(needle)) continue
    let path: string | null = department.deptPath
    while (path) {
      if (keep.has(path)) break
      keep.add(path)
      path = byPath.get(path)?.parentPath ?? null
    }
  }
  return keep
}

export function collectSubtreeIds<T extends DepartmentTreeSource>(
  departments: T[],
  rootPath: string
): string[] {
  const ids: string[] = []
  for (const department of departments) {
    if (
      department.deptPath === rootPath ||
      department.deptPath.startsWith(`${rootPath}_`)
    ) {
      ids.push(department.deptId)
    }
  }
  return ids
}
