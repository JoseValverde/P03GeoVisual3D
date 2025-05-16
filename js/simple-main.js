/**
 * Script principal para la visualización 3D con Four.js
 * Muestra cuatro pajaritas con rotaciones en X de 0°, 90°, 180° y 270°
 * usando un pivot específico (X: -1.032, Y: 0.316, Z: -0.472)
 */

// Importar los módulos de Three.js
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from './lib/examples/jsm/loaders/SVGLoader.js';
import Utils from './simple-utils.js';

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
    scene.background = new THREE.Color(0xbfbdb7);
    
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
    // Crear cuatro pajaritas con rotaciones consecutivas de 90° en el eje X
    loadSVG('./pajarita001.svg', 0);
    loadSVG('./pajarita001.svg', Math.PI/2);  // 90 grados
    loadSVG('./pajarita001.svg', Math.PI);    // 180 grados
    loadSVG('./pajarita001.svg', 3*Math.PI/2); // 270 grados
    
    // Crear un plano como suelo
    const floor = Utils.createMesh('cube', { width: 100, height: 0.1, depth: 100 }, {
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
 * @param {number} rotationX - Rotación en radianes alrededor del eje X
 */
function loadSVG(url, rotationX = 0) {
    const svgLoader = new SVGLoader();
    
    console.log(`Intentando cargar SVG desde: ${url} con rotación X: ${rotationX} radianes`);
    
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
        const centerY = ((maxY + minY) / 2); // Ajustar el centro para que esté más arriba
        
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
                    depth: 60,          // Profundidad moderada
                    bevelEnabled: true,   // Activar bisel para bordes suaves
                    bevelThickness: 0.03, // Grosor del bisel
                    bevelSize: 0.5,      // Tamaño del bisel
                    bevelOffset: 0,       // Sin desplazamiento
                    bevelSegments: 30      // Más segmentos para un bisel más suave
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
        
        console.log("Centro geométrico original del SVG:", center);
        
        // Movemos la geometría para que el centro quede en el origen 
        // (esto hace que la rotación sea alrededor del centro del objeto)
        svgGroup.children.forEach(mesh => {
            mesh.position.x -= center.x;
            mesh.position.y -= center.y;
            mesh.position.z -= center.z;
        });
        
        // Establecer el pivot de rotación especificado (X: -1.032, Y: 0.316, Z: -0.472)
        const pivotX = -1.032;
        const pivotY = 0.316;
        const pivotZ = -0.472;
        
        // Aplicar el pivot de rotación moviendo los hijos
        svgGroup.children.forEach(child => {
            // Mover los hijos en dirección opuesta al pivot
            child.position.x += pivotX;
            child.position.y += pivotY;
            child.position.z += pivotZ;
        });
        
        // Compensar la posición del grupo
        svgGroup.position.set(-pivotX, -pivotY, -pivotZ);
        
        // Aplicar la rotación en el eje X según el parámetro
        svgGroup.rotation.x = rotationX;
        
        // Añadir el grupo a la escena
        scene.add(svgGroup);
        
        console.log(`SVG agregado a la escena, posición: (${svgGroup.position.x.toFixed(3)}, ${svgGroup.position.y.toFixed(3)}, ${svgGroup.position.z.toFixed(3)}), rotación X: ${rotationX.toFixed(3)}`);
        
        // Creamos un objeto específico sin rotación automática
        const svgRotator = {
          object: svgGroup,
          rotateX: { active: false, speed: 0 },
          rotateY: { active: false, speed: 0 },
          rotateZ: { active: false, speed: 0 },
        };
        
        // Añadir a la lista de objetos (sin rotación automática)
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
    
    // Animar objetos (en este caso no hay animación de rotación)
    Utils.animate(objects, (obj) => {
        // No aplicamos rotación automática para esta visualización estática
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
