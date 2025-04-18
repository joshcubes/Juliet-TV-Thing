// Visualizer Settings Variables
let waveColor = "#00FF00";         // Waveform color.
let zoomFactor = 2.4;              // Zoom factor for waveform.
let analyzerGain = 5.75;           // Effective gain (logarithmically mapped).
let lineThickness = 4;             // Waveform line thickness.
let smoothingLerpFactor = 1 - 0.55;  // For waveform smoothing (0.55 slider yields lerp factor 0.45).

// Logo Settings Variables
let logoSpeedFactor = 1.4;         // Multiplier for logo bouncing speed.
let logoPercent = 23;              // Logo height as percentage of window height.

// New Feature Toggles
let showLogo = true;               // Toggle for bouncing logo.
let showWaveform = true;           // Toggle for waveform display.

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
  
  // Initialize logo position (centered).
  let desiredHeight = (logoPercent / 100) * height;
  let logoScale = desiredHeight / refLogoHeight;
  let outputLogoWidth = refLogoWidth * logoScale;
  let outputLogoHeight = refLogoHeight * logoScale;
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
  
  // Feature toggles
  document.getElementById("toggleLogo").addEventListener("change", function() {
    showLogo = this.checked;
  });
  document.getElementById("toggleWaveform").addEventListener("change", function() {
    showWaveform = this.checked;
  });
  
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
  
  // Logo Height Slider – adjust logo size and recenter.
  document.getElementById("logoSizeSlider").addEventListener("input", function() {
    logoPercent = parseFloat(this.value);
    document.getElementById("currentLogoSize").innerText = "Current Logo Height: " + logoPercent.toFixed(0) + "%";
    let desiredHeight = (logoPercent / 100) * height;
    let logoScale = desiredHeight / refLogoHeight;
    let currentLogoWidth = refLogoWidth * logoScale;
    let currentLogoHeight = refLogoHeight * logoScale;
    logoX = (width - currentLogoWidth) / 2;
    logoY = (height - currentLogoHeight) / 2;
  });
  
  // Logo Speed Slider – adjust logoSpeedFactor.
  document.getElementById("logoSpeedSlider").addEventListener("input", function() {
    logoSpeedFactor = parseFloat(this.value);
    document.getElementById("currentLogoSpeed").innerText = "Current Logo Speed: " + logoSpeedFactor.toFixed(1);
  });
  
  // Logo Upload – update logo image.
  document.getElementById("logoUpload").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function(e) {
        loadImage(e.target.result, function(loadedImage) {
          logo = loadedImage;
          refLogoWidth = loadedImage.width;
          refLogoHeight = loadedImage.height;
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
  
  // Save and Load Config Buttons
  document.getElementById("saveConfigButton").addEventListener("click", saveConfig);
  document.getElementById("loadConfigButton").addEventListener("click", function() {
    // Trigger the hidden file input for config upload.
    document.getElementById("configUpload").click();
  });
  document.getElementById("configUpload").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      loadConfigFromFile(file);
    }
    this.value = null;
  });
  
  // Load Defaults Button
  document.getElementById("loadDefaultsButton").addEventListener("click", loadDefaults);
}

function draw() {
  background(30);
  
  // --- Update and Draw the Bouncing Logo ---
  if (showLogo) {
    let desiredHeight = (logoPercent / 100) * height;
    let currentLogoScale = desiredHeight / refLogoHeight;
    let currentLogoWidth = refLogoWidth * currentLogoScale;
    let currentLogoHeight = refLogoHeight * currentLogoScale;
    
    let effectiveXSpeed = baseLogoXSpeed * logoSpeedFactor;
    let effectiveYSpeed = baseLogoYSpeed * logoSpeedFactor;
    logoX += effectiveXSpeed;
    logoY += effectiveYSpeed;
    
    // Bounce against canvas boundaries.
    if (logoX < 0 || logoX + currentLogoWidth > width) {
      baseLogoXSpeed *= -1;
      logoX += baseLogoXSpeed * logoSpeedFactor;
    }
    if (logoY < 0 || logoY + currentLogoHeight > height) {
      baseLogoYSpeed *= -1;
      logoY += baseLogoYSpeed * logoSpeedFactor;
    }
    
    image(logo, logoX, logoY, currentLogoWidth, currentLogoHeight);
  }
  
  // --- Get and Draw the Waveform ---
  if (showWaveform && fft) {
    let rawWaveform = fft.waveform();
    
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
        document.getElementById("currentDevice").innerText = "Current Input: " + deviceLabel;
      });
    } else {
      document.getElementById("currentDevice").innerText = "Audio Input Not Available";
    }
  }
}

// --- Save/Load Config Functions ---

function saveConfig() {
  const config = {
    waveColor: waveColor,
    zoomFactor: zoomFactor,
    gainSliderValue: parseFloat(document.getElementById("gainSlider").value),
    lineThickness: lineThickness,
    smoothingValue: parseFloat(document.getElementById("smoothingSlider").value),
    logoPercent: logoPercent,
    logoSpeedFactor: logoSpeedFactor,
    showLogo: showLogo,
    showWaveform: showWaveform
  };
  const configStr = JSON.stringify(config, null, 2);
  const blob = new Blob([configStr], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "julietVisualizerConfig.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadConfigFromFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const config = JSON.parse(e.target.result);
      
      // Update waveform settings.
      waveColor = config.waveColor;
      document.getElementById("colorPicker").value = config.waveColor;
      
      zoomFactor = config.zoomFactor;
      document.getElementById("zoomSlider").value = config.zoomFactor;
      
      // Update gain.
      document.getElementById("gainSlider").value = config.gainSliderValue;
      let sliderValue = config.gainSliderValue;
      analyzerGain = Math.pow(10, (sliderValue - 0.25) / 0.75);
      if (gainNode) { 
        gainNode.amp(analyzerGain); 
      }
      
      // Update line thickness.
      lineThickness = config.lineThickness;
      document.getElementById("lineThicknessSlider").value = config.lineThickness;
      
      // Update smoothing.
      document.getElementById("smoothingSlider").value = config.smoothingValue;
      smoothingLerpFactor = 1 - config.smoothingValue;
      
      // Update logo settings.
      logoPercent = config.logoPercent;
      document.getElementById("logoSizeSlider").value = config.logoPercent;
      let desiredHeight = (logoPercent / 100) * height;
      let logoScale = desiredHeight / refLogoHeight;
      let currentLogoWidth = refLogoWidth * logoScale;
      let currentLogoHeight = refLogoHeight * logoScale;
      logoX = (width - currentLogoWidth) / 2;
      logoY = (height - currentLogoHeight) / 2;
      
      logoSpeedFactor = config.logoSpeedFactor;
      document.getElementById("logoSpeedSlider").value = config.logoSpeedFactor;
      
      // Update feature toggles.
      showLogo = config.showLogo;
      document.getElementById("toggleLogo").checked = config.showLogo;
      
      showWaveform = config.showWaveform;
      document.getElementById("toggleWaveform").checked = config.showWaveform;
      
    } catch (error) {
      console.error("Error parsing configuration file:", error);
    }
  };
  reader.readAsText(file);
}

function loadDefaults() {
  // Reset settings to original default values.
  waveColor = "#00FF00";
  zoomFactor = 2.4;
  analyzerGain = 5.75;
  lineThickness = 4;
  smoothingLerpFactor = 1 - 0.55;
  logoSpeedFactor = 1.4;
  logoPercent = 23;
  showLogo = true;
  showWaveform = true;
  
  document.getElementById("colorPicker").value = waveColor;
  document.getElementById("zoomSlider").value = zoomFactor;
  document.getElementById("gainSlider").value = 0.82;
  document.getElementById("lineThicknessSlider").value = lineThickness;
  document.getElementById("smoothingSlider").value = 0.55;
  document.getElementById("logoSpeedSlider").value = logoSpeedFactor;
  document.getElementById("logoSizeSlider").value = logoPercent;
  
  document.getElementById("toggleLogo").checked = true;
  document.getElementById("toggleWaveform").checked = true;
  
  console.log("Defaults loaded.");
}

// --- Open Settings on Top Left Click (if panel is closed) ---
function mousePressed() {
  const panel = document.getElementById("settingsPanel");
  if (panel.style.display === "none" || panel.style.display === "") {
    // If not open, a click in the upper-left quadrant toggles it.
    if (mouseX < width / 2 && mouseY < height / 2) {
      toggleSettings();
    }
  }
}
