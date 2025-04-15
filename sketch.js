let waveColor = "#00FF00"; // Default waveform color
let mic, fft;

let logo, logoX, logoY, logoXSpeed, logoYSpeed;

// Preload the logo image.
function preload() {
  logo = loadImage("logo.png"); // Ensure you have logo.png in your folder
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize bouncing logo parameters.
  logoX = random(width - logo.width);
  logoY = random(height - logo.height);
  logoXSpeed = 3;
  logoYSpeed = 3;
  
  // Request microphone permissions by starting a default AudioIn.
  // This will prompt the user, and once granted, we can enumerate devices.
  mic = new p5.AudioIn();
  mic.start(() => {
    fft = new p5.FFT();
    fft.setInput(mic);
    
    // After permission is granted, populate the audio device dropdown.
    populateAudioInputSelect();
    
    // Update the display of the current device.
    updateCurrentDeviceDisplay();
  });
}

function draw() {
  background(30);
  
  // --- Draw the bouncing DVD-style logo ---
  logoX += logoXSpeed;
  logoY += logoYSpeed;
  
  // Bounce off the horizontal edges.
  if (logoX < 0 || logoX + logo.width > width) {
    logoXSpeed *= -1;
  }
  // Bounce off the vertical edges.
  if (logoY < 0 || logoY + logo.height > height) {
    logoYSpeed *= -1;
  }
  
  image(logo, logoX, logoY);
  
  // --- Draw the waveform ---
  if (fft) {
    let waveform = fft.waveform();
    noFill();
    stroke(waveColor); // Use the current wave color.
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

// Listen for the 'S' key to toggle the settings panel.
function keyPressed() {
  if (key === 's' || key === 'S') {
    toggleSettings();
  }
}

function toggleSettings() {
  const panel = document.getElementById("settingsPanel");
  panel.style.display = (panel.style.display === "none" || panel.style.display === "") ? "block" : "none";
}

// Enumerate all available audio input devices and populate the dropdown.
function populateAudioInputSelect() {
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
      const audioSelect = document.getElementById("audioInputSelect");
      // Clear any existing options.
      audioSelect.innerHTML = "";
      devices.forEach(function(device) {
        if (device.kind === "audioinput") {
          let option = document.createElement("option");
          option.value = device.deviceId;
          // Device labels might be empty if permission hasn’t been granted yet.
          option.text = device.label || "Audio Input " + (audioSelect.length + 1);
          audioSelect.appendChild(option);
        }
      });
    });
  }
}

// Update the "Current Device" paragraph based on current mic settings.
function updateCurrentDeviceDisplay() {
  // If the mic has a source object with a label, use it; otherwise, use the dropdown.
  const audioSelect = document.getElementById("audioInputSelect");
  let currentLabel = "Not Selected";
  if (mic && mic.stream) {
    // Try to extract a label by matching the current stream’s deviceId.
    // Note: This might depend on browser support.
    const tracks = mic.stream.getAudioTracks();
    if (tracks.length > 0) {
      const settings = tracks[0].getSettings();
      let deviceId = settings.deviceId;
      // Iterate through dropdown options to find a matching device.
      for (let i = 0; i < audioSelect.options.length; i++) {
        if (audioSelect.options[i].value === deviceId) {
          currentLabel = audioSelect.options[i].text;
          // Set the dropdown selection appropriately.
          audioSelect.selectedIndex = i;
          break;
        }
      }
    }
  }
  document.getElementById("currentDevice").innerText = "Current Device: " + currentLabel;
}

// Event listener for the color picker.
document.getElementById("colorPicker").addEventListener("input", function() {
  waveColor = this.value;
});

// Update the audio input when a new device is selected.
document.getElementById("audioInputSelect").addEventListener("change", function() {
  let deviceId = this.value;
  
  // Update displayed current device.
  document.getElementById("currentDevice").innerText = "Current Device: " + this.options[this.selectedIndex].text;
  
  // Stop the previous input.
  if (mic) {
    mic.stop();
  }
  
  // Specify constraints to choose the selected audio input.
  let constraints = {
    audio: {
      deviceId: { exact: deviceId }
    }
  };
  
  // Create a new microphone input with the given constraints.
  mic = new p5.AudioIn();
  mic.start(constraints, () => {
    fft.setInput(mic);
  });
});
