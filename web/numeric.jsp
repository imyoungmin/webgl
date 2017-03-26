<%--
  Created by IntelliJ IDEA.
  User: youngmin
  Date: 3/25/17
  Time: 3:29 PM
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
	<title>Numeric.JS</title>
	<script src="js/numeric-1.2.6.min.js"></script>
	<script src="js/Transformations.js"></script>
	<script>
		// Translations.
		console.log( Tf.translate( 1, 2, 3 ) );
		console.log( Tf.translateV( [4, 5, 6] ) );

		// Scaling.
		console.log( Tf.scale( 1, 2, 3 ) );
		console.log( Tf.scaleV( [4, 5, 6] ) );

		// Normalizing a vector.
		console.log( Tf.normalize( [1, 1, 1] ) );

		// Cross product.
		console.log( Tf.cross( [1,0,0], [0,1,0] ) );

		// Rotation.
		console.log( Tf.rotate( Math.PI/4, [0,0,1] ) );

		// The view matrix.
		console.log( Tf.lookAt( [1,1,4], [0,0,0], [0,1,0] ));

		// The frustrum matrix.
		console.log( Tf.frustrum( -5, 5, -4, 4, 0.1, 10 ) );

		// The perspective matrix.
		console.log( Tf.perspective( 10, 2, 0.1, 10 ) );
	</script>
</head>
<body>

</body>
</html>
