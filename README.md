# webgl
A WebGL Template

Use this sample code to create your WebGL application!

You can draw: dots, lines, unit spheres, unit cubes, unit cylinders, and unit prisms.  The template uses jQuery and Numeric.js to provide the basis for interaction and linear algebra, respectively.  All drawing capabilities and graphics setup are encapsulated in the WebGL.js class for ease of use.

## Affine transformations

We provide a library of affine transformations that you can apply to your model matrix to draw your geometries at any location you want.  These transformations include translation, scaling, and rotation, plus the functionality to generate the view and projection matrices.  You may check out Transformation.js.

## Shading

We use shaders to implement a basic Phong model.  Coloring your geometries works as in the old fixed-pipeline OpenGL; for this, you must use the setColor function of the WebGL class.  Both the vertex and fragment shaders are located in the js/shaders/ directory of the repository.

## Interactivity

We provide a Camera class that permits the user to fly the camera through the scene.  The sample index.jsp sets up interactivity by capturing the left-mouse-button drag, mouse scrolling, and right-mouse-button drag to pan the scene along the camera axes, zoom in and out via a global scaling transformation, and rotating the scene via a model rotation.
