import './style/main.css';

let container = document.getElementById('canvas-container');
let regl = require('regl')({container, extensions: []});

let linguato = regl({
    vert: require('./shaders/pass-through.vert'),
    frag: require('./shaders/scene.frag'),
    attributes: {
        a_position: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        a_uv: [[0, 0], [1, 0], [0, 1], [1, 1]]
    },
    uniforms: {
        u_time: regl.prop('u_time'),
        u_resolution : regl.prop('u_resolution'),
        u_mouse_x: regl.prop('u_mouse_x')
    },
    primitive: 'triangle strip',
    count: 4
})

const u_mouse_x_key = 'linguato__u_mouse_x'
let mouse_active = false;
let u_mouse_x = Number(localStorage.getItem(u_mouse_x_key)) || 0.0;

window.addEventListener('mousedown', e => {
    mouse_active = true;
})

window.addEventListener('mousemove', e => {
    if (mouse_active) {
        let du = (e.movementX / window.innerWidth)
        u_mouse_x -= Math.PI * du;
        // store this in local storage, so that
        // when we hotload, we still have the same viewing angle
        // we had on our last mouse update.
        localStorage.setItem(u_mouse_x_key, u_mouse_x.toString());
    }
});

window.addEventListener('mouseup', e => {
    mouse_active = false;
})

regl.frame(e => {
    let u_resolution = [2 * window.innerWidth, 2 * window.innerHeight];
    console.log(u_mouse_x)

    linguato({
        u_time: e.time,
        u_resolution,
        u_mouse_x
    })
})