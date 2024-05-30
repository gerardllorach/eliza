//@Eliza agent

this.elizaAI = null;
// Globals
// performance
if (!LS.Globals)
  LS.Globals = {};

// Mic icon
var micIcon = new Image();
micIcon.src = LS.ResourcesManager.path + "/gerard/eliza/micIcon.png";

// Language
this.lang = "es";
// Init speech synthesis service
speechSynthesis.getVoices();


this.init = function()
{
  this.htmlGUI = LS.GUI.getRoot();
  this.createHTML();
  // ASR, SST and Lipsync
  this.elizaAI = new Eliza(this.lang);
  if (!this.elizaAI)
    return;
  
  
  this.prevState = "OFF";
  //debugger;
  // When all resources are loaded start elizaAI
  LS.Globals.elizaAI = this.elizaAI;
  var that = this;
  setTimeout(function(){                       
                       LS.Globals.startTime = performance.now();
                       that.elizaAI.start();
                       }, 1000);
  //if (LS.ResourcesManager.num_resources_being_loaded == 0)
  //  this.elizaAI.start();
  //else
	//	LEvent.bind( LS.ResourcesManager, "end_loading_resources", this.elizaAI.start, this.elizaAI);

  
  // BML controls
  
}



this.onUpdate = function(dt)
{

  if (!this.elizaAI && LS.GlobalScene.time>2)
    this.init();
    return;
  // Changing state
  if (this.prevState != this.elizaAI.state){
    console.log("State changed from ", this.prevState, " to ", this.elizaAI.state);
    // Speaking
    if (this.elizaAI.state == "SPEAKING"){
      this.speaking();
    }
    // Speaking to waiting
    else if (this.elizaAI.state == "WAITING" && this.prevState == "SPEAKING"){
      this.TransSpeak2Wait();
    } 
    // Listening
    else if (this.elizaAI.state == "LISTENING"){
      this.listening(); 
    }
    // Blink when states change
    LS.Globals.blink({end: Math.random()*0.6 + 0.2});
  }
  
  this.prevState = this.elizaAI.state;
	
	node.scene.refresh();
}


this.onFinish = function(){
  LEvent.unbindAll(LS.ResourcesManager, this.elizaAI);
  
  navigator.mediaDevices.getUserMedia({audio: true, video:true}, function(stream) {
  var tracks = stream.getTracks();
  for (var i = 0; i<tracks.length; i++)
      tracks[i].stop();
	}, function(e){console.error("ERROR: get user media: ", e);});

	// Remove html elements
  var htmlGUI = LS.GUI.getRoot();
  for (var i = 0; i<htmlGUI.children.length; i++) {
    var el = htmlGUI.children[i];
    if (el.id == "userText" || el.id == "elizaText"){
      htmlGUI.removeChild(el);
      i--;
    }
  }
  // Other solution is:
  // htmlGUI.innerHTML = "";
  
}


this.speaking = function(){
  // Gaze to user
  LS.Globals.gazeShift({
    start: 0,
    end: Math.random() + 0.5,
    target: "USER",
    influence: "HEAD",
    dynamic: true
  });
  // Smile
  LS.Globals.faceShift({
    valaro: [Math.random()*0.4+0.4, Math.random()*0.3],
    start: Math.random()*0.5,
    end: Math.random() + 3
  });
  
  // Head nod/shake
  // Sync
  var ready = Math.random()*0.4 + 0.2;
  var stroke = Math.random()*0.4 + ready + 0.2;
  var relax = Math.random()*0.4 + stroke + 0.2;
  var end = Math.random()*0.4 + relax + 0.2;
  // Type (shakes head when no/not is present)
  var type = "NOD";
  if (this.elizaAI.elizaMSG.search("not ") != -1) type = "SHAKE";
  if (this.elizaAI.elizaMSG.search("no ") != -1) type = "SHAKE";
  if (this.elizaAI.elizaMSG.search("n't ") != -1) type = "SHAKE";

  LS.Globals.head({
    start: 0,
    ready: ready,
    stroke: stroke,
    relax: relax,
    end: end,
    lexeme: type,
    amount: 0.1 - Math.random()*0.05
  });
  
}

this.TransSpeak2Wait = function(){
  // Gaze to side
 	var start = Math.random()*2;
  var opts = ["RIGHT", "LEFT", "DOWN","DOWNRIGHT", "DOWNLEFT"];
  var val = opts[Math.floor(Math.random()*opts.length)];
  var end = start + Math.random()*2 + 3;
  LS.Globals.gaze({
    start: start,
    end: end,
    target: "USER",
    influence: "EYES",
    offsetDirection: val,
    offsetAngle: Math.random()*15 + 5
  });
  LS.Globals.gaze({
    start: end,
    target: "USER",
    influence: "EYES",
    dynamic: true
  });
  
  // Smile
  LS.Globals.faceShift({
    valaro: [Math.random()*0.5+0.1, Math.random()*0.1],
    start: Math.random()*0.5,
    end: Math.random() + 1
  });

  
}

