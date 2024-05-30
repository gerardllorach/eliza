//@Eliza module
// states = {OFF, LISTENING, PROCESSING, SPEAKING, WAITING}

// Globals
// performance
if (!LS.Globals)
  LS.Globals = {};

// Switch to https if using this script
if (window.location.protocol != "https:")
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);




// Initialize eliza AI, ASR and STT
function Eliza(lang, gender){
  // Speech to text ASR
  if (typeof webkitSpeechRecognition !== 'undefined')
  	this.recognition = new webkitSpeechRecognition()
  else if (typeof SpeechRecognition !== 'undefined')
    this.recognition = new SpeechRecognition();
  else{
    console.error("SpeechRecognition not supported by browser. Please use the latest version of Chrome.");
  	alert("SpeechRecognition not supported by browser. Please use the latest version of Chrome.");
    return undefined;
  }
  this.recognition.interimResults = true; // Show preliminary results
  this.recognition.lang = this.lang = lang || "en-US";
  this.gender = gender || "Female";

  this.tempSTT = "";
  this.finalSTT = "";

  // Artificial Intelligence
  this.elizaAI = new ElizaBot();
  this.elizaAI.memSize = 100;
  this.elizaMSG = "";
  this.state = "OFF";
  
  this.init();
  
  
  
  // Text to speech --> this is done now in BML
  //this.elizaVoice = new SpeechSynthesisUtterance("");
  //this.elizaVoice.lang = "en-US";
  //this.elizaVoice.voice = speechSynthesis.getVoices().filter(function(voice) { return voice.name == 'Google US English'; })[0];

  // Lipsyncing --> done in facialControl
  //this.lipsync = new Lipsync();
  
  // Start and end lipsync with eliza voice --> defined in facialControl
  //thatEliza = this;
  //this.elizaVoice.onstart = function(e){thatEliza.lipsync.start(); thatEliza.state = "SPEAKING";}
  //this.elizaVoice.onend = function(e){thatEliza.lipsync.stop(); thatEliza.state = "WAITING";}
  
  

}

Eliza.prototype.init = function(){

  var recognition = this.recognition;
  // Actually LS.Globals.elizaAI = this, but "that" is giving problems inside recogition callbacks
  var that = this;
  //LS.GlobalScene.collectData();
  var lights = LS.GlobalScene._lights;
  this.initLights = [];
    for (var i = 0; i<lights.length; i++)
      this.initLights[i] = lights[i].intensity;

  // Results of ASR
  recognition.onresult = function(e){
    if (e.results[0].isFinal){
      console.log("STT delay", performance.now()- LS.Globals.startSTT );
      if (LS.Globals.STTPer)
      	LS.Globals.STTPer.push(performance.now()- LS.Globals.startSTT);
      
      var msg = e.results[0][0].transcript;
      LS.Globals.startEliza = performance.now();
      LS.Globals.elizaAI.processResult(msg, true); 
      
    }
    else{
      var msg = "";
      for (var i = 0; i< e.results.length; i++)
        msg += e.results[i][0].transcript;
      LS.Globals.elizaAI.processResult(msg, false);
    }
  }

  recognition.onspeechend = function(){
    LS.Globals.elizaAI.state = "PROCESSING";
  }
  
  recognition.onaudioend = function(){
    LS.Globals.startSTT = performance.now();
    LS.Globals.startTotal = performance.now();
  }
  
  recognition.onstart = function(){
    LS.Globals.elizaAI.state = "LISTENING";
    LS.Globals.elizaAI.finalSTT = "";
    // Dim lights
    var lights = LS.GlobalScene._lights;
    // Fix start error (lights cannot be found onStart())
      if (LS.Globals.elizaAI.initLights.length == 0)
        for (var i = 0; i<lights.length; i++) LS.Globals.elizaAI.initLights[i] = lights[i].intensity;
    for (var i = 0; i<lights.length; i++){
      // Dim lights
      var targetLight = LS.Globals.elizaAI.initLights[i] * 0.5;
      LS.Tween.easeProperty( lights[i], "intensity", targetLight, 0.5, LS.Tween.EASE_IN_CUBIC );
    }
  }
  
  recognition.onend = function(e){
    // Force temp output if cancelled
    if (LS.Globals.elizaAI.finalSTT == "" && LS.Globals.elizaAI.tempSTT != ""){
      LS.Globals.elizaAI.processResult( LS.Globals.elizaAI.tempSTT, true);
    	LS.Globals.elizaAI.state = "PROCESSING";
    } else if (LS.Globals.elizaAI.tempSTT == "")
      LS.Globals.elizaAI.state = "WAITING";
    else
    	LS.Globals.elizaAI.state = "PROCESSING";
    
    // Recover lights
    var lights = LS.GlobalScene._lights;
    for (var i = 0; i<lights.length; i++){
      var targetLight = LS.Globals.elizaAI.initLights[i];
      LS.Tween.easeProperty( lights[i], "intensity", targetLight, 1, LS.Tween.EASE_IN_CUBIC );
    }
  }
  
  recognition.onerror = function(e){
    LS.Globals.elizaAI.state = "WAITING";
    
    console.error("There has been a recognition error: ", e);
     // Recover lights
    var lights = LS.GlobalScene._lights;
    for (var i = 0; i<lights.length; i++){
      var targetLight = LS.Globals.elizaAI.initLights[i];
      LS.Tween.easeProperty( lights[i], "intensity", targetLight, 1, LS.Tween.EASE_IN_CUBIC );
    }
  }
  
}



Eliza.prototype.start = function(){
  
  // Eliza bot
  this.elizaMSG = this.elizaAI.getInitial();
  LS.Globals.speech ({text: this.elizaMSG}, this);
  //this.elizaVoice.voice = speechSynthesis.getVoices().filter(function(voice) { return voice.name == 'Google US English'; })[0];
  //this.elizaVoice.text = this.elizaMSG;
  //speechSynthesis.speak(this.elizaVoice);
  
  // Show HTML GUI
  var eT = document.getElementById("elizaText");
  if (eT) eT.innerHTML = this.elizaMSG;
}


Eliza.prototype.updateLips = function(){
  this.lipsync.update();
}


Eliza.prototype.processResult = function(msg, isFinal){
  // Get HTML GUI elements
  var uT = document.getElementById("userText");
  var eT = document.getElementById("elizaText");
  
  if (isFinal){
    this.finalSTT = msg;
    this.tempSTT = "";
    //this.stopSample(); Is this necessary? startmicrophone is never called
    this.elizaMSG = this.elizaAI.transform(msg); // Get answer from bot
    console.log("Eliza delay", performance.now() - LS.Globals.startEliza);
    if (LS.Globals.ElizaPer)
    	LS.Globals.ElizaPer.push(performance.now() - LS.Globals.startEliza);
    // BML instruction
    LS.Globals.speech ({text: this.elizaMSG}, this);
    //this.elizaVoice.text = this.elizaMSG;
    //speechSynthesis.speak(this.elizaVoice);
    
    // Show HTML GUI
    if (uT && eT){
      uT.innerHTML = this.finalSTT;
      uT.style.color = "black";
      eT.innerHTML = this.elizaMSG;
    }
    
    
  } else{
    this.tempSTT = msg;
    // Show HTML GUI
    if (uT &&  eT){
      uT.innerHTML = this.tempSTT;
      uT.style.color = "dimgray";
    }
  }
}