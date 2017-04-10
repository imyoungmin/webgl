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

    <!-- Vertex shader -->
    <script id="shader-vs" type="x-shader/x-vertex"><%@include file="shaders/vertex.glsl" %></script>

    <!-- Fragment shader -->
    <script id="shader-fs" type="x-shader/x-fragment"><%@include file="shaders/fragment.glsl" %></script>

    <script>
		var /** type {context} */ gl;
		var /** type {Element} */ canvas;
		var shaderProgram;
		var triangleVertexBuffer;

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
         * Load and compile a shader from a script element.
         * @param id DOM element's id.
         */
        function loadShaderFromDOM( id )
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
         * Load, compile, and link vertex and fragment shaders.
         */
        function setupShaders()
        {
            var vertexShader = loadShaderFromDOM( "shader-vs" );                // Get shaders and compile them.
            var fragmentShader = loadShaderFromDOM( "shader-fs" );

            shaderProgram = gl.createProgram();
            gl.attachShader( shaderProgram, vertexShader );                     // Link shaders to program.
            gl.attachShader( shaderProgram, fragmentShader );
            gl.linkProgram( shaderProgram );

            if( !gl.getProgramParameter( shaderProgram, gl.LINK_STATUS ) )
                alert( "Failed to set up shaders!" );

            shaderProgram.vertexPositionAttribute = gl.getAttribLocation( shaderProgram, "aVertexPosition" );
            shaderProgram.vertexColorAttribute = gl.getAttribLocation( shaderProgram, "aVertexColor" );
        }

        /**
         * Load vertex and fragment data in buffers.
         */
        function setupBuffers()
        {
            triangleVertexBuffer = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, triangleVertexBuffer );

            var triangleVertices = [
                //( x     y     z )   (  r    g    b    a )
                   0.0,  0.5,  0.0,     255,   0,   0, 255,     // v0
                  -0.5, -0.5,  0.0,       0, 255,   0, 255,     // v1
                   0.5, -0.5,  0.0,       0,   0, 255, 255      // v2
            ];

            var nbrOfVertices = 3;

            // Calculate how many bytes that are needed for one vertex element that consists of (x,y,z) + (r,g,b,a).
            var vertexSizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT + 4 * Uint8Array.BYTES_PER_ELEMENT;
            var vertexSizeInFloats = vertexSizeInBytes / Float32Array.BYTES_PER_ELEMENT;

            // Allocate the buffer.
            var buffer = new ArrayBuffer( nbrOfVertices * vertexSizeInBytes );

            // Map the buffer to a Float32Array view to access position.
            var positionView = new Float32Array( buffer );

            // Map the same buffer to Uint8Array view to access color.
            var colorView = new Uint8Array( buffer );

            // Populate the array buffer using the JavaScript array.
            var positionOffsetInFloats = 0;
            var colorOffsetInBytes = 12;
            var k  = 0;
            for( var i = 0; i < nbrOfVertices; i++ )
            {
                positionView[positionOffsetInFloats]   = triangleVertices[k];       // x
                positionView[positionOffsetInFloats+1] = triangleVertices[k+1];     // y
                positionView[positionOffsetInFloats+2] = triangleVertices[k+2];     // z
                colorView[colorOffsetInBytes]          = triangleVertices[k+3];     // r
                colorView[colorOffsetInBytes+1]        = triangleVertices[k+4];     // g
                colorView[colorOffsetInBytes+2]        = triangleVertices[k+5];     // b
                colorView[colorOffsetInBytes+3]        = triangleVertices[k+6];     // a

                k += 7;
                positionOffsetInFloats += vertexSizeInFloats;
                colorOffsetInBytes += vertexSizeInBytes;
            }

            gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
            triangleVertexBuffer.positionLength = 3;
            triangleVertexBuffer.colorLength = 4;
            triangleVertexBuffer.numberOfItems = 3;
        }

        function sendShadingInformation( Projection, Camera, Model )
		{
			var ModelView = numeric.dot( Camera, Model );		// Model-view transformation matrix.

			// Send the ModelView and Projection matrices.
			var mvLocation = gl.getUniformLocation( shaderProgram, "ModelView" );
			var projLocation = gl.getUniformLocation( shaderProgram, "Projection" );

			gl.uniformMatrix4fv( mvLocation, false, Tf.toWebGLMatrix( ModelView ) );
			gl.uniformMatrix4fv( projLocation, false, Tf.toWebGLMatrix( Projection ));
		}

        /**
         * Draw objects.
         */
        function draw()
        {
            gl.viewport( 0, 0, gl.viewportWidth, gl.viewportHeight );
			gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

			// Set up the view matrix.
			Camera = Tf.lookAt( gEye, gPointOfInterest, gUp );

            // Bind the buffer containing both position and color.
            gl.bindBuffer( gl.ARRAY_BUFFER, triangleVertexBuffer );

            // Describe how positions are organized in vertex array.
            gl.vertexAttribPointer( shaderProgram.vertexPositionAttribute, triangleVertexBuffer.positionLength, gl.FLOAT, false, 16, 0 );

            // Describe how colors are organized in vertex array.
            gl.vertexAttribPointer( shaderProgram.vertexColorAttribute, triangleVertexBuffer.colorLength, gl.UNSIGNED_BYTE, true, 16, 12 );

            // Enable vertex attrib arryas for both position and color attributes.
            gl.enableVertexAttribArray( shaderProgram.vertexPositionAttribute );
            gl.enableVertexAttribArray( shaderProgram.vertexColorAttribute );

			// Apply transformations.
			Model = numeric.dot( ArcBall, Tf.scaleU( gZoom ) );
			sendShadingInformation( Proj, Camera, Model );

            // Draw triangle.
            gl.drawArrays( gl.TRIANGLES, 0, triangleVertexBuffer.numberOfItems );

			// After this, disable vertex attrib array for both position and color.
			gl.disableVertexAttribArray( shaderProgram.vertexPositionAttribute );
			gl.disableVertexAttribArray( shaderProgram.vertexColorAttribute );

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

			var ratio = canvas.width/canvas.height;
			Proj = Tf.perspective( 5*Math.PI/9, ratio, 0.01, 1000.0 );

			gl = createGLContext( canvas );
            setupShaders();
            setupBuffers();

			// Enable depth test.
			gl.enable( gl.DEPTH_TEST );
			gl.depthFunc( gl.LESS );

			// Use compiled shader program.
			gl.useProgram( shaderProgram );

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