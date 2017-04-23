attribute vec3 position;
attribute vec3 normal;

uniform mat4 ModelView;
uniform mat4 Projection;
uniform vec4 lightPosition;
uniform float pointSize;

uniform bool usePhong;

varying vec3 N;			// All in camera coordinates.
varying vec3 L;
varying vec3 E;

void main(void)
{
	vec4 p = vec4( position.xyz, 1.0 );					// A point.
	vec4 n = vec4( normal.xyz, 0.0 );					// A vector.
	gl_Position = Projection * ModelView * p;

	if( usePhong )
	{
		N = (ModelView * n).xyz;
		L = (lightPosition - ModelView*p).xyz;
		E = -(ModelView * p).xyz;
	}

	gl_PointSize = pointSize;
}