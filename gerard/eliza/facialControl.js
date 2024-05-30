// Globals
if (!LS.Globals)
  LS.Globals = {};

var thatFacial = this;

// performance
LS.Globals.STTPer = [];
LS.Globals.TTSPer = [];
LS.Globals.ElizaPer = [];
LS.Globals.TotalPer = [];

this.headNodeName = "omarHead";
this.jawNodeName = "jaw";
this._jawInitRot = null;
this._jawRot = quat.create();

this.headBoneNodeName = "head";
this.facialTrackerName = "facePosition";
this.lookAtEyesName = "lookAtEyes";
this.lookAtHeadName = "lookAtHead";
this.lookAtNeckName = "lookAtNeck";


// Blend shapes index
this.smileBSIndex = 0;
this.sadBSIndex = 1;
this.kissBSIndex = 2;
this.lipsClosedBSIndex = 3;

this.browsDownBSIndex = 4;
this.browsInnerUpBSIndex = 5;
this.browsUpBSIndex = 6;
this.eyeLidsBSIndex = 7;

//this["@eyeLidsBSIndex"] = {type: "number"};


// Blend shapes factor
this.sadFactor = 1;
this.smileFactor = 1;
this.lipsClosedFactor = 1;
this.kissFactor = 1;
this.browsDownFactor = 1;
this.browsInnerUpFactor = 1;
this.browsUpFactor = 1;
this.jawFactor = 1;

this['@sadFactor'] = {type: "slider", max: 4, min: 0.1};
this['@smileFactor'] = {type: "slider", max: 4, min: 0.1};
this['@lipsClosedFactor'] = {type: "slider", max: 4, min: 0.1};
this['@kissFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsDownFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsInnerUpFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsUpFactor'] = {type: "slider", max: 4, min: 0.1};
this['@jawFactor'] = {type: "slider", max: 4, min: 0.1};

this._facialBSW = [0,0,0,0,0,0,0,0,0];
this._FacialLexemes = [];
this._blendshapes = null;




// Web-based TTS and lipsync
// Text to speech (BML Realizer)
this.Speech = null;


// Lipsyncing
this._lipsync = new Lipsync();
// Start and end lipsync with eliza voice
this._lipsync.initStream();




// Blink timings and variables
this.Blink = null;
this.blinking = false;


// Gaze Actions
this._clicked = false;

// Head behavior
this._lookAtHeadComponent = null;



   
  
this.onStart = function(){

  // Get head node
  head = node.scene.getNodeByName (this.headNodeName);
  if(!head){
    console.error("Head node not found");
    return; 
  }
  
  // Get morph targets
  morphTargets = head.getComponent(LS.Components.MorphDeformer);
  
  if (!morphTargets){
    console.error("Morph deformer not found in: ", head.name);
    return; 
  }
  morphTargets = morphTargets.morph_targets;
  this._blendshapes = morphTargets;
  
  // Get eyeLidsBS
  if (this.eyeLidsBSIndex > morphTargets.length-1){
    console.error("Eye lid index", this.eyeLidsBSIndex ," is not found in: ", morphTargets);
    return; 
  }
	
  this.eyeLidsBS = morphTargets[this.eyeLidsBSIndex];
  
  
  // Get jaw node and initial rotation
  this.jaw = node.scene.getNodeByName (this.jawNodeName);
  
  if (!this.jaw){
    console.error("Jaw node not found with name: ", this.jawNodeName);
    return;
  }
  // Initial rotation
  this._jawInitRotation = vec4.copy(vec4.create(), this.jaw.transform.rotation);
  
  
  // Gaze
  // Get head bone node
  this.headBone = node.scene.getNodeByName(this.headBoneNodeName);
  
  if (!this.headBone)
    console.error("Head bone node not found with name: ", this.headBoneNodeName);
  else
		this.gazePositions["HEAD"] = this.headBone.transform.globalPosition;
  LS.GlobalScene.getActiveCameras(true);
  if (LS.GlobalScene._cameras[0])
  	this.gazePositions["CAMERA"] = LS.GlobalScene.getCamera().getEye();
  else
    console.error("Camera position not found for gaze.");
  var userPos = node.scene.getNodeByName(this.facialTrackerName);
  if (userPos === undefined)
    console.log("Facial tracking object not found");
  else
    this.gazePositions["USER"] = userPos.transform._position;
  
  // Get lookAt nodes
  this.lookAtEyes = node.scene.getNodeByName (this.lookAtEyesName);
  this.lookAtHead = node.scene.getNodeByName (this.lookAtHeadName);
  //this.lookAtNeck = node.scene.getNodeByName (this.lookAtNeckName);
  if (!this.lookAtEyes) console.error("LookAt Eyes not found with name: ", this.lookAtEyesName);
  if (!this.lookAtHead) console.error("LookAt Head not found with name: ", this.lookAtHeadName);
  //if (!this.lookAtNeck) console.error("LookAt Neck not found with name: ", this.lookAtNeckName);
  
  // Gaze manager
  this.gazeManager = new GazeManager(this.lookAtNeck, this.lookAtHead, this.lookAtEyes, this.gazePositions);

  
  // Head behavior
  // Get lookAt head component
  this._lookAtHeadComponent = this.headBone.getComponents(LS.Components.LookAt)[0];
  if (!this._lookAtHeadComponent)
    console.error("LookAt component not found in head bone. ", this._lookAtHeadComponent, this.headBone);
  
  this.headBML = null;
  
  
  
  // Define speech (TTS) -> it is automatically when called firts. language is defined by elizaAgent.js
  //this.Speech = new Speech('en-US', 'Google US English');

}
  
  
 



