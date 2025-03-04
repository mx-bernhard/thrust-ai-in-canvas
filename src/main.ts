import './style.css'
import { LunarLanderGame } from './game'
import { GameConfig } from './types'

// Game configuration
const config: GameConfig = {
  gravity: 9.81,
  thrustMax: 15,
  torqueMax: 5,
  fuelMax: 1000,
  fuelConsumption: 1,
  targetPosition: {
    x: window.innerWidth * 0.4,
    y: window.innerHeight * 0.4
  },
  initialState: {
    position: {
      x: window.innerWidth * 0.2,
      y: window.innerHeight * 0.2
    },
    velocity: {
      x: 0,
      y: 0
    },
    angle: 0,
    angularVelocity: 0,
    thrust: 0,
    fuel: 1000
  }
}

// Initialize game
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const game = new LunarLanderGame(canvas, config)

// Set up button controls
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const stepBtn = document.getElementById('stepBtn') as HTMLButtonElement

pauseBtn.addEventListener('click', () => {
  game.togglePause()
  pauseBtn.textContent = pauseBtn.textContent === 'Pause' ? 'Continue' : 'Pause'
})

resetBtn.addEventListener('click', () => {
  game.reset()
  pauseBtn.textContent = 'Pause'
})

stepBtn.addEventListener('click', () => {
  game.step()
})

// Start game loop
game.gameLoop()
