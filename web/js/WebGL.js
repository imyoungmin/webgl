"use strict";

/**
 * Class to implement WebGL rendering capabilities.
 * @param gl {WebGLRenderingContext} A WebGL valid context.
 * @param _vertexShaderId {string} DOM Id of vertex shader script element.
 * @param _fragmentShaderId {string} DOM Id of fragment shader script element.
 * @constructor
 */
function WebGL( gl, _vertexShaderId, _fragmentShaderId )
{
	////////////////////////////////////////// Lighting and material variables /////////////////////////////////////////

	/**
	 * @typedef {object} Lighting
	 * @property {Vec4} ambient.
	 * @property {Vec4} diffuse.
	 * @property {Vec4} specular.
	 * @property {number} shininess.
	 */

	/**
	 * @type {Lighting}
	 * @private
	 */
	var _material = {					// Material properties to be changed.
		ambient:   [ 0.8, 0.8, 0.8, 1.0 ],
		diffuse:   [ 0.8, 0.8, 0.8, 1.0 ],
		specular:  [ 0.8, 0.8, 0.8, 1.0 ],
		shininess: 64.0
	};
	const _LIGHT = {					// Light source properties.
		ambient:   [ 0.4, 0.4, 0.4, 1.0 ],
		diffuse:   [ 0.9, 0.9, 0.9, 1.0 ],
		specular:  [ 0.8, 0.8, 0.8, 1.0 ],
		shininess: 0.0
	};

	var /** @type {Vec4} */ _lightPosition = [-7.0, 10.0, 20.0, 1.0];

	//////////////////////////////////////////// WebGL rendering variables /////////////////////////////////////////////

	/**
	 * @typedef {object} GeometryBuffer
	 * @property {WebGLBuffer} bufferID - Buffer ID as given by WebGL.
	 * @property {number} vertexCount - Number of vertices stored in buffer.
 	 */

	const _GEOM_TYPE = { CUBE: 0, SPHERE: 1, CYLINDER: 2, PRISM: 3 };
	const _ELEMENTS_PER_VERTEX = 3;

	var /** @type {WebGLProgram} */ _renderingProgram = null;		// Shading program.

	/**
	 * @type {?GeometryBuffer}
	 * @private
	 */
	var _cube = null,
		_sphere = null,
		_cylinder = null,
		_prism = null,
		_path = null;

	///////////////////////////////////////////// Init the rendering process ///////////////////////////////////////////

	_compileShaders();		// Compile and create the rendering program.

	//gl.enable( gl.PROGRAM_POINT_SIZE );

	// Culling faces.
	gl.cullFace( gl.BACK );
	gl.frontFace( gl.CCW );
	gl.enable( gl.CULL_FACE );

	// Enable depth test.
	gl.enable( gl.DEPTH_TEST );
	gl.depthFunc( gl.LEQUAL );

	////////////////////////////////////////////// Private member functions/////////////////////////////////////////////

	/**
	 * Load, compile, and link vertex and fragment shaders.
	 * @private
	 */
	function _compileShaders()
	{
		var vertexShader = _loadShaderFromDOM( _vertexShaderId );		// Get shaders and compile them.
		var fragmentShader = _loadShaderFromDOM( _fragmentShaderId );

		_renderingProgram = gl.createProgram();
		gl.attachShader( _renderingProgram, vertexShader );				// Link shaders to program.
		gl.attachShader( _renderingProgram, fragmentShader );
		gl.linkProgram( _renderingProgram );

		if( !gl.getProgramParameter( _renderingProgram, gl.LINK_STATUS ) )
			alert( "Failed to set up shaders!" );
	}

	/**
	 * Load and compile a shader from a script element.
	 * @param id DOM element's id.
	 * @returns {?WebGLShader} A WebGL shader or null if there's an error.
	 * @private
	 */
	function _loadShaderFromDOM( id )
	{
		var shaderScript = document.getElementById( id );

		// If we don't find an element with the specified id, it doesn't exist.
		if( !shaderScript )
			return null;

		// Loop through the children for the found DOM element and build up the shader source code as a string.
		var shaderSource  = "";
		var currentChild = shaderScript.firstChild;
		while( currentChild )
		{
			if( currentChild.nodeType == 3 )        // A text node.
				shaderSource += currentChild.textContent;
			currentChild = currentChild.nextSibling;
		}

		var /** type {?WebGLShader} */ shader = null;
		switch( shaderScript.type )
		{
			case "x-shader/x-fragment":
			{
				shader = gl.createShader( gl.FRAGMENT_SHADER );
				break;
			}
			case "x-shader/x-vertex":
			{
				shader = gl.createShader( gl.VERTEX_SHADER );
				break;
			}
			default:
				return null;
		}

		gl.shaderSource( shader, shaderSource );        // Attach source code to shader object.
		gl.compileShader( shader );                     // And compile it.

		if( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) )
		{
			alert( "Error compiling shader " + gl.getShaderInfoLog( shader ) );
			gl.deleteShader( shader );
			return null;
		}
		return shader;
	}

	/**
	 * Auxiliary function to draw a 3D geometry.
	 * This function considers the right geometry buffer has been bound (i.e. it's active) and executes all
	 * necessary commands to finish drawing the active geometry.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 * @param g {?GeometryBuffer} A pointer to the geometry data structure.
	 * @param t {number} Type of geometry to be drawn.
	 * @private
	 */
	function _drawGeom( Projection, Camera, Model, g, t )
	{
		if( _material.ambient[3] < 1.0 )	// If alpha channel in current material color is not fully opaque, blend.
		{
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		if( !g )							// No data yet loaded into the buffer?
		{
			g = {};
			g.bufferID = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, g.bufferID );

			var /** @type {?Geometry} */ geom = new Geometry();
			switch( t )						// Create a geometry vertices and normals according to requested type.
			{
				case _GEOM_TYPE.CUBE:     geom.createCube();     break;
				case _GEOM_TYPE.SPHERE:   geom.createSphere();   break;
				case _GEOM_TYPE.CYLINDER: geom.createCylinder(); break;
				case _GEOM_TYPE.PRISM:    geom.createPrism();    break;
			}

			var vertexPositions = [];
			var normals = [];
			g.vertexCount = geom.getData( vertexPositions, normals );				// Load vertex and normal values.

			// Allocate space for the buffer.
			const size = Float32Array.BYTES_PER_ELEMENT * vertexPositions.length;	// Size of arrays in bytes.

			// Copy positions and normals to an array buffer.
			var buffer = new ArrayBuffer( 2*size );
			var floatView = new Float32Array( buffer );

			for( var i = 0; i < vertexPositions.length; i++ )
				floatView[i] = vertexPositions[i];

			for( var j = 0; j < normals.length; j++, i++ )
				floatView[i] = normals[j];

			gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );				// Copy data to WebGL buffer.
		}
		else																		// Data is already there; just make geom bufferID the active buffer.
			gl.bindBuffer( gl.ARRAY_BUFFER, g.bufferID );

		// Set up our vertex attributes.
		var position_location = gl.getAttribLocation( _renderingProgram, "position" );
		gl.enableVertexAttribArray( position_location );
		gl.vertexAttribPointer( position_location, _ELEMENTS_PER_VERTEX, gl.FLOAT, false, 0, 0 );

		var normal_location = gl.getAttribLocation( _renderingProgram, "normal" );
		gl.enableVertexAttribArray( normal_location );
		var offset = Float32Array.BYTES_PER_ELEMENT * g.vertexCount * _ELEMENTS_PER_VERTEX;
		gl.vertexAttribPointer( normal_location, _ELEMENTS_PER_VERTEX, gl.FLOAT, false, 0, offset );

		_sendShadingInformation( Projection, Camera, Model, true );

		// Draw triangles.
		gl.drawArrays( gl.TRIANGLES, 0, g.vertexCount );

		// Disable attribute arrays for position and normals.
		gl.disableVertexAttribArray( position_location );
		gl.disableVertexAttribArray( normal_location );

		if( _material.ambient[3] < 1.0 )
			gl.disable( gl.BLEND );
	}

	/**
	 * Set sequence of vertices information for a path.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 * @param vertices {@const Array.<Vec3>} A vector of vertices.
	 * @returns {number} The position attribute location in shader, so that the pointer can be disabled later.
	 * @private
	 */
	function _setSequenceInformation( Projection, Camera, Model, vertices )
	{
		if( !_path )		// We haven't used this buffer before? Create it.
		{
			_path = {};
			_path.bufferID = gl.createBuffer();
		}

		gl.bindBuffer( gl.ARRAY_BUFFER, _path.bufferID );				// Make this geom bufferID the active buffer.

		// Load vertices and (virtually no) normals.
		_path.vertexCount = vertices.length;
		const totalElements = _ELEMENTS_PER_VERTEX * _path.vertexCount;

		// Allocate space for the buffer.
		const size = Float32Array.BYTES_PER_ELEMENT * totalElements;	// Size of arrays in bytes.

		// Copy positions and normals to an array buffer.
		var buffer = new ArrayBuffer( size );
		var floatView = new Float32Array( buffer );

		for( var i = 0; i < _path.vertexCount; i++ )
		{
			for( var j = 0; j < _ELEMENTS_PER_VERTEX; j++ )
				floatView[_ELEMENTS_PER_VERTEX*i + j] = vertices[i][j];
		}

		gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW );

		// Set up our vertex attributes.
		var position_location = gl.getAttribLocation( _renderingProgram, "position" );
		gl.enableVertexAttribArray( position_location );
		gl.vertexAttribPointer( position_location, _ELEMENTS_PER_VERTEX, gl.FLOAT, false, 0, 0 );

		_sendShadingInformation( Projection, Camera, Model, false );	// Without using phong model.

		return position_location;
	}

	/**
	 * Send shading information to shaders.
	 * @param Projection {Mat44} The projection matrix.
	 * @param Camera {Mat44} The camera matrix.
	 * @param Model {Mat44} The model matrix.
	 * @param [usingPhong] {boolean} If given and true, compute the inverse transpose of MV to transform normals.
	 * @private
	 */
	function _sendShadingInformation( Projection, Camera, Model, usingPhong )
	{
		var ModelView = numeric.dot( Camera, Model );			// Model-view transformation matrix.

		// Send the ModelView and Projection matrices.
		var mvLocation = gl.getUniformLocation( _renderingProgram, "ModelView" );
		var projLocation = gl.getUniformLocation( _renderingProgram, "Projection" );

		gl.uniformMatrix4fv( mvLocation, false, Tf.toWebGLMatrix( ModelView ) );
		gl.uniformMatrix4fv( projLocation, false, Tf.toWebGLMatrix( Projection ));

		if( !!usingPhong )
		{
			var InvTransMV = Tf.getInvTransModelView( ModelView );	// The inverse transpose of the upper left 3x3 matrix in the Model View matrix.
			var itmvLocation = gl.getUniformLocation( _renderingProgram, "InvTransModelView" );
			gl.uniformMatrix3fv( itmvLocation, false, Tf.toWebGLMatrix( InvTransMV ) );
		}

		// Specify if we will use phong lighting model.
		var usePhong_location = gl.getUniformLocation( _renderingProgram, "usePhong" );
		gl.uniform1i( usePhong_location, Number( !!usingPhong ) );

		// Specify if we are not drawing a point by default.
		var drawPoint_location = gl.getUniformLocation( _renderingProgram, "drawPoint" );
		gl.uniform1i( drawPoint_location, 0 );

		// Set up shading.
		var lightSource_location = gl.getUniformLocation( _renderingProgram, "lightPosition" );
		var /** @type {Float32Array} */ ls_vector = new Float32Array( numeric.dot(Camera, _lightPosition) );
		gl.uniform4fv( lightSource_location, ls_vector );

		// Set up material shading.
		var shininess_location = gl.getUniformLocation( _renderingProgram, "shininess" );
		gl.uniform1f( shininess_location, _material.shininess );

		/** @type {Float32Array} */
		var ambientProd_vector = new Float32Array( numeric.mul( _material.ambient, _LIGHT.ambient ) ),
			diffuseProd_vector = new Float32Array( numeric.mul( _material.diffuse, _LIGHT.diffuse ) ),
			specularProd_vector = new Float32Array( numeric.mul( _material.specular, _LIGHT.specular ) );

		var ambientProd_location = gl.getUniformLocation( _renderingProgram, "ambientProd" ),
			diffuseProd_location = gl.getUniformLocation( _renderingProgram, "diffuseProd" ),
			specularProd_location = gl.getUniformLocation( _renderingProgram, "specularProd" );

		gl.uniform4fv( ambientProd_location, ambientProd_vector );
		gl.uniform4fv( diffuseProd_location, diffuseProd_vector );
		gl.uniform4fv( specularProd_location, specularProd_vector );
	}

	//////////////////////////////////////////////// Public interface //////////////////////////////////////////////////

	/**
	 * Change material color.
	 * @param r {number} Red component in [0,1].
	 * @param g {number} Green component in [0,1].
	 * @param b {number} Blue component in [0,1].
	 * @param [a] {number} Alpha channel in [0,1].
	 */
	this.setColor = function( r, g, b, a ){
		a = (a !== undefined)? a: 1.0;

		r = Math.min( 1.0, Math.max( r, 0.0 ) );
		g = Math.min( 1.0, Math.max( g, 0.0 ) );
		b = Math.min( 1.0, Math.max( b, 0.0 ) );
		a = Math.min( 1.0, Math.max( a, 0.0 ) );

		_material.ambient = [ r, g, b, a ];
		_material.diffuse = [ r, g, b, a ];
		_material.specular[3] = a;
	};

	/**
	 * A convenient vector-version of setColor(r,g,b,a).
	 * @param rgba {Vec4} The RGBA vector.
	 */
	this.setColorV = function( rgba ){
		this.setColor( rgba[0], rgba[1], rgba[2], rgba[3] );
	};

	/**
	 * Draw a unit cube.
	 * Creates a cube with side length = 1, centered at the origin. If the cube is not yet created, it fills out a
	 * buffer and leaves its vertex and normal data there for future calls, making it drawing in WebGL more efficient.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera transformation matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 */
	this.drawCube = function( Projection, Camera, Model ){
		_drawGeom( Projection, Camera, Model, _cube, _GEOM_TYPE.CUBE );
	};

	/**
	 * Draw a unit sphere.
	 * Creates a unit-radius sphere centered at the origin. If the sphere is not yet created, it fills out a buffer and
	 * leaves its vertex and normal data there for future calls, making it drawing in WebGL more efficient.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera transformation matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 */
	this.drawSphere = function( Projection, Camera, Model ){
		_drawGeom( Projection, Camera, Model, _sphere, _GEOM_TYPE.SPHERE );
	};

	/**
	 * Draw a unit cylinder.
	 * Creates a unit-length cylinder, with unit radius, from z=0 to z=1. If the cylinder is not yet created, it fills
	 * out the buffer and leaves its vertex and normal data there for future calls, making it drawing in WebGL more efficient.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera transformation matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 */
	this.drawCylinder = function( Projection, Camera, Model ){
		_drawGeom( Projection, Camera, Model, _cylinder, _GEOM_TYPE.CYLINDER );
	};

	/**
	 * Draw a unit prism.
	 * Creates a 8-sided prism whose first apex is at the orgin, and the second apex is at (0,0,1).
	 * Furthermore, the pyramid bases join at the plane z=0.3, and consist of a square inscribed in a circle of unit radius.
	 * If the prism is not yet created, it fills out a buffer and leaves its vertex and normal data there for future calls,
	 * making it drawing in WebGL more efficient.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera transformation matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 */
	this.drawPrism = function( Projection, Camera, Model ){
		_drawGeom( Projection, Camera, Model, _prism, _GEOM_TYPE.PRISM );
	};

	/**
	 * Draw an open path (of connected vertices).
	 * This function combines the functionality of the private function _drawGeometry with andy of the public draw* functions,
	 * but for a path, which doesn't considers the normals.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 * @param vertices {@const Array.<Vec3>} A vector of vec3 elements containing vertex information.
	 */
	this.drawPath = function( Projection, Camera, Model, vertices ){
		if( _material.ambient[3] < 1.0 )		// If alpha channel in current material color is not fully opaque, blend.
		{
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		var posL =_setSequenceInformation( Projection, Camera, Model, vertices );		// Prepare drawing by sending shading information to shaders.

		// Draw connected lines.
		gl.drawArrays( gl.LINE_STRIP, 0, _path.vertexCount );

		// Disable vertex attribute array position we sent in the _setSequenceInformation function.
		gl.disableVertexAttribArray( posL );

		if( _material.ambient[3] < 1.0 )		// Restore blending if necessary.
			gl.disable( gl.BLEND );
	};

	/**
	 * Draw points.
	 * @param Projection {@const Mat44} The 4x4 projection matrix.
	 * @param Camera {@const Mat44} The 4x4 camera matrix.
	 * @param Model {@const Mat44} The 4x4 model transformation matrix.
	 * @param vertices {@const Array.<Vec3>} A vector of vec3 elements containing vertex information.
	 * @param [size] {number} Pixel size for points.
	 */
	this.drawPoints = function( Projection, Camera, Model, vertices, size ){
		if( !size || size < 0 )
			size = 10;

		if( _material.ambient[3] < 1.0 )		// If alpha channel in current material color is not fully opaque, blend.
		{
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		var posL = _setSequenceInformation( Projection, Camera, Model, vertices );		// Prepare drawing by sedding shading information to shaders.

		// Specify the point size in vertex shader.
		var pointSize_location = gl.getUniformLocation( _renderingProgram, "pointSize" );
		gl.uniform1f( pointSize_location, size );							// Desirable size for points.

		// Specify if we are drawing a point (a flag) -- setSequenceInformation sent a 0, but this will override that for a 1.
		var drawPoint_location = gl.getUniformLocation( _renderingProgram, "drawPoint" );
		gl.uniform1i( drawPoint_location, 1 );

		gl.drawArrays( gl.POINTS, 0, _path.vertexCount );

		// Disable vertex attribute array position we sent in the _setSequenceInformation function.
		gl.disableVertexAttribArray( posL );

		if( _material.ambient[3] < 1.0 )		// Restore blending mode.
			gl.disable( gl.BLEND );
	};

	/**
	 * Public access to rendering program.
	 * @returns {WebGLProgram}
	 */
	this.getRenderingProgram = function(){
		return _renderingProgram;
	};
}








