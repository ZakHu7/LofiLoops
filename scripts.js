const mm = window.mm;

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
    ],
    totalTime: 8
};

// Global Variables
let currentMel;
let training = {};
let midime = new mm.MidiMe({epochs: 100});
midime.initialize();

//Load player with piano sound
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');

function playTwinkle() {
    player.resumeContext();

    player.start(TWINKLE_TWINKLE);
}

function loadTwinkle() {
    const qns = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);
    
    currentMel = qns;
    console.log(currentMel);
}

// Train the model!!
async function train() {
    // setLoading(true);
    console.log("training");
    console.log(midime);
    // stopPlayer();

    // This is the input that we're going to train on.
    const chunks = getChunks([currentMel]);
    console.log(chunks)
    const z1 = await midime.encode(chunks);  // shape of z is [chunks, 256]
    
    training.z = z1;

    console.log(training.z)
    
    var totalSteps = midime.config.epochs = trainingSteps;
    
    const losses = [];

    // console.log(training.z)

    await midime.train(training.z, async (epoch, logs) => {
      // await mm.tf.nextFrame();
      trainingSteps = epoch + 1;
      losses.push(logs.total);
      // plotLoss(losses);
    });
    console.log("training done")
  
    // If we've trained, then we sample from MidiMe.
    const s = await midime.sample(1);
    training.zArray = s.arraySync()[0];
    var mel = (await midime.decode(s))[0];

    console.log("got new sequence")
    
    // Get the 4 inputs from midime too.
    const z = midime.encoder.predict(s);
    const z_ = z[0].arraySync()[0];
    s.dispose();

    currentMel = mel;

    function getChunks(qnsMel) {
      // Encode the input into MusicVAE, get back a z.
      // Split this sequence into 32 bar chunks.
      let chunks = [];
      qnsMel.forEach((m) => {
        const melChunks = mm.sequences.split(mm.sequences.clone(m), 16 * 4);
        chunks = chunks.concat(melChunks);
      });
      return chunks;
    }

  }