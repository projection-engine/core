vec3 gaussian(sampler2D samplerData, vec2 texCoords) {
    int blurRadius = int(roughness * 20.);
    float sigma = float(blurRadius) * 0.75;
    vec3 col = vec3(0.0);
    float accum = 0.0;
    float weight;
    vec2 offset;
    float SIG = 2.0 * pow(float(blurRadius), 2.);
    if (blurRadius <= 1)
    return texture(samplerData, texCoords).rgb;
    for (int x = -blurRadius / 2; x < blurRadius / 2; ++x) {
        for (int y = -blurRadius / 2; y < blurRadius / 2; ++y) {
            offset = vec2(x, y);
            weight = 1.0 / SIG * PI * exp(-((pow(offset.x, 2.) + pow(offset.y, 2.)) / SIG));
            col += textureLod(samplerData, texCoords + texelSize * offset, 2.).rgb * weight;
            accum += weight;
        }
    }

    if (accum > 0.) return col / accum;
    return texture(samplerData, texCoords).rgb;
}


vec3 computeSSR() {
    if (metallic < 0.05) return vec3(0.);
    vec3 worldNormal = normalFromDepth(depthData, quadUV, scene_depth);
    vec3 reflected = normalize(reflect(normalize(viewSpacePosition), normalize(worldNormal)));
    vec3 hitPos = viewSpacePosition;
    float step = max(stepSizeSSR, .1);
    int maxSteps = clamp(maxStepsSSR, 1, 100);
    vec4 coords = RayMarch(maxSteps, (reflected * max(.01, -viewSpacePosition.z)), hitPos, step, quadUV);

    vec2 dCoords = smoothstep(CLAMP_MIN, CLAMP_MAX, abs(vec2(0.5) - coords.xy));
    float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);
    float reflectionMultiplier = clamp(pow(metallic, SSRFalloff) * screenEdgefactor * -reflected.z, 0., 1.);
    vec3 tracedAlbedo = gaussian(previousFrame, coords.xy);

    return tracedAlbedo * reflectionMultiplier * (brdf.r + brdf.g);
}

vec3 getDiffuse(vec3 KS, float metallic) {
    return (1. - KS) * (1. - metallic);
}
vec3 fresnelSchlick(float VdotH, vec3 F0) {
    float f = pow(1.0 - VdotH, 5.0);
    return f + F0 * (1.0 - f);
}


vec3 fresnel(vec3 F0, float F90, float HdotV) {
    return F0 + (F90 - F0) * pow(1.0 - HdotV, 5.0);
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

float distributionGGX(float NdotH, float roughness) {
    float a2 = pow(roughness, 4.);
    float denom = (pow(NdotH, 2.) * (a2 - 1.0) + 1.0);
    return a2 / (PI * pow(denom, 2.));
}

float geometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(float NdotL, float roughness) {
    float roughnessSquared = pow(roughness, 2.);
    float V = NdotL * (NdotV * (1. - roughnessSquared) + roughnessSquared);
    float L = NdotV * (NdotL * (1. - roughnessSquared) + roughnessSquared);
    return clamp(0.5 * 1. / (V + L), 0., 1.);
}

vec3 sampleIndirectLight() {
    vec3 diffuseColor = texture(SSGI, quadUV).rgb * albedoOverPI;
    vec3 specularColor = ssrEnabled ? computeSSR() : vec3(0.);
    return diffuseColor + specularColor;
}

vec3 computeSkylightAmbient(vec3 V) {
    vec3 specular = vec3(0.);
    vec3 F = fresnelSchlickRoughness(NdotV, F0, roughness);
    vec3 kD = (1.0 - F) * (1.0 - metallic);
    vec3 prefilteredColor = textureLod(skylight_specular, reflect(-V, N), 0.).rgb;

    specular = prefilteredColor;//* (F * brdf.r + brdf.g);

    //    vec3 diffuse = texture(skylight_diffuse, N).rgb * albedo * kD ;
    return specular;//diffuse + specular;
}

vec4 precomputeContribution(vec3 lightPosition) {
    vec3 L = normalize(lightPosition - worldSpacePosition);
    float NdotL = max(dot(N, L), 0.0);
    if (NdotL <= 0.) return vec4(0.);
    return vec4(L, NdotL);
}

float kelemen(float HdotV) {
    return 1. / (4. * pow(HdotV, 2.) + 1e-5);
}

// "Production Friendly Microfacet Sheen BRDF" http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float charlie(float roughness, float NdotH) {
    const float MAX_SIN2H = 0.0078125;

    float inv = 1.0 / roughness;
    float sin2h = max(1.0 - pow(NdotH, 2.), MAX_SIN2H);

    return (2. + inv) * pow(sin2h, inv * .5) / (2. * PI);
}

