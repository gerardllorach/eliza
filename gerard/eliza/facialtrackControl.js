//@Facial tracking

// Video capture
navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;

this.offsetX = 0;
this.offsetY = 0;
this.offsetZ = 0;

this.targetPos = vec3.create();

this.scale = 1;

this.videoWidth = 200;
this.videoHeight = 150;

this.showWebcam = true; 

var faceTracker = null;

//defined: component, node, scene, globals
this.onStart = function()
{
  // New face tracker
  faceTracker = new TrackFace();
  if (faceTracker.disabled)
    return;
  
  // Start video
  this.startVideo();

  // Target pos
  vec3.copy(this.targetPos, node.transform.position);
  
  // Show video and tracker
  if (this.showWebcam)
  	this.showVideoHTML();
  
}

this.onUpdate = function(dt)
{
  if (faceTracker.disabled)
    return;
  // Update face tracker
  if (faceTracker.ready == 1){
    if (!this.vid)
      return;
    faceTracker.detectFace(this.vid);
    rect = faceTracker.rWW;
    // Position node
    if (rect){
      centerX = (rect.x + rect.x + rect.width)/2
      centerY = (rect.y + rect.y + rect.height)/2;
      // Scale from 0 to 1
      centerX = centerX/faceTracker.max_work_size - 0.5; 
      centerY = centerY/faceTracker.max_work_size - 0.5;// Maybe different..
      // Scale
      centerX *= this.scale;
      centerY *= this.scale;
      
      
      //node.transform.position[0] = -centerX - this.offsetX;
      //node.transform.position[1] = -centerY + this.offsetY;
      //node.transform.position[2] = this.offsetZ;
      this.targetPos[0] = -centerX - this.offsetX;
      this.targetPos[1] = -centerY + this.offsetY;
      this.targetPos[2] = this.offsetZ;
      
      
      
      // Update GUI
      if (this.showWebcam){

      	var rectFace = document.getElementById("rectFace");
        var widthFactor = this.videoWidth/faceTracker.work_canvas.width;
        var heightFactor = this.videoHeight/faceTracker.work_canvas.height;
        rectFace.style["margin-left"] = rect.x * widthFactor + "px";
        rectFace.style["margin-top"] = rect.y * heightFactor + "px";
        rectFace.style.width = rect.width * widthFactor+ "px";
        rectFace.style.height = rect.height * heightFactor + "px";
      }
    }
    
  }
  
  // Update pos
  vec3.lerp(node.transform.position, node.transform.position, this.targetPos, 0.1);
  node.transform._must_update_matrix = true;
  
  
    
	node.scene.refresh();
}


// Finish
this.onFinish = function(){

  if (this.stream){
    var tracks = this.stream.getTracks();
    for (var i = 0; i<tracks.length; i++)
    	tracks[i].stop();
  }

  
  if (faceTracker)
    if (faceTracker.ww)
      faceTracker.ww.terminate();
}





// Start video and initialize facial tracker
this.startVideo = function(){
  this.vid = document.createElement('video');
  thatFT = this;
  // Get video input from user (asking audio too for permissions pop-up)
  navigator.mediaDevices.getUserMedia({video: true, audio: false}).then(stream => {
    thatFT.stream = stream;
    thatFT.vid.srcObject = stream;//window.URL.createObjectURL(stream);
    thatFT.vid.autoplay = true;
  }).catch(error => {
    console.log("ERROR: get user media: ", error);
  });
  
  this.vid.onloadedmetadata = function(e){
    
    this.setAttribute('width',thatFT.videoWidth);
    this.setAttribute('height',thatFT.videoHeight);
    
    // Start tracker       
    faceTracker.init(this.videoWidth, this.videoHeight);
  }
}



// Show video and tracker
this.showVideoHTML = function(){
  
  var div = LS.GUI.createElement("div","none");
  div.id = "webcam";
  div.style.position = "absolute";
  div.style.right = "0px";
  div.style.bottom = "0px";
  div.style.marginRight = "3px";
  div.style.marginBottom = "3px";
  
  div.style.width = this.videoWidth + "px";
  div.style.height =  this.videoHeight +"px";
	div.style.outlineColor = "black";
  div.style.outlineStyle = "solid";
  div.style.bgColor = "black";
    
  div.appendChild(this.vid);
  
  var rectFace = LS.GUI.createElement("div");
  rectFace.id = "rectFace";
  rectFace.style.border = "2px solid lime";
  rectFace.style.position = "absolute";
  rectFace.style.top = "0px";
  rectFace.style.left = "0px";
  
  div.appendChild(rectFace);
}
