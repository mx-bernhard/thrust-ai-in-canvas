import "./style.css";
import { LunarLanderGame } from "./game";
import { GameConfig } from "./types";
import { DDPWeights } from "./ddp";

// Get the app container
const appContainer = document.getElementById("app");
if (!appContainer) {
  console.error("App container not found");
  throw new Error("App container not found");
}

// Create canvas
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth * 0.9; // 90% of window width
canvas.height = window.innerHeight * 0.7; // 70% of window height
appContainer.appendChild(canvas);

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
    isCollided: false,
  },
  targetPosition: { x: canvas.width - 100, y: canvas.height - 100 }, // Fixed position in bottom right
  numObstacles: 6, // Reduced number of obstacles
};

// Create game instance
const game = new LunarLanderGame(canvas, gameConfig);

// Force the ship to start in the upper left quadrant
game.reset();

// Create UI controls
const controlsContainer = document.createElement("div");
controlsContainer.className = "controls";
appContainer.appendChild(controlsContainer);

// Pause/Resume button
const pauseButton = document.createElement("button");
pauseButton.textContent = "Pause";
pauseButton.addEventListener("click", () => {
  if (pauseButton.textContent === "Pause") {
    game.pause();
    pauseButton.textContent = "Resume";
  } else {
    game.resume();
    pauseButton.textContent = "Pause";
  }
});
controlsContainer.appendChild(pauseButton);

// Step button (for debugging)
const stepButton = document.createElement("button");
stepButton.textContent = "Step";
stepButton.addEventListener("click", () => {
  game.step();
});
controlsContainer.appendChild(stepButton);

// Reset button
const resetButton = document.createElement("button");
resetButton.textContent = "Reset";
resetButton.addEventListener("click", () => {
  game.reset();
  if (pauseButton.textContent === "Resume") {
    pauseButton.textContent = "Pause";
  }
});
controlsContainer.appendChild(resetButton);

// Regenerate Obstacles button
const regenerateObstaclesButton = document.createElement("button");
regenerateObstaclesButton.textContent = "New Obstacles";
regenerateObstaclesButton.addEventListener("click", () => {
  game.regenerateObstacles();
});
controlsContainer.appendChild(regenerateObstaclesButton);

// Create a container for the obstacles amount input
const obstaclesInputContainer = document.createElement("div");
obstaclesInputContainer.className = "input-container";

// Add a label for the input
const obstaclesLabel = document.createElement("label");
obstaclesLabel.textContent = "Obstacles: ";
obstaclesLabel.style.marginRight = "5px";
obstaclesInputContainer.appendChild(obstaclesLabel);

// Add an input for the number of obstacles
const obstaclesInput = document.createElement("input");
obstaclesInput.type = "number";
obstaclesInput.min = "1";
obstaclesInput.max = "30";
obstaclesInput.value = "10"; // Default value

// Update the obstacles amount when the input changes
obstaclesInput.addEventListener("change", () => {
  const amount = parseInt(obstaclesInput.value, 10);
  if (!isNaN(amount)) {
    game.setObstaclesAmount(amount);
  }
});

obstaclesInputContainer.appendChild(obstaclesInput);
controlsContainer.appendChild(obstaclesInputContainer);

// Toggle path button
const togglePathButton = document.createElement("button");
togglePathButton.textContent = "Hide Path";
togglePathButton.addEventListener("click", () => {
  if (togglePathButton.textContent === "Hide Path") {
    game.togglePath(false);
    togglePathButton.textContent = "Show Path";
  } else {
    game.togglePath(true);
    togglePathButton.textContent = "Hide Path";
  }
});
controlsContainer.appendChild(togglePathButton);

// Plan path button
const planPathButton = document.createElement("button");
planPathButton.textContent = "Plan Path";
planPathButton.addEventListener("click", () => {
  game.planPath();
});
controlsContainer.appendChild(planPathButton);

// Toggle debug info button
const toggleDebugButton = document.createElement("button");
toggleDebugButton.textContent = "Hide Debug Info";
toggleDebugButton.addEventListener("click", () => {
  if (toggleDebugButton.textContent === "Hide Debug Info") {
    game.toggleDebugInfo(false);
    toggleDebugButton.textContent = "Show Debug Info";
  } else {
    game.toggleDebugInfo(true);
    toggleDebugButton.textContent = "Hide Debug Info";
  }
});
controlsContainer.appendChild(toggleDebugButton);

