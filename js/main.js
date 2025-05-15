/**
 * Script principal para la visualización 3D con Three.js
 */

// Importar los módulos de Three.js
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './lib/examples/jsm/loaders/GLTFLoader.js';
import Utils from './utils.js';

// Variables globales
let scene, camera, renderer;
let controls;
let objects = [];

// Inicializar la aplicación cuando el documento esté listo
window.addEventListener('load', init);
window.addEventListener('resize', onWindowResize);

/**
 * Inicializar Three.js y configurar la escena
 */
function init() {
    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Crear cámara
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.z = 5;
    
    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Añadir controles de órbita
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Configurar luces
    Utils.setupBasicLights(scene);
    
    // Añadir objetos a la escena
    createObjects();
    
    // Iniciar el bucle de renderizado
    animate();
}

/**
 * Crear objetos para la escena
 */
function createObjects() {
    // Ejemplo: Crear un cubo
    const cube = Utils.createMesh('cube', { width: 1, height: 1, depth: 1 }, {
        type: 'MeshStandardMaterial',
        color: 0x3498db
    });
    cube.position.x = -1.5;
    scene.add(cube);
    objects.push(cube);
    
    // Ejemplo: Crear una esfera
    const sphere = Utils.createMesh('sphere', { radius: 0.7 }, {
        type: 'MeshStandardMaterial',
        color: 0xe74c3c,
        metalness: 0.7,
        roughness: 0.2
    });
    sphere.position.x = 1.5;
    scene.add(sphere);
    objects.push(sphere);
    
    // Crear un plano como suelo
    const floor = Utils.createMesh('cube', { width: 10, height: 0.1, depth: 10 }, {
        type: 'MeshStandardMaterial',
        color: 0x95a5a6,
        roughness: 0.8
    });
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    scene.add(floor);
}

/**
 * Función de animación (bucle de renderizado)
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Actualizar controles
    controls.update();
    
    // Animar objetos
    Utils.animate(objects, (obj) => {
        obj.rotation.x += 0.01;
        obj.rotation.y += 0.01;
    });
    
    // Renderizar la escena
    renderer.render(scene, camera);
}

/**
 * Manejar el redimensionamiento de la ventana
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