this.listening = function(){
  // Gaze to user
  LS.Globals.gazeShift({
    start: 0,
    end: Math.random() + 0.5,
    target: "USER",
    influence: "HEAD",
    dynamic: true
  });
  // Concern
  LS.Globals.faceShift({
    valaro: [-Math.random()*0.5-0.4, Math.random()*0.2-0.1],
    start: 0,
    end: Math.random() + 3
  });
}




this._clicked = false;
this.onRenderGUI = function(){
	if (!this.elizaAI)
    return;
  
  width = gl.viewport_data[2];
  height = gl.viewport_data[3];
  
  gl.start2D();
  
  
  // STT - Mic input
  var rect = {x: 40, y: height-240, w: 80, h: 80};
	
  if(micIcon && this.elizaAI.state == "WAITING"){
  	gl.drawImage(micIcon, rect.x, rect.y, rect.w, rect.h);
    xDist = gl.mouse.x - rect.x - rect.w/2;
    yDist = (height - gl.mouse.y) - rect.y - rect.h/2;
    var dist = Math.sqrt(xDist*xDist + yDist*yDist);
    if (dist < rect.w*1.2/2){
      gl.strokeStyle = "rgba(0,0,0,0.8)";
      gl.beginPath();
      gl.arc(rect.x + rect.w/2, rect.y + rect.h/2, rect.w*0.6,0,2*Math.PI);
      gl.stroke();
      // Clicked
      if (gl.mouse.left_button == 2 && !this._clicked){
        if (this.elizaAI.state == "LISTENING")
          this.elizaAI.recognition.stop();
        else if (this.elizaAI.state == "PROCESSING")
          this.elizaAI.recognition.abort();
        else if (this.elizaAI.state == "WAITING")
          this.elizaAI.recognition.start();
        this._clicked = true;
      }
      if (gl.mouse.left_button == 0)
        this._clicked = false;
    }
  }
  
  // STT - Cancel mic input
  var rect = {x: 140, y: height-225, w: 50, h: 50};
	
  if(micIcon && this.elizaAI.state == "LISTENING"){
  	gl.drawImage(micIcon, rect.x, rect.y, rect.w, rect.h);
    xDist = gl.mouse.x - rect.x - rect.w/2;
    yDist = (height - gl.mouse.y) - rect.y - rect.h/2;

    // Draw on top
    gl.fillStyle = "rgba(0,0,0,0.7)";
    gl.beginPath();
    gl.arc(rect.x + rect.w/2, rect.y + rect.h/2, rect.w*0.6,0,2*Math.PI);
    gl.fill();
    
    var dist = Math.sqrt(xDist*xDist + yDist*yDist);
    if (dist < rect.w*1.2/2){
      gl.strokeStyle = "rgba(0,0,0,0.8)";
      gl.beginPath();
      gl.arc(rect.x + rect.w/2, rect.y + rect.h/2, rect.w*0.6,0,2*Math.PI);
      gl.stroke();
      // Clicked
      if (gl.mouse.left_button == 2 && !this._clicked){
        this.elizaAI.recognition.abort();
        this._clicked = true;
      }
      if (gl.mouse.left_button == 0)
        this._clicked = false;
    }
  }
  
  //if (this.elizaAI){
    // STT
    /*gl.font = "20px Arial";
    gl.textAlign = "left";
    gl.fillStyle = "rgba(0,0,0,0.7)";
    gl.fillText(this.elizaAI.tempSTT, 40, height-100);
    gl.fillStyle = "black";//"rgba(255,255,255,1.0)";
    gl.fillText(this.elizaAI.finalSTT, 40, height-100);
    gl.fillStyle ="red";// "rgba(255,255,0,1.0)";
    gl.fillText(this.elizaAI.elizaMSG, 40, height-70);*/
  //}
  
  gl.finish2D();
}


this.createHTML = function(){
  height = gl.viewport_data[3];
  var htmlGUI = LS.GUI.getRoot();
  
  var userText = document.createElement("p");
  // Font
  userText.style.fontSize = "x-large";
  userText.style["font-family"] = "Arial, Helvetica, sans-serif";
  userText.style.color = "black";
  // Margins
  userText.style.position = "absolute";
  userText.style.bottom= "90px"; userText.style.left = "40px";
  // Id
  userText.id = "userText";
  
  htmlGUI.appendChild(userText);

  
  var elizaText = document.createElement("p");
  // Font
  elizaText.style.fontSize = "x-large";
  elizaText.style["font-family"] = "Arial, Helvetica, sans-serif";
  elizaText.style.color = "red";
  // Margins
  elizaText.style.position = "absolute";
  elizaText.style.bottom = "40px"; elizaText.style.left = "40px";
  // Id
  elizaText.id = "elizaText";
  
  htmlGUI.appendChild(elizaText);
}

