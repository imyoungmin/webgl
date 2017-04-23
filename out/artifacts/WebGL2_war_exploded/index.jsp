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
	<script src="js/WebGL.js"></script>

    <!-- Vertex shader -->
    <script id="shader-vs" type="x-shader/x-vertex"><%@include file="shaders/vertex.glsl" %></script>

    <!-- Fragment shader -->
    <script id="shader-fs" type="x-shader/x-fragment"><%@include file="shaders/fragment.glsl" %></script>

    <script>
		var /** type {context} */ gl;
		var /** type {Element} */ canvas;
		var /** type {WebGL} */ webGL;

		// Time control.
		var gTime = 0.0;
		var gDeltaT = 0.01;

		// Camera controls.
		var gPointOfInterest = [0,0,0];
		var gEye = [0,0,10];
		var gUp = Tf.Y_AXIS;

		// Projection and Camera matrices.
		var Proj = null;
		var Camera = null;
		var Model = null;

		/////////////////////////////////////// User interaction interface /////////////////////////////////////////////

		var ArcBall = numeric.identity(4);		// Rotation, simple arc ball matrix.
		var gMouseDown = false;
		var gLastMouseX = null;
		var gLastMouseY = null;

        var gZoom = 1.0;						// Camera zoom.
        const ZOOM_IN = 1.03;
        const ZOOM_OUT = 0.97;

		/**
		 * When user clicks on canvas.
		 * @param event {Event} jQuery on mouse down event.
		 */
		function canvasMouseDown( event )
		{
			gMouseDown = true;
			gLastMouseX = event.clientX;
			gLastMouseY = event.clientY;

			console.log("clicked", gLastMouseX, gLastMouseY);

			event.preventDefault();
		}

		/**
		 * When user releases mouse.
		 */
		function documentMouseUp()
		{
			gMouseDown = false;
		}

		/**
		 * When user drags mouse within the canvas.
		 * @param event {Event} jQuery event object.
		 */
		function canvasMouseMove( event )
		{
			if( !gMouseDown )
				return false;

			var newX = event.clientX,		// New mouse position.
				newY = event.clientY;

			// The changes in the X and Y direction.
			var deltaX = newX - gLastMouseX,
				deltaY = newY - gLastMouseY;

			var R = numeric.dot( Tf.rotate( Tf.degreesToRadians(deltaY), [1,0,0] ), Tf.rotate( Tf.degreesToRadians(deltaX), [0,1,0] ) );
			ArcBall = numeric.dot( ArcBall, R );

			gLastMouseX = newX;
			gLastMouseY = newY;

			event.preventDefault();
		}

		/**
		 * When user scrolls within the canvas event listener.
		 * @param event {WheelEvent} DOM level-3 event object.
		 */
		function canvasMouseScroll( event )
		{
			gZoom *= (event.deltaY > 0)? ZOOM_IN: ZOOM_OUT;

			event.preventDefault();
		}

		/**
		 * When user presses the reset button event listener.
		 */
		function resetViewButtonClick()
		{
			gZoom = 1.0;
			ArcBall = numeric.identity(4);
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

			//////////////////////////////////////////////////////////////////////////////

			Camera = Tf.lookAt( gEye, gPointOfInterest, gUp );
			Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );
			gl.useProgram( webGL.getRenderingProgram() );

			/////////////////////////////// Rendering spot ///////////////////////////////

            webGL.setColor( 1.0, 0.0, 0.0 );			// A red cube.
			webGL.drawCube( Proj, Camera, Model );

			webGL.setColor( 0.0, 1.0, 0.0 );			// A green sphere.
			webGL.drawSphere( Proj, Camera, numeric.dot( numeric.dot(Model, Tf.translate(2,0,0)), Tf.scaleU(0.5) ) );

			webGL.setColor( 0.0, 0.0, 1.0 );			// A blue cylinder.
			webGL.drawCylinder( Proj, Camera, numeric.dot( numeric.dot(Model, Tf.translate(-2,0,-0.5)), Tf.scale(0.5,0.5,1.0) ) );

			var theta = 2.0*Math.PI/6;
			var r = 3;
			var /** @type {Vec3} */ points = [];		// A yellow hexagon.
			for( var i = 0; i <= 6; i++ )
				points.push( [r*Math.cos( i*theta ), r*Math.sin( i*theta ), 0] );
			webGL.setColorV( [1.0, 1.0, 0.0] );
			webGL.drawPath( Proj, Camera, Model, points );

			webGL.setColor( 0.0, 1.0, 1.0, 0.5 );		// A semi-transparent cyan set of points.
			webGL.drawPoints( Proj, Camera, Model, points.slice(0,-1) );

			// Time control.
			gTime += gDeltaT;
        }

        /**
         * Modify the canvas size when window resizes.
         */
        $(window).resize( function(){
			var jCanvasContainer = $( "#canvasContainer" );
			canvas.width = jCanvasContainer[0].offsetWidth;
			canvas.height = jCanvasContainer[0].offsetHeight;
			var ratio = canvas.width/canvas.height;
			Proj = Tf.perspective( 5*Math.PI/9, ratio, 0.01, 1000.0 );
        });

        /**
         * Launch application.
         */
        function startup()
        {
        	var jCanvas = $( "#myGLCanvas" );
			var jCanvasContainer = $( "#canvasContainer" );
            canvas = jCanvas[0];                // Access element and set the height and width.
			canvas.width = jCanvasContainer[0].offsetWidth;
            canvas.height = jCanvasContainer[0].offsetHeight;

			// Set up event handlers.
			jCanvas.on( "mousedown", canvasMouseDown );
			jCanvas.on( "mousemove", canvasMouseMove );
			jCanvas[0].addEventListener( "mousewheel", canvasMouseScroll, false );
			document.onmouseup = documentMouseUp;
			$("#resetViewButton").click( resetViewButtonClick );

			// Build prerspective projection.
			var ratio = canvas.width/canvas.height;
			Proj = Tf.perspective( 5*Math.PI/9, ratio, 0.01, 1000.0 );

			// Create the WebGL context and object.
			gl = createGLContext( canvas );
            webGL = new WebGL( gl, "shader-vs", "shader-fs" );

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