const fragShader = `
#define SHADER_NAME BEND_WAVES_FS

precision mediump float;

uniform float     uTime;
uniform sampler2D uMainSampler;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
varying vec2 outTexCoord;
uniform vec2 uResolution;
uniform float amount;
uniform float barrelPower;
uniform float fadeAmount;
uniform float bloomPower;

// Remap values
float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// -- START FILM GRAIN -- //
//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise3D(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

float snoise3D(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }

// glsl-film-grain

float grain(vec2 texCoord, vec2 resolution, float frame, float multiplier) {
    vec2 mult = texCoord * resolution;
    float offset = snoise3D(vec3(mult / multiplier, frame));
    float n1 = pnoise3D(vec3(mult, offset), vec3(1.0/texCoord * resolution, 1.0));
    return n1 / 2.0 + 0.5;
}

float grain(vec2 texCoord, vec2 resolution, float frame) {
    return grain(texCoord, resolution, frame, 2.5);
}

float grain(vec2 texCoord, vec2 resolution) {
    return grain(texCoord, resolution, 0.0);
}

// -- END FILM GRAIN -- //

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

// Jamie Owen glsl-blend
float blendOverlay(float base, float blend) {
    return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
    return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
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
    vec2 uvR = distort(uv, distortCoefficient + 0.05);
    vec2 uvG = distort(uv, distortCoefficient + 0.1);
    vec2 uvB = distort(uv, distortCoefficient + 0.15);

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
    // float distortCoefficient = -0.25;
    // uv = distort(uv, distortCoefficient);

    // Sample canvas
    vec4 texColor = texture2D(uMainSampler, uv);
    vec4 brightColor = vec4(0.0);

    // Chromatic abberration
    texColor = rgbLensSplit(uMainSampler, uv, barrelPower);

    // Bloom
    float glowAmount = map(sin(uTime * 4.0), -1.0, 1.0, 0.008, 0.016) * bloomPower;
    texColor.rgb += gaussianBlur(uMainSampler, uv, vec3(1080, 1080, 0)).rgb * glowAmount;

    // Film fade
    float gamma = map(fadeAmount, 0.0, 1.0, 0.1, 1.0);
    texColor.rgb = pow(texColor.rgb, vec3(1.0/gamma));
    texColor.rgb *= clamp(map(fadeAmount, 0.0, 0.35, 0.0, 1.0), 0.0, 1.0);

    // // Film grain
    // float grainSize = 5.0;
    // vec2 grainUV = fract(uv += uTime * 0.1 + 1.0);
    // float g = grain(uv, uResolution / grainSize, uTime * 10.0, 2.5);
    // texColor.rgb = blendOverlay(texColor.rgb, vec3(g), 0.5);
    // texColor.a = 1.0;

    // texColor = texture2D(iChannel1, uv);

    // Output to screen
    gl_FragColor = vec4( texColor );
}
`;

export default class PostProcess extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline
{
    constructor (game)
    {
        super({
            game,
            renderTarget: true,
            fragShader,
            uniforms: [
                'uProjectionMatrix',
                'uMainSampler',
                'iChannel0',
                'iChannel1',
                'uTime',
                'uResolution',
                'amount',
                'barrelPower',
                'fadeAmount',
                'bloomPower',
            ]
        });
        this._time = 0;
        this._amount = 0;
        this._fadeAmount = 0.0;
    }

    onPreRender ()
    {
        this._time += 0.005;
        this._time % 10;
        this.set1f('uTime', this._time);

        this._amount += 0.01;
        this._amount % 10;
        this.set1f('amount', this._amount);

    }
}