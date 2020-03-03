const mm = window.mm;

// Constants
const MELODY_BARS = 2;
const TRIO_BARS = 4;

//Testing Data
const TWINKLE_TWINKLE = {
  notes: [
    { pitch: 60, startTime: 0.0, endTime: 0.5 },
    { pitch: 60, startTime: 0.5, endTime: 1.0 },
    { pitch: 67, startTime: 1.0, endTime: 1.5 },
    { pitch: 67, startTime: 1.5, endTime: 2.0 },
    { pitch: 69, startTime: 2.0, endTime: 2.5 },
    { pitch: 69, startTime: 2.5, endTime: 3.0 },
    { pitch: 67, startTime: 3.0, endTime: 4.0 },
    { pitch: 65, startTime: 4.0, endTime: 4.5 },
    { pitch: 65, startTime: 4.5, endTime: 5.0 },
    { pitch: 64, startTime: 5.0, endTime: 5.5 },
    { pitch: 64, startTime: 5.5, endTime: 6.0 },
    { pitch: 62, startTime: 6.0, endTime: 6.5 },
    { pitch: 62, startTime: 6.5, endTime: 7.0 },
    { pitch: 60, startTime: 7.0, endTime: 8.0 },
    
    { pitch: 67, startTime: 8.0, endTime: 8.5 },
    { pitch: 67, startTime: 8.5, endTime: 9.0 },
    { pitch: 65, startTime: 9.0, endTime: 9.5 },
    { pitch: 65, startTime: 9.5, endTime: 10.0 },
    { pitch: 64, startTime: 10.0, endTime: 10.5 },
    { pitch: 64, startTime: 10.5, endTime: 11.0 },
    { pitch: 62, startTime: 11.0, endTime: 12.0 },
    { pitch: 67, startTime: 12.0, endTime: 12.5 },
    { pitch: 67, startTime: 12.5, endTime: 13.0 },
    { pitch: 65, startTime: 13.0, endTime: 13.5 },
    { pitch: 65, startTime: 13.5, endTime: 14.0 },
    { pitch: 64, startTime: 14.0, endTime: 14.5 },
    { pitch: 64, startTime: 14.5, endTime: 15.0 },
    { pitch: 62, startTime: 15.0, endTime: 16.0 },
    
    { pitch: 60, startTime: 16.0, endTime: 16.5 },
    { pitch: 60, startTime: 16.5, endTime: 17.0 },
    { pitch: 67, startTime: 17.0, endTime: 17.5 },
    { pitch: 67, startTime: 17.5, endTime: 18.0 },
    { pitch: 69, startTime: 18.0, endTime: 18.5 },
    { pitch: 69, startTime: 18.5, endTime: 19.0 },
    { pitch: 67, startTime: 19.0, endTime: 20.0 },
    { pitch: 65, startTime: 20.0, endTime: 20.5 },
    { pitch: 65, startTime: 20.5, endTime: 21.0 },
    { pitch: 64, startTime: 21.0, endTime: 21.5 },
    { pitch: 64, startTime: 21.5, endTime: 22.0 },
    { pitch: 62, startTime: 22.0, endTime: 22.5 },
    { pitch: 62, startTime: 22.5, endTime: 23.0 },
    { pitch: 60, startTime: 23.0, endTime: 24.0 },
  ],
  totalTime: 24
};

// Global Variables
let currentMel;
let training = {};
let trainingSteps = 100;
let userStopped = true;


let mvae;
let midime;

let player;

let viz;

init();

function init() {
  // Initialize midime
  midime = new mm.MidiMe({ epochs: 100 });
  midime.initialize();

  //Load player with piano sound
  player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');

  // Initialize mvae
  // mvae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
  
  mvae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_16bar');
  mvae.initialize();

  player.callbackObject = {
    run: (note) => viz.redraw(note, true),
    stop: () => { }
  };

  // Event Listeners
  fileBtn.addEventListener('change', loadFile);


  setLoading(false);
}

function updateViz() {
  viz = new mm.PianoRollSVGVisualizer(
    currentMel,
    document.getElementById('viz'),
    { noteRGB: '35,70,90', activeNoteRGB: '157, 229, 184', noteHeight: 3 });
}

function stopPlayer() {
  player.stop();
  userStopped = true;
}

function playCurrentMel() {
  player.resumeContext();
  userStopped = false;
  player.start(currentMel);
}

function loopPlayer() {
  userStopped = false;
  player.start(currentMel).then(() => {
    if (!userStopped) {
      loopPlayer();
    } else {
      stopPlayer();
    }
  });
}

async function loadSequence(mel) {
  currentMel = mel;
  // This is the input that we're going to train on.
  const chunks = getChunks([mel]);
  const z = await mvae.encode(chunks);  // shape of z is [chunks, 256]
  training.z = z;

  updateViz();

  function getChunks(quantizedMels) {
    // Encode the input into MusicVAE, get back a z.
    // Split this sequence into 32 bar chunks.
    let chunks = [];
    quantizedMels.forEach((m) => {
      const melChunks = mm.sequences.split(mm.sequences.clone(m), 16 * TRIO_BARS);
      chunks = chunks.concat(melChunks);
    });
    console.log(chunks);
    return chunks;
  }
}

async function loadTwinkle() {
  setLoading(true);

  const qns = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);
  await loadSequence(qns);
  console.log(qns);

  updateViz();
  setLoading(false);
}
// Loads a file from the user.
async function loadFile() {
  if (fileInput.files.length == 0) {
    console.log("No files provided!");
    return;
  }
  setLoading(true);

  const uns = await mm.blobToNoteSequence(fileInput.files[0]);
  const qns = mm.sequences.quantizeNoteSequence(uns, 4);
  await loadSequence(qns);
  console.log(qns);

  updateViz();
  setLoading(false);
}

async function loadTrained() {

  const s = await midime.sample(1);
  let zArray = s.arraySync()[0];
  const newMel = (await mvae.decode(s))[0];
  await loadSequence(newMel);

  // Get the 4 inputs from midime too.
  const z = midime.encoder.predict(s);
  const z_ = z[0].arraySync()[0];
  console.log(z_);
  s.dispose();
}

// Train the model!!
async function train() {
  setLoading(true);
  // stopPlayer(playerMelody, document.getElementById('btnPlayMelody'));

  currentSample = null;
  // trainingStep.textContent = 0;
  // totalSteps.textContent = ;
  midime.config.epochs = trainingSteps;

  const losses = [];

  await midime.train(training.z, async (epoch, logs) => {
    await mm.tf.nextFrame();
    // trainingStep.textContent = epoch + 1;
    losses.push(logs.total);
    // plotLoss(losses);
  });
  // updateUI('training-done');
  await loadTrained();

  setLoading(false);
}




function setLoading(loading) {
  if (loading) {
    document.getElementById("loading").removeAttribute('hidden');
  } else {
    document.getElementById("loading").setAttribute('hidden', true);
  }
}

