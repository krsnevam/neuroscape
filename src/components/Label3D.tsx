import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface LabelLine {
  text: string
  color?: string
  /** font size in CSS pixels */
  size?: number
  bold?: boolean
  mono?: boolean
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

/**
 * Text that lives in the 3D scene but always faces the camera at a fixed size on screen.
 * It is drawn into a texture, so it needs no font download and works offline.
 */
export default function Label3D({
  position,
  lines,
  background,
}: {
  position: [number, number, number]
  lines: LabelLine[]
  /** optional pill behind the text, e.g. 'rgba(2,6,23,0.8)' */
  background?: string
}) {
  const height = useThree((s) => s.size.height)
  const camera = useThree((s) => s.camera)
  const key = JSON.stringify(lines) + (background ?? '')

  const label = useMemo(() => {
    const k = 2 // texture pixels per CSS pixel, for crisp text
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const font = (l: LabelLine) => `${l.bold ? '600 ' : ''}${(l.size ?? 12) * k}px ${l.mono ? MONO : SANS}`
    const pad = 6 * k
    let w = 0
    let h = pad * 2
    for (const l of lines) {
      ctx.font = font(l)
      w = Math.max(w, ctx.measureText(l.text).width)
      h += (l.size ?? 12) * k * 1.3
    }
    canvas.width = Math.ceil(w + pad * 2)
    canvas.height = Math.ceil(h)
    if (background) {
      ctx.fillStyle = background
      ctx.beginPath()
      ctx.roundRect(0, 0, canvas.width, canvas.height, 5 * k)
      ctx.fill()
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 5 * k
    let y = pad
    for (const l of lines) {
      const lh = (l.size ?? 12) * k * 1.3
      ctx.font = font(l)
      ctx.fillStyle = l.color ?? '#f8fafc'
      ctx.fillText(l.text, canvas.width / 2, y + lh / 2)
      y += lh
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: false,
      toneMapped: false,
    })
    return { material, texture, cssW: canvas.width / k, cssH: canvas.height / k }
    // `key` captures the content of `lines`
  }, [key])

  useEffect(
    () => () => {
      label.texture.dispose()
      label.material.dispose()
    },
    [label],
  )

  // With sizeAttenuation off, a sprite is sized as if it sat one unit from the camera
  const fov = (camera as THREE.PerspectiveCamera).fov ?? 50
  const unit = (2 * Math.tan((fov * Math.PI) / 360)) / height
  return (
    <sprite
      position={position}
      material={label.material}
      scale={[label.cssW * unit, label.cssH * unit, 1]}
      renderOrder={10}
      raycast={() => null}
    />
  )
}
