/**
 * Created by Im YoungMin.
 */
"use strict";

/**
 * The camera class.
 * @param [eye] {Vec3} The eye point location in world coordinates.
 * @param [look] {Vec3} The target point to look at in world coordinates.
 * @param [up] {Vec3} The up direction in world coordinates.
 * @param [N] {number} The near plane > 0.
 * @param [F] {number} The far plane > N.
 * @param [w] {number} The viewport width.
 * @param [h] {number} The viewport height.
 * @constructor
 */
function Camera( eye, look, up, N, F, w, h )
{
	/**
	 * The Camera coordinate system axes.
	 * @type {Vec3}
	 * @private
	 */
	var _u, _v, _n, _eye;

	/**
	 * The near and far planes.
	 * @type {number}
	 * @private
	 */
	var _near, _far;

	/**
	 * Viewport metrics.
	 * @type {number}
	 * @private
	 */
	var _width, _height;

	/**
	 * The View matrix.
	 * @type {Mat44}
	 * @private
	 */
	var _V;

	/**
	 * The Projection matrix.
	 * @type {Mat44}
	 * @private
	 */
	var _P;

	/**
	 * Use the u, v, and n vectors to create the View matrix.
	 * @private
	 */
	function _setViewMatrix()
	{
		_V = [
			[ _u[0], _u[1], _u[2], -numeric.dot( _eye, _u ) ],
			[ _v[0], _v[1], _v[2], -numeric.dot( _eye, _v ) ],
			[ _n[0], _n[1], _n[2], -numeric.dot( _eye, _n ) ],
			[   0.0,   0.0,   0.0,                      1.0 ]
		];
	}

	///////////////////////////////////////////// Public interface /////////////////////////////////////////////////////

	/**
	 * Retrieve the View matrix.
	 * @returns {Mat44}
	 */
	this.getView = function(){
		return _V;
	};

	/**
	 * Create the view matrix.
	 * @param eye {Vec3} The eye point location in world coordinates.
	 * @param look {Vec3} The target point to look at in world coordinates.
	 * @param up {Vec3} The up direction in world coordinates.
	 */
	this.setView = function( eye, look, up ){

		// Copy the values.
		_eye= [ eye[0], eye[1], eye[2] ];

		_n = Tf.normalize( numeric.sub( _eye, look ) );			// Compute n.
		_u = Tf.normalize( Tf.cross( up, _n ) );				// Compute u = up x n.
		_v = Tf.normalize( Tf.cross( _n, _u ) );				// Compute v = n x u.

		// Recalculate the View matrix.
		_setViewMatrix();
	};

	/**
	 * Slide the camera along its axes.
	 * @param dU {number} Proportion to slide on the u-axis.
	 * @param dV {number} Proportion to slide on the v-axis.
	 * @param dN {number} Proportion to slide on the n-axis.
	 */
	this.slide = function( dU, dV, dN ){
		_eye = numeric.add( _eye, numeric.mul( dU, _u ), numeric.mul( dV, _v ), numeric.mul( dN, _n ) );
		_setViewMatrix();
	};

	/**
	 * Create the projection matrix.
	 * This sets the viewport width and height as well.
	 * @param w {number} Viewport width.
	 * @param h {number} Viewport height.
	 */
	this.setProjection = function( w, h ){
		_width = w;
		_height = h;
		var ratio = _width/_height;
		_P = Tf.perspective( Math.PI/3.0, ratio, _near, _far );
	};

	/**
	 * Retrieve the Projection matrix.
	 * @returns {Mat44}
	 */
	this.getProjection = function(){
		return _P;
	};

	/**
	 * Retrieve the world coordinates of a point in the viewport.
	 * The resulting point will lie in the xy plane perpendicular to the eye axis.
	 * @param x {number} Client viewport x.
	 * @param y {number} Client viewport y.
	 * @param [distance] {number} Distance from the eye along the n axis.
	 * @param [custV] {Mat44} Custom view matrix to compute the transformation.
	 * @returns {Vec3} The world coordinates.
	 */
	this.viewportToWorldCoordinates = function( x, y, distance, custV )
	{
		x = Math.min( Math.max( 0, x ), _width );		// Clamp x and y to viewport limits.
		y = Math.min( Math.max( 0, y ), _height );

		var z = -((distance && distance > _near)? distance: 10.0);
		custV = (custV)? custV: _V;						// We want to compute everyting based on an initial camera matrix.

		// Create coordinates that lie in the range -1 to +1 (inverting y-axis).
		x = (x * 2.0 / _width - 1.0);
		y = (1.0 - y * 2.0 / _height);

		// The current world transformation matrix.
		var /** @type {Mat44} */ M = numeric.dot( _P, custV );			// Exclude the model matrix.
		var /** @type {Mat44} */ MInv = numeric.inv( M );

		// The mouse vector position.
		var a = -(_far + _near)/(_far - _near);
		var b = -2.0 * _far * _near / (_far - _near);
		var depth = (a*z + b) / -z;
		var /** @type {Vec4} */ p_viewPort = [ x, y, depth, 1.0 ];		// Get coodinates for a Pz = 0.
		var /** @type {Vec4} */ p_world = numeric.dot( MInv, p_viewPort );
		p_world = numeric.div( p_world, p_world[3] ).slice( 0, 3 );		// Divide by W and return X,Y,Z.

		return p_world;
	};

	///////////////////////////////////////////// Initialize object ////////////////////////////////////////////////////

	// Set default values for eye, look, and up.
	eye = ( eye )? eye: [0.0, 0.0, 10.0];
	look = ( look )? look: [0.0, 0.0, 0.0];
	up = ( up )? up: Tf.Y_AXIS;

	this.setView( eye, look, up );		// Initialize the View matrix.

	// Set default values for near and far planes.
	_near = ( N )? Math.abs( N ): 1.0;
	_far = ( F && F > _near )? F: 100.0;

	w = (w && w > 0)? w: 1000;
	h = (h && h > 0)? h: 1000;

	this.setProjection( w, h );			// Initialize the Projectio matrix.
}