precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_mouse_x;


// Rigid Transforms

mat3 rotation(float a, float b, float g) 
{
    float ca = cos(a);
    float sa = sin(a);
    float cb = cos(b);
    float sb = sin(b);
    float cg = cos(g);
    float sg = sin(g);

    mat3 Y = mat3(
        ca, -sa, 0.,
        sa, ca, 0.,
        0., 0., 1.
    );

    mat3 P = mat3(
        cb, 0., sb,
        0., 1., 0.,
        -sb, 0., cb
    );

    mat3 R = mat3(
        1., 0., 0.,
        0., cg, -sg,
        0., sg, cg
    );

    return Y * P * R;

    // return mat3(
    //     ca * cb, ca*sb*sg - sa*cg, ca*sb*cg + sa*sg,
    //     sa*cb, sa*sb*sg + ca*sg, sa*sb*cg - ca*sg,
    //     -sb, cb*sg, cb*cg
    // );
}


// SDF ops

float smoothmin(float a, float b, float k)
{
    float h = max( k - abs(a-b), 0.0);
    return min(a, b) - h * h / (k * 4.0);
}

// SDFs

float sphere( vec3 pos, float rad )
{
    return length(pos) - rad;
}

float ellipsoid( vec3 pos, vec3 rad )
{
    float k0 = length(pos/rad);
    float k1 = length(pos/rad/rad);

    return k0 * (k0 - 1.0) / k1;
}

float character_head( vec3 pos, vec3 character_c )
{
    // lower head shape
    vec3 head_lower_c = character_c + vec3(0.0, 0.2, 0.0);
    float head_lower_s = 0.5;
    vec3 head_lower_r = vec3(0.5, 0.4, 0.5) * head_lower_s;

    float d_head_lower = ellipsoid(pos - head_lower_c, head_lower_r);

    // upper head shape
    vec3 head_upper_c = character_c + vec3(0.0, 0.3, 0.00);
    float head_upper_s = 0.4;
    vec3 head_upper_r = vec3(0.5, 0.3, 0.5) * head_upper_s;

    float d_head_upper = ellipsoid(pos - head_upper_c, head_upper_r);
    float d_head = smoothmin(d_head_lower, d_head_upper, 0.06);

    // eyes
    vec3 eye_pos = vec3(abs(pos.x), pos.yz);
    mat3 eye_rot = rotation(0.5, -0.02, -0.2);

    vec3 eye_c = character_c + head_upper_c + vec3(0.16, 0.005, 0.15);
    vec3 eye_r = vec3(0.03, 0.04, 0.03);
    float d_eye = ellipsoid(eye_rot * (eye_pos - eye_c), eye_r);

    return smoothmin(d_eye, d_head, 0.005);

}

float character( vec3 pos )
{
    // float t = fract(u_time);
    
    // animation params;
    vec3 character_c = vec3(0.0);

    return character_head(pos, character_c);
}

float scene( vec3 pos )
{
    // character   
    float d1 = character(pos);

    // floor
    float d2 = pos.y - (-0.25);

    return min(d1, d2);
}

vec3 calc_normal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(
        vec3( scene(pos + e.xyy ) - scene(pos - e.xyy), 
              scene(pos + e.yxy ) - scene(pos - e.yxy), 
              scene(pos + e.yyx ) - scene(pos - e.yyx) )
    );
}

float cast_ray (vec3 ro, vec3 rd)
{
    float t = 0.0;
    for ( int i = 0; i < 100; i++ )
    {
        vec3 pos = ro + t * rd;
        float h = scene( pos );

        if (h < 0.001) break; // hit the scene.

        t += h;

        if (t > 20.) break; // hit the far-clipping plane.
    }

    if (t > 20.) t = -1.0;

    return t;
}

void main () 
{
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
    float time = u_time * 0.1;

    vec3 ro = vec3(2.0 * sin(u_mouse_x), 0.25, 2.0 * cos(u_mouse_x));
    vec3 ta = vec3(0.0, 0.0, 0.0);

    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww, vec3(0.0, 1.0, 0.0)) );
    vec3 vv = normalize( cross(uu, ww) );

    vec3 rd = normalize( p.x * uu + p.y * vv + 1.5 * ww);

    vec3 col = vec3(0.5, 0.6, 0.75) - 0.4 * p.y;
    col = mix(col, vec3(0.7, 0.75, 0.8), exp(-10. * rd.y));

    float t = cast_ray(ro, rd);

    if (t > 0.0) {
        // col = vec3(1.0);
        vec3 pos = ro + t * rd;
        vec3 nor = calc_normal(pos);

        vec3 mate = vec3(0.2, 0.2, 0.2);

        // sun data
        vec3 sun_dir = normalize(vec3(0.4, 0.4, 0.4));
        vec3 sun_col = vec3(6.2, 5.0, 4.0);
        float sun_sha = step(cast_ray(pos+nor*0.001, sun_dir), 0.0);
        float sun_dif = clamp(dot(nor, sun_dir), 0.0, 1.0);


        // sky data
        vec3 sky_col = vec3(0.2, 0.2, 0.2);
        float sky_dif = clamp(0.5 + 0.5*dot(nor, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);

        // bounce light data (GI).
        float bounce_dif = clamp(0.5 + 0.5*dot(nor, vec3(0.0, -1.0, 0.0)), 0.0, 1.0);
        vec3 bounce_col = vec3(0.2, 0.25, 0.2);


        col = mate * sun_col * sun_dif * sun_sha;
        col += mate * sky_col * sky_dif;
        col += mate * bounce_col * bounce_dif;
    }

    // gamma
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}