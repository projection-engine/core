float screenSpaceShadows(vec3 lightDirection){
    int maxSteps = min(100, max(1, maxStepsSSS));
    float stepSize = maxSSSDistance / float(maxSteps);
    float edgeAttenuation = SSSEdgeAttenuation;

    vec3 rayPosition = getViewPosition(quadUV, quadUV);
    vec3 rayDirection = vec3(viewMatrix * vec4(lightDirection, 0.));


    vec3 rayStepIncrement = rayDirection * stepSize;
    float occlusion = 0.0;
    vec4 rayUV   = vec4(0.);
    for (int i = 0; i < maxSteps; i++) {
        rayPosition += rayStepIncrement;
        rayUV = projectionMatrix * vec4(rayPosition, 1.0);
        rayUV.xy /= rayUV.w;
        rayUV.xy = rayUV.xy * 0.5 + 0.5;

        if (rayUV.x == clamp(rayUV.x, 0., 1.) && rayUV.y == clamp(rayUV.y, 0., 1.)){
            float currentDepth     = getViewPosition(rayUV.xy, quadUV).z;
            float currentDepthDelta = rayPosition.z - currentDepth;
            if (currentDepthDelta <= 0. || currentDepthDelta > SSSDepthThickness)
            continue;
            vec2 fade = max(vec2(0.), edgeAttenuation * abs(rayUV.xy - 0.5) - 5.);
            occlusion = clamp(1. - dot(fade, fade), 0., 1.);
            break;
        }
    }

    return 1. - occlusion;
}