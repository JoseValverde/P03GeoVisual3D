/**
 * Script principal para la visualización 3D con Four.js
 * Muestra cuatro pajaritas con rotaciones en Z de 0°, 90°, 180° y 270°
 * usando un pivot específico (X: -1.025, Y: 0.301, Z: 0)
 * Las pajaritas rotan automáticamente alrededor de su punto pivot
 * 
 * Elementos visuales:
 * - Cruceta ROJA: Indica el centro geométrico (0,0,0) de cada pajarita
 * - Cruceta AZUL: Indica el punto de pivot (-1.025, 0.301, 0) alrededor del cual rota la pajarita
 * - Línea VERDE: Conecta el centro con el pivot para visualizar la relación entre ambos puntos
 * - Pajarita VERDE: La pajarita en posición 0° es de color verde (#7D8A2E)
 * - Pajarita DORADA: Las pajaritas en posiciones 90°, 180° y 270° son de color dorado (#AA8A50)
 * 
 * Controles:
 * - Tecla R: Detiene/reinicia la rotación y vuelve a las posiciones iniciales
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
let originalRotations = []; // Almacenar rotaciones iniciales
let pivotX = 1.025; // Coordenada X del pivot
let pivotY = -0.7;  // Coordenada Y del pivot
let pivotZ = 0;      // Coordenada Z del pivot

// Inicializar la aplicación cuando el documento esté listo
window.addEventListener('load', init);
window.addEventListener('resize', onWindowResize);
window.addEventListener('keydown', handleKeyDown);

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
    renderer.shadowMap.type = THREE.VSMShadowMap; // Sombras muy suavizadas (Variance Shadow Map)
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Mejor representación de colores
    renderer.toneMapping = THREE.ReinhardToneMapping; // Mapeo tonal más suave
    renderer.toneMappingExposure = 1.5; // Mayor exposición para reducir contraste en sombras
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
    // Crear cuatro pajaritas con rotaciones consecutivas de 90° en el eje Z
    loadSVG('./pajarita001.svg', 0);
    loadSVG('./pajarita001.svg', Math.PI/2);  // 90 grados
    loadSVG('./pajarita001.svg', Math.PI);    // 180 grados
    loadSVG('./pajarita001.svg', 3*Math.PI/2); // 270 grados
    
    // Crear un plano como suelo
    const floor = Utils.createMesh('cube', { width: 1000, height: 0.1, depth: 1000 }, {
        type: 'MeshStandardMaterial',
        color: 0x95a5a6,
        roughness: 0.8
    });
    floor.position.y = -3.5;
    floor.receiveShadow = true;
    scene.add(floor);
}

/**
 * Carga un archivo SVG y lo convierte en una forma 3D
 * @param {string} url - Ruta al archivo SVG
 * @param {number} rotationZ - Rotación en radianes alrededor del eje Z
 * @description La pajarita de 0 grados (la primera) tiene color verde acento (#7D8A2E), 
 * las demás pajaritas tienen color dorado (#AA8A50)
 */
