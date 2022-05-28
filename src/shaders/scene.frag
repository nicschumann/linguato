precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_mouse_x;


uniform float u_smile;
uniform float u_width;
uniform float u_open;


float remap(float t, float a, float b, float c, float d)
{
    return ((t - a) / (b - a)) * (d - c) + c;
}

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

float smoothmax(float a, float b, float k)
{
    float h = max( k - abs(a-b), 0.0);
    return max(a, b) + h * h / (k * 4.0);
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

/**
 * Material Index
 * 0 = floor
 * 1 = head material
 * 2 = eye material
 * 3 = mouth material
 * 4 = tongue material
 */

vec2 character_head( vec3 pos, vec3 character_c )
{
    float material = -1.0;

    // lower head shape
    vec3 head_lower_c = character_c + vec3(0.0, 0.2, 0.0);
    float head_lower_s = 0.5;
    vec3 head_lower_r = vec3(0.5, 0.4, 0.5) * head_lower_s;

    float d_head_lower = ellipsoid(pos - head_lower_c, head_lower_r);

    // upper head shape
    vec3 head_upper_c = character_c + vec3(0.0, 0.3, 0.00);
    float head_upper_s = 0.4;
    vec3 head_upper_r = vec3(0.45, 0.3, 0.5) * head_upper_s;

    float d_head_upper = ellipsoid(pos - head_upper_c, head_upper_r);
    float d_head = smoothmin(d_head_lower, d_head_upper, 0.06);

    // eyes
    vec3 eye_pos = vec3(abs(pos.x), pos.yz); // mirrors everything across x = 0
    mat3 eye_rot = rotation(0.25, -0.3, -0.4); // control first param

    /**
     * good eye positions...
     *
     * more forward: vec3(0.12, 0.005, 0.18);
     * more side: vec3(0.16, 0.005, 0.15);
     */
    vec3 eye_c = character_c + head_upper_c + vec3(0.12, 0.005, 0.18);
    float eye_s = 0.8;
    vec3 eye_r = vec3(0.025, 0.04, 0.03) * eye_s;

    float d_eye = ellipsoid(eye_rot * (eye_pos - eye_c), eye_r);

    // cheeks

    // mouth

    // notes on parametrization.
    // as scale_x increases, smile_x needs to decrease.

    // mouth state parameters.
    // float state_open = 1.0; // [0, 1]
    // float state_back = 1.0; // width? [0, 1]
    // float state_smile = 1.0; // [-1, 1]
    float state_open = u_open; // [0, 1]
    float state_back = u_width; // width? [0, 1]
    float state_smile = u_smile; // [-1, 1]

    float sm_remap_start = -1.0;
    float sm_remap_end = 3.;

    float op_remap_start = remap(state_smile, -1.0, 1.0,    0.01, 0.02); // 0.01;
    float op_remap_end = remap(state_smile, -1.0, 1.0,    0.2, 0.2);

    // float bk_remap_start = 0.2;
    float bk_remap_start = remap(state_open, 0.0, 1.0,    0.05, 0.3);
    float bk_remap_end = remap(state_open, 0.0, 1.0,    0.35, 0.45) * remap(state_smile, -1.0, 1.0, 0.75, 0.8);


    float smile_x = remap(state_smile, -1.0, 1.0, -1.0, 1.5); // min -1.0, max: 1.5

    float m_s = 0.4;

    float m_z = 0.5;

    float m_y = -0.12;
    float s_y = 0.15;
    float s_x = 0.35;

    // min open;
    smile_x = remap(state_smile, -1.0, 1.0, sm_remap_start, sm_remap_end); // resting pos?
    s_y = remap(state_open, 0.0, 1.0, op_remap_start, op_remap_end); // min: 0.01, max: 0.3
    s_x = remap(state_back, 0.0, 1.0, bk_remap_start, bk_remap_end); // min: 0.5

    m_y = -0.1; // function of x, y, and s

    // /i/
    // m_y = -0.15;
    // s_y = 0.1;
    // s_x = 0.2;


    // m_y = -0.15;
    // s_y = 0.2;
    // s_x = 0.7;

    // // max open
    // m_y = -0.18;
    // s_y = 0.25;
    // s_x = 1.;

    vec3 mouth_c = 
        character_c + 
        head_lower_c + 
        vec3(0.0, m_y * m_s + (smile_x * pos.x * pos.x), 0.15);

    // mat3 mouth_rot = rotation(0.0, 0.0, 0.); // this controls how high the mouth is

    /**
     * good mouth poses...
     * wide open mouth: vec3(0.8, 0.2, 0.6) * 0.5s
     * closed mouth
     */

    vec3 mouth_r = vec3(s_x, s_y, m_z) * m_s;
    float d_mouth = ellipsoid((pos - mouth_c), mouth_r) / (min(s_y, s_x) * 25.);

    float d_mouth_interior = ellipsoid(pos - (head_lower_c + vec3(0.0, -0.02, 0.01)), vec3(0.2, 0.13, 0.22));

    float d1 = smoothmin(d_eye, d_head, 0.005);
    float d2 = smoothmax(smoothmax(d1, -d_mouth, 0.01), -d_mouth_interior, 0.02);

    if (d_eye < d_head) { material = 2.0; }
    else if (d2 > d2) { material = 3.0; }
    else { material = 1.0; }

    return vec2(d2, material);

}

vec2 character( vec3 pos )
{
    // float t = fract(u_time);
    
    // animation params;
    vec3 character_c = vec3(0.0);

    return character_head(pos, character_c);
}

vec2 scene( vec3 pos )
{
    float material = 0.0;

    // character   
    vec2 d1 = character(pos);

    // floor
    float d2 = pos.y - (-0.25);

    if (d1.x < d2) { material = d1.y; }

    return vec2(min(d1.x, d2), material);
}

vec3 calc_normal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(
        vec3( scene(pos + e.xyy ).x - scene(pos - e.xyy).x, 
              scene(pos + e.yxy ).x - scene(pos - e.yxy).x, 
              scene(pos + e.yyx ).x - scene(pos - e.yyx).x )
    );
}

