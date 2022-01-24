#version 300 es

precision highp float;
// IN
in vec4 vPosition;
in highp vec2 texCoord;



in mat3 toTangentSpace;
in vec3 normalVec;

// UNIFORMS


uniform vec3 cameraVec;
struct PBR {
    sampler2D albedo;
    sampler2D metallic;
    sampler2D roughness;
    sampler2D normal;
    sampler2D height;
    sampler2D ao;
};
uniform PBR pbrMaterial;
uniform float selected;

// OUTPUTS
layout (location = 0) out vec4 gPosition;
layout (location = 1) out vec4 gNormal;
layout (location = 2) out vec4 gAlbedo;
layout (location = 3) out vec4 gBehaviour;





float getDisplacement (vec2 UVs, sampler2D height){
    return texture(height, UVs).r;
}

void main(){
    gPosition = vec4(1.0);
    gBehaviour = vec4(1.0);
    gAlbedo = vec4(1.0);
    gNormal = vec4(1.0);

    gPosition = vPosition;

    vec3 V = normalize(cameraVec - vPosition.xyz);
    vec2 UVs = texCoord;
    float hScale = 0.05;
    const float minLayers = 8.0;
    const float maxLayers = 64.0;
    float numberLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), V)));
    float layerDepth = 1.0/numberLayers;
    float currentLayerDepth = 0.0;
    vec2 S = V.xy  * hScale;
    vec2 deltaUVs = S/numberLayers;
    float currentDepthMapValue = 1.0 -  getDisplacement(UVs, pbrMaterial.height);
    while (currentLayerDepth < currentDepthMapValue){
        UVs -= deltaUVs;
        currentDepthMapValue = 1.0 -   getDisplacement(UVs, pbrMaterial.height);
        currentLayerDepth +=layerDepth;
    }
    vec2 prevTexCoord = UVs + deltaUVs;
    float afterDepth = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = 1.0 -   getDisplacement(UVs, pbrMaterial.height) - currentLayerDepth + layerDepth;
    float weight = afterDepth/(afterDepth-beforeDepth);
    UVs = prevTexCoord * weight + UVs * (1.0 - weight);

    //    if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0|| UVs.y < 0.0)
    //        discard;

    if(selected == 1.0){
        gAlbedo = vec4(1.0, 1.0, 0.0, 1.0);

        gBehaviour.r = 0.0;
        gBehaviour.g = 1.0;
        gBehaviour.b = 0.0;
    }
    else {
        gAlbedo.rgb = texture(pbrMaterial.albedo, UVs).rgb;
        gAlbedo.a = 1.0;

        gBehaviour.r = texture(pbrMaterial.ao, UVs).r;
        gBehaviour.g = texture(pbrMaterial.roughness, UVs).r;
        gBehaviour.b = texture(pbrMaterial.metallic, UVs).r;
    }

    gNormal = vec4(normalize(toTangentSpace * ((texture(pbrMaterial.normal, UVs).xyz * 2.0)- 1.0)), 1.0);

}