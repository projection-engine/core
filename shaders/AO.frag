
precision highp float;
#define KERNELS 64

//import(cameraUBO)

uniform Settings{
    vec4 settings;
    vec4 samples[KERNELS];
    vec2 noiseScale;
};
in vec2 texCoords;
uniform int maxSamples;
uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D noiseSampler;
out vec4 fragColor;



void main()
{
    vec4 fragPosition = texture(gPosition, texCoords);
    if (fragPosition.a < 1.) discard;
    float radius = settings.x;
    float power = settings.y;
    float bias = settings.z;

    vec3 normal = (transpose(invViewMatrix) * texture(gNormal, texCoords)).rgb;
    vec3 randomVec = texture(noiseSampler, texCoords * noiseScale).xyx;

    vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN = mat3(tangent, bitangent, normal);

    float occlusion = 0.0;
    for (int i = 0; i < maxSamples; ++i){
        vec3 samplePos = TBN * samples[i].rgb;
        samplePos = fragPosition.xyz + samplePos * radius;
        vec4 offset = vec4(samplePos, 1.0);
        offset = projectionMatrix *offset;
        offset.xyz /= offset.w;
        offset.xyz = offset.xyz * 0.5 + 0.5;

        float sampleDepth = texture(gPosition, offset.xy).z;
        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fragPosition.z - sampleDepth));
        occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0) * rangeCheck;
    }
    occlusion = 1.- occlusion / float(maxSamples);

    fragColor = vec4(pow(clamp(occlusion, 0., 1.), power), .0, .0, 1.);
}