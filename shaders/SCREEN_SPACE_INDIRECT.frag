#version 300 es
precision highp float;

#define CLAMP_MIN .1
#define CLAMP_MAX .9
#define SEARCH_STEPS 5;
#define DEPTH_THRESHOLD 1.2;

in vec2 texCoords;

uniform sampler2D previousFrame;
uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D gBehaviour;
uniform sampler2D stochasticNormals;
uniform sampler2D noiseSampler;

uniform vec2 noiseScale;
uniform mat3 rayMarchSettings;

uniform mat4 projection;
uniform mat4 viewMatrix;
uniform mat4 invViewMatrix;

layout (location = 0) out vec4 SSGISampler;
layout (location = 1) out vec4 SSRSampler;

//import(aces)
//import(rayMarcher)
//import(SSGI)
//import(SSR)

void main(){
    vec4 pixelPosition = texture(gPosition, texCoords);
    if (pixelPosition.a < 1.)
    discard;
    float SSR_falloff = rayMarchSettings[0][0];
    float SSR_minRayStep = rayMarchSettings[0][1];
    float SSR_stepSize = rayMarchSettings[0][2];
    float SSGI_stepSize = rayMarchSettings[1][0];
    float SSGI_intensity = rayMarchSettings[1][1];
    bool ENABLED_SSGI = rayMarchSettings[1][2] == 1.;
    bool ENABLED_SSR = rayMarchSettings[2][0] == 1.;

    int SSGI_maxSteps = int(rayMarchSettings[2][1]);
    int SSR_maxSteps = int(rayMarchSettings[2][2]);

    if (ENABLED_SSR)
    SSRSampler = vec4(SSR(SSR_maxSteps, SSR_falloff, SSR_minRayStep, SSR_stepSize), 1.);
    else
    SSRSampler = vec4(vec3(0.), 1.);

    if (ENABLED_SSGI)
    SSGISampler = vec4(SSGI(SSGI_maxSteps, SSGI_stepSize, SSGI_intensity, noiseScale), 1.);
    else
    SSGISampler = vec4(vec3(0.), 1.);
}



