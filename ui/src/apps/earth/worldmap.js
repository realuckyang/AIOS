import { feature } from 'topojson-client'
import topoData from './land-110m.json'

const geo = feature(topoData, topoData.objects.land)

const projectPath = (coords) => {
  return coords.map((ring) =>
    ring.map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'}${lng.toFixed(1)},${(-lat).toFixed(1)}`).join(' ') + ' Z'
  ).join(' ')
}

export const landPaths = geo.features.map((f) => {
  const g = f.geometry
  if (g.type === 'Polygon') return projectPath(g.coordinates)
  if (g.type === 'MultiPolygon') return g.coordinates.map(c => projectPath(c)).join(' ')
  return ''
}).filter(Boolean)
