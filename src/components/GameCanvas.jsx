import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

// ── CHARACTER MODE ─────────────────────────────
// 0 = Basic_Charakter (1 ตัว)
// 1 = MBTI rotation (16 ตัว สลับทุก 1 วิ)
const CHARACTER_MODE = 0
// ───────────────────────────────────────────────

const SPEED = 80
const SPRINT_MULTIPLIER = 2
const ARRIVE_THRESHOLD = 4
const DOUBLE_CLICK_MS = 300

const PLAYER_KEY  = 'Basic_Charakter'
const MBTI_TYPES  = [
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP',
  'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
  'INFJ', 'INFP', 'INTJ', 'INTP',
  'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
]

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('Failed to load:', file.src)
    })

    this.load.tilemapTiledJSON('world', '/maps/world.json')
    this.load.image('Grass', '/assets/sprites/Tilesets/Grass.png')
    this.load.image('Tilled_Dirt_Wide', '/assets/sprites/Tilesets/Tilled_Dirt_Wide.png')
    this.load.image(
      'Basic_Grass_Biom_things_1',
      '/assets/sprites/Objects/Basic_Grass_Biom_things_1.png',
    )

    if (CHARACTER_MODE === 0) {
      this.load.spritesheet(PLAYER_KEY, '/assets/sprites/Characters/Play_Charakter_Spritesheet.png', {
        frameWidth: 48, frameHeight: 48,
      })
    } else {
      MBTI_TYPES.forEach(mbti => {
        this.load.spritesheet(mbti, `/assets/sprites/Characters/${mbti}_Charakter_Spritesheet.png`, {
          frameWidth: 48, frameHeight: 48,
        })
      })
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'world' })

    const grassTiles = map.addTilesetImage('Grass', 'Grass')
    const dirtTiles  = map.addTilesetImage('Tilled_Dirt_Wide', 'Tilled_Dirt_Wide')
    const biomTiles  = map.addTilesetImage('Basic_Grass_Biom_things_1', 'Basic_Grass_Biom_things_1')

    const tilesets = [grassTiles, dirtTiles, biomTiles]

    const groundLayer    = map.createLayer('Ground', tilesets, 0, 0)
    const objectsLayer   = map.createLayer('Objects', tilesets, 0, 0)
    const collisionLayer = map.createLayer('Collision', tilesets, 0, 0)
    if (!collisionLayer) {
      console.error('Collision layer not found!')
    } else {
      // collisionLayer.setVisible(false)
      collisionLayer.setCollisionByExclusion([-1])
    }

    groundLayer.setDepth(0)
    objectsLayer.setDepth(1)
    if (collisionLayer) collisionLayer.setDepth(2)

    const scaleX   = this.scale.width / map.widthInPixels
    const scaleY   = this.scale.height / map.heightInPixels
    const mapScale = Math.ceil(Math.max(scaleX, scaleY))

    groundLayer.setScale(mapScale)
    objectsLayer.setScale(mapScale)
    if (collisionLayer) collisionLayer.setScale(mapScale)

    const worldW = map.widthInPixels * mapScale
    const worldH = map.heightInPixels * mapScale

    this.physics.world.setBounds(0, 0, worldW, worldH)

    const DIRS = [
      { key: 'walk-down',  start: 0,  end: 3  },
      { key: 'walk-up',    start: 4,  end: 7  },
      { key: 'walk-left',  start: 8,  end: 11 },
      { key: 'walk-right', start: 12, end: 15 },
    ]
    if (CHARACTER_MODE === 0) {
      DIRS.forEach(({ key, start, end }) => {
        this.anims.create({
          key: `${PLAYER_KEY}-${key}`,
          frames: this.anims.generateFrameNumbers(PLAYER_KEY, { start, end }),
          frameRate: 8,
          repeat: -1,
        })
      })
      this.anims.create({
        key: `${PLAYER_KEY}-idle`,
        frames: this.anims.generateFrameNumbers(PLAYER_KEY, { frames: [0] }),
        frameRate: 1,
        repeat: 0,
      })
      this.currentMbti = PLAYER_KEY
    } else {
      MBTI_TYPES.forEach(mbti => {
        DIRS.forEach(({ key, start, end }) => {
          this.anims.create({
            key: `${mbti}-${key}`,
            frames: this.anims.generateFrameNumbers(mbti, { start, end }),
            frameRate: 8,
            repeat: -1,
          })
        })
        this.anims.create({
          key: `${mbti}-idle`,
          frames: this.anims.generateFrameNumbers(mbti, { frames: [0] }),
          frameRate: 1,
          repeat: 0,
        })
      })
      this.mbtiIndex   = 0
      this.currentMbti = MBTI_TYPES[0]
      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          this.mbtiIndex   = (this.mbtiIndex + 1) % MBTI_TYPES.length
          this.currentMbti = MBTI_TYPES[this.mbtiIndex]
          const curKey = this.player.anims.currentAnim?.key ?? ''
          const suffix = curKey.includes('-') ? curKey.split('-').slice(1).join('-') : 'idle'
          this.player.play(`${this.currentMbti}-${suffix}`)
        },
      })
    }

    const spawnX = this.cameras.main.width / 2
    const spawnY = this.cameras.main.height / 2
    this.player = this.physics.add.sprite(spawnX, spawnY, this.currentMbti)
    this.player.setScale(2)
    this.player.setBodySize(16, 16)
    this.player.setDepth(5)
    this.player.setCollideWorldBounds(true)
    this.player.play(`${this.currentMbti}-idle`)

    if (collisionLayer) this.physics.add.collider(this.player, collisionLayer)

    // destination marker
    this.marker = this.add.graphics()
    this.marker.fillStyle(0xffff00, 1)
    this.marker.fillCircle(0, 0, 4)
    this.marker.setDepth(10)
    this.marker.setVisible(false)

    // move state
    this.isMoving = false
    this.targetX  = 0
    this.targetY  = 0
    this.isSprinting  = false
    this.lastClickTime = 0

    this.input.on('pointerdown', (pointer) => {
      const now = this.time.now
      if (now - this.lastClickTime < DOUBLE_CLICK_MS) {
        this.isSprinting = !this.isSprinting
      }
      this.lastClickTime = now

      const worldX = pointer.worldX
      const worldY = pointer.worldY
      this.targetX  = worldX
      this.targetY  = worldY
      this.isMoving = true
      this.marker.setPosition(worldX, worldY).setVisible(true)
    })

    const getZoom = (w) => w < 768 ? 1.5 : w < 1024 ? 3 : 2.5

    // camera
    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(getZoom(this.scale.width))
    this.game.events.emit('zoomChanged', getZoom(this.scale.width))
    this.cameras.main.centerOn(this.player.x, this.player.y)

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const current = this.cameras.main.zoom
      const next = Phaser.Math.Clamp(current + (deltaY > 0 ? -0.1 : 0.1), 1.0, 3.0)
      this.cameras.main.setZoom(next)
      this.game.events.emit('zoomChanged', next)
    })

    this.input.addPointer(1)
    this.lastPinchDist = null

    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.usingWasd = false

    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height)
      this.cameras.main.setZoom(getZoom(gameSize.width))
      this.game.events.emit('zoomChanged', getZoom(gameSize.width))
    })
  }

  update() {
    const p1 = this.input.pointer1
    const p2 = this.input.pointer2
    if (p1.isDown && p2.isDown) {
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y)
      if (this.lastPinchDist !== null) {
        const next = Phaser.Math.Clamp(
          this.cameras.main.zoom + (dist - this.lastPinchDist) * 0.005,
          1.0, 3.0
        )
        this.cameras.main.setZoom(next)
        this.game.events.emit('zoomChanged', next)
      }
      this.lastPinchDist = dist
    } else {
      this.lastPinchDist = null
    }

    const spd = SPEED * (this.isSprinting ? SPRINT_MULTIPLIER : 1)

    const { up, down, left, right } = this.wasd
    const wasdActive = up.isDown || down.isDown || left.isDown || right.isDown

    if (wasdActive) {
      this.usingWasd = true
      this.isMoving = false
      this.marker.setVisible(false)

      let vx = 0, vy = 0
      if (left.isDown)  vx -= spd
      if (right.isDown) vx += spd
      if (up.isDown)    vy -= spd
      if (down.isDown)  vy += spd
      if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2 }
      this.player.setVelocity(vx, vy)

      if (vx === 0 && vy === 0) {
        const idleKey = `${this.currentMbti}-idle`
        if (this.player.anims.currentAnim?.key !== idleKey) this.player.play(idleKey)
      } else {
        const dir = Math.abs(vx) >= Math.abs(vy)
          ? (vx > 0 ? 'walk-right' : 'walk-left')
          : (vy > 0 ? 'walk-down' : 'walk-up')
        const animKey = `${this.currentMbti}-${dir}`
        if (this.player.anims.currentAnim?.key !== animKey) this.player.play(animKey)
      }
      return
    }

    if (this.usingWasd) {
      this.usingWasd = false
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
    }

    if (!this.isMoving) return

    const dx       = this.targetX - this.player.x
    const dy       = this.targetY - this.player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < ARRIVE_THRESHOLD) {
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
      this.isMoving = false
      this.isSprinting = false
      this.marker.setVisible(false)
      return
    }

    this.player.setVelocity(
      (dx / distance) * spd,
      (dy / distance) * spd,
    )

    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'walk-right' : 'walk-left')
      : (dy > 0 ? 'walk-down'  : 'walk-up')

    const animKey = `${this.currentMbti}-${dir}`
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey)
    }
  }
}

export default function GameCanvas() {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(null)
  const [showZoom, setShowZoom] = useState(false)
  const gameRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      pixelArt: true,
      antialias: false,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game
    game.events.on('zoomChanged', (v) => {
      setZoom(+v.toFixed(1))
      setShowZoom(true)
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setShowZoom(false), 1500)
    })

    return () => {
      clearTimeout(hideTimerRef.current)
      game.destroy(true)
    }
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      />
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 64,
        height: 20,
        backgroundImage: 'url(/assets/ui/custom/zoom_bg.png)',
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: showZoom ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: "'pixelFont-7', monospace",
          fontSize: 10,
          color: '#3d2b1f',
          fontWeight: 'bold',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {zoom}×
        </span>
      </div>
    </>
  )
}
