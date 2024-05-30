/**
* LookAt rotate a mesh to look at the camera or another object
* @class LookAt
* @constructor
* @param {Object} object to configure from
*/



function LookAt(o)
{
	this.enabled = true;
	this.nodeTarget = null;
	this.front = LookAt.POSZ;
	this.up = LookAt.POSY;
	
	
  //console.log(this, this._root); // Why not _root here?
	this.createProperty( "initial_rotation", vec3.fromValues(0,0,0)); // isn't this the same as this.initial_rotation = vec3.fromValues?
	
	this.lock_to_axis= LookAt.NONE;
	
	this.lim_horizontal = false;
	this.limit_horizontal = vec2.create(); // Min,Max
	this.lim_vertical = false;
	this.limit_vertical = vec2.create(); // Min,Max
	
	this.influence = 1;
  
  this.applyRotation = true;


	this._target_position = vec3.create();
	this._quat = quat.create();
  this._initRot = quat.create();
  this._tmpRot = quat.create();
  this._finalRotation = quat.create();
	this._vec = vec3.create();
	this._temp_up = vec3.create();

	this._neutralRotation = null;
  
  
  
  this._GM = mat4.create();
this._temp = mat4.create();
this._temp_pos = vec3.create();
this._temp_target = vec3.create();
this._temp_up2 = vec3.create();
  
  
  

	if(o)
		this.configure(o);
}

LookAt.icon = "mini-icon-lookAt.png";

LookAt.POSX = 1;
LookAt.NEGX = 2;
LookAt.POSY = 3;
LookAt.NEGY = 4;
LookAt.POSZ = 5;
LookAt.NEGZ = 6;

LookAt.NONE = 1;
LookAt.HORIZONTAL = 2;
LookAt.VERTICAL = 3;

LookAt["@nodeTarget"] = { type: 'node' };
LookAt["@nodeId"] = { type: 'node' };
LookAt["@front"] = { type: 'enum', values: { "-Z": LookAt.NEGZ,"+Z": LookAt.POSZ, "-Y": LookAt.NEGY,"+Y": LookAt.POSY,"-X": LookAt.NEGX,"+X": LookAt.POSX }};
LookAt["@up"] = { type: 'enum', values: { "-Z": LookAt.NEGZ,"+Z": LookAt.POSZ, "-Y": LookAt.NEGY,"+Y": LookAt.POSY,"-X": LookAt.NEGX,"+X": LookAt.POSX }};
LookAt['@influence'] = {type:"slider", min:0, max: 1};
LookAt["@lock_to_axis"] = { type: "enum", values: {"Off": LookAt.NONE, "Horizontal": LookAt.HORIZONTAL, "Vertical": LookAt.VERTICAL }};





LookAt.prototype.onAddedToScene = function(scene)
{
	LEvent.bind( scene, "beforeRender", this.updateOrientation, this);
}

LookAt.prototype.onRemovedFromScene = function(scene)
{
	LEvent.unbind( scene, "beforeRender", this.updateOrientation, this);
}


