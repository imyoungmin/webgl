precision mediump float;

uniform vec4 ambientProd, diffuseProd, specularProd;
uniform float shininess;
uniform bool usePhong;
uniform bool drawPoint;

varying vec3 N;
varying vec3 L;
varying vec3 E;

void main(void)
{
	vec4 ambient, diffuse, specular;

	if( usePhong )
	{
		vec3 NN = normalize( N );
		vec3 EE = normalize( E );
		vec3 LL = normalize( L );

		vec3 H = normalize( LL + EE );
		float seen = dot( LL, NN );

		// Diffuse component.
		float Kd = max( seen, 0.0 );
		diffuse = Kd * diffuseProd;

		// Ambient component.
		ambient = ambientProd;

		// Specular component.
		float Ks = pow( max( dot( NN, H ), 0.0 ), shininess );
		if( seen > 0.0 )
			specular = Ks * specularProd;
		else
			specular = vec4( 0.0, 0.0, 0.0, 1.0 );
	}
	else
	{
		ambient = ambientProd;
		diffuse = diffuseProd;
		specular = vec4( 0.0, 0.0, 0.0, 1.0 );
	}

	// Final fragment color.
	vec4 totalColor = ambient + diffuse + specular;
	if( drawPoint )
	{
		if(dot(gl_PointCoord-0.5,gl_PointCoord-0.5)>0.25)		// For rounded points.
			discard;
		else
			gl_FragColor = vec4( totalColor.rgb, ambient.a );
	}
	else
		gl_FragColor = vec4( totalColor.rgb, ambient.a );
}