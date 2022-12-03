// ------------------ ATTRIBUTES TO FILL
float naturalAO = 1.;
float roughness = .5;
float metallic = .5;
float refractionIndex=0.;
float alpha = 1.;
vec3 albedo= vec3(.5);
vec3 N = vec3(0.);
vec3 emission = vec3(0.);
bool flatShading = false;
// ------------------ ATTRIBUTES TO FILL


// ------------------ INTERNAL ATTRIBUTES
vec2 brdf = vec2(0.);
vec3 F0 = vec3(0.04);
float NdotV;
vec3 viewSpacePosition;
//import(depthReconstructionUtils)

//import(rayMarcher)

vec3 computeSSR(){
    if (metallic < 0.01)
    return vec3(0.);
    vec3 worldNormal = normalFromDepth(gl_FragCoord.z, quadUV, scene_depth);
    vec3 reflected = normalize(reflect(normalize(viewSpacePosition), normalize(worldNormal)));
    vec3 hitPos = viewSpacePosition;
    vec3 jitt = mix(vec3(0.0), vec3(hash(viewSpacePosition)), roughness);
    vec4 coords = RayMarch(maxStepsSSR, (vec3(jitt) + reflected * max(.01, -viewSpacePosition.z)), hitPos, stepSizeSSR, quadUV);

    vec2 dCoords = smoothstep(CLAMP_MIN, CLAMP_MAX, abs(vec2(0.5) - coords.xy));
    float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);

    float reflectionMultiplier = pow(metallic, SSRFalloff) * screenEdgefactor * -reflected.z;
    vec3 tracedAlbedo = texture(previousFrame, coords.xy).rgb;

    return tracedAlbedo * clamp(reflectionMultiplier, 0.0, 1.);
}

//import(SSS)

//import(brdf)

//import(computeLights)

//import(computePointLights)

//import(computeSpotLights)

vec3 computeSkylightAmbient(vec3 V){
    vec3 specular = vec3(0.);
    vec3 F  = fresnelSchlick(NdotV, F0, roughness);
    vec3 kD = (1.0 - F) * (1.0 - metallic);
    vec3 prefilteredColor = textureLod(skylight_specular, reflect(-V, N), 0.).rgb;

    specular = prefilteredColor;//* (F * brdf.r + brdf.g);

    //    vec3 diffuse = texture(skylight_diffuse, N).rgb * albedo * kD ;
    return specular;//diffuse + specular;
}


vec4 pbLightComputation() {
    if (flatShading) return vec4(albedo + emission, alpha);
    viewSpacePosition = viewSpacePositionFromDepth(gl_FragCoord.z, quadUV);

    vec3 directIllumination = vec3(0.0);
    vec3 indirectIllumination = vec3(0.0);
    vec3 V = cameraPosition - worldSpacePosition;
    float distanceFromCamera = length(V);
    V = normalize(V);
    float ao = hasAmbientOcclusion ? naturalAO * texture(SSAO, quadUV).r : naturalAO;
    float NdotV = max(dot(N, V), 0.000001);
    brdf = texture(brdf_sampler, vec2(NdotV, roughness)).rg;
    F0 = mix(F0, albedo, metallic);

    float quantityToDivide = float(directionalLightsQuantity) + float(pointLightsQuantity);
    for (int i = 0; i < directionalLightsQuantity; i++){
        vec3 lightInformation = computeDirectionalLight(distanceFromCamera, shadow_atlas, shadowMapsQuantity, shadowMapResolution, directionalLightsPOV[i], directionalLights[i], worldSpacePosition, V, F0, roughness, metallic, N, albedo);
        directIllumination += lightInformation;

    }

    float viewDistance = length(V);
    for (int i = 0; i < pointLightsQuantity; ++i){
        vec3 lightInformation = computePointLights(distanceFromCamera, shadow_cube, pointLights[i], worldSpacePosition, viewDistance, V, N, roughness, metallic, albedo, F0);
        directIllumination += lightInformation;
    }

    for (int i = 0; i < spotLightsQuantity; ++i){
        vec3 lightInformation = computeSpotLights(distanceFromCamera, spotLights[i], worldSpacePosition, V, N, roughness, metallic, albedo, F0);
        directIllumination += lightInformation;
    }

    indirectIllumination = sampleIndirectLight(ssrEnabled, metallic, roughness, albedo);
    if (hasSkylight)
    indirectIllumination += computeSkylightAmbient(V);
    return vec4((directIllumination + indirectIllumination) * ao + emission, alpha);

}