LookAt.prototype.updateOrientation = function(e)
{
	if(!this.enabled){
		if (this._neutralRotation){
			quat.copy(this._root.transform.rotation, this._neutralRotation);
			this._root.transform._must_update_matrix = true;
			this._neutralRotation = false;
		}

		return;
	}

	if(!this._root || !this._root.transform ) 
		return;
	var scene = this._root.scene;


	// Define transform (from this node or selected node)
	var transform = this._root.transform;

	// Define neutral rotation once
	if (!this._neutralRotation){
		this._neutralRotation = quat.create();
		quat.copy(this._neutralRotation, transform._rotation);
	}


	var target_position = null;
	var up = null;
	var position = transform.getGlobalPosition();

	switch( this.up )
	{
		case LookAt.NEGX: up = vec3.set(this._temp_up,-1,0,0); break;
		case LookAt.POSX: up = vec3.set(this._temp_up,1,0,0); break;
		case LookAt.NEGZ: up = vec3.set(this._temp_up,0,0,-1); break;
		case LookAt.POSZ: up = vec3.set(this._temp_up,0,0,1); break;
		case LookAt.NEGY: up = vec3.set(this._temp_up,0,-1,0); break;
		case LookAt.POSY: 
		default:
			up = vec3.set(this._temp_up,0,1,0);
	}

	if( this.nodeTarget )
	{
		var node = scene.getNode( this.nodeTarget );
		if(!node || node == this._root ) //avoid same node
			return;
		target_position = node.transform.getGlobalPosition( this._target_position );
	}
	else
		return;




	// Get lookAt quaternion
	//transform.lookAt( position, target_position, up, true );
	//mat4.lookAt(this._tmpRot, position, target_position, up);
	var GM = this._GM;
  var temp = this._temp;
  var temp_pos = this._temp_pos;
  var temp_target = this._temp_target;
  var temp_up2 = this._temp_up2;
  //convert to local space
  if(transform._parent)
  {
    transform._parent.getGlobalMatrix( GM );
    var inv = mat4.invert(GM,GM);
    if (inv === null){
      //console.log("Error: ", inv, position);
      return;
    }
    mat4.multiplyVec3(temp_pos, inv, position);
    mat4.multiplyVec3(temp_target, inv, target_position);
    mat4.rotateVec3(temp_up2, inv, up );
  }
  else
  {
    temp_pos.set( position );
    temp_target.set( target_position );
    temp_up2.set( up );
  }

  mat4.lookAt(temp, temp_pos, temp_target, temp_up2);
  //mat4.invert(temp, temp);

  quat.fromMat4( this._tmpRot, temp );
  //transform._position.set( temp_pos );	
  //this._must_update_matrix = true;
  
  
  
  
  
  
  

	// Fix the front vector
	/*switch( this.front )
	{
		case LookAt.POSY: quat.rotateX( transform._rotation, transform._rotation, Math.PI * -0.5 );	break;
		case LookAt.NEGY: quat.rotateX( transform._rotation, transform._rotation, Math.PI * 0.5 );	break;
		case LookAt.POSX: quat.rotateY( transform._rotation, transform._rotation, Math.PI * 0.5 );	break;
		case LookAt.NEGX: quat.rotateY( transform._rotation, transform._rotation, Math.PI * -0.5 );	break;
		case LookAt.POSZ: quat.rotateY( transform._rotation, transform._rotation, Math.PI );	break;
		case LookAt.NEGZ:
		default:
	}*/
	switch( this.front )
	{
		case LookAt.POSY: quat.rotateX( this._tmpRot, this._tmpRot, Math.PI * -0.5 );	break;
		case LookAt.NEGY: quat.rotateX( this._tmpRot, this._tmpRot, Math.PI * 0.5 );	break;
		case LookAt.POSX: quat.rotateY( this._tmpRot, this._tmpRot, Math.PI * 0.5 );	break;
		case LookAt.NEGX: quat.rotateY( this._tmpRot, this._tmpRot, Math.PI * -0.5 );	break;
		case LookAt.POSZ: quat.rotateY( this._tmpRot, this._tmpRot, Math.PI );	break;
		case LookAt.NEGZ:
		default:
  }
	


	// Influence: Interpolate (spherical) between lookAt quaternion and neutral rotation quaternion
	quat.set(this._quat, 0, 0, 0, 1);
	//quat.slerp(transform._rotation, this._quat, transform._rotation, this.influence);
 	quat.slerp(this._tmpRot, this._quat, this._tmpRot, this.influence);



	// Lock axis and rotation limits
	//quat.toEuler(this._vec, transform._rotation);
  quat.toEuler(this._vec, this._tmpRot);

	// Rotation limits
	if (this.lim_horizontal){
		// Min horizontal
		if (this._vec[0] < this.limit_horizontal[0] * DEG2RAD)
			this._vec[0] = this.limit_horizontal[0] * DEG2RAD;
		// Max horizontal
		if (this._vec[0] > this.limit_horizontal[1] * DEG2RAD)
			this._vec[0] = this.limit_horizontal[1] * DEG2RAD;
	}


	if (this.lim_vertical){
		// Min vertical
		if (this._vec[2] < this.limit_vertical[0] * DEG2RAD)
			this._vec[2] = this.limit_vertical[0] * DEG2RAD;
		// Max vertical
		if (this._vec[2] > this.limit_vertical[1] * DEG2RAD)
			this._vec[2] = this.limit_vertical[1] * DEG2RAD;
	}


	// Lock Axis
	if (this.lock_to_axis == LookAt.VERTICAL)
		this._vec[0] = 0;
	if (this.lock_to_axis == LookAt.HORIZONTAL)
		this._vec[2] = 0;

	//quat.fromEuler(transform._rotation, this._vec);
	quat.fromEuler(this._tmpRot, this._vec);
	

	// Transform inital rotation euler to quaternion and apply inital rotation
	var initRot = this.initial_rotation;
	quat.fromEuler(this._initRot, vec3.set(this._vec, initRot[1]*DEG2RAD, initRot[2]*DEG2RAD, initRot[0]*DEG2RAD));
	
  //quat.multiply(transform._rotation, transform._rotation, this._initRot);
  quat.multiply(this._tmpRot, this._tmpRot, this._initRot);
  
  // Copy final transform matrix
  quat.copy(this._finalRotation, this._tmpRot);
  
  if (this.applyRotation){
    quat.copy(transform._rotation, this._finalRotation);
    transform.mustUpdate = true;
  }
  
    

}



LS.registerComponent( LookAt );

