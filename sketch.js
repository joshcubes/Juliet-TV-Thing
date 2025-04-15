let waveColor = "#00FF00"; // Global variable for waveform color
let mic, fft;
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

  // Start the microphone (default device) and request permission.
  mic = new p5.AudioIn();
  mic.start(() => {
    fft = new p5.FFT();
    fft.setInput(mic);
    // After the mic stream is ready, update the display of the default device.
    updateCurrentDeviceDisplay();
  });

  // Attach event listener for the color picker.
  const colorPicker = document.getElementById("colorPicker");
  if (colorPicker) {
    colorPicker.addEventListener("input", function() {
      waveColor = this.value;
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
    noFill();
    stroke(waveColor);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      let x = map(i, 0, waveform.length, 0, width);
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
      const deviceId = settings.deviceId; // Device ID for the stream.
      // Use enumerateDevices to find the label corresponding to this deviceId.
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
