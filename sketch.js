let waveColor = "#00FF00";   // Global variable for waveform color.
let zoomFactor = 1;          // Default zoom factor.
let analyzerGain = 1;        // Effective gain from logarithmic mapping.
let lineThickness = 2;       // Default waveform line thickness.

let mic, fft, gainNode;
let logo, logoX, logoY, logoXSpeed, logoYSpeed;

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
    // (Optional: connect gainNode to master output via gainNode.connect() if needed.)
    
    // Initialize FFT using the output of the gain node.
    fft = new p5.FFT();
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
      // Read raw slider value (between 0 and 1) and map logarithmically.
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
  const lineThicknessSlider = document.getElementById("lineThicknessSlider");
  if (lineThicknessSlider) {
    lineThicknessSlider.addEventListener("input", function() {
      lineThickness = parseFloat(this.value);
      document.getElementById("currentLineThickness").innerText = "Current Line Thickness: " + lineThickness.toFixed(2);
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

  // --- Draw the Waveform ---
  if (fft) {
    let waveform = fft.waveform();
    // Calculate the number of samples to display based on zoomFactor.
    let nSamples = waveform.length / zoomFactor;
    nSamples = constrain(nSamples, 1, waveform.length);

    noFill();
    stroke(waveColor);
    strokeWeight(lineThickness);  // Use our adjusted line thickness.
    beginShape();
    for (let i = 0; i < nSamples; i++) {
      // Map the current sample index to the full canvas width.
      let x = map(i, 0, nSamples, 0, width);
      let y = map(waveform[i], -1, 1, 0, height);
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
      const deviceId = settings.deviceId; // Device ID from the stream.
      // Look up the device label using enumerateDevices.
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
