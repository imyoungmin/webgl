attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
varying vec4 vColor;

void main()
{
    vColor = aVertexColor;
    gl_Position = vec4( aVertexPosition, 1.0 );
}
