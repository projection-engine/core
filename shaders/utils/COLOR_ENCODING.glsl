// THANKS http://emmettmcquinn.com/blog/graphics/2012/11/07/float-packing.html
const float c_precision = 128.0;
const float c_precisionp1 = c_precision + 1.0;

/*
 * \param color normalized RGB value
 * \returns 3-component encoded float
 */
float color2float(vec3 color){
    color = clamp(color, 0.0, 1.0);
    return floor(color.r * c_precision + 0.5)
    + floor(color.b * c_precision + 0.5) * c_precisionp1
    + floor(color.g * c_precision + 0.5) * c_precisionp1 * c_precisionp1;
}

/*
 * \param value 3-component encoded float
 * \returns normalized RGB value
 */
vec3 float2color(float value) {
    vec3 color;
    color.r = mod(value, c_precisionp1) / c_precision;
    color.b = mod(floor(value / c_precisionp1), c_precisionp1) / c_precision;
    color.g = floor(value / (c_precisionp1 * c_precisionp1)) / c_precision;
    return color;
}