float V_GGX_anisotropic_2cos(float cos_theta_m, float alpha_x, float alpha_y, float cos_phi, float sin_phi)
{
    float cos2 = cos_theta_m * cos_theta_m;
    float sin2 = (1.0 - cos2);
    float s_x = alpha_x * cos_phi;
    float s_y = alpha_y * sin_phi;
    return 1.0 / max(cos_theta_m + sqrt(cos2 + (s_x * s_x + s_y * s_y) * sin2), 0.001);
}
float D_GGX_Anisotropic(float cos_theta_m, float alpha_x, float alpha_y, float cos_phi, float sin_phi)
{
    float cos2 = cos_theta_m * cos_theta_m;
    float sin2 = (1.0 - cos2);
    float r_x = cos_phi / alpha_x;
    float r_y = sin_phi / alpha_y;
    float d = cos2 + sin2 * (r_x * r_x + r_y * r_y);
    return clamp(1.0 / (PI * alpha_x * alpha_y * d * d), 0., 1.);
}
void anisotropicCompute(inout vec3 H, inout vec3 dEnergy, inout vec3 specularTotal, inout vec3 L, float NdotL, inout vec3 lightColor, float HdotV, float NdotH) {
    vec3 b = normalize(B);
    float rotation = max(anisotropicRotation * PI * 2., .00000001);
    vec2 direction = vec2(cos(rotation), sin(rotation));
    vec3 t = normalize((vec3(direction, 0.) * TBN));

    float aspect = sqrt(1. - anisotropy * .9);
    float ax = roughness / aspect;
    float ay = roughness * aspect;
    float TdotH = dot(t, H);
    float BdotH = dot(b, H);

    float D = D_GGX_Anisotropic(NdotH, ax, ay, TdotH, BdotH);
    float V = V_GGX_anisotropic_2cos(NdotV, ax, ay, TdotH, BdotH) * V_GGX_anisotropic_2cos(NdotV, ax, ay, TdotH, BdotH);
    vec3 F = fresnel(F0, clamp(dot(F0, vec3(50. * .3333)), 0., 1.), dot(L, H));

    specularTotal += D * V * F;
    dEnergy *= getDiffuse(F, metallic);
}

void clearCoatCompute(inout vec3 dEnergy, inout vec3 specularTotal, inout vec3 L, float NdotL, inout vec3 lightColor, float HdotV, float NdotH) {
    float D = distributionGGX(NdotH, roughness);
    float V = kelemen(HdotV);
    vec3 F = fresnel(vec3(.04), 1., HdotV) * max(clearCoat, 0.);
    specularTotal += D * V * F;
    dEnergy *= getDiffuse(F, metallic);

}
void sheenCompute(inout vec3 dEnergy, inout vec3 specularTotal, inout vec3 L, float NdotL, inout vec3 lightColor, float HdotV, float NdotH) {
    float D = charlie(roughness, NdotH);
    float V = clamp(1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV)), 0., 1.);
    vec3 F = sheen * mix(vec3(1.), F0, pow(sheenTint, 2.));
    specularTotal += D * V * F;
    dEnergy *= getDiffuse(F, metallic);
}

void isotropicCompute(inout vec3 dEnergy, inout vec3 specularTotal, inout vec3 L, float NdotL, inout vec3 lightColor, float HdotV, float NdotH) {
    float D = distributionGGX(NdotH, roughness);
    float V = geometrySmith(NdotL, roughness);
    vec3 F = fresnelSchlick(HdotV, F0);
    specularTotal += D * V * F;
    dEnergy *= getDiffuse(F, metallic);
}

// "Beyond a Simple Physically Based Blinn-Phong Model in Real-Time" https://blog.selfshadow.com/publications/s2012-shading-course/gotanda/s2012_pbs_beyond_blinn_slides_v3.pdf
vec3 computeDiffuseContribution(float NdotL, float HdotV) {
    float s2 = pow(roughness, 4.);
    float VoL = 2. * pow(HdotV, 2.) - 1.;
    float consineRI = VoL - NdotV * NdotL;
    float C1 = 1. - 0.5 * s2 / (s2 + 0.33);
    float C2 = 0.45 * s2 / (s2 + 0.09) * consineRI * (consineRI >= 0. ? 1. / (max(NdotL, NdotV + 0.0001)) : 1.);
    return albedoOverPI * (C1 + C2) * (1. + roughness * 0.5);
}

vec3 computeBRDF(inout vec3 L, float NdotL, inout vec3 lightColor) {
    vec3 H = normalize(V + L);
    float HdotV = clamp(dot(H, V), 0., 1.);
    float NdotH = clamp(dot(N, H), 0., 1.);
    vec3 diffuseTotal = computeDiffuseContribution(NdotL, HdotV);
    vec3 specularTotal = vec3(0.);
    vec3 diffuseEnergy = vec3(1.);


    switch (renderingMode) {
        case ISOTROPIC:
            isotropicCompute(diffuseEnergy, specularTotal, L, NdotL, lightColor, HdotV, NdotH);
            break;
        case ANISOTROPIC:
            anisotropicCompute(H, diffuseEnergy, specularTotal, L, NdotL, lightColor, HdotV, NdotH);
            break;
        case SHEEN:
            sheenCompute(diffuseEnergy, specularTotal, L, NdotL, lightColor, HdotV, NdotH);
            break;
        case CLEAR_COAT:
            clearCoatCompute(diffuseEnergy, specularTotal, L, NdotL, lightColor, HdotV, NdotH);
            break;
    }

    return (diffuseTotal * diffuseEnergy + specularTotal) * lightColor;
}