this.onUpdate = function(dt)
{
  
  // Update blendshapes
  if (!this._blendshapes || !this.jaw)
    return;
  
  // Update facial expression
  this.faceUpdate(dt);
  
  // Face blend (blink, facial expressions, lipsync)
  this.facialBlend(dt);

  // Gaze
  if (this.gazeManager)
  	this.gazeManager.update(dt);
  //console.log(this.gazePositions["USER"]);
  
  // Head behavior
  this.headBMLUpdate(dt);

  
	node.scene.refresh();
}

this.onFinish = function(){
  //console.log(this.lipsync);
  this._lipsync.stop(); 
}



// --------------------- BLINK ---------------------
// BML
// <blink start attackPeak relax end amount>

LS.Globals.blink = function(blinkData, cmdId){

  blinkData.end = blinkData.end || blinkData.attackPeak * 2 || 0.5;

  thatFacial.newBlink(blinkData);
  thatFacial.blinking = true;
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), blinkData.end * 1000, cmdId + ": true");
}

// Create blink object
this.newBlink = function(blinkData){
  this.Blink = new Blink(blinkData, this.eyeLidsBS.weight);
  
}




// --------------------- SPEECH ---------------------

LS.Globals.speech = function(speechData, agentPlanner){
  if (speechData.text === undefined){
    console.log("No text input in ", speechData);
  	return;
  }

  thatFacial.newSpeech(speechData, agentPlanner);
}

this.newSpeech = function(speechData, agentPlanner){
  
  if (this.Speech == null)
    this.Speech = new Speech(agentPlanner.lang, agentPlanner.gender);//, 'Google US English');
  

  // Change state when speech ends
  if (!this.speechCallback){
    if (agentPlanner){
      this.Speech.utterance.onstart = function(e){
        console.log("TTS delay", performance.now() - LS.Globals.startTTS); 
        LS.Globals.TTSPer.push(performance.now() - LS.Globals.startTTS);
        if (LS.Globals.startTotal)
        	LS.Globals.TotalPer.push(performance.now() - LS.Globals.startTotal);
        thatFacial._lipsync.unpause(); agentPlanner.state = "SPEAKING";}
      this.Speech.utterance.onend = function(e){thatFacial._lipsync.pause(0.1); agentPlanner.state = "WAITING";}
    } else{
      this.Speech.utterance.onstart = function(e){thatFacial._lipsync.unpause();}
      this.Speech.utterance.onend = function(e){thatFacial._lipsync.pause(0.1);}
    }
  } else
    this.speechCallback = true;
  
  // Speak
  LS.Globals.startTTS = performance.now();
  this.Speech.speak(speechData.text);

}





