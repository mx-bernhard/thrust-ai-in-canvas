import './style.css'
import { LunarLanderGame } from './game'
import { GameConfig } from './types'

// Game configuration
const config: GameConfig = {
  gravity: 9.81,
  thrustMax: 15,
  torqueMax: 5,
  fuelMax: 100000,
  fuelConsumption: 0,
  targetPosition: {
    x: 0.7,
    y: 0.6
  },
  initialState: {
    position: {
      x: 0.2,
      y: 0.2
    },
    velocity: {
      x: 0,
      y: 0
    },
    angle: 0,
    angularVelocity: 0,
    thrust: 0,
    fuel: 1000,
    isCollided: false
  }
}

// Initialize game
let game: LunarLanderGame | null = null

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas element not found')
    return
  }

  // Clean up existing game if any
  if (game) {
    game.cleanup()
  }

  // Create new game instance
  game = new LunarLanderGame(canvas, config)

  // Set up button controls
  const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
  const stepBtn = document.getElementById('stepBtn') as HTMLButtonElement

  if (pauseBtn && resetBtn && stepBtn) {
    pauseBtn.addEventListener('click', () => {
      if (game) {
        game.togglePause()
        pauseBtn.textContent = pauseBtn.textContent === 'Pause' ? 'Continue' : 'Pause'
      }
    })

    resetBtn.addEventListener('click', () => {
      if (game) {
        game.reset()
        pauseBtn.textContent = 'Pause'
      }
    })

    stepBtn.addEventListener('click', () => {
      if (game) {
        game.step()
      }
    })

    // Start game loop
    game.gameLoop()
  } else {
    console.error('Control buttons not found')
  }
})

// Clean up on page unload
window.addEventListener('unload', () => {
  if (game) {
    game.cleanup()
    game = null
  }
})
