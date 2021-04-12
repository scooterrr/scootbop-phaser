#define SHADER_NAME BEND_WAVES_FS

precision mediump float;

uniform float     uTime;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
uniform float amount;
uniform float barrelPower;
uniform float fadeAmount;

// Remap values
float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// Returns RGB split
vec3 rgbSplit(sampler2D buffer, vec2 uv, vec2 amount)
{    
    // Sample buffer
    float r = texture2D(buffer, vec2(uv.x, uv.y + amount.y)).r;
    float g = texture2D(buffer, vec2(uv.x + amount.x, uv.y - amount.y)).g;
    float b = texture2D(buffer, vec2(uv.x - amount.x, uv.y - amount.y)).b;
    
    // Return split image
    return vec3(r, g, b); 
}

// Returns gaussian blurred image ( from https://www.shadertoy.com/view/Xltfzj )
vec4 gaussianBlur(sampler2D buffer, vec2 uv, vec3 iResolution)
{
    vec4 outColour;
    const float Pi = 6.28318530718; // Pi*2
    
    // Values 
    const float Directions =8.0; // BLUR DIRECTIONS (Default 16.0 - More is better but slower)
    const float Quality =2.0; // BLUR QUALITY (Default 4.0 - More is better but slower)
    const float Size = 24.0; // BLUR SIZE (Radius)
    vec2 Radius = Size/iResolution.xy;
    
    // Blur calculations
    for( float d=0.0; d<Pi; d+=Pi/Directions)
    {
        for(float i=1.0/Quality; i<=1.0; i+=1.0/Quality)
        {
            outColour += texture2D( buffer, uv+vec2(cos(d),sin(d))*Radius*i);       
        }
    }
    
    return outColour;
}

// adapted from Francois Tarlier
vec2 distort(vec2 uv, float k)
{
    // cubic distortion value
    float kcube = 0.5;
    float r2 = (uv.x-0.5)*(uv.x-0.5) + (uv.y-0.5)*(uv.y-0.5);       
    float f = 0.0;
    if (kcube == 0.0) {
         f = 1.0 + r2 * k;
    } else {
         f = 1.0 + r2 * (k + kcube * sqrt(r2));
    };
    float x = f*(uv.x-0.5)+0.5;
    float y = f*(uv.y-0.5)+0.5;

    return vec2(x, y);
}

// RGB Lens Split
vec4 rgbLensSplit(sampler2D buffer, vec2 uv, float amount)
{
    // Get distorted UVs
    float distortCoefficient = -amount;
    vec2 uvR = distort(uv, distortCoefficient / 6.0);
    vec2 uvG = distort(uv, distortCoefficient / 4.0);
    vec2 uvB = distort(uv, distortCoefficient / 2.0);

    // Shift channels
    uvR.x += 0.0015;
    uvG.y += 0.0015;

    // Sample buffer
    float r = texture2D(buffer, uvR).r;
    float g = texture2D(buffer, uvG).g;
    float b = texture2D(buffer, uvB).b;
    float a = 1.0;

    return vec4(r, g, b, a);
}

void main( void )
{
    vec2 uv = outTexCoord;

    // Lens distortion
    float distortCoefficient = -0.25;
    uv = distort(uv, distortCoefficient);

    // Sample canvas
    vec4 texColor = texture2D(uMainSampler, uv);
    vec4 brightColor = vec4(0.0);

    // Chromatic abberration
    texColor = rgbLensSplit(uMainSampler, uv, 0.25);

    // Bloom
    float glowAmount = map(sin(uTime * 4.0), -1.0, 1.0, 0.008, 0.016) * bloomPower;
    texColor.rgb += gaussianBlur(uMainSampler, uv, vec3(1080, 1080, 0)).rgb * glowAmount;

    // Film fade
    float gamma = map(fadeAmount, 0.0, 1.0, 0.1, 1.0);
    texColor.rgb = pow(texColor.rgb, vec3(1.0/gamma));
    texColor.rgb *= clamp(map(fadeAmount, 0.0, 0.35, 0.0, 1.0), 0.0, 1.0);

    // Output to screen
    gl_FragColor = vec4( texColor );
}