// --------------------- FACIAL EXPRESSIONS ---------------------
// BML
// <face or faceShift start attackPeak relax* end* valaro
// <faceLexeme start attackPeak relax* end* lexeme amount
// <faceFacs not implemented>
// lexeme  [OBLIQUE_BROWS, RAISE_BROWS,
//      RAISE_LEFT_BROW, RAISE_RIGHT_BROW,LOWER_BROWS, LOWER_LEFT_BROW,
//      LOWER_RIGHT_BROW, LOWER_MOUTH_CORNERS,
//      LOWER_LEFT_MOUTH_CORNER,
//      LOWER_RIGHT_MOUTH_CORNER,
//      RAISE_MOUTH_CORNERS,
//      RAISE_RIGHT_MOUTH_CORNER,
//      RAISE_LEFT_MOUTH_CORNER, OPEN_MOUTH,
//      OPEN_LIPS, WIDEN_EYES, CLOSE_EYES]
//
// face/faceShift can contain several sons of type faceLexeme without sync attr
// valaro Range [-1, 1]


LS.Globals.face = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;
	var shift = false;
  thatFacial.newFA(faceData, shift);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

LS.Globals.faceShift = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;
	var shift = true;
  thatFacial.newFA(faceData, shift);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

// Declare new facial expression
this.newFA = function(faceData, shift){
	if (faceData.valaro)
  	this.FA = new FacialExpr (faceData, shift, this._facialBSW);
  else if (faceData.lexeme)
    this._FacialLexemes.push(new FacialExpr (faceData, shift, this._facialBSW));
}

// Update facial expressions
this.faceUpdate = function(dt){
  
  if (this.FA){
    // Update FA with Val Aro
    this.FA.updateVABSW( this._facialBSW , dt);

    // Remove object if transition finished
    if (!this.FA.transition){
      this.FA = null;
    }
  }
  
  // Update facial lexemes
  for (var i = 0; i < this._FacialLexemes.length; i++){
  	if (this._FacialLexemes[i].transition)
    	this._FacialLexemes[i].updateLexemesBSW(this._facialBSW, dt);
  }
  
  // Clean facial lexemes
  for (var i = 0; i < this._FacialLexemes.length; i++){
    if (!this._FacialLexemes[i].transition){
       this._FacialLexemes.splice(i, 1);
    }
  }
  
  
  // Check for NaN errors
  for (var i = 0; i<this._facialBSW.length; i++){
    if (isNaN(this._facialBSW[i])){
      console.error("Updating facial expressions create NaN values! <this.faceUpdate>");
      this._facialBSW[i] = 0;
    }
  }
  
}














// --------------------- FACIAL BLEND ---------------------
this.facialBlend = function(dt){
  
  // Facial interpolation (low face) if audio is not playing
  if (!this._lipsync.working && (this.FA || this._FacialLexemes.length != 0) ){
    this._blendshapes[this.sadBSIndex].weight = this._facialBSW[0] * this.sadFactor; // sad
    this._blendshapes[this.smileBSIndex].weight = this._facialBSW[1] * this.smileFactor; // smile
    this._blendshapes[this.lipsClosedBSIndex].weight = this._facialBSW[2] * this.lipsClosedFactor; // lipsClosed
    this._blendshapes[this.kissBSIndex].weight = this._facialBSW[3] * this.kissFactor; // kiss

    quat.copy (this._jawRot, this._jawInitRotation);
    this._jawRot[3] += -this._facialBSW[4] * 0.3 * this.jawFactor; // jaw
    this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);
  } 
  // Lipsync
  else if (this._lipsync.working){
	
    // Facial expression
    this._blendshapes[this.sadBSIndex].weight = this._facialBSW[0] * this.sadFactor; // sad
    this._blendshapes[this.smileBSIndex].weight = this._facialBSW[1] * this.smileFactor; // smile

    // Lipsync
    this._lipsync.update();
    this._blendshapes[this.lipsClosedBSIndex].weight = this._lipsync.lipsyncBSW[1]; // lipsClosed
    this._blendshapes[this.kissBSIndex].weight = this._lipsync.lipsyncBSW[0]; // kiss
    
    quat.copy (this._jawRot, this._jawInitRotation);
    this._jawRot[3] += -this._lipsync.lipsyncBSW[2] * 0.3; // jaw
    this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);
  }
  // Facial interpolation (high face)
  if (this.FA || this._FacialLexemes.length != 0){
  	this._blendshapes[this.browsDownBSIndex].weight = this._facialBSW[5] * this.browsDownFactor; // browsDown
  	this._blendshapes[this.browsInnerUpBSIndex].weight = this._facialBSW[6] * this.browsInnerUpFactor; // browsInnerUp
  	this._blendshapes[this.browsUpBSIndex].weight = this._facialBSW[7] * this.browsUpFactor; // browsUp
  	this._blendshapes[this.eyeLidsBSIndex].weight = this._facialBSW[8]; // eyeLids
  }
  
  // Eye blink
  if (this.blinking && this.eyeLidsBS && this.Blink){
    weight = this.Blink.update(dt, this._facialBSW[8]);
    if (weight !== undefined)
    	this._blendshapes[this.eyeLidsBSIndex].weight = weight;
    if (!this.Blink.transition)
      this.blinking = false;
  }
}











