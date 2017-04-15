/**
 * The geometry class, which builds geometric figures to be drawn in WebGL.
 * @constructor
 */
function Geometry()
{
	/////////////////////////////////////// Private member data and functions //////////////////////////////////////////

	/**
	 * @type {Array.<Vec3>}
	 * @private
	 */
	var _points = [],		// Store 3D coordinates of geometry vertices.
		_normals = [];		// Store 3D coordinates of normal vectors to each vertex.

	/**
	 * Register group of three points as vertices for a triangle and its normals.
	 * The parameters must be given in right-hand order, so that CCW culling can be used in WebGL.
	 * @param a {Vec3} First point.
	 * @param b {Vec3} Second point.
	 * @param c {Vec3} Third point.
	 * @param na {Vec3} First normal.
	 * @param nb {Vec3} Second normal.
	 * @param nc {Vec3} Third normal.
	 * @private
	 */
	function _registerTriangle( a, b, c, na, nb, nc )
	{
		// Vertices.
		_points.push( a );
		_points.push( b );
		_points.push( c );

		// Normals.
		_normals.push( na );
		_normals.push( nb );
		_normals.push( nc );
	}

	/**
	 * Recursively, divide an equilateral triangle into four inner triangles.
	 * @param a {Vec3} First triangle vertex.
	 * @param b {Vec3} Second triangle vertex.
	 * @param c {Vec3} Third triangle vertex.
	 * @param n {int} recursive level.
	 */
	function _divideTriangle( a, b, c, n )
	{
		if( n > 0 )
		{
			/** @type {Vec3} */
			var v1 = Tf.normalize( numeric.add( a, b ) ),
				v2 = Tf.normalize( numeric.add( a, c ) ),
				v3 = Tf.normalize( numeric.add( b, c ) );
			_divideTriangle( a, v2, v1, n-1 );
			_divideTriangle( c, v3, v2, n-1 );
			_divideTriangle( b, v1, v3, n-1 );
			_divideTriangle( v1, v2, v3, n-1 );
		}
		else
			_registerTriangle( a, b, c, a, b, c );		// Normals are the same as vertex locations.
	}

	/////////////////////////////////////////////// Public interface ///////////////////////////////////////////////////

	/**
	 * Obtain all vertex coordinates and normals.
	 * @param vertices {number[]} An empty vector to allocate the x, y, and z vertices information.
	 * @param normals {number[]} An empty vector to allocate the x, y, and z normals information.
	 * @returns {number} Number of 3D points/vertices that were processed.
	 */
	this.getData = function( vertices, normals )
	{
		var n = _points.length;

		for( var i = 0; i < n; i++ )
		{
			// Vertices.
			vertices.push( _points[i][0] );			// X-coordinate.
			vertices.push( _points[i][1] );			// Y-coordinate.
			vertices.push( _points[i][2] );			// Z-coordinate.

			// Normals.
			normals.push( _normals[i][0] );	// X-coordinate.
			normals.push( _normals[i][1] );	// Y-coordinate.
			normals.push( _normals[i][2] );	// Z-coordinate.
		}

		return n;
	};

	/**
	 * Builds a cube centered at the origin.
	 * @param side {number} Cube side length.
	 */
	this.createCube = function( side )
	{
		var s = side/2.0;

		_points = [];								// Start afresh.
		_normals = [];

		// Front face.
		/** @type {Vec3} */
		var p0 = [ -s, -s,  s ],					//      p7----------p5
			p1 = [  s, -s,  s ],					//      /|          /|
			p2 = [  s,  s,  s ],					//     /           / |
			p3 = [ -s,  s,  s ],					//    p3-+--------p2 |
													//    |           |  |
		// Back face.								//    |  |        |  |
			p4 = [  s, -s, -s ],					//    | p6- - - - +-p4
			p5 = [  s,  s, -s ],					//    | /         | /
			p6 = [ -s, -s, -s ],					//    |/          |/
			p7 = [ -s,  s, -s ];					//    p0----------p1

		// Register all vertices in triangles.
		_registerTriangle( p0, p1, p2, Tf.Z_AXIS, Tf.Z_AXIS, Tf.Z_AXIS );				// Front face.
		_registerTriangle( p2, p3, p0, Tf.Z_AXIS, Tf.Z_AXIS, Tf.Z_AXIS );
		_registerTriangle( p1, p4, p2, Tf.X_AXIS, Tf.X_AXIS, Tf.X_AXIS );				// Right face.
		_registerTriangle( p4, p5, p2, Tf.X_AXIS, Tf.X_AXIS, Tf.X_AXIS );
		_registerTriangle( p4, p6, p5, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS );	// Back face.
		_registerTriangle( p6, p7, p5, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS );
		_registerTriangle( p0, p3, p7, Tf.NEG_X_AXIS, Tf.NEG_X_AXIS, Tf.NEG_X_AXIS );	// Left face.
		_registerTriangle( p0, p7, p6, Tf.NEG_X_AXIS, Tf.NEG_X_AXIS, Tf.NEG_X_AXIS );
		_registerTriangle( p2, p5, p7, Tf.Y_AXIS, Tf.Y_AXIS, Tf.Y_AXIS );				// Top face.
		_registerTriangle( p7, p3, p2, Tf.Y_AXIS, Tf.Y_AXIS, Tf.Y_AXIS );
		_registerTriangle( p1, p6, p4, Tf.NEG_Y_AXIS, Tf.NEG_Y_AXIS, Tf.NEG_Y_AXIS );	// Bottom face.
		_registerTriangle( p1, p0, p6, Tf.NEG_Y_AXIS, Tf.NEG_Y_AXIS, Tf.NEG_Y_AXIS );
	};

	/**
	 * Create a unit sphere centered at the origin.
	 * @param n {number} Number of recursion levels to approximate the sphere.
	 */
	this.createSphere = function( n )
	{
		_points = [];								// Start afresh.
		_normals = [];

		// Points for the initial tetrahedron.
		var /** @type {Vec3[]} */ v = [
			[ 0.0, 0.0, 1.0 ],
			[ 0.0, 0.942809, -0.333333 ],
			[ -0.816497, -0.471405, -0.333333 ],
			[ 0.816497, -0.471405, -0.333333 ]
		];

		_divideTriangle( v[0], v[1], v[2], n );
		_divideTriangle( v[3], v[2], v[1], n );
		_divideTriangle( v[0], v[3], v[1], n );
		_divideTriangle( v[0], v[2], v[3], n );
	};

	/**
	 * Create a cylinder along the Z axis.
	 * The cylinder is created so that its base is located on the XY plane, and it grows along the +Z axis.
	 * @param [radius] {number} The cylinder radius (must be positive).
	 * @param [length] {number} The cylinder length along the +Z axis (must be positive).
	 */
	this.createCylinder = function( radius, length )
	{
		if( !radius || radius < 0 )			// Check for correct input parameters.
			radius = 1.0;

		if( !length || length < 0 )
			length = 1.0;

		_points = [];						// Start afresh.
		_normals = [];

		const N = 50;						// Resolution (number of sides to approximate top and bottom circles).
		const step = 2.0*Math.PI/N;

		/** @type {Vec3} */
		var P0 = [ 0, 0, 0 ],
			P0L = [ 0, 0, length ],
			P1 = [ radius, 0, 0 ],			// Need this point to start the triangle.
			P1L = numeric.add( P1, numeric.mul( Tf.Z_AXIS, length ) );							// P1 moved to the other face of the cylinder.

		for( var I = 1; I <= N; I++ )
		{
			var angle = I*step;
			var /** @type {Vec3} */ P2 = [ radius*Math.cos( angle ), radius*Math.sin( angle ), 0  ];

			// Register XY0 triangle (order of points is changed to keep the right-hand rule).
			_registerTriangle( P0, P2, P1, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS, Tf.NEG_Z_AXIS );

			var /** @type {Vec3} */ P2L = numeric.add( P2, numeric.mul( Tf.Z_AXIS, length ) );	// P2 moved to the other face of the cylinder.

			// Register XYlength triangle.
			_registerTriangle( P0L, P1L, P2L, Tf.Z_AXIS, Tf.Z_AXIS, Tf.Z_AXIS );

			// Register a side of the cylinder.
			_registerTriangle( P2L, P1L, P1, P2, P1, P1 );		// Lower triangle.
			_registerTriangle( P1, P2, P2L, P1, P2, P2 );		// Upper triangle.

			P1 = P2;
			P1L = P2L;
		}
	};

	/**
	 * Create a prism along the Z-axis.
	 * The prism contains two square pyramids whose bases are glued, perpendicular to Z-axis. Their
	 * bases are located within a distance from the origin, along the Z-axis. Thus, the first
	 * pyramid's apex is at the origin, and the second pyramid's apex is at the length of the geom, on the +Z axis.
	 * @param [radius] {number} Bases radius for both pyramids.
	 * @param [length] {number} Prism's length along the +Z axis.
	 * @param [bases] {number} Bases position expressed in a percentage value in the range (0,1).
	 */
	this.createPrism = function( radius, length, bases )
	{
		if( !radius || radius < 0 )		// Fix input parameters if they are invalid.
			radius = 0.5;

		if( !length || length < 0 )
			length = 1.0;

		if( !bases || !(bases > 0 && bases < 1) )
			bases = 0.3;

		_points = [];					// Start afresh.
		_normals = [];

		bases *= length;				// Change bases to something in (0, length).

		/** @type {Vec3} */
		var PA1 = [ 0, 0, 0 ],			// Apex for first pyramid.
			PA2 = [ 0, 0, length ];		// Apex for second pyramid.

		const N = 4;
		const step = Math.PI/2.0;		// Four sides for each pyramid.
		var angle = -Math.PI/4.0;		// Start below the X axis.

		/** @type {Vec3} */
		var normal = null,
			P1 = [ radius*Math.cos(angle), radius*Math.sin(angle), bases ];
		for( var I = 1; I <= N; I++ )
		{
			angle += step;

			var /** @type {Vec3} */ P2 = [ radius*Math.cos(angle), radius*Math.sin(angle), bases ];

			// Register triangle for first pyramid.
			normal = Tf.cross( numeric.sub( P1, PA1 ), numeric.sub( PA1, P2 ) );
			_registerTriangle( P1, PA1, P2, normal, normal, normal );

			// Register triangle for second pyramid.
			normal = Tf.cross( numeric.sub( P1, P2 ), numeric.sub( P2, PA2 ) );
			_registerTriangle( P1, P2, PA2, normal, normal, normal );

			P1 = P2;
		}
	}
}












