// Visualizer Settings Variables
let waveColor = "#00FF00";         // Waveform color.
let zoomFactor = 2.4;              // Zoom factor for waveform.
let analyzerGain = 5.75;           // Effective gain (logarithmically mapped).
let lineThickness = 4;             // Waveform line thickness.
let smoothingLerpFactor = 1 - 0.55;  // For waveform smoothing (0.55 smoothing slider yields lerp factor 0.45).

// Logo Settings Variables
let logoSpeedFactor = 1.4;         // Multiplier for logo bouncing speed.
let logoPercent = 23;              // Logo height as percentage of window height (default 23%)

// Reference dimensions for the logo (set from the default logo in preload—and updated on upload)
let refLogoWidth, refLogoHeight;

// Audio and Visualizer Objects
let mic, fft, gainNode;
let logo, logoX, logoY;
let baseLogoXSpeed = 3;            // Base horizontal speed.
let baseLogoYSpeed = 3;            // Base vertical speed.
let smoothedWaveform = [];         // Array for storing smoothed FFT data.

function preload() {
  // Load the default logo image.
  // When loaded, store its intrinsic dimensions as reference.
  logo = loadImage("logo.png", function(img) {
    refLogoWidth = img.width;
    refLogoHeight = img.height;
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Compute the desired output height from logoPercent.
  let desiredHeight = (logoPercent / 100) * height;
  let logoScale = desiredHeight / refLogoHeight;
  let outputLogoWidth = refLogoWidth * logoScale;
  let outputLogoHeight = refLogoHeight * logoScale;
  
  // Initially center the logo.
  logoX = (width - outputLogoWidth) / 2;
  logoY = (height - outputLogoHeight) / 2;
  
  // Set base speeds.
  baseLogoXSpeed = 3;
  baseLogoYSpeed = 3;
  
  // Start the default microphone.
  mic = new p5.AudioIn();
  mic.start(() => {
    // Set up a gain node for the microphone.
    gainNode = new p5.Gain();
    gainNode.amp(analyzerGain);
    gainNode.setInput(mic);
    
    // Initialize the FFT analyzer with a smoothing parameter.
    fft = new p5.FFT(0.95, 1024);
    fft.setInput(gainNode);
    
    updateCurrentDeviceDisplay();
  });
  
  // --- Attach Event Listeners ---
  
  // Waveform Color
  document.getElementById("colorPicker").addEventListener("input", function() {
    waveColor = this.value;
  });
  
  // Zoom Slider
  document.getElementById("zoomSlider").addEventListener("input", function() {
    zoomFactor = parseFloat(this.value);
    document.getElementById("currentZoom").innerText = "Current Zoom: " + zoomFactor.toFixed(1);
  });
  
  // Gain Slider (logarithmic mapping)
  document.getElementById("gainSlider").addEventListener("input", function() {
    let sliderValue = parseFloat(this.value);
    analyzerGain = Math.pow(10, (sliderValue - 0.25) / 0.75);
    if (gainNode) {
      gainNode.amp(analyzerGain);
    }
    document.getElementById("currentGain").innerText = "Current Gain: " + analyzerGain.toFixed(2);
  });
  
  // Line Thickness Slider
  document.getElementById("lineThicknessSlider").addEventListener("input", function() {
    lineThickness = parseFloat(this.value);
    document.getElementById("currentLineThickness").innerText = "Current Line Thickness: " + lineThickness.toFixed(2);
  });
  
  // Smoothing Slider
  document.getElementById("smoothingSlider").addEventListener("input", function() {
    let sliderVal = parseFloat(this.value);
    // 0 => no smoothing (lerp factor = 1); 1 => maximum smoothing (lerp factor = 0)
    smoothingLerpFactor = 1 - sliderVal;
    document.getElementById("currentSmoothing").innerText = "Current Smoothing: " + sliderVal.toFixed(2);
  });
  
  // Logo Height Slider – now represents a percentage of the window height.
  document.getElementById("logoSizeSlider").addEventListener("input", function() {
    logoPercent = parseFloat(this.value);
    document.getElementById("currentLogoSize").innerText = "Current Logo Height: " + logoPercent.toFixed(0) + "%";
    
    // Recalculate desired height from the current window height.
    let desiredHeight = (logoPercent / 100) * height;
    let logoScale = desiredHeight / refLogoHeight;
    let currentLogoWidth = refLogoWidth * logoScale;
    let currentLogoHeight = refLogoHeight * logoScale;
    
    // Recenter the logo.
    logoX = (width - currentLogoWidth) / 2;
    logoY = (height - currentLogoHeight) / 2;
  });
  
  // Logo Speed Slider – adjust the logoSpeedFactor.
  document.getElementById("logoSpeedSlider").addEventListener("input", function() {
    logoSpeedFactor = parseFloat(this.value);
    document.getElementById("currentLogoSpeed").innerText = "Current Logo Speed: " + logoSpeedFactor.toFixed(1);
  });
  
  // Logo Upload – allow a local upload; update reference dimensions so aspect ratio is preserved.
  document.getElementById("logoUpload").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function(e) {
        loadImage(e.target.result, function(loadedImage) {
          // Update the global logo image.
          logo = loadedImage;
          // Update reference dimensions based on the new image.
          refLogoWidth = loadedImage.width;
          refLogoHeight = loadedImage.height;
          // Recenter the logo using the current slider value.
          let desiredHeight = (logoPercent / 100) * height;
          let logoScale = desiredHeight / refLogoHeight;
          let currentLogoWidth = refLogoWidth * logoScale;
          let currentLogoHeight = refLogoHeight * logoScale;
          logoX = (width - currentLogoWidth) / 2;
          logoY = (height - currentLogoHeight) / 2;
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

function draw() {
  background(30);
  
  // --- Update and Draw the Bouncing Logo ---
  // Compute the desired output height based on current windowHeight and logoPercent.
  let desiredHeight = (logoPercent / 100) * height;
  // Compute the current scaling factor.
  let currentLogoScale = desiredHeight / refLogoHeight;
  // Calculate output dimensions while preserving the original aspect ratio.
  let currentLogoWidth = refLogoWidth * currentLogoScale;
  let currentLogoHeight = refLogoHeight * currentLogoScale;
  
  // Update logo position using bounce simulation.
  let effectiveXSpeed = baseLogoXSpeed * logoSpeedFactor;
  let effectiveYSpeed = baseLogoYSpeed * logoSpeedFactor;
  logoX += effectiveXSpeed;
  logoY += effectiveYSpeed;
  
  // Bounce against the canvas boundaries.
  if (logoX < 0 || logoX + currentLogoWidth > width) {
    baseLogoXSpeed *= -1;
    logoX += baseLogoXSpeed * logoSpeedFactor;
  }
  if (logoY < 0 || logoY + currentLogoHeight > height) {
    baseLogoYSpeed *= -1;
    logoY += baseLogoYSpeed * logoSpeedFactor;
  }
  
  // Draw the logo.
  image(logo, logoX, logoY, currentLogoWidth, currentLogoHeight);
  
  // --- Get and Smooth the Waveform Data ---
  if (fft) {
    let rawWaveform = fft.waveform(); // Array of values in [-1, 1]
    
    if (smoothedWaveform.length !== rawWaveform.length) {
      smoothedWaveform = rawWaveform.slice();
    } else {
      for (let i = 0; i < rawWaveform.length; i++) {
        smoothedWaveform[i] = lerp(smoothedWaveform[i], rawWaveform[i], smoothingLerpFactor);
      }
    }
    
    let nSamples = smoothedWaveform.length / zoomFactor;
    nSamples = constrain(nSamples, 1, smoothedWaveform.length);
    
    noFill();
    stroke(waveColor);
    strokeWeight(lineThickness);
    beginShape();
    for (let i = 0; i < nSamples; i++) {
      let x = map(i, 0, nSamples, 0, width);
      let y = map(smoothedWaveform[i], -1, 1, 0, height);
      vertex(x, y);
    }
    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  // Toggle settings panel when 'S' is pressed.
  if (key === 's' || key === 'S') {
    toggleSettings();
  }
}

function toggleSettings() {
  const panel = document.getElementById("settingsPanel");
  panel.style.display = (panel.style.display === "none" || panel.style.display === "") ? "block" : "none";
}

function updateCurrentDeviceDisplay() {
  if (mic && mic.stream) {
    const tracks = mic.stream.getAudioTracks();
    if (tracks.length > 0) {
      const settings = tracks[0].getSettings();
      const deviceId = settings.deviceId;
      navigator.mediaDevices.enumerateDevices().then(function(devices) {
        let deviceLabel = "Unknown";
        devices.forEach(function(device) {
          if (device.kind === "audioinput" && device.deviceId === deviceId) {
            deviceLabel = device.label;
          }
        });
        document.getElementById("currentDevice").innerText = "Default Microphone Device: " + deviceLabel;
      });
    } else {
      document.getElementById("currentDevice").innerText = "Default Microphone Device: Not Available";
    }
  }
}
