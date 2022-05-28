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
        u_mouse_x: regl.prop('u_mouse_x'),

        u_width: regl.prop('u_width'),
        u_open: regl.prop('u_open'),
        u_smile: regl.prop('u_smile'),
    },
    primitive: 'triangle strip',
    count: 4
})

const u_mouse_x_key = 'linguato__u_mouse_x'
let mouse_active = false;
let u_mouse_x = Number(localStorage.getItem(u_mouse_x_key)) || 0.0;

const smile_target = document.getElementById('metadata-parameter--mouth-smile--value');
const openness_target = document.getElementById('metadata-parameter--mouth-openness--value');
const width_target = document.getElementById('metadata-parameter--mouth-width--value');

let u_mouse_width = 0.0;
let u_mouse_open = 0.0;
let u_mouse_smile = 0.0;

smile_target.innerText = u_mouse_smile.toFixed(2);
width_target.innerText = u_mouse_width.toFixed(2);
openness_target.innerText = u_mouse_open.toFixed(2);


container.addEventListener('mousewheel', e => {
    e.preventDefault();
    u_mouse_smile = Math.min(Math.max(u_mouse_smile + (e.deltaY / window.innerHeight), -1.0), 1.0);
    smile_target.innerText = u_mouse_smile.toFixed(2);
})

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
    } else {
        u_mouse_width = Math.min( Math.max(e.clientX / window.innerWidth, 0.0), 1.0);
        u_mouse_open = Math.min( Math.max(e.clientY / window.innerHeight, 0.0), 1.0);

        width_target.innerText = u_mouse_width.toFixed(2);
        openness_target.innerText = u_mouse_open.toFixed(2);
    }
});

window.addEventListener('mouseup', e => {
    mouse_active = false;
})

regl.frame(e => {
    let u_resolution = [2 * window.innerWidth, 2 * window.innerHeight];

    // console.log(`open: ${u_mouse_open}`)
    // console.log(`width: ${u_mouse_width}`);

    linguato({
        u_time: e.time,
        u_resolution,
        u_mouse_x,

        u_width: u_mouse_width,
        u_open: u_mouse_open,
        u_smile: u_mouse_smile
    })
})