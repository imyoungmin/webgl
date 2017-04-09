/**
 * The transformations builder object.
 * @type {object}
 */
var Tf = {

	/**
	 * Translation with individual displacements.
	 * @param x {number} Displacement along x axis.
	 * @param y {number} Displacement along y axis.
	 * @param z {number} Displacement along z axis.
	 * @returns {Array.<Array.<number>>} A 4x4 translation matrix.
	 */
	translate: function( x, y, z ){
		return [
			[1, 0, 0, x],
			[0, 1, 0, y],
			[0, 0, 1, z],
			[0, 0, 0, 1]
		];
	},

	/**
	 * Translation with vector displacement.
	 * @param d {number[]} Displacement vector
	 * @returns {Array.<Array.<number>>}
	 */
	translateV: function( d ){
		return Tf.translate( d[0], d[1], d[2] );
	},

	/**
	 * Scaling with individual factors.
	 * @param x {number} Scaling along x axis.
	 * @param y {number} Scaling along y axis.
	 * @param z {number} Scaling along z axis.
	 * @returns {Array.<Array.<number>>} A 4x4 scaling matrix.
	 */
	scale: function( x, y, z ){
		return [
			[x, 0, 0, 0],
			[0, y, 0, 0],
			[0, 0, z, 0],
			[0, 0, 0, 1]
		];
	},

	/**
	 * Uniform scaling across axes.
	 * @param s {number} Scaling factor for x, y, and z axes.
	 * @returns {Array.<Array.<number>>} A 4x4 scaling matrix.
	 */
	scaleU: function( s ){
		return Tf.scale( s, s, s );
	},

	/**
	 * Scaling with factors vector.
	 * @param s {number[]} Scaling factors vector.
	 * @returns {Array.<Array.<number>>} A 4x4 scaling matrix.
	 */
	scaleV: function( s ){
		return Tf.scale( s[0], s[1], s[2] );
	},

	/**
	 * Normalize a vector (not in place).
	 * @param v {number[]} A 3-element vector.
	 * @returns {number[]} Normalized version of input vector.
	 */
	normalize: function( v ){
		return numeric.div( v, numeric.norm2(v) );
	},

	/**
	 * Cross product of 2 3-element vectors.
	 * @param u {number[]} Vector.
	 * @param v {number[]} Vector.
	 * @returns {number[]}
	 */
	cross: function( u, v ){
		return [
			u[1]*v[2] - u[2]*v[1],
			u[2]*v[0] - u[0]*v[2],
			u[0]*v[1] - u[1]*v[0]
		];
	},

	rotate: function( theta, axis ){
		var u = Tf.normalize( axis );		// Normalize rotation axis.
		var cosTheta = Math.cos( theta );
		var sinTheta = Math.sin( theta );

		var x = u[0],
			y = u[1],
			z = u[2];

		// 3x3 cross product matrix.
		var C = [
			[  0, -z,  y ],
			[  z,  0, -x ],
			[ -y,  x,  0 ]
		];

		// Tensor-product matrix.
		var T = [
			[ x*x, x*y, x*z ],
			[ x*y, y*y, y*z ],
			[ x*z, y*z, z*z ]
		];

		var R = numeric.add( numeric.mul(cosTheta,numeric.identity(3)), numeric.mul(sinTheta,C), numeric.mul(1-cosTheta,T) );

		// Replace upper 3x3 submatrix of the 4x4 identity matrix with the resulting rotation matrix R.
		return [
			[ R[0][0], R[0][1], R[0][2], 0 ],
			[ R[1][0], R[1][1], R[1][2], 0 ],
			[ R[2][0], R[2][1], R[2][2], 0 ],
			[       0,       0,       0, 1 ]
		];
	},

	/**
	 * Generate the view matrix: look at.
	 * @param e {number[]} Viewer's eye position.
	 * @param p {number[]} Point of interest.
	 * @param u {number[]} Up vector.
	 * @returns {Array.<Array.<number>>} The 4x4 view matrix.
	 */
	lookAt: function( e, p, u ){
		var z = Tf.normalize( numeric.sub(e, p) ),			// Forward vector.
			x = Tf.normalize( Tf.cross( u, z ) ),			// Sideways vector.
			y = Tf.cross( z, x );							// Normalized up vector.

		var M = [
			[ x[0], y[0], z[0], 0.0 ],
			[ x[1], y[1], z[1], 0.0 ],
			[ x[2], y[2], z[2], 0.0 ],
			[ -numeric.dot(x,e), -numeric.dot(y,e), -numeric.dot(z,e), 1.0 ]
		];

		return numeric.transpose( M );
	},

	/**
 	 * Perspective matrix: frustrum.
	 * @param left {number} Left plane.
	 * @param right {number} Right plane.
	 * @param bottom {number} Bottom plane.
	 * @param top {number} Top plane.
	 * @param near {number} Near plane.
	 * @param far {number} Far plane.
	 * @returns {Array.<Array.<number>>} A 4x4 perspective matrix.
 	 */
	frustrum: function( left, right, bottom, top, near, far ){
		if( right == left || top == bottom || near == far || near < 0.0 || far < 0.0 )
			return numeric.identity( 4 );

		return [
			[ 2.0*near/(right-left),                   0.0, (right+left)/(right-left),                     0.0 ],
			[                   0.0, 2.0*near/(top-bottom), (top+bottom)/(top-bottom),                     0.0 ],
			[                   0.0,                   0.0,     (near+far)/(near-far), 2.0*near*far/(near-far) ],
			[                   0.0,                   0.0,                      -1.0,                     0.0 ]
		];
	},

	/**
	 * Perspective matrix: symmetric frustrum.
	 * @param fovy {number} Field of view.
	 * @param ratio {number} Viewport ratio.
	 * @param near {number} Near plane.
	 * @param far {number} Far plane.
	 * @returns {Array.<Array.<number>>} A 4x4 perspective matrix.
	 */
	perspective: function( fovy, ratio, near, far ){
		var top = Math.tan( fovy/2.0 ) * near;
		return Tf.frustrum( -top*ratio, top*ratio, -top, top, near, far );
	},

	/**
	 * Ortographic projection matrix.
	 * @param left {number} Left plane.
	 * @param right {number} Right plane.
	 * @param bottom {number} Bottom plane.
	 * @param top {number} Top plane.
	 * @param near {number} Near plane.
	 * @param far {number} Far plane.
	 * @returns {Array<Array<number>>}
	 */
	ortographic: function( left, right, bottom, top, near, far ){
		if( right == left || top == bottom || near == far || near < 0.0 || far < 0.0 )
			return numeric.identity( 4 );

		return [
			[ 2.0/(right-left),              0.0,             0.0, -(left+right)/(right-left) ],
			[              0.0, 2.0/(top-bottom),             0.0, -(bottom+top)/(top-bottom) ],
			[              0.0,              0.0, -2.0/(far-near),     -(far+near)/(far-near) ],
			[              0.0,              0.0,             0.0,                        1.0 ]
		];
	},


	/**
	 * Transform a common matrix into a column-major array of doubles, suitable for WebGL shaders.
	 * @param source {Array.<Array.<number>>}
	 * @returns {Float32Array}
	 */
	toWebGLMatrix: function( source ){
		var rows = source.length;
		var cols = source[0].length || 1;

		var destination = new Float32Array(rows * cols);

		for( var c = 0; c < cols; c++ )
			for( var r = 0; r < rows; r++ )
				destination[c*rows + r] = source[r][c];

		return destination;
	},

	degreesToRadians: function( degrees ){
		return degrees * (2*Math.PI)/360;
	}

};

/**
 * The coordinate axes.
 */
Object.defineProperty( Tf, "X_AXIS", {
	get: function () {
		return [1, 0, 0];
	}
});

Object.defineProperty( Tf, "Y_AXIS", {
	get: function () {
		return [0, 1, 0];
	}
});

Object.defineProperty( Tf, "Z_AXIS", {
	get: function () {
		return [0, 0, 1];
	}
});



