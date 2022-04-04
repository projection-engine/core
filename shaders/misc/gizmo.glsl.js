export const vertex = `#version 300 es

layout (location = 1) in vec3 position;
 

uniform mat4 viewMatrix;
uniform mat4 transformMatrix;
uniform mat4 projectionMatrix;

void main(){
    gl_Position = projectionMatrix * viewMatrix * transformMatrix * vec4(position,1.0);
}
`

export const fragment = `#version 300 es
precision highp float;

in vec4 vPosition;
uniform int axis;
uniform int selectedAxis;
out vec4 fragColor;

void main(){
    vec3 color = vec3(1.);
    vec3 loc = vec3(0.0, 1.0, 0.0);
    switch (axis) {
        case 1:
            color = vec3(1., 0., 0.);
   
            break;
        case 2:
            color = vec3(0., 1., 0.);
            break;
        case 3:
            color = vec3(0., 0., 1.);
            break;
        default:
            break;
    }
  
    if(selectedAxis == axis)
        color = vec3(1., 1., 0.);
    
    fragColor = vec4(color, 1.);
}
`
export const vertexRot = `#version 300 es

layout (location = 1) in vec3 position;
layout (location = 3) in vec2 uvs;

uniform mat4 viewMatrix;
uniform mat4 transformMatrix;
uniform mat4 projectionMatrix;
out vec2 uv;
void main(){
    mat4 modelView = viewMatrix * transformMatrix;
    uv = uvs; 
 
    gl_Position = projectionMatrix * modelView * vec4(position,1.0);
 
    
}
`

export const fragmentRot = `#version 300 es
precision highp float;

// IN
in vec4 vPosition;
in vec2 uv;
in vec3 normalVec;
uniform int axis;
uniform int selectedAxis;
uniform sampler2D circleSampler;
out vec4 fragColor;

void main(){
    vec4 colorS = texture(circleSampler, uv);
    float opacity = 1.;
    if(colorS.a <= .1 && axis > 0)
        opacity = .3;
    
        
    vec3 color = vec3(1.);
    switch (axis) {
        case 1:
            color = vec3(1., 0., 0.);
            break;
        case 2:
            color = vec3(0., 1., 0.);
            break;
        case 3:
            color = vec3(0., 0., 1.);
            break;
        default:
            break;
    }
  
    if(selectedAxis == axis)
        color = vec3(1., 1., 0.);
        
    fragColor = vec4(color, opacity);
}
`

export const shadedVertex = `#version 300 es

layout (location = 1) in vec3 position;
 layout (location = 2) in vec3 normal;

uniform mat4 viewMatrix;
uniform mat4 transformMatrix;
uniform mat4 projectionMatrix;

out vec3 normalVec;

void main(){
   normalVec = normalize(normal);
    gl_Position = projectionMatrix * viewMatrix * transformMatrix * vec4(position,1.0);
}
`

export const shadedFragment = `#version 300 es
precision highp float;

in vec4 vPosition;
in vec3 normalVec;

uniform int axis;
uniform int selectedAxis;
out vec4 fragColor;


void main(){
    vec3 color = vec3(1.);
    vec3 loc = vec3(0.0, 1.0, 0.0);
    switch (axis) {
        case 1:
            color = vec3(1., 0., 0.);
   
            break;
        case 2:
            color = vec3(0., 1., 0.);
            break;
        case 3:
            color = vec3(0., 0., 1.);
            break;
        default:
            break;
    }
  
    if(selectedAxis == axis)
        color = vec3(1., 1., 0.);
    
    float shadingIntensity = dot(normalVec, vec3(2., 5.0, 0.0));
    float brightness = max(0.5, shadingIntensity);
    color = color * brightness;
    
    fragColor = vec4(color, .95);
}
`