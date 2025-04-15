let logo, logoX, logoY, logoXSpeed, logoYSpeed;
let mic, fft;

function preload() {
  // Load your band logo image (ensure the image is in your project folder)
  logo = loadImage("logo.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize logo parameters for a bouncing effect
  logoX = random(width - logo.width);
  logoY = random(height - logo.height);
  logoXSpeed = 3;
  logoYSpeed = 3;
  
  // Initialize microphone input for real-time audio capture
  mic = new p5.AudioIn();
  mic.start();
  
  // Set up FFT to analyze the audio waveform; it can also provide frequency data if needed
  fft = new p5.FFT();
  fft.setInput(mic);
}

function draw() {
  background(30);
  
  // --- Bouncing Logo Logic ---
  logoX += logoXSpeed;
  logoY += logoYSpeed;
  
  // Check edges and reverse velocity if needed
  if (logoX < 0 || logoX + logo.width > width) {
    logoXSpeed *= -1;
  }
  if (logoY < 0 || logoY + logo.height > height) {
    logoYSpeed *= -1;
  }
  
  image(logo, logoX, logoY);
  
  // --- Audio Waveform Display ---
  let waveform = fft.waveform();
  
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();
}

// Ensure responsiveness on window resize:
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
