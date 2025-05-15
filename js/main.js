/**
 * Script principal para la visualización 3D con Three.js
 */

// Importar los módulos de Three.js
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './lib/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader } from './lib/examples/jsm/loaders/SVGLoader.js';
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
    camera.position.set(0, 1, 8); // Posición ajustada para mejor visualización
    
    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suavizadas
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Mejor representación de colores
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
    cube.castShadow = true;  // Habilitar que el cubo proyecte sombras
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
    sphere.castShadow = true;  // Habilitar que la esfera proyecte sombras
    scene.add(sphere);
    objects.push(sphere);
    
    // Cargar y crear el objeto SVG (pajarita)
    loadSVG('./pajarita001.svg'); // Corregir la ruta al archivo SVG
    
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
 * Carga un archivo SVG y lo convierte en una forma 3D
 * @param {string} url - Ruta al archivo SVG
 */
function loadSVG(url) {
    const svgLoader = new SVGLoader();
    
    console.log("Intentando cargar SVG desde:", url);
    
    svgLoader.load(url, function(data) {
        console.log("SVG cargado correctamente:", data);
        const svgGroup = new THREE.Group();
        const paths = data.paths;
        console.log("Número de paths encontrados:", paths.length);
        
        // Calcular las dimensiones del SVG para escalarlo correctamente
        let maxX = -Infinity;
        let minX = Infinity;
        let maxY = -Infinity;
        let minY = Infinity;
        
        paths.forEach(path => {
            const points = path.subPaths[0]?.getPoints() || [];
            points.forEach(point => {
                maxX = Math.max(maxX, point.x);
                minX = Math.min(minX, point.x);
                maxY = Math.max(maxY, point.y);
                minY = Math.min(minY, point.y);
            });
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (maxX + minX) / 2;
        const centerY = (maxY + minY) / 2;
        
        // Escalar para que el objeto tenga un tamaño razonable en la escena
        const scale = 2.0 / Math.max(width, height);
        
        paths.forEach((path) => {
            const fillColor = path.color; // Color del relleno en el SVG
            
            // Crear una forma a partir del path
            const shapes = SVGLoader.createShapes(path);
            console.log("Shapes creados para el path:", shapes.length);
            
            // Para cada forma, crear una geometría y una malla
            shapes.forEach((shape) => {
                // Crear la geometría extruida (con profundidad y bisel para mayor realismo)
                const geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: 100,          // Profundidad moderada (reducida de 3 a 0.5)
                    bevelEnabled: true,   // Activar bisel para bordes suaves
                    bevelThickness: 0.03, // Grosor del bisel
                    bevelSize: 0.02,      // Tamaño del bisel
                    bevelOffset: 0,       // Sin desplazamiento
                    bevelSegments: 10      // Más segmentos para un bisel más suave
                });
                
                // Crear un material para la malla con aspecto más metálico
                const material = new THREE.MeshStandardMaterial({
                  color: 0xaa8a50,       // Color dorado apagado
                  metalness: 0.6,        // Más metálico
                  roughness: 0.3,        // Menos rugosidad para más brillo
                  flatShading: false     // Sombreado suave
                });
                
                // Crear la malla
                const mesh = new THREE.Mesh(geometry, material);
                
                // Centrar y escalar el objeto
                mesh.position.x = -centerX * scale;
                mesh.position.y = -centerY * scale;
                mesh.scale.set(scale, -scale, scale);  // Invertir Y porque SVG usa Y hacia abajo
                
                // Configurar sombras
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Añadir a nuestro grupo
                svgGroup.add(mesh);
            });
        });
        
        // Calculamos el centro geométrico del grupo
        const bbox = new THREE.Box3().setFromObject(svgGroup);
        const center = bbox.getCenter(new THREE.Vector3());
        
        // Movemos la geometría para que el centro quede en el origen 
        // (esto hace que la rotación sea alrededor del centro del objeto)
        svgGroup.children.forEach(mesh => {
            mesh.position.x -= center.x;
            mesh.position.y -= center.y;
            mesh.position.z -= center.z;
        });
        
        // Posicionar el grupo en la escena - más alto y un poco adelante para asegurar visibilidad
        svgGroup.position.set(0, 0, -1);
        
        // Añadir el grupo a la escena
        scene.add(svgGroup);
        
        // Imprimir información sobre la geometría para depuración
        console.log("SVG agregado a la escena, posición:", svgGroup.position);
        
        // Creamos un objeto específico para la rotación del SVG
        const svgRotator = {
            object: svgGroup,
            rotateOnlyZ: true // Indicador para rotar solo en eje Y
        };
        
        // Añadir a la lista de objetos animados para rotarlo
        objects.push(svgRotator);
    });
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
        if (obj.rotateOnlyX) {
          // Este objeto solo rota en el eje X
          obj.object.rotation.x += 0.01;
        } else if (obj.rotateOnlyY) {
            // Este objeto solo rota en el eje Y (SVG)
            obj.object.rotation.y += 0.01;
        } else if (obj.rotateOnlyZ) {
            // Este objeto solo rota en el eje z (SVG)
            obj.object.rotation.z += -0.01;
          } else {
          // Objetos normales rotan en ambos ejes
          obj.rotation.x += 0.01;
          obj.rotation.y += 0.01;
        }
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
