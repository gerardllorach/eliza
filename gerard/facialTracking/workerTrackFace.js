//@ Webworker for facial tracking
importScripts('https://webglstudio.org/latest/fileserver/files//gerard/facialTracking/jsfeat.js');
importScripts('https://webglstudio.org/latest/fileserver/files//gerard/facialTracking/frontalFace.js');

onmessage = function (e) {
 
  switch(e.data.cmd){
    // Assign array buffers for calculations
    case "init":
      var w = this.w = e.data.w;
      var h = this.h = e.data.h;
      
      this.img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
      this.edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);

      this.ii_sum = new Int32Array((w+1)*(h+1));
      this.ii_sqsum = new Int32Array((w+1)*(h+1));
      this.ii_tilted = new Int32Array((w+1)*(h+1));
      this.ii_canny = new Int32Array((w+1)*(h+1));
      
      this.classifier = jsfeat.haar.frontalface;
      
      this.min_scale = e.data.min_scale || 2;
      this.scale_factor = e.data.scale_factor || 1.2;
      this.equalize_histogram = e.data.equalize_histogram === undefined ? true : e.data.equalize_histogram;
      this.use_canny = e.data.use_canny === undefined ? false : e.data.use_canny;
      this.edges_density = e.data.edges_density || 0.13;
			
      this.max_work_size = 160;
      break;
      
    // Process image
    case "process":
      // Grayscale
      jsfeat.imgproc.grayscale(e.data.data, this.w, this.h, this.img_u8);

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
      
      
      postMessage(r);
      break;
  }
  
}