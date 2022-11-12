// THANKS TO https://imanolfotia.com/blog/1

float dDepth;

vec3 getViewPosition(vec2 coords){
    return  vec3(viewMatrix * textureLod(gPosition, coords, 2.));
}

vec3 BinarySearch(inout vec3 dir, inout vec3 hitCoord)
{
    float depth;
    vec4 projectedCoord;
    int Q = SEARCH_STEPS;
    for(int i = 0; i < Q; i++){
        projectedCoord = projectionMatrix * vec4(hitCoord, 1.0);
        projectedCoord.xy /= projectedCoord.w;
        projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;

        depth = getViewPosition(projectedCoord.xy).z;
        dDepth = hitCoord.z - depth;
        dir *= 0.5;
        if(dDepth > 0.0)
        hitCoord += dir;
        else
        hitCoord -= dir;
    }

    projectedCoord = projectionMatrix * vec4(hitCoord, 1.0);
    projectedCoord.xy /= projectedCoord.w;
    projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;

    return vec3(projectedCoord.xy, depth);
}

vec4 RayMarch(int maxSteps, vec3 dir, inout vec3 hitCoord,  float stepSize){
    dir *= stepSize;
    float depth;
    int steps;
    vec4 projectedCoord;


    for(int i = 0; i < maxSteps; i++)   {
        hitCoord += dir;
        projectedCoord = projectionMatrix * vec4(hitCoord, 1.0);
        projectedCoord.xy /= projectedCoord.w;
        projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;

        depth = getViewPosition(projectedCoord.xy).z;
        if(depth > 1000.0)
        continue;

        dDepth = hitCoord.z - depth;
        float Q = DEPTH_THRESHOLD;
        if((dir.z - dDepth) < Q){
            if(dDepth <= 0.0)
            {
                vec4 Result;
                Result = vec4(BinarySearch(dir, hitCoord), 1.0);

                return Result;
            }
        }

        steps++;
    }


    return vec4(projectedCoord.xy, depth, 0.0);
}

vec3 hash(vec3 a){
    a = fract(a * vec3(.8) );
    a += dot(a, a.yxz + 19.19);
    return fract((a.xxy + a.yxx)*a.zyx);
}