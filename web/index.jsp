<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WebGL</title>

    <!-- Styles -->
    <link href="css/reset.css" type="text/css" rel="stylesheet" />

    <script src="js/jquery-3.1.1.min.js"></script>
	<script src="js/numeric-1.2.6.min.js"></script>
	<script src="js/Transformations.js"></script>
	<script src="js/Geometry.js"></script>
	<script src="js/Camera.js"></script>
	<script src="js/WebGL.js"></script>

    <!-- Vertex shader -->
    <script id="shader-vs" type="x-shader/x-vertex"><%@include file="shaders/vertex.glsl" %></script>

    <!-- Fragment shader -->
    <script id="shader-fs" type="x-shader/x-fragment"><%@include file="shaders/fragment.glsl" %></script>

    <script>
		var /** type {context} */ gl;
		var /** type {WebGL} */ webGL;
		var resizeTimeOut = null;

		// Time control.
		var gTime = 0.0;
		var gDeltaT = 0.01;

		// Camera control.
		var /** @type {Camera} */ gCamera = null;
		var /** @type {Mat44} */ View0 = null;
		const EYE = [0.0, 0.0, 10.0];			// Eye position.
		const LOOK = [0.0, 0.0, 0.0];			// Look at position.
		const N = 1.0;							// Near plane.
		const F = 100.0;						// Far plane.

		// Model matrix.
		var Model = null;

		/////////////////////////////////////// User interaction interface /////////////////////////////////////////////

		var ArcBall = numeric.identity(4);		// Rotation, simple arc ball matrix.
		var gLeftMouseDown = false;
		var gRightMouseDown = false;
		var gLastMouseX = null;
		var gLastMouseY = null;
		var /** @type {Vec3} */ gLastMousePw = null;

        var gZoom = 1.0;						// Camera zoom.
        const ZOOM_IN = 1.03;
        const ZOOM_OUT = 0.97;

		/**
		 * When user clicks on canvas.
		 * @param event {Event} jQuery on mouse down event.
		 */
		function canvasMouseDown( event )
		{
			gLastMouseX = event.clientX;
			gLastMouseY = event.clientY;

			event.preventDefault();

			if( event.which == 1 )				// Left mouse button down?
			{
				gLeftMouseDown = true;			// Only one button at a time.
				gRightMouseDown = false;

				// Left clicking is for dragging.
				View0 = numeric.clone( gCamera.getView() );			// Use the start view to compute the drag.
				gLastMousePw = gCamera.viewportToWorldCoordinates( gLastMouseX, gLastMouseY, EYE[2] );
			}
			else
			{
				if( event.which == 3 )			// Right clicking is for rotating.
				{
					gRightMouseDown = true;
					gLeftMouseDown = false;
					View0 = null;
				}
			}

			return false;
		}

		/**
		 * When user releases mouse.
		 * @param event {Event} jQuery mouse event object.
		 */
		function documentMouseUp( event )
		{
			if( event.which == 1 )				// Release left mouse button?
			{
				gLeftMouseDown = false;
				View0 = null;
			}
			else
			{
				if( event.which == 3 )			// Right mouse button released?
					gRightMouseDown = false;
			}
		}

		/**
		 * When user drags mouse within the canvas.
		 * @param event {Event} jQuery event object.
		 */
		function canvasMouseMove( event )
		{
			event.preventDefault();

			var newX = event.clientX,							// New mouse position.
				newY = event.clientY;

			if( gLeftMouseDown )								// Dragging?
			{
				var /** @type {Vec3} */ newMousePw = gCamera.viewportToWorldCoordinates( newX, newY, EYE[2], View0 );
				var delta = numeric.sub( gLastMousePw, newMousePw );
				gLastMousePw = newMousePw;

				gCamera.slide( delta[0], delta[1], delta[2] );	// Modifies the camera.
			}
			else
			{
				if( gRightMouseDown )							// Zooming in and out?
				{
					// The changes in the X and Y direction.
					var deltaX = newX - gLastMouseX,
						deltaY = newY - gLastMouseY;

					var R = numeric.dot( Tf.rotate( Tf.degreesToRadians(deltaY), [1,0,0] ), Tf.rotate( Tf.degreesToRadians(deltaX), [0,1,0] ) );
					ArcBall = numeric.dot( ArcBall, R );

					// Update rotation matrix with new rotation.
					Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );

					gLastMouseX = newX;
					gLastMouseY = newY;
				}
			}

			return false;
		}

		/**
		 * When user scrolls within the canvas event listener.
		 * @param event {WheelEvent} DOM level-3 event object.
		 */
		function canvasMouseScroll( event )
		{
			gZoom *= (event.deltaY > 0)? ZOOM_IN: ZOOM_OUT;

			// Update the Model matrix.
			Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );

			event.preventDefault();
		}

		/**
		 * When user presses the reset button event listener.
		 */
		function resetViewButtonClick()
		{
			gZoom = 1.0;
			ArcBall = numeric.identity(4);

			// Update the Model matrix.
			Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );

			// Reset the View matrix.
			gCamera.setView( EYE, LOOK, Tf.Y_AXIS );
		}

		/////////////////////////////////////////////// WebGL functions ////////////////////////////////////////////////

        /**
         * Create a WebGL context.
         * @param canvas The canvas DOM object.
         * @returns {context} A WebGL context if successful, null otherwise.
         */
        function createGLContext( canvas )
        {
            var names = ["webgl", "experimental-webgl"];
            var context = null;

            for( var i = 0; i < names.length; i++ )
            {
                try
                {
                    context = canvas.getContext( names[i] );
                }
                catch( e ) {}

                if( context )
                    break;
            }

            if( context )
            {
                context.viewportWidth = canvas.width;
                context.viewportHeight = canvas.height;
            }
            else
                alert( "Failed to create WebGL context!" );

            return context;
        }

        /**
         * Draw objects.
         */
        function draw()
        {
            gl.viewport( 0, 0, gl.viewportWidth, gl.viewportHeight );
			gl.clearColor( 0.15, 0.15, 0.17, 1.0 );
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

			//////////////////////////////////////////// Rendering spot ////////////////////////////////////////////////

            webGL.setColor( 1.0, 0.0, 0.0 );			// A red cube.
			webGL.drawCube( gCamera.getProjection(), gCamera.getView(), Model );

			webGL.setColor( 0.0, 1.0, 0.0 );			// A green sphere.
			webGL.drawSphere( gCamera.getProjection(), gCamera.getView(), numeric.dot( numeric.dot(Model, Tf.translate(2,0,0)), Tf.scaleU(0.5) ) );

			webGL.setColor( 0.0, 0.0, 1.0 );			// A blue cylinder.
			webGL.drawCylinder( gCamera.getProjection(), gCamera.getView(), numeric.dot( numeric.dot(Model, Tf.translate(-2,0,-0.5)), Tf.scale(0.5,0.5,1.0) ) );

			var theta = 2.0*Math.PI/6;
			var r = 3;
			var /** @type {Vec3} */ points = [];		// A yellow hexagon.
			for( var i = 0; i <= 6; i++ )
				points.push( [r*Math.cos( i*theta ), r*Math.sin( i*theta ), 0] );
			webGL.setColorV( [1.0, 1.0, 0.0] );
			webGL.drawPath( gCamera.getProjection(), gCamera.getView(), Model, points );

			webGL.setColor( 0.0, 1.0, 1.0, 0.5 );		// A semi-transparent cyan set of points.
			webGL.drawPoints( gCamera.getProjection(), gCamera.getView(), Model, points.slice(0,-1) );

			// Time control.
			gTime += gDeltaT;
        }

        /**
         * Modify the canvas size when window resizes.
         */
        $(window).resize( function(){

        	clearTimeout( resizeTimeOut );		// Only the last resize event will be considered.

        	// Give some time before resizing.
        	resizeTimeOut = setTimeout( function(){
				var jCanvasContainer = $( "#canvasContainer" );
				var jCanvas = $( "#myGLCanvas" );
				var canvas = jCanvas[0];
				canvas.width = jCanvasContainer[0].offsetWidth;
				canvas.height = jCanvasContainer[0].offsetHeight;
				gl.viewportWidth = canvas.width;
				gl.viewportHeight = canvas.height;

				gCamera.setProjection( gl.viewportWidth, gl.viewportHeight );

				resetViewButtonClick();
			}, 500 );
        });

        /**
         * Launch application.
         */
        function startup()
        {
        	var jCanvas = $( "#myGLCanvas" );
			var jCanvasContainer = $( "#canvasContainer" );
            var canvas = jCanvas[0];                // Access element and set the height and width.
			canvas.width = jCanvasContainer[0].offsetWidth;
            canvas.height = jCanvasContainer[0].offsetHeight;

			// Set up event handlers.
			jCanvas.on( "mousedown", canvasMouseDown );
			jCanvas.on( "mousemove", canvasMouseMove );
			jCanvas.on( "contextmenu", function(){ return false; } );
			jCanvas[0].addEventListener( "wheel", canvasMouseScroll, false );
			$( document ).on( "mouseup", documentMouseUp );
			$("#resetViewButton").click( resetViewButtonClick );

			// Create the WebGL context and object.
			gl = createGLContext( canvas );
            webGL = new WebGL( gl, "shader-vs", "shader-fs" );

			console.log( "Created WebGL context. Width =", canvas.width, "Height =", canvas.height );

			// Init Camera's view and projection matrices.
			gCamera = new Camera( EYE, LOOK, Tf.Y_AXIS, N, F, gl.viewportWidth, gl.viewportHeight );

			// Init the Model matrix (rotation and zoom).
			Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );

			// Use the program with the compiled shaders.
			gl.useProgram( webGL.getRenderingProgram() );

			// Run animation.
			tick();
        }

		/**
		 * Time passing function.
		 */
		function tick()
		{
			requestAnimationFrame( tick );
			draw();
		}
    </script>

</head>
<body onload="startup();">
	<div style="position: absolute; padding: 10px; z-index: 1; top: 10px; left: 10px; background: rgba( 255, 255, 255, 0.25 ); border-radius: 5px;">
		<button id="resetViewButton">Reset View</button>
	</div>
	<div id="canvasContainer" style="position: absolute; top: 0; right: 0; left: 0; bottom: 0; z-index: 0;">
		<canvas id="myGLCanvas" width="500" height="500">
			Your browser does not support the canvas object.
		</canvas>
	</div>
</body>
</html>