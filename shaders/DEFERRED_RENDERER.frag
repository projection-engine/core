#version 300 es
precision highp float;

#define MAX_LIGHTS 4
#define PI 3.14159265359

in vec2 texCoords;

uniform PointLights{
    mat4 pointLights[24];
    int pointLightsQuantity;
};

uniform DirectionalLights{
    mat4 directionalLights[16];
    mat4 directionalLightsPOV[16];
    int directionalLightsQuantity;
};

uniform vec4 settings;

uniform vec3 cameraPosition;
uniform bool hasAO;

uniform sampler2D shadowMapTexture;
uniform samplerCube shadowCube;
uniform sampler2D aoSampler;
uniform sampler2D positionSampler;
uniform sampler2D normalSampler;
uniform sampler2D albedoSampler;
uniform sampler2D behaviourSampler;
uniform sampler2D ambientSampler;
uniform sampler2D depthSampler;
uniform sampler2D screenSpaceReflections;
uniform sampler2D screenSpaceGI;
out vec4 finalColor;

//import(computeShadows)

//import(distributionGGX)

//import(geometrySchlickGGX)

//import(geometrySmith)

//import(fresnelSchlick)

//import(fresnelSchlickRoughness)

//import(computeDirectionalLight)

//import(computePointLight)

//import(sampleIndirectLight)


void main() {
    vec3 fragPosition = texture(positionSampler, texCoords).rgb;
    if (fragPosition.x == 0.0 && fragPosition.y == 0.0 && fragPosition.z == 0.0)
    discard;

    float shadowMapsQuantity = settings.z;
    float shadowMapResolution = settings.y;
    vec3 albedo = texture(albedoSampler, texCoords).rgb;

    if (albedo.r <= 1. && albedo.g <= 1. && albedo.b <= 1.){
        vec3 directIllumination = vec3(0.0);
        vec3 indirectIllumination = vec3(0.0);
        vec3 V = normalize(cameraPosition - fragPosition);
        vec3 N = texture(normalSampler, texCoords).rgb;

        float ao = texture(behaviourSampler, texCoords).r;
        if (hasAO == true)
        ao *= texture(aoSampler, texCoords).r;

        float roughness = texture(behaviourSampler, texCoords).g;
        float metallic =texture(behaviourSampler, texCoords).b;

        float NdotV    = max(dot(N, V), 0.000001);
        vec3 F0 = vec3(0.04);

        F0 = mix(F0, albedo, metallic);

        float shadows = directionalLightsQuantity > 0 || pointLightsQuantity > 0?  0. : 1.0;
        float quantityToDivide = float(directionalLightsQuantity) + float(pointLightsQuantity);
        for (int i = 0; i < directionalLightsQuantity; i++){
            vec4 lightInformation = computeDirectionalLight(shadowMapTexture, shadowMapsQuantity, shadowMapResolution, directionalLightsPOV[i], directionalLights[i], fragPosition, V, F0, roughness, metallic, N, albedo);
            directIllumination += lightInformation.rgb;
            shadows += lightInformation.a/quantityToDivide;
        }

        float viewDistance = length(V);
        for (int i = 0; i < int(pointLightsQuantity); ++i){
            vec4 lightInformation = computePointLights(shadowCube, pointLights[i], fragPosition, viewDistance, V, N, quantityToDivide, roughness, metallic, albedo, F0);
            directIllumination += lightInformation.rgb;
            shadows += lightInformation.a/quantityToDivide;
        }

        indirectIllumination = texture(ambientSampler, texCoords).rgb + sampleIndirectLight(shadows, screenSpaceGI, screenSpaceReflections, NdotV, metallic, roughness, albedo, F0);
        finalColor = vec4(directIllumination * ao * shadows + indirectIllumination, 1.);
    }
    else
    finalColor = vec4(albedo, 1.);
}

