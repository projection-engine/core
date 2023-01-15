#define PI 3.14159265359
#define FRAG_DEPTH_THRESHOLD .0001
#define MAX_LIGHTS 310
#define PARALLAX_THRESHOLD 200.
#define CLAMP_MIN .1
#define CLAMP_MAX .9
#define SEARCH_STEPS 5
#define DEPTH_THRESHOLD 1.2
#define PI_SQUARED 6.2831853
#define DIRECTIONAL 0
#define SPOT 1
#define POINT 2
#define SPHERE 3
#define DISK 4
#define PLANE 5

#define UNLIT 0
#define ISOTROPIC 1
#define ANISOTROPIC 2
#define SHEEN 3
#define CLEAR_COAT 4
#define TRANSPARENCY 5
#define SKY 6

in mat4 matAttr;
in vec2 naturalTextureUV;
in vec3 naturalNormal;

in vec3 worldPosition;
in mat4 invModelMatrix;

// GLOBAL
uniform vec2 bufferResolution;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 invViewMatrix;
uniform mat4 invProjectionMatrix;
uniform vec3 cameraPosition;
uniform float elapsedTime;
uniform bool isDecalPass;

uniform UberShaderSettings {
    float shadowMapsQuantity;
    float shadowMapResolution;
    int lightQuantity;

    float SSRFalloff;
    float stepSizeSSR;
    float maxSSSDistance;
    float SSSDepthThickness;
    float SSSEdgeAttenuation;
    float skylightSamples;
    float SSSDepthDelta;
    float SSAOFalloff;
    int maxStepsSSR;
    int maxStepsSSS;
    bool hasSkylight;
    bool hasAmbientOcclusion;

    mat4 lightPrimaryBuffer[MAX_LIGHTS];
    mat4 lightSecondaryBuffer[MAX_LIGHTS];
    int lightTypeBuffer[MAX_LIGHTS];
};

uniform sampler2D scene_depth;
uniform sampler2D brdf_sampler;
uniform sampler2D SSAO;
uniform sampler2D SSGI;
uniform sampler2D previousFrame;
uniform sampler2D shadow_atlas;
uniform samplerCube shadow_cube;
uniform samplerCube skylight_specular;
uniform sampler2D sampler0;
uniform sampler2D sampler1;
uniform sampler2D sampler2;
uniform sampler2D sampler3;
uniform sampler2D sampler4;
uniform sampler2D sampler5;
uniform sampler2D sampler6;
uniform sampler2D sampler7;


out vec4 fragColor;

float naturalAO = 1.;
float roughness = .5;
float metallic = .5;
float refractionIndex = 0.;
float alpha = 1.;
vec3 albedo = vec3(.5);

mat3 TBN;
vec3 T;
vec3 B;
vec3 N;

vec3 emission = vec3(0.);
vec3 albedoOverPI;
vec3 VrN;
vec2 brdf;
vec3 F0 = vec3(0.04);
float NdotV;
vec2 texelSize;
bool flatShading = false;
bool isSky;
bool alphaTested;

vec2 quadUV;
vec3 viewDirection;
bool hasTBNComputed = false;
bool hasViewDirectionComputed = false;
float distanceFromCamera;
vec3 V;
vec2 texCoords;
vec3 viewSpacePosition;
vec3 worldSpacePosition;
vec3 normalVec;
float depthData;


// MATERIAL ATTRIBUTES
bool screenDoorEffect;
bool ssrEnabled;
int renderingMode;
vec3 entityID;
int materialID;
float anisotropicRotation;
float anisotropy;
float clearCoat;
float sheen;
float sheenTint;
bool useAlbedoDecal;
bool useMetallicDecal;
bool useRoughnessDecal;
bool useNormalDecal;
bool useOcclusionDecal;


void extractData() {
    texelSize = 1. / bufferResolution;
    quadUV = gl_FragCoord.xy / bufferResolution;
    depthData = texture(scene_depth, quadUV).r;

    screenDoorEffect = matAttr[1][0] == 1.;
    ssrEnabled = matAttr[1][1] == 1.;
    renderingMode = int(matAttr[0][3]);
    entityID = vec3(matAttr[0]);
    materialID = int(matAttr[1][2]);




    if (isDecalPass) {
        anisotropicRotation = matAttr[1][3];
        anisotropy = matAttr[2][0];
        clearCoat = matAttr[2][1];
        sheen = matAttr[2][2];
        sheenTint = matAttr[2][3];

        renderingMode = ISOTROPIC;
        useAlbedoDecal = matAttr[3][0] == 1.;
        useMetallicDecal = matAttr[3][1] == 1.;
        useRoughnessDecal = matAttr[3][2] == 1.;
        useNormalDecal = matAttr[3][3] == 1.;
        useOcclusionDecal = matAttr[1][2] == 1.;
    }

    isSky = renderingMode == SKY;
    flatShading = renderingMode == UNLIT;
    alphaTested = renderingMode == TRANSPARENCY;
}


void computeTBN() {
    if (!hasTBNComputed){
        hasTBNComputed = true;
        vec3 N = abs(normalVec);
        if (N.z > N.x && N.z > N.y)
        T = vec3(1., 0., 0.);
        else
        T = vec3(0., 0., 1.);
        T = normalize(T - N * dot(T, N));
        B = cross(T, N);
        TBN = mat3(T, B, N);
    }
}

vec2 parallaxOcclusionMapping(vec2 texCoords, vec3 viewDir, bool discardOffPixes, sampler2D heightMap, float heightScale, float layers) {
    if (distanceFromCamera > PARALLAX_THRESHOLD) return texCoords;
    float layerDepth = 1.0 / layers;
    float currentLayerDepth = 0.0;
    vec2 P = viewDir.xy / viewDir.z * heightScale;
    vec2 deltaTexCoords = P / layers;

    vec2 currentUVs = texCoords;
    float currentDepthMapValue = texture(heightMap, currentUVs).r;
    while (currentLayerDepth < currentDepthMapValue) {
        currentUVs -= deltaTexCoords;
        currentDepthMapValue = texture(heightMap, currentUVs).r;
        currentLayerDepth += layerDepth;
    }

    vec2 prevTexCoords = currentUVs + deltaTexCoords;
    float afterDepth = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(heightMap, prevTexCoords).r - currentLayerDepth + layerDepth;


    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentUVs * (1.0 - weight);

    return finalTexCoords;
}