// Toggle narrow passages visualization button
const toggleNarrowPassagesButton = document.createElement("button");
toggleNarrowPassagesButton.textContent = "Show Narrow Passages";
toggleNarrowPassagesButton.addEventListener("click", () => {
  if (toggleNarrowPassagesButton.textContent === "Show Narrow Passages") {
    game.toggleNarrowPassagesVisualization(true);
    toggleNarrowPassagesButton.textContent = "Hide Narrow Passages";
  } else {
    game.toggleNarrowPassagesVisualization(false);
    toggleNarrowPassagesButton.textContent = "Show Narrow Passages";
  }
});
controlsContainer.appendChild(toggleNarrowPassagesButton);

// Add a weights control UI
function createWeightsControls() {
  const controlsContainer = document.createElement("div");
  controlsContainer.className = "weights-controls";
  controlsContainer.style.margin = "20px 0";
  controlsContainer.style.display = "flex";
  controlsContainer.style.flexWrap = "wrap";
  controlsContainer.style.gap = "10px";

  const weightControls: Array<{
    name: keyof DDPWeights;
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    {
      name: "positionWeight",
      label: "Position Weight",
      min: 1,
      max: 50,
      step: 1,
    },
    {
      name: "velocityWeight",
      label: "Velocity Weight",
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: "angularVelocityWeight",
      label: "Angular Vel Weight",
      min: 0.01,
      max: 1,
      step: 0.01,
    },
    {
      name: "boundaryWeight",
      label: "Boundary Weight",
      min: 1,
      max: 50,
      step: 1,
    },
    {
      name: "boundaryMargin",
      label: "Boundary Margin",
      min: 10,
      max: 150,
      step: 5,
    },
    {
      name: "obstacleWeight",
      label: "Obstacle Weight",
      min: 0,
      max: 5000,
      step: 100,
    },
    {
      name: "obstacleMargin",
      label: "Obstacle Margin",
      min: 0,
      max: 150,
      step: 5,
    },
    {
      name: "collisionCourseWeight",
      label: "Collision Course",
      min: 1,
      max: 100,
      step: 1,
    },
  ];

  weightControls.forEach((control) => {
    const controlDiv = document.createElement("div");
    controlDiv.style.display = "flex";
    controlDiv.style.flexDirection = "column";

    const label = document.createElement("label");
    label.textContent = control.label;
    label.style.marginBottom = "5px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = control.min.toString();
    slider.max = control.max.toString();
    slider.step = control.step.toString();
    slider.value = game.getControllerWeight(control.name).toString();

    const valueDisplay = document.createElement("span");
    valueDisplay.textContent = slider.value;
    valueDisplay.style.fontSize = "12px";
    valueDisplay.style.marginTop = "2px";

    slider.addEventListener("input", () => {
      const value = parseFloat(slider.value);
      valueDisplay.textContent = value.toString();

      // Update the weight in the game
      const weightUpdate = { [control.name]: value } as Partial<DDPWeights>;
      game.setControllerWeights(weightUpdate);
    });

    controlDiv.appendChild(label);
    controlDiv.appendChild(slider);
    controlDiv.appendChild(valueDisplay);
    controlsContainer.appendChild(controlDiv);
  });

  const resetButton = document.createElement("button");
  resetButton.textContent = "Reset Weights";
  resetButton.addEventListener("click", () => {
    game.resetControllerWeights();
    // Update all sliders
    document
      .querySelectorAll(".weights-controls input")
      .forEach((slider, index) => {
        const input = slider as HTMLInputElement;
        const control = weightControls[index];
        input.value = game.getControllerWeight(control.name).toString();
        const valueDisplay = slider.nextElementSibling as HTMLSpanElement;
        valueDisplay.textContent = input.value;
      });
  });

  controlsContainer.appendChild(resetButton);
  return controlsContainer;
}

// Add weights controls to the UI
appContainer.appendChild(createWeightsControls());

// Start the game
game.start();
