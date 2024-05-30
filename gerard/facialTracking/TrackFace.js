//@TrackFace class
// requires jsfeat.js and frontalface.js


// Constructor
function TrackFace (min_scale, scale_factor, equalize_histogram, use_canny, edges_density){
  
  this.min_scale = min_scale || 2;
  this.scale_factor = scale_factor || 1.2;
  this.equalize_histogram = equalize_histogram === undefined ? true : equalize_histogram;
  this.use_canny = use_canny === undefined ? false : use_canny;
  this.edges_density = edges_density || 0.13;
  
  this.max_work_size = 320; // 160 def
  
  this.ready = 1;
  
  if (window.Worker) 
  	this.ww = new Worker(LS.ResourcesManager.path + "/gerard/facialTracking/workerTrackFace.js"); 
  else {
    console.error("Web workers not supported, facial tracking disabled,");
    this.disabled = true;
  }
  //this.ww.onmessage = function(e){ console.log("Web worker: ", e.data);}
  
  // Classifier
  this.classifier = jsfeat.haar.frontalface;
}

TrackFace.prototype.init = function(videoWidth, videoHeight){
    
  var scale = Math.min(this.max_work_size/videoWidth, this.max_work_size/videoHeight);
  var w = (videoWidth*scale)|0;
  var h = (videoHeight*scale)|0;
  
  this.work_canvas = document.createElement('canvas');
  this.work_canvas.width = w;
  this.work_canvas.height = h;
  this.work_ctx = this.work_canvas.getContext('2d');
  
  
  if (this.ww) {
    // Use web worker
    this.ww.postMessage({
      cmd: 'init',
      w: w,
      h: h,
      min_scale: this.min_scale,
      scale_factor: this.scale_factor,
      equalize_histogram : this.equalize_histogram,
      use_canny : this.use_canny,
      edges_density : this.edges_density
    });
    
    
    that = this;
    this.ww.onmessage = function(e){
      that.rWW = e.data;
      that.ready = 1;
    }
  } 
  
  else {
    this.img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    this.edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    this.ii_sum = new Int32Array((w+1)*(h+1));
    this.ii_sqsum = new Int32Array((w+1)*(h+1));
    this.ii_tilted = new Int32Array((w+1)*(h+1));
    this.ii_canny = new Int32Array((w+1)*(h+1));
  }
}


TrackFace.prototype.detectFace = function(video){

  if (video.readyState != video.HAVE_ENOUGH_DATA)
    return;
  
  this.ready = 0;
  
  if (this.work_ctx === undefined){
    this.init(400,300);
  }
  
  // Print the video in a canvas to get the image to process
  this.work_ctx.drawImage(video, 0, 0, this.work_canvas.width, this.work_canvas.height);
  var imageData = this.work_ctx.getImageData(0, 0, this.work_canvas.width, this.work_canvas.height);

  if (this.ww){

    this.ww.postMessage({
      cmd: 'process',
      data: imageData.data
    }); 
  }
  
  else {
    // Grayscale
    jsfeat.imgproc.grayscale(imageData.data, this.work_canvas.width, this.work_canvas.height, this.img_u8);

    // possible options
    if(this.equalize_histogram) {
      jsfeat.imgproc.equalize_histogram(this.img_u8, this.img_u8);
    }
    //jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3);

    jsfeat.imgproc.compute_integral_image(this.img_u8, this.ii_sum, this.ii_sqsum, this.classifier.tilted ? this.ii_tilted : null);

    if(this.use_canny) {
      jsfeat.imgproc.canny(this.img_u8, this.edg, 10, 50);
      jsfeat.imgproc.compute_integral_image(this.edg, this.ii_canny, null, null);
    }

    jsfeat.haar.edges_density = this.edges_density;
    var rects = jsfeat.haar.detect_multi_scale(this.ii_sum, this.ii_sqsum, this.ii_tilted, this.use_canny? this.ii_canny : null, this.img_u8.cols, this.img_u8.rows, this.classifier, this.scale_factor, this.min_scale);
    rects = jsfeat.haar.group_rectangles(rects, 1);
    
    // Select best candidate?
    var on = rects.length;
    if (on)
      jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);});

    var n = 1 || on;
    n = Math.min(n, on);
    var r;
    for(var i = 0; i < n; ++i) {
      r = rects[i];
    }
    
    this.r = r;

  }
}