attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 ModelView;
uniform mat4 Projection;

varying vec4 vColor;

void main()
{
    vec4 p = vec4( aVertexPosition.xyz, 1.0 );      // A point.
    vColor = aVertexColor;
    gl_Position = Projection * ModelView * p;
}
