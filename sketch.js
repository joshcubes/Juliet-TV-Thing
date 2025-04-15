let waveColor = "#00FF00";   // Global variable for waveform color.
let zoomFactor = 1;          // Default zoom factor.
let analyzerGain = 1;        // Effective gain from logarithmic mapping.
let lineThickness = 2;       // Default waveform line thickness.
let smoothingLerpFactor = 1; // Default lerp factor for smoothing.
                             // (1 means immediate update, 0 means fully smoothed)

let mic, fft, gainNode;
let logo, logoX, logoY, logoXSpeed, logoYSpeed;

// Global array to store our smoothed waveform:
let smoothedWaveform = [];

function preload() {
  // Ensure you have a valid logo.png in your project folder.
  logo = loadImage("logo.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Initialize bouncing logo parameters.
  logoX = random(width - logo.width);
  logoY = random(height - logo.height);
  logoXSpeed = 3;
  logoYSpeed = 3;

  // Start the default microphone.
  mic = new p5.AudioIn();
  mic.start(() => {
    // Create a gain node and route the mic through it.
    gainNode = new p5.Gain();
    gainNode.amp(analyzerGain);  // Set the initial gain.
    gainNode.setInput(mic);
    
    // Initialize FFT with a high smoothing parameter.
    fft = new p5.FFT(0.95, 1024);
    fft.setInput(gainNode);
    
    // Once permission is granted, update the default device display.
    updateCurrentDeviceDisplay();
  });

  // Attach event listener for the color picker.
  const colorPicker = document.getElementById("colorPicker");
  if (colorPicker) {
    colorPicker.addEventListener("input", function() {
      waveColor = this.value;
    });
  }

  // Attach event listener for the zoom slider.
  const zoomSlider = document.getElementById("zoomSlider");
  if (zoomSlider) {
    zoomSlider.addEventListener("input", function() {
      zoomFactor = parseFloat(this.value);
      document.getElementById("currentZoom").innerText = "Current Zoom: " + zoomFactor.toFixed(1);
    });
  }
  
  // Attach event listener for the gain slider.
  const gainSlider = document.getElementById("gainSlider");
  if (gainSlider) {
    gainSlider.addEventListener("input", function() {
      let sliderValue = parseFloat(this.value);
      // effectiveGain = 10^((sliderValue - 0.25) / 0.75)
      analyzerGain = Math.pow(10, (sliderValue - 0.25) / 0.75);
      if (gainNode) {
        gainNode.amp(analyzerGain);
      }
      document.getElementById("currentGain").innerText = "Current Gain: " + analyzerGain.toFixed(2);
    });
  }
  
  // Attach event listener for the line thickness slider.
  const thicknessSlider = document.getElementById("lineThicknessSlider");
  if (thicknessSlider) {
    thicknessSlider.addEventListener("input", function() {
      lineThickness = parseFloat(this.value);
      document.getElementById("currentLineThickness").innerText = "Current Line Thickness: " + lineThickness.toFixed(2);
    });
  }
  
  // Attach event listener for the smoothing slider.
  const smoothingSlider = document.getElementById("smoothingSlider");
  if (smoothingSlider) {
    smoothingSlider.addEventListener("input", function() {
      let sliderVal = parseFloat(this.value);
      // Map slider such that 0 => no smoothing (fast update, effective factor = 1)
      // and 1 => maximum smoothing (effective factor = 0).
      smoothingLerpFactor = 1 - sliderVal;
      document.getElementById("currentSmoothing").innerText = "Current Smoothing: " + sliderVal.toFixed(2);
    });
  }
}

function draw() {
  background(30);

  // --- Bouncing DVD-style Logo ---
  logoX += logoXSpeed;
  logoY += logoYSpeed;
  if (logoX < 0 || logoX + logo.width > width) {
    logoXSpeed *= -1;
  }
  if (logoY < 0 || logoY + logo.height > height) {
    logoYSpeed *= -1;
  }
  image(logo, logoX, logoY);

  // --- Draw the Smoothed Waveform ---
  if (fft) {
    let rawWaveform = fft.waveform(); // Get current waveform (raw data)
    
    // Initialize smoothedWaveform if needed.
    if (smoothedWaveform.length !== rawWaveform.length) {
      smoothedWaveform = rawWaveform.slice();
    } else {
      // Interpolate each sample.
      for (let i = 0; i < rawWaveform.length; i++) {
        smoothedWaveform[i] = lerp(smoothedWaveform[i], rawWaveform[i], smoothingLerpFactor);
      }
    }
    
    // Determine how many samples to draw based on zoomFactor.
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

// Toggle the settings panel when S is pressed.
function keyPressed() {
  if (key === 's' || key === 'S') {
    toggleSettings();
  }
}

function toggleSettings() {
  const panel = document.getElementById("settingsPanel");
  panel.style.display = (panel.style.display === "none" || panel.style.display === "") ? "block" : "none";
}

// Update and display the default microphone device label.
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
        document.getElementById("currentDevice").innerText =
          "Default Microphone Device: " + deviceLabel;
      });
    } else {
      document.getElementById("currentDevice").innerText =
          "Default Microphone Device: Not Available";
    }
  }
}