function loadSVG(url, rotationZ = 0) {
    const svgLoader = new SVGLoader();
    
    console.log(`Intentando cargar SVG desde: ${url} con rotación Z: ${rotationZ} radianes`);
    
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
                    depth: 80,          // Profundidad moderada
                    bevelEnabled: true,   // Activar bisel para bordes suaves
                    bevelThickness: 0.03, // Grosor del bisel
                    bevelSize: 0.5,      // Tamaño del bisel
                    bevelOffset: 0,       // Sin desplazamiento
                    bevelSegments: 30      // Más segmentos para un bisel más suave
                });
                
        // Crear un material para la malla con aspecto más metálico y sombras muy suaves
                // La pajarita de 0 grados tendrá el color verde acento, las demás dorado
                const materialColor = rotationZ === 0 ? 0x7D8A2E : 0xaa8a50; 
                
                // Mostrar en consola el color de la pajarita según su rotación
                if (rotationZ === 0) {
                    console.log("Aplicando color verde acento (#7D8A2E) a la pajarita de 0 grados");
                }
                
                const material = new THREE.MeshStandardMaterial({
                  color: materialColor,  // Color según la rotación
                  metalness: 0.5,        // Ligeramente menos metálico para sombras más suaves
                  roughness: 0.4,        // Mayor rugosidad para difuminar mejor las sombras
                  flatShading: false,    // Sombreado suave (no plano)
                  envMapIntensity: 1.2,  // Intensidad del mapa de entorno (reflejo)
                  shadowSide: THREE.FrontSide, // Mejora la calidad de las sombras proyectadas
                  dithering: true        // Añade dithering para suavizar las transiciones de sombra
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
        
        // En este punto, el centro (0,0,0) corresponde al centro geométrico de la pajarita
        console.log("Pajarita centrada en el origen. Centro local: (0,0,0)");
        
        // Crear un marcador (cruceta roja) para visualizar el centro de la pajarita
        const centerMarker = createCenterMarker();
        svgGroup.add(centerMarker);
        
        // Establecer el pivot de rotación especificado (X: -1.025, Y: 0.301, Z: 0)
        // Estas coordenadas son relativas al centro local (0,0,0) de cada figura
        // El centro local corresponde a la mitad del ancho y alto de la figura
        // Usamos las variables globales para el pivot (ya definidas al inicio)
        // const pivotX = -1.025; 
        // const pivotY = 0.301;
        // const pivotZ = 0;
        
        // Creamos un grupo adicional que servirá como punto de pivote
        const pivotGroup = new THREE.Group();
        scene.add(pivotGroup);
        
        // Movemos la geometría para que el punto de pivot quede en el origen
        svgGroup.position.set(pivotX, pivotY, pivotZ);
        
        // Añadimos el grupo SVG al grupo pivot (ahora el SVG rota alrededor del pivot)
        pivotGroup.add(svgGroup);
        
        // Crear una línea que conecte el centro con el pivot para visualizar la relación
        const connectionLine = createConnectionLine();
        svgGroup.add(connectionLine);
        
        // Aplicar la rotación en el eje Z según el parámetro
        pivotGroup.rotation.z = rotationZ;
        
        // Crear un marcador (cruceta) para mostrar la posición del pivot
        const pivotMarker = createPivotMarker();
        
        // Posicionar el marcador en el origen del grupo pivot (0,0,0)
        // ya que este punto representa ahora el eje de rotación
        pivotMarker.position.set(0, 0, 0);
        
        // Añadir el marcador al grupo pivot para que se mantenga en el punto de rotación
        pivotGroup.add(pivotMarker);
        
        console.log(`SVG agregado a la escena, posición: (${svgGroup.position.x.toFixed(3)}, ${svgGroup.position.y.toFixed(3)}, ${svgGroup.position.z.toFixed(3)}), rotación Z: ${rotationZ.toFixed(3)}`);
        console.log(`Pivot posicionado en: (${pivotX}, ${pivotY}, ${pivotZ}) respecto al centro de la pajarita`);
        
        // Creamos un objeto específico con rotación automática en Z
        const svgRotator = {
          object: pivotGroup,   // Importante: rotamos el grupo pivot, no el svgGroup
          rotateX: { active: false, speed: 0 },
          rotateY: { active: false, speed: 0 },
          rotateZ: { active: true, speed: 0.01 }, // Activamos la rotación en Z
          initialRotationZ: rotationZ // Guardamos la rotación inicial
        };
        
        // Guardar la rotación inicial para poder restaurarla
        originalRotations.push({
            object: pivotGroup,
            rotationZ: rotationZ
        });
        
        // Añadir a la lista de objetos
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
    
    // Animar objetos con rotación automática
    Utils.animate(objects, (obj) => {
        // Si es un objeto con configuración específica de rotación por eje
        if (obj.object && (obj.hasOwnProperty('rotateX') || obj.hasOwnProperty('rotateY') || obj.hasOwnProperty('rotateZ'))) {
            // Rotación en eje X
            if (typeof obj.rotateX === 'object' && obj.rotateX !== null) {
                if (obj.rotateX.active) {
                    obj.object.rotation.x += obj.rotateX.speed;
                }
            }
            
            // Rotación en eje Y
            if (typeof obj.rotateY === 'object' && obj.rotateY !== null) {
                if (obj.rotateY.active) {
                    obj.object.rotation.y += obj.rotateY.speed;
                }
            }
            
            // Rotación en eje Z
            if (typeof obj.rotateZ === 'object' && obj.rotateZ !== null) {
                if (obj.rotateZ.active) {
                    // Aplicar la rotación correctamente alrededor del pivot
                    obj.object.rotation.z += obj.rotateZ.speed;
                }
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
 * Maneja las pulsaciones de teclas
 * @param {KeyboardEvent} event - El evento de pulsación de tecla
 */
function handleKeyDown(event) {
    // Tecla 'r' o 'R' para detener la rotación y restablecer posiciones
    if (event.key === 'r' || event.key === 'R') {
        // Detener/reiniciar rotación para todos los objetos
        objects.forEach(obj => {
            // Alternar el estado de rotación
            if (obj.rotateZ && obj.rotateZ.active) {
                // Si está activo, detenerlo
                obj.rotateZ.active = false;
                
                // Restaurar la rotación inicial
                const originalRotation = originalRotations.find(rot => rot.object === obj.object);
                if (originalRotation) {
                    obj.object.rotation.z = originalRotation.rotationZ;
                }
            } else if (obj.rotateZ) {
                // Si está detenido, activarlo
                obj.rotateZ.active = true;
            }
        });
        
        console.log("Rotación " + (objects[0]?.rotateZ?.active ? "activada" : "desactivada") + " y posiciones restablecidas");
    }
}

/**
 * Crea un marcador en forma de cruceta para visualizar el pivot
 * @returns {THREE.Object3D} - Objeto 3D que representa el marcador
 * @description Este marcador visualiza el punto exacto del pivot local (X: -1.025, Y: 0.301, Z: 0)
 * alrededor del cual giran las pajaritas. El origen (0,0,0) del marcador
 * corresponde al pivot y es visible como una cruceta azul.
 */
function createPivotMarker() {
    // Crear un grupo para contener las líneas de la cruceta
    const markerGroup = new THREE.Group();
    
    // Tamaño de la cruceta
    const size = 0.25;
    
    // Material para las líneas de la cruceta (azul brillante)
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff,
        transparent: true,
        opacity: 0.8
    });
    
    // Crear líneas en las tres direcciones (X, Y, Z)
    // Eje X (línea horizontal)
    const geometryX = new THREE.BoxGeometry(size * 2, size / 10, size / 10);
    const lineX = new THREE.Mesh(geometryX, material);
    markerGroup.add(lineX);
    
    // Eje Y (línea vertical)
    const geometryY = new THREE.BoxGeometry(size / 10, size * 2, size / 10);
    const lineY = new THREE.Mesh(geometryY, material);
    markerGroup.add(lineY);
    
    // Eje Z (línea de profundidad)
    const geometryZ = new THREE.BoxGeometry(size / 10, size / 10, size * 2);
    const lineZ = new THREE.Mesh(geometryZ, material);
    markerGroup.add(lineZ);
    
    // Añadir una pequeña esfera en el centro de la cruceta
    const sphereGeometry = new THREE.SphereGeometry(size / 8, 16, 16);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    markerGroup.add(sphere);
    
    return markerGroup;
}

/**
 * Crea una línea que conecta el centro de la pajarita con el punto de pivot
 * @returns {THREE.Object3D} - Objeto 3D que representa la línea de conexión
 */
function createConnectionLine() {
    // Crear puntos para la línea
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0)); // Desde el centro (0,0,0)
    points.push(new THREE.Vector3(-pivotX, -pivotY, -pivotZ)); // Hasta el pivot (en coordenadas locales inversas)
    
    // Crear la geometría de la línea
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Material para la línea (verde claro)
    const material = new THREE.LineBasicMaterial({
        color: 0x44ff44,
        linewidth: 2,
        opacity: 0.7,
        transparent: true
    });
    
    // Crear la línea
    const line = new THREE.Line(geometry, material);
    
    // Añadir una etiqueta con la distancia
    const distance = Math.sqrt(pivotX * pivotX + pivotY * pivotY + pivotZ * pivotZ);
    console.log(`Distancia entre centro y pivot: ${distance.toFixed(3)} unidades`);
    
    return line;
}

/**
 * Crea un marcador en forma de cruceta para visualizar el centro de la pajarita
 * @returns {THREE.Object3D} - Objeto 3D que representa el marcador
 * @description Este marcador rojo visualiza el centro geométrico (0,0,0) de cada pajarita,
 * que corresponde al punto central después de centrar la geometría.
 */
function createCenterMarker() {
    // Crear un grupo para contener las líneas de la cruceta
    const markerGroup = new THREE.Group();
    
    // Tamaño de la cruceta (ligeramente más pequeño que el marcador del pivot)
    const size = 0.2;
    
    // Material para las líneas de la cruceta (rojo brillante)
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff2222,
        transparent: true,
        opacity: 0.8
    });
    
    // Crear líneas en las tres direcciones (X, Y, Z)
    // Eje X (línea horizontal)
    const geometryX = new THREE.BoxGeometry(size * 2, size / 10, size / 10);
    const lineX = new THREE.Mesh(geometryX, material);
    markerGroup.add(lineX);
    
    // Eje Y (línea vertical)
    const geometryY = new THREE.BoxGeometry(size / 10, size * 2, size / 10);
    const lineY = new THREE.Mesh(geometryY, material);
    markerGroup.add(lineY);
    
    // Eje Z (línea de profundidad)
    const geometryZ = new THREE.BoxGeometry(size / 10, size / 10, size * 2);
    const lineZ = new THREE.Mesh(geometryZ, material);
    markerGroup.add(lineZ);
    
    // Añadir una pequeña esfera en el centro de la cruceta
    const sphereGeometry = new THREE.SphereGeometry(size / 8, 16, 16);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    markerGroup.add(sphere);
    
    return markerGroup;
}
