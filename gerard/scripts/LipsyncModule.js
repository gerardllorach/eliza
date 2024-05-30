

// --------------------- LIPSYNC MODULE --------------------

// Switch to https if using this script
if (window.location.protocol != "https:")
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);


// Globals
if (!LS.Globals)
  LS.Globals = {};

// Audio context
if (!LS.Globals.AContext)
  LS.Globals.AContext = new AudioContext();


// Audio sources
// Microphone
navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;


Lipsync.prototype.refFBins = [0, 500, 700,3000, 6000];


// Constructor
function Lipsync(threshold, smoothness, pitch) {

  // Freq analysis bins, energy and lipsync vectors
  this.energy = [0,0,0,0,0,0,0,0];
  this.lipsyncBSW = [0,0,0]; //kiss,lipsClosed,jaw

  // Lipsync parameters
  this.threshold = threshold || 0.5;
  this.smoothness = smoothness || 0.6;
  this.pitch = pitch || 1;
  // Change freq bins according to pitch
  this.fBins = [];
  this.defineFBins(this.pitch);

  // Initialize buffers
  this.init();

  this.working = false;
}





// Start mic input (asking video too for permissions pop-up)
Lipsync.prototype.start = function(){
  // Restart mic input?
  this.stopSample();
  
  thatLip = this;
  navigator.getUserMedia({audio: true, video:false}, function(stream) {
    thatLip.stream = stream;
    thatLip.sample = thatLip.context.createMediaStreamSource(stream);
    thatLip.sample.connect(thatLip.analyser);
  }, function(e){console.error("ERROR: get user media: ", e);});

  this.working = true;
}

// Init stream
Lipsync.prototype.initStream = function(){
  thatLip = this;
  navigator.getUserMedia({audio: true}, function(stream) {
    thatLip.stream = stream;
    thatLip.sample = thatLip.context.createMediaStreamSource(stream);
  }, function(e){console.error("ERROR: get user media: ", e);});
}

// Pause (disconnect from analyser)
Lipsync.prototype.pause = function(dt){
  this.stop(dt);
  return;
  
  // Immediate pause
  if (dt === undefined){
    // Pause analyser
    this.sample.disconnect(this.analyser);
    this.working = false;
  }
  // Delayed pause
  else {
    thatLip = this;
    setTimeout(thatLip.pause.bind(thatLip), dt*1000);
  }
}

// Unpause (connect analyser)
Lipsync.prototype.unpause = function(){
  this.start();
  return;
  
  this.sample.connect(this.analyser);
  this.working = true;
}



// Update lipsync weights
Lipsync.prototype.update = function(){
  if (!this.working)
    return;

  // FFT data
  if (!this.analyser){
    if (this.gainNode){
      // Analyser
      this.analyser = this.context.createAnalyser();
      // FFT size
      this.analyser.fftSize = 1024;
      // FFT smoothing
      this.analyser.smoothingTimeConstant = this.smoothness;
    }
    else
      return;
  }
  // Short-term power spectrum
  this.analyser.getFloatFrequencyData(this.data);
  // Analyze energies
  this.binAnalysis();
  // Calculate lipsync blenshape weights
  this.lipAnalysis();

}



Lipsync.prototype.stop = function(dt){
  // Immediate stop
  if (dt === undefined){
    // Stop mic input
    this.stopSample();

    this.working = false;
  }
  // Delayed stop
  else {
    thatLip = this;
    setTimeout(thatLip.stop.bind(thatLip), dt*1000);
  }
}







// Define fBins
Lipsync.prototype.defineFBins = function(pitch){
  for (var i = 0; i<this.refFBins.length; i++)
      this.fBins[i] = this.refFBins[i] * pitch;
}


// Audio buffers and analysers
Lipsync.prototype.init = function(){

  var context = this.context = LS.Globals.AContext;;
  // Sound source
  this.sample = context.createBufferSource();
  // Gain Node
  this.gainNode = context.createGain();
  // Analyser
  this.analyser = context.createAnalyser();
  // FFT size
  this.analyser.fftSize = 1024;
  // FFT smoothing
  this.analyser.smoothingTimeConstant = this.smoothness;
  
  // FFT buffer
  this.data = new Float32Array(this.analyser.frequencyBinCount);
}


// Analyze energies
Lipsync.prototype.binAnalysis = function(){
  
  // Signal properties
  var nfft = this.analyser.frequencyBinCount;
  var fs = this.context.sampleRate;

  var fBins = this.fBins;
  var energy = this.energy;

  
  // Energy of bins
  for (var binInd = 0; binInd < fBins.length-1; binInd++){
    // Start and end of bin
    var indxIn = Math.round(fBins[binInd]*nfft/(fs/2));
    var indxEnd = Math.round(fBins[binInd+1]*nfft/(fs/2));

    // Sum of freq values
    energy[binInd] = 0;
    for (var i = indxIn; i<indxEnd; i++){
      // data goes from -25 to -160 approx
      // default threshold: 0.45
      var value = this.threshold + (this.data[i]+20)/140;
      // Zeroes negative values
      value = value > 0 ? value : 0;
      
      energy[binInd] += value;
    }
    // Divide by number of sumples
    energy[binInd] /= (indxEnd-indxIn); 
  }
}

// Calculate lipsyncBSW
Lipsync.prototype.lipAnalysis = function(){
  
  var energy = this.energy;

  if (energy !== undefined){
    
    var value = 0;

    // Kiss blend shape
    // When there is energy in the 1 and 2 bin, blend shape is 0
    value = (0.5 - (energy[2]))*2;
    if (energy[1]<0.2)
      value = value*(energy[1]*5)
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.lipsyncBSW[0] = value;


    // Lips closed blend shape
    value = energy[3]*3;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.lipsyncBSW[1] = value;
    
    // Jaw blend shape
    value = energy[1]*0.8 - energy[3]*0.8;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.lipsyncBSW[2] = value;
  }

}




// Stops mic input
Lipsync.prototype.stopSample = function(){
  // If AudioBufferSourceNode has started
  if(this.sample)
    if(this.sample.buffer)
      this.sample.stop(0);
  
  // If microphone input
  if (this.stream){
    var tracks = this.stream.getTracks();
    for (var i = 0; i<tracks.length; i++)
      if (tracks[i].kind = "audio")
        tracks[i].stop();
    this.stream = null;
  }

}