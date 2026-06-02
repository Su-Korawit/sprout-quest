import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

const SPEED = 80
const ARRIVE_THRESHOLD = 4
const MBTI_TYPES = [
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

    MBTI_TYPES.forEach(mbti => {
      this.load.spritesheet(mbti, `/assets/sprites/Characters/${mbti}_Charakter_Spritesheet.png`, {
        frameWidth: 48,
        frameHeight: 48,
      })
    })
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
      collisionLayer.setVisible(false)
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

    // animations — สร้างให้ครบทุก MBTI
    const DIRS = [
      { key: 'walk-down',  start: 0,  end: 3  },
      { key: 'walk-up',    start: 4,  end: 7  },
      { key: 'walk-left',  start: 8,  end: 11 },
      { key: 'walk-right', start: 12, end: 15 },
    ]
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

    // player
    this.mbtiIndex  = 0
    this.currentMbti = MBTI_TYPES[0]

    const spawnX = this.cameras.main.width / 2
    const spawnY = this.cameras.main.height / 2
    this.player = this.physics.add.sprite(spawnX, spawnY, this.currentMbti)
    this.player.setScale(2)
    this.player.setBodySize(16, 16)
    this.player.setDepth(5)
    this.player.setCollideWorldBounds(true)
    this.player.play(`${this.currentMbti}-idle`)

    if (collisionLayer) this.physics.add.collider(this.player, collisionLayer)

    // วน MBTI ทุก 1 วินาที
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

    this.input.on('pointerdown', (pointer) => {
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
    this.cameras.main.centerOn(this.player.x, this.player.y)

    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height)
      this.cameras.main.setZoom(getZoom(gameSize.width))
    })
  }

  update() {
    if (!this.isMoving) return

    const dx       = this.targetX - this.player.x
    const dy       = this.targetY - this.player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < ARRIVE_THRESHOLD) {
      this.player.setVelocity(0, 0)
      this.player.play(`${this.currentMbti}-idle`)
      this.isMoving = false
      this.marker.setVisible(false)
      return
    }

    this.player.setVelocity(
      (dx / distance) * SPEED,
      (dy / distance) * SPEED,
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

    return () => {
      game.destroy(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}
