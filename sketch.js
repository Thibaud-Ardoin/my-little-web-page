let blobs = [];
const NUM_BLOBS = 50;

function signedRandom() {
    return random(2) - 1;
}


class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    getColor() {
        return color(this.r, this.g, this.b, this.a);
    }
}
let alpha = 10;

const palette = [
    new Color(255, 218, 185, alpha),  // Pastel orange
    new Color(173, 216, 230, alpha),  // Light blue 
    new Color(255, 182, 193, alpha),  // Light pink
    new Color(144, 238, 144, alpha),  // Light green
    new Color(255, 218, 185, alpha),  // Peach
    new Color(221, 160, 221, alpha),  // Plum
    new Color(176, 196, 222, alpha),  // Light steel blue
    new Color(152, 251, 152, alpha),  // Pale green
    new Color(255, 192, 203, alpha),  // Pink
    new Color(135, 206, 235, alpha),  // Sky blue
    new Color(216, 191, 216, alpha)   // Thistle
];


class Blob {
    constructor(color, position, size) {
        this.x = position.x;
        this.y = position.y;
        this.color = color;
        this.size = size;
        this.reset();
    }

    reset() {
        this.size = random(30, this.size);
    }


    draw() {
        noStroke();
        fill(this.color);
        beginShape();

        for (let a = 0; a < TWO_PI; a += 0.1) {
            // Add variation to the noise by using multiple noise functions
            let noiseFactor1 = noise(this.x * 0.05, this.y * 0.05, a) * 200;
            let noiseFactor2 = noise(this.x * 0.15, this.y * 0.15, a + 1000) * 150;
            let noiseFactor3 = noise(this.x * 0.3, this.y * 0.3, a + 2000) * 100;
            let noiseFactor = noiseFactor1 + noiseFactor2 + noiseFactor3;
            // Increase variation by multiplying noiseFactor

            let r = width/3 + (noiseFactor - width/5)*2 ;
            let x = this.x + cos(a) * r ;
            let y = this.y + sin(a) * r ;

            let secondaryNoiseFactorx = signedRandom();
            let secondaryNoiseFactory = signedRandom();

            let xx = x + secondaryNoiseFactorx * 200;
            let yy = y + secondaryNoiseFactory * 200;
            curveVertex(xx, yy);
        }
        endShape(CLOSE);
    }
}

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-background');
    background(255);
    noLoop();

    let positions = [
        createVector(width, random(height/2)),
        createVector(0, random(height/2)),
    ];

    for (let i = 0; i < 2; i++) {
        let random_color = random(palette);
        let size = random(50, 50);
        for (let j = 0; j < NUM_BLOBS; j++) {
            blobs.push(new Blob(random_color.getColor(), positions[i], size));
        }
    }
}

function draw() {
    background(255);

    for (let blob of blobs) {
        blob.draw();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}