vec2 cast_ray (vec3 ro, vec3 rd)
{
    float t = 0.0;
    float m = -1.0;

    for ( int i = 0; i < 100; i++ )
    {
        vec3 pos = ro + t * rd;
        vec2 h = scene( pos );

        if (h.x < 0.001) break; // hit the scene.

        t += h.x;
        m = h.y;

        if (t > 20.) break; // hit the far-clipping plane.
    }

    if (t > 20.) t = -1.0;

    return vec2(t, m);
}

void main () 
{
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
    float time = u_time * 0.1;
    float focal_length = 4.0;

    vec3 ro = vec3(2.0 * sin(u_mouse_x), 0.5, 2.0 * cos(u_mouse_x));
    vec3 ta = vec3(0.0, 0.15, 0.0);

    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww, vec3(0.0, 1.0, 0.0)) );
    vec3 vv = normalize( cross(uu, ww) );

    vec3 rd = normalize( p.x * uu + p.y * vv + focal_length * ww);

    vec3 col = vec3(0.5, 0.6, 0.75) - 0.4 * p.y;
    col = mix(col, vec3(0.7, 0.75, 0.8), exp(-10. * rd.y));

    vec2 hit = cast_ray(ro, rd);
    float t = hit.x;

    if (t > 0.0) {
        // col = vec3(1.0);
        vec3 pos = ro + t * rd;
        vec3 nor = calc_normal(pos);


        vec3 mate = vec3(0.2, 0.2, 0.2);
        if (hit.y == 2.0) { mate = vec3(0.02, 0.02, 0.03); }
        if (hit.y == 3.0) { mate = vec3( 0.3, 0.1, 0.1); }

        // sun data
        vec3 sun_dir = normalize(vec3(0.4, 0.4, 0.4));
        vec3 sun_col = vec3(6.2, 5.0, 4.0);
        float sun_sha = step(cast_ray(pos+nor*0.001, sun_dir).x, 0.0);
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