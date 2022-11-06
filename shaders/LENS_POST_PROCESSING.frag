#version 300 es
precision mediump float;
in vec2 texCoords;

uniform LensEffects{
    float distortionIntensity;
    float chromaticAberrationIntensity;
    bool distortionEnabled;
    bool chromaticAberrationEnabled;
    bool bloomEnabled;
};

uniform sampler2D blurred;
uniform sampler2D sceneColor;

out vec4 fragColor;
vec3 chromaticAberration(vec2 uv){
    float amount = chromaticAberrationIntensity * .001;
    vec3 col;
    col.r = texture( sceneColor, vec2(uv.x+amount,uv.y) ).r;
    col.g = texture( sceneColor, uv ).g;
    col.b = texture( sceneColor, vec2(uv.x-amount,uv.y) ).b;
    return col;
}
vec2 lensDistortion( vec2 uv, float k){
    vec2 t = uv - .5;
    float r2 = t.x * t.x + t.y * t.y;
    float f = 1. + r2 * (  .1 - k * sqrt(r2));

    vec2 nUv = f * t + .5;
    return nUv;
}

void main(void){
    vec2 texCoords = distortionEnabled ? lensDistortion( texCoords, distortionIntensity * .5)  : texCoords;
    vec3 bloomColor = bloomEnabled ? texture(blurred, texCoords).rgb : vec3(0.);
    vec3 color = chromaticAberrationEnabled ? chromaticAberration(texCoords): texture(sceneColor, texCoords).rgb;


    fragColor = vec4(color + bloomColor, 1.);

}