// --------------------- GAZE ---------------------
// BML
// <gaze or gazeShift start ready* relax* end influence target influence offsetAngle offsetDirection>
// influence [EYES, HEAD, NECK, SHOULDER, WAIST, WHOLE, ...]
// offsetAngle relative to target
// offsetDirection (of offsetAngle) [RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]
// target [CAMERA, RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]

// "HEAD" position is added onStart
this.gazePositions = {"RIGHT": [70, 150, 70], "LEFT": [-70, 150, 70],
                      "UP": [0, 210, 70], "DOWN": [0, 70, 70],
                      "UPRIGHT": [70, 210, 70], "UPLEFT": [-70, 210, 70],
                      "DOWNRIGHT": [70, 70, 70], "DOWNLEFT": [-70, 70, 70]};



LS.Globals.gaze = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 2.0;

  thatFacial.newGaze(gazeData, false);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}

LS.Globals.gazeShift = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 1.0;

  thatFacial.newGaze(gazeData, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}


this.newGaze = function(gazeData, shift, gazePositions, headOnly){

  if (!gazePositions)
  	gazePositions = this.gazePositions;
  // TODO: recicle gaze in gazeManager
  this.gazeManager.newGaze(gazeData, shift, gazePositions, headOnly);
  
}






// --------------------- HEAD ---------------------
// BML
// <head start ready strokeStart stroke strokeEnd relax end lexeme repetition amount>
// lexeme [NOD, SHAKE]
// repetition cancels stroke attr
// amount how intense is the head nod? 0 to 1
LS.Globals.head = function(headData, cmdId){

	headData.end = headData.end || 2.0;

  thatFacial.newHeadBML(headData);

  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}

// New head behavior
this.newHeadBML = function(headData){
  
   this._lookAtHeadComponent = this.headBone.getComponents(LS.Components.LookAt)[0];
  if (!this._lookAtHeadComponent)
    console.error("LookAt component not found in head bone. ", this._lookAtHeadComponent, this.headBone);
  
  var lookAt = this._lookAtHeadComponent;
  if (lookAt){
    this.headBML = new HeadBML(headData, this.headBone, 
                               lookAt._initRot, lookAt._finalRotation, 
                               lookAt.limit_vertical[0], lookAt.limit_horizontal[0]);
  }
}
// Update
this.headBMLUpdate = function(dt){
  
  if (this.headBML){
    if (this.headBML.transition){
      this._lookAtHeadComponent.applyRotation = false;
      this.headBML.update(dt);
    } else
      this._lookAtHeadComponent.applyRotation = true;
  }
}

// BML
// <headDirectionShift start end target>
// Uses gazeBML
LS.Globals.headDirectionShift = function(headData, cmdId){
  headData.end = headData.end || 2.0;
  
  headData.influence = "HEAD";
  thatFacial.newGaze(headData, true, null, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}
