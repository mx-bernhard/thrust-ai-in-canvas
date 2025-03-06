import './style.css'
import { LunarLanderGame } from './game'
import { GameConfig } from './types'

// Get the app container
const appContainer = document.getElementById('app')
if (!appContainer) {
  console.error('App container not found')
  throw new Error('App container not found')
}

// Create canvas
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth * 0.9 // 90% of window width
canvas.height = window.innerHeight * 0.7 // 70% of window height
appContainer.appendChild(canvas)

// Game configuration
const gameConfig: GameConfig = {
  gravity: { x: 0, y: 0.1 },
  thrustMax: 20,
  torqueMax: 10.0,
  fuelMax: 1000,
  fuelConsumption: 0.1,
  initialState: {
    position: { x: 100, y: 100 }, // Fixed position in upper left corner
    velocity: { x: 0, y: 0 },
    angle: 0,
    angularVelocity: 0,
    thrust: 0,
    fuel: 1000,
    isCollided: false
  },
  targetPosition: { x: canvas.width - 100, y: canvas.height - 100 }, // Fixed position in bottom right
  numObstacles: 6 // Reduced number of obstacles
}

// Create game instance
const game = new LunarLanderGame(canvas, gameConfig)

// Force the ship to start in the upper left quadrant
game.reset()

// Create UI controls
const controlsContainer = document.createElement('div')
controlsContainer.className = 'controls'
appContainer.appendChild(controlsContainer)

// Pause/Resume button
const pauseButton = document.createElement('button')
pauseButton.textContent = 'Pause'
pauseButton.addEventListener('click', () => {
  if (pauseButton.textContent === 'Pause') {
    game.pause()
    pauseButton.textContent = 'Resume'
  } else {
    game.resume()
    pauseButton.textContent = 'Pause'
  }
})
controlsContainer.appendChild(pauseButton)

// Step button (for debugging)
const stepButton = document.createElement('button')
stepButton.textContent = 'Step'
stepButton.addEventListener('click', () => {
  game.step()
})
controlsContainer.appendChild(stepButton)

// Reset button
const resetButton = document.createElement('button')
resetButton.textContent = 'Reset'
resetButton.addEventListener('click', () => {
  game.reset()
  if (pauseButton.textContent === 'Resume') {
    pauseButton.textContent = 'Pause'
  }
})
controlsContainer.appendChild(resetButton)

// Regenerate Obstacles button
const regenerateObstaclesButton = document.createElement('button')
regenerateObstaclesButton.textContent = 'New Obstacles'
regenerateObstaclesButton.addEventListener('click', () => {
  game.regenerateObstacles()
})
controlsContainer.appendChild(regenerateObstaclesButton)

// Toggle path button
const togglePathButton = document.createElement('button')
togglePathButton.textContent = 'Hide Path'
togglePathButton.addEventListener('click', () => {
  if (togglePathButton.textContent === 'Hide Path') {
    game.togglePath(false)
    togglePathButton.textContent = 'Show Path'
  } else {
    game.togglePath(true)
    togglePathButton.textContent = 'Hide Path'
  }
})
controlsContainer.appendChild(togglePathButton)

// Plan path button
const planPathButton = document.createElement('button')
planPathButton.textContent = 'Plan Path'
planPathButton.addEventListener('click', () => {
  game.planPath()
})
controlsContainer.appendChild(planPathButton)

// Toggle debug info button
const toggleDebugButton = document.createElement('button')
toggleDebugButton.textContent = 'Hide Debug Info'
toggleDebugButton.addEventListener('click', () => {
  if (toggleDebugButton.textContent === 'Hide Debug Info') {
    game.toggleDebugInfo(false)
    toggleDebugButton.textContent = 'Show Debug Info'
  } else {
    game.toggleDebugInfo(true)
    toggleDebugButton.textContent = 'Hide Debug Info'
  }
})
controlsContainer.appendChild(toggleDebugButton)

// Toggle narrow passages visualization button
const toggleNarrowPassagesButton = document.createElement('button')
toggleNarrowPassagesButton.textContent = 'Show Narrow Passages'
toggleNarrowPassagesButton.addEventListener('click', () => {
  if (toggleNarrowPassagesButton.textContent === 'Show Narrow Passages') {
    game.toggleNarrowPassagesVisualization(true)
    toggleNarrowPassagesButton.textContent = 'Hide Narrow Passages'
  } else {
    game.toggleNarrowPassagesVisualization(false)
    toggleNarrowPassagesButton.textContent = 'Show Narrow Passages'
  }
})
controlsContainer.appendChild(toggleNarrowPassagesButton)

// Start the game
game.start()
