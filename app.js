const routine = [
  {
    id: "supine-spinal-twist",
    name: "Supine Spinal Twist",
    description: "Lie on your back, bring one knee across your body, extend opposite arm out. Look away from the knee.",
    targetAreas: ["spine", "lower back", "glutes"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "left-right",
    image: null
  },
  {
    id: "sitting-forward-bend",
    name: "Sitting Forward Bend",
    description: "Sit with legs extended, hinge at hips and reach toward your feet. Keep spine long.",
    targetAreas: ["hamstrings", "lower back"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  },
  {
    id: "seated-toe-touch",
    name: "Seated Toe Touch",
    description: "Sit with legs extended, reach for your toes. Relax your head and neck.",
    targetAreas: ["hamstrings", "calves"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  },
  {
    id: "standing-hamstring",
    name: "Standing Hamstring",
    description: "Stand and place one heel forward on a low surface. Hinge at hips, keep back straight.",
    targetAreas: ["hamstrings"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "left-right",
    image: null
  },
  {
    id: "half-splits",
    name: "Half Splits",
    description: "From kneeling, extend one leg forward with heel down. Hinge forward over the straight leg.",
    targetAreas: ["hamstrings", "calves"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "left-right",
    image: null
  },
  {
    id: "low-lunge",
    name: "Low Lunge",
    description: "Step one foot forward into a lunge, lower back knee to ground. Sink hips forward and down.",
    targetAreas: ["hip flexors", "quadriceps"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "left-right",
    image: null
  },
  {
    id: "sphinx",
    name: "Sphinx",
    description: "Lie face down, prop up on forearms with elbows under shoulders. Relax your lower back.",
    targetAreas: ["lower back", "abs"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  },
  {
    id: "downward-dog",
    name: "Downward Dog",
    description: "Hands and feet on floor, hips high, forming an inverted V. Press heels toward ground.",
    targetAreas: ["hamstrings", "calves", "shoulders"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  },
  {
    id: "plank",
    name: "Plank",
    description: "Hold a push-up position with arms straight. Keep body in a straight line from head to heels.",
    targetAreas: ["core", "shoulders"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  },
  {
    id: "cat-cow",
    name: "Cat/Cow",
    description: "On hands and knees, alternate between arching back up (cat) and dropping belly down (cow).",
    targetAreas: ["spine", "lower back"],
    durationSeconds: 30,
    transitionSeconds: 5,
    sides: "custom",
    sideNames: ["Cat", "Cow"],
    repetitions: 2,
    image: null
  },
  {
    id: "childs-pose",
    name: "Child's Pose",
    description: "Kneel and sit back on heels, fold forward with arms extended or by your sides. Rest forehead on ground.",
    targetAreas: ["lower back", "hips", "shoulders"],
    durationSeconds: 60,
    transitionSeconds: 5,
    sides: "none",
    image: null
  }
];

let currentIndex = 0;
let currentSide = null;
let currentSideIndex = 0;
let currentRepetition = 0;
let phase = 'idle'; // idle, transition, hold
let timeRemaining = 0;
let totalTime = 0;
let phaseStartTime = 0;
let pausedAt = 0;
let intervalId = null;
let animationId = null;
let paused = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(frequency = 800, duration = 200) {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function getCurrentStretch() {
  return routine[currentIndex];
}

function renderRoutineList() {
  const container = document.getElementById('routineList');
  let html = '<h2>Routine</h2><ul>';
  routine.forEach((stretch, index) => {
    let className = '';
    if (index === currentIndex && phase !== 'idle') {
      className = 'current';
    } else if (index < currentIndex) {
      className = 'completed';
    }
    const sideNames = getSideNames(stretch);
    const reps = stretch.repetitions || 1;
    const phases = Math.max(1, sideNames.length) * reps;
    const duration = phases > 1
      ? `${stretch.durationSeconds}s × ${phases}`
      : `${stretch.durationSeconds}s`;
    html += `<li class="${className}">${stretch.name} <span style="color:#999">(${duration})</span></li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
}

function updateDisplay() {
  const stretch = getCurrentStretch();
  if (!stretch) {
    document.getElementById('stretchName').textContent = 'Routine Complete!';
    document.getElementById('phase').textContent = '';
    document.getElementById('timer').textContent = '--';
    document.getElementById('description').textContent = '';
    document.getElementById('progress').textContent = '';
    return;
  }

  document.getElementById('stretchName').textContent = stretch.name;
  document.getElementById('timer').textContent = timeRemaining;
  document.getElementById('description').textContent = stretch.description;
  document.getElementById('progress').textContent = `Stretch ${currentIndex + 1} of ${routine.length}`;

  let phaseText = '';
  if (phase === 'transition') {
    phaseText = 'Get ready...';
  } else if (phase === 'hold') {
    const reps = stretch.repetitions || 1;
    let repText = reps > 1 ? ` (${currentRepetition + 1}/${reps})` : '';
    if (currentSide) {
      phaseText = `Hold - ${currentSide}${repText}`;
    } else {
      phaseText = 'Hold';
    }
  }
  document.getElementById('phase').textContent = phaseText;

  updateProgressBar();

  renderRoutineList();
}

function updateProgressBar() {
  if (totalTime <= 0) {
    document.getElementById('progressFill').style.width = '0%';
    return;
  }
  const elapsed = paused ? (pausedAt - phaseStartTime) : (Date.now() - phaseStartTime);
  const progress = Math.min(100, (elapsed / (totalTime * 1000)) * 100);
  document.getElementById('progressFill').style.width = `${progress}%`;
}

function animateProgress() {
  if (!paused && phase !== 'idle') {
    updateProgressBar();
  }
  animationId = requestAnimationFrame(animateProgress);
}

function tick() {
  if (paused) return;

  timeRemaining--;
  if (timeRemaining <= 0) {
    advancePhase();
  }
  updateDisplay();
}

function getSideNames(stretch) {
  if (stretch.sides === 'none') return [];
  if (stretch.sides === 'custom') return stretch.sideNames || [];
  if (stretch.sides === 'left-right') return ['Left', 'Right'];
  if (stretch.sides === 'front-back') return ['Front', 'Back'];
  return [];
}

function advancePhase() {
  const stretch = getCurrentStretch();
  if (!stretch) {
    stop();
    return;
  }

  const sideNames = getSideNames(stretch);
  const repetitions = stretch.repetitions || 1;

  if (phase === 'transition') {
    beep(800);
    phase = 'hold';
    totalTime = stretch.durationSeconds;
    timeRemaining = stretch.durationSeconds;
    phaseStartTime = Date.now();
    currentSideIndex = 0;
    currentRepetition = 0;
    if (sideNames.length > 0) {
      currentSide = sideNames[0];
    } else {
      currentSide = null;
    }
  } else if (phase === 'hold') {
    if (sideNames.length > 0 && currentSideIndex < sideNames.length - 1) {
      // Move to next side
      beep(600);
      currentSideIndex++;
      currentSide = sideNames[currentSideIndex];
      totalTime = stretch.durationSeconds;
      timeRemaining = stretch.durationSeconds;
      phaseStartTime = Date.now();
    } else if (currentRepetition < repetitions - 1) {
      // Start next repetition
      beep(600);
      currentRepetition++;
      currentSideIndex = 0;
      currentSide = sideNames.length > 0 ? sideNames[0] : null;
      totalTime = stretch.durationSeconds;
      timeRemaining = stretch.durationSeconds;
      phaseStartTime = Date.now();
    } else {
      nextStretch();
    }
  }
}

function nextStretch() {
  currentIndex++;
  currentSide = null;
  currentSideIndex = 0;
  currentRepetition = 0;
  const stretch = getCurrentStretch();
  if (stretch) {
    beep(1000);
    phase = 'transition';
    totalTime = stretch.transitionSeconds;
    timeRemaining = stretch.transitionSeconds;
    phaseStartTime = Date.now();
  } else {
    beep(1000);
    setTimeout(() => beep(1000), 200);
    setTimeout(() => beep(1000), 400);
    stop();
  }
}

function start() {
  if (routine.length === 0) {
    alert('No stretches in routine!');
    return;
  }
  audioCtx.resume();
  currentIndex = 0;
  currentSide = null;
  currentSideIndex = 0;
  currentRepetition = 0;
  paused = false;
  phase = 'transition';
  totalTime = routine[0].transitionSeconds;
  timeRemaining = routine[0].transitionSeconds;
  phaseStartTime = Date.now();
  beep(1000);
  animateProgress();
  document.getElementById('startBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('pauseBtn').textContent = 'Pause';
  updateDisplay();
  intervalId = setInterval(tick, 1000);
}

function stop() {
  clearInterval(intervalId);
  intervalId = null;
  cancelAnimationFrame(animationId);
  animationId = null;
  phase = 'idle';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
  updateDisplay();
}

function togglePause() {
  if (paused) {
    // Resuming - adjust phaseStartTime by time spent paused
    const pauseDuration = Date.now() - pausedAt;
    phaseStartTime += pauseDuration;
    paused = false;
  } else {
    // Pausing - record when we paused
    pausedAt = Date.now();
    paused = true;
  }
  document.getElementById('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
}

updateDisplay();
