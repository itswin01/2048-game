export type Grid = (number | null)[][]
export type Direction = 'up' | 'down' | 'left' | 'right'

export function createEmptyGrid(size: number): Grid {
  return Array(size).fill(null).map(() => Array(size).fill(null))
}

export function addRandomTile(grid: Grid): Grid {
  const newGrid = grid.map(row => [...row])
  const emptyCells: [number, number][] = []
  for (let r = 0; r < newGrid.length; r++) {
    for (let c = 0; c < newGrid[r].length; c++) {
      if (newGrid[r][c] === null) emptyCells.push([r, c])
    }
  }
  if (emptyCells.length === 0) return newGrid
  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4
  return newGrid
}

export function initGrid(size: number): Grid {
  let grid = createEmptyGrid(size)
  grid = addRandomTile(grid)
  grid = addRandomTile(grid)
  return grid
}

function slideRow(row: (number | null)[]): { row: (number | null)[], score: number } {
  const vals = row.filter(v => v !== null) as number[]
  let score = 0
  const merged: number[] = []
  let i = 0
  while (i < vals.length) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      merged.push(vals[i] * 2)
      score += vals[i] * 2
      i += 2
    } else {
      merged.push(vals[i])
      i++
    }
  }
  while (merged.length < row.length) merged.push(null as unknown as number)
  return { row: merged as (number | null)[], score }
}

export function move(grid: Grid, direction: Direction): { grid: Grid, score: number, moved: boolean } {
  const size = grid.length
  let totalScore = 0
  let moved = false
  let newGrid = grid.map(row => [...row])

  const rotate90 = (g: Grid): Grid => {
    const n = g.length
    return Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => g[n - 1 - c][r])
    )
  }

  // Normalize: always slide left
  let rotations = 0
  if (direction === 'right') rotations = 2
  else if (direction === 'up') rotations = 3
  else if (direction === 'down') rotations = 1

  for (let i = 0; i < rotations; i++) newGrid = rotate90(newGrid)

  const originalStr = JSON.stringify(newGrid)
  newGrid = newGrid.map(row => {
    const { row: newRow, score } = slideRow(row)
    totalScore += score
    return newRow
  })

  if (JSON.stringify(newGrid) !== originalStr) moved = true

  const unrotations = (4 - rotations) % 4
  for (let i = 0; i < unrotations; i++) newGrid = rotate90(newGrid)

  return { grid: newGrid, score: totalScore, moved }
}

export function isGameOver(grid: Grid): boolean {
  const size = grid.length
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) return false
      if (c + 1 < size && grid[r][c] === grid[r][c + 1]) return false
      if (r + 1 < size && grid[r][c] === grid[r + 1][c]) return false
    }
  }
  return true
}

export function hasWon(grid: Grid): boolean {
  return grid.some(row => row.some(v => v === 2048))
}
