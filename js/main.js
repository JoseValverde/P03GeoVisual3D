/**
 * Script principal para la visualización 3D con Three.js
 */

// Importar los módulos de Three.js
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './lib/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader } from './lib/examples/jsm/loaders/SVGLoader.js';
import { GUI } from './lib/dat.gui.module.js';
import Utils from './utils.js';

// Variables globales
let scene, camera, renderer;
let controls;
let objects = [];
let axesHelper, centerMarker, svgAxesHelper; // Helpers para visualización
let gui; // Panel de control

// Parámetros para controlar desde la GUI
const params = {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    showHelpers: true,
    showAxes: true,
    showCenterMarker: true,
    resetCenter: function() {
        centerController.resetCenter();
        this.centerX = 0;
        this.centerY = 0;
        this.centerZ = 0;
        updateGUI();
    }
};

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
    
    // Configurar panel de control GUI
    setupGUI();
}

/**
 * Crear objetos para la escena
 */
function createObjects() {
    // Cargar y crear el objeto SVG (pajarita)
    loadSVG('./pajarita001.svg');
    
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
                    depth: 20,          // Profundidad moderada (reducida de 3 a 0.5)
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
        
        // Añadir helpers para visualizar los ejes y el centro
        
        // Crear y añadir ejes (rojo: X, verde: Y, azul: Z)
        axesHelper = new THREE.AxesHelper(2); // Tamaño de 2 unidades
        scene.add(axesHelper);
        
        // Crear un pequeño objeto para marcar el centro de la pajarita
        centerMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 16), // Pequeña esfera
            new THREE.MeshBasicMaterial({color: 0xff00ff}) // Color magenta
        );
        centerMarker.position.copy(svgGroup.position); // Posición igual a la del SVG
        scene.add(centerMarker);
        
        // Añadir ejes locales para la pajarita
        svgAxesHelper = new THREE.AxesHelper(1); // Tamaño de 1 unidad
        svgGroup.add(svgAxesHelper); // Añadimos al grupo para que siga sus transformaciones
        
        // Creamos un objeto específico para la rotación del SVG
        const svgRotator = {
          object: svgGroup,
          rotateX: { active: false, speed: 0.01 }, // Rotación en eje X: desactivada, velocidad 0.01
          rotateY: { active: false, speed: 0.01 }, // Rotación en eje Y: desactivada, velocidad 0.01
          rotateZ: { active: true, speed: -0.1 }, // Rotación en eje Z: activada, velocidad 0.01
        };
        
        // Añadir a la lista de objetos animados para rotarlo
        objects.push(svgRotator);
        
        // Asignar el grupo SVG al controlador de centro
        centerController.setGroup(svgGroup);
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
        // Si es un objeto con configuración específica de rotación por eje (nuevo formato con velocidad)
        if (obj.object && (obj.hasOwnProperty('rotateX') || obj.hasOwnProperty('rotateY') || obj.hasOwnProperty('rotateZ'))) {
            // Comprobar si las propiedades son objetos (nuevo formato) o booleanos (formato anterior)
            
            // Rotación en eje X
            if (typeof obj.rotateX === 'object' && obj.rotateX !== null) {
                // Nuevo formato: { active: bool, speed: number }
                if (obj.rotateX.active) {
                    obj.object.rotation.x += obj.rotateX.speed;
                }
            } else if (obj.rotateX === true) {
                // Formato anterior: booleano
                obj.object.rotation.x += 0.01;
            }
            
            // Rotación en eje Y
            if (typeof obj.rotateY === 'object' && obj.rotateY !== null) {
                if (obj.rotateY.active) {
                    obj.object.rotation.y += obj.rotateY.speed;
                }
            } else if (obj.rotateY === true) {
                obj.object.rotation.y += 0.01;
            }
            
            // Rotación en eje Z
            if (typeof obj.rotateZ === 'object' && obj.rotateZ !== null) {
                if (obj.rotateZ.active) {
                    obj.object.rotation.z += obj.rotateZ.speed;
                }
            } else if (obj.rotateZ === true) {
                obj.object.rotation.z += -0.01;
            }
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

/**
 * Controla la visibilidad de los helpers de visualización
 * @param {boolean} showAxes - Mostrar/ocultar ejes globales
 * @param {boolean} showCenter - Mostrar/ocultar marcador de centro
 * @param {boolean} showSvgAxes - Mostrar/ocultar ejes locales de la pajarita
 */
function toggleHelpers(showAxes = true, showCenter = true, showSvgAxes = true) {
    if (axesHelper) axesHelper.visible = showAxes;
    if (centerMarker) centerMarker.visible = showCenter;
    if (svgAxesHelper) svgAxesHelper.visible = showSvgAxes;
    console.log(`Visualización de helpers - Ejes: ${showAxes}, Centro: ${showCenter}, Ejes SVG: ${showSvgAxes}`);
}

/**
 * Ajusta el centro de la pajarita
 * @param {Object} svgGroup - El grupo que contiene la pajarita
 * @param {number} offsetX - Desplazamiento en el eje X
 * @param {number} offsetY - Desplazamiento en el eje Y
 * @param {number} offsetZ - Desplazamiento en el eje Z
 */
function adjustSvgCenter(svgGroup, offsetX = 0, offsetY = 0, offsetZ = 0) {
    if (!svgGroup) {
        console.error("No se ha encontrado el grupo SVG");
        return;
    }
    
    // Aplicar el desplazamiento a todos los hijos
    svgGroup.children.forEach(mesh => {
        if (mesh !== svgAxesHelper) { // No ajustar el helper de ejes
            mesh.position.x += offsetX;
            mesh.position.y += offsetY;
            mesh.position.z += offsetZ;
        }
    });
    
    // Actualizar la posición del marcador del centro para reflejar el nuevo centro
    if (centerMarker) {
        centerMarker.position.set(
            svgGroup.position.x, 
            svgGroup.position.y, 
            svgGroup.position.z
        );
    }
    
    console.log(`Centro ajustado - X: ${offsetX}, Y: ${offsetY}, Z: ${offsetZ}`);
}

// Controlador para manejar el centro de la pajarita
const centerController = {
    // Referencia al grupo SVG (se establecerá cuando se cargue)
    svgGroup: null,
    
    // Establecer la referencia al grupo SVG
    setGroup: function(group) {
        this.svgGroup = group;
        console.log("Controlador de centro configurado correctamente");
    },
    
    // Mover el centro en el eje X
    moveX: function(amount) {
        if (!this.svgGroup) return;
        adjustSvgCenter(this.svgGroup, amount, 0, 0);
    },
    
    // Mover el centro en el eje Y
    moveY: function(amount) {
        if (!this.svgGroup) return;
        adjustSvgCenter(this.svgGroup, 0, amount, 0);
    },
    
    // Mover el centro en el eje Z
    moveZ: function(amount) {
        if (!this.svgGroup) return;
        adjustSvgCenter(this.svgGroup, 0, 0, amount);
    },
    
    // Mover el centro en los tres ejes
    move: function(x, y, z) {
        if (!this.svgGroup) return;
        adjustSvgCenter(this.svgGroup, x, y, z);
    },
    
    // Reiniciar el centro (calcular automáticamente)
    resetCenter: function() {
        if (!this.svgGroup) return;
        
        // Calcular el centro geométrico
        const bbox = new THREE.Box3().setFromObject(this.svgGroup);
        const center = bbox.getCenter(new THREE.Vector3());
        
        // Reiniciar las posiciones de los hijos
        this.svgGroup.children.forEach(mesh => {
            if (mesh !== svgAxesHelper) {
                mesh.position.x -= center.x;
                mesh.position.y -= center.y;
                mesh.position.z -= center.z;
            }
        });
        
        console.log("Centro reiniciado");
    }
};

/**
 * Configura el panel de control GUI
 */
function setupGUI() {
    gui = new GUI({ width: 300 });
    
    // Carpeta para controlar el centro de la figura
    const centerFolder = gui.addFolder('Centro de la figura');
    
    // Controles para mover el centro en cada eje
    centerFolder.add(params, 'centerX', -2, 2, 0.01).name('Posición X').onChange(value => {
        const delta = value - params.centerX;
        centerController.moveX(delta);
    });
    
    centerFolder.add(params, 'centerY', -2, 2, 0.01).name('Posición Y').onChange(value => {
        const delta = value - params.centerY;
        centerController.moveY(delta);
    });
    
    centerFolder.add(params, 'centerZ', -2, 2, 0.01).name('Posición Z').onChange(value => {
        const delta = value - params.centerZ;
        centerController.moveZ(delta);
    });
    
    centerFolder.add(params, 'resetCenter').name('Reiniciar Centro');
    
    // Abrir la carpeta por defecto
    centerFolder.open();
    
    // Carpeta para controlar la visualización de los helpers
    const helpersFolder = gui.addFolder('Visualización');
    
    helpersFolder.add(params, 'showAxes').name('Mostrar Ejes').onChange(value => {
        if (axesHelper) axesHelper.visible = value;
    });
    
    helpersFolder.add(params, 'showCenterMarker').name('Mostrar Centro').onChange(value => {
        if (centerMarker) centerMarker.visible = value;
    });
    
    helpersFolder.open();
}

/**
 * Actualiza los valores en la GUI
 */
function updateGUI() {
    // Actualizar los controles de la GUI con los valores actuales
    for (const controller of gui.__controllers) {
        controller.updateDisplay();
    }
}

// Exponer funciones para poder usarlas desde la consola
window.toggleHelpers = toggleHelpers;
window.centerController = centerController;
