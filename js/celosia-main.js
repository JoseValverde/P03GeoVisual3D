/**
 * Script principal para la visualización 3D con Three.js
 * Muestra una celosía de pajaritas que se expande desde el centro,
 * con un anillo interior de 6 pajaritas y elementos en forma de celosía radial
 * usando un pivot específico (X: 0.502, Y: -0.3451, Z: 0)
 * 
 * Elementos visuales:
 * - Cruceta ROJA: Indica el centro geométrico (0,0,0) de cada pajarita
 * - Cruceta AZUL: Indica el punto de pivot alrededor del cual rota la pajarita
 * - Línea VERDE: Conecta el centro con el pivot para visualizar la relación entre ambos puntos
 * - Anillo interior:
 *   - Pajaritas VERDES: Las pajaritas en posiciones pares (0°, 120°, 240°) son de color verde
 *   - Pajaritas DORADAS: Las pajaritas en posiciones impares (60°, 180°, 300°) son de color dorado
 * - Celosía radial:
 *   - Pajaritas con colores alternados que se extienden desde el centro
 *   - Todas las pajaritas mantienen una escala constante
 * 
 * Controles:
 * - Tecla R: Activa/detiene la rotación y vuelve a las posiciones iniciales
 * - Tecla A: Oculta/muestra las marcas (crucetas) que indican los centros y puntos de pivot
 * - Teclas 1/2: Disminuir/Aumentar número de repeticiones en la celosía
 * - Teclas 3/4: Disminuir/Aumentar distancia entre repeticiones
 * - Teclas 5/6: Disminuir/Aumentar escala uniforme de todas las pajaritas
 * - Teclas 7/8: Disminuir/Aumentar valor de altura Z en la celosía
 * - Teclas 9/0: Disminuir/Aumentar offset angular para distribución en espiral
 * - Teclas -/+: Disminuir/Aumentar desplazamiento radial adicional
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
let pivotX = 0.502; // Coordenada X del pivot
let pivotY = -0.3451; // Coordenada Y del pivot
let pivotZ = 0;      // Coordenada Z del pivot
let markersVisible = false; // Estado de visibilidad de las marcas (inicialmente ocultas)
let centerMarkers = []; // Array para almacenar los marcadores de centro
let pivotMarkers = []; // Array para almacenar los marcadores de pivot
let connectionLines = []; // Array para almacenar las líneas de conexión

// Variables para la celosía
let numRepeticiones = 4;           // Número de repeticiones en la celosía (ajustable con teclas 1/2)
let distanciaRepeticiones = 0.965;   // Distancia entre repeticiones (ajustable con teclas 3/4)
let escalaUniforme = 1.0;          // Escala uniforme para todas las pajaritas (ajustable con teclas 5/6)
let alturaZ = 0;                   // Altura en el eje Z (ajustable con teclas 7/8)
let offsetAngular = 0;             // Desplazamiento angular para las pajaritas (ajustable con teclas 9/0)
let desplazamientoRadial = 0;      // Desplazamiento radial adicional (ajustable con teclas -/+)

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
    // 1. Crear anillo interior de seis pajaritas uniformemente distribuidas en un círculo (60° entre cada una)
    crearAnilloInterior();
    
    // 2. Crear la celosía radial de pajaritas
    crearCelosiaRadial();
    
    // 3. Crear un plano como suelo
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
 * Crea el anillo interior de pajaritas
 */
function crearAnilloInterior() {
    const numPajaritas = 6;
    const angleStep = (2 * Math.PI) / numPajaritas; // 60° en radianes
    
    for (let i = 0; i < numPajaritas; i++) {
        const angle = i * angleStep; // 0, 60°, 120°, 180°, 240°, 300°
        loadSVG('./pajarita001.svg', angle, numPajaritas, 0, 0, 0, 1.0, 'interior', i);
    }
}

/**
 * Crea la celosía radial de pajaritas
 * Esta función crea pajaritas que se extienden desde el anillo interior hacia afuera
 * manteniendo el mismo patrón del primer anillo
 */
function crearCelosiaRadial() {
    // Número de direcciones radiales (mismo que el anillo interior)
    const numDirecciones = 6;
    const angleStep = (2 * Math.PI) / numDirecciones; // 60° en radianes
    
    // Para cada dirección radial
    for (let dir = 0; dir < numDirecciones; dir++) {
        const angulo = dir * angleStep; // Ángulo de la dirección (igual al del anillo interior)
        
        // Para cada repetición en esta dirección (empezando desde 1 para no solapar con el anillo interior)
        for (let rep = 1; rep <= numRepeticiones; rep++) {
            // Calculamos la distancia desde el centro
            // Empezamos desde distanciaRepeticiones para dejar un espacio con el anillo interior
            // Añadimos el desplazamiento radial que puede ser positivo o negativo
            const distancia = (distanciaRepeticiones * rep) + (desplazamientoRadial * rep);
            
            // Aplicamos una escala uniforme para todas las pajaritas
            const escala = escalaUniforme;
            
            // Calculamos el ángulo con el offset angular
            const anguloAjustado = angulo + (offsetAngular * rep);
            
            // Calcular posición en coordenadas polares (centro + vector radial)
            const x = distancia * Math.cos(anguloAjustado);
            const y = distancia * Math.sin(anguloAjustado);
            
            // Z puede incrementarse con cada repetición para crear un efecto de elevación
            const z = alturaZ * rep;
            
            // La rotación debe ser coherente con el anillo interior
            // Si en el anillo interior la pajarita en este ángulo tiene rotación angulo,
            // entonces las pajaritas radiales deben seguir el mismo patrón
            
            // Mantenemos la misma rotación que la del anillo interior para esta dirección
            // si rep es impar, y rotamos 180 grados si rep es par para crear un patrón más interesante
            const rotacion = rep % 2 === 0 ? angulo + Math.PI : angulo;
            
            // El índice es importante para determinar el color de manera coherente
            // Usamos dir como base para mantener la coherencia con el anillo interior
            const indice = dir + (rep * numDirecciones);
            
            // Cargar la pajarita en esta posición
            loadSVG('./pajarita001.svg', rotacion, numDirecciones, x, y, z, escala, 'celosia', indice);
        }
    }
}

/**
 * Función para regenerar la celosía cuando se cambien los parámetros
 */
function regenerarCelosia() {
    // Eliminar todas las pajaritas de la celosía actual
    const pajaritasCelosia = objects.filter(obj => obj.tipo === 'celosia');
    
    // Eliminar las pajaritas de la celosía de la escena y de los arrays
    pajaritasCelosia.forEach(obj => {
        scene.remove(obj.object);
        
        // Eliminar las referencias a los marcadores y líneas
        const index = objects.indexOf(obj);
        if (index !== -1) {
            // Eliminar marcadores del centro correspondientes
            if (centerMarkers[index]) {
                centerMarkers.splice(index, 1);
            }
            
            // Eliminar marcadores del pivot correspondientes
            if (pivotMarkers[index]) {
                pivotMarkers.splice(index, 1);
            }
            
            // Eliminar líneas de conexión correspondientes
            if (connectionLines[index]) {
                connectionLines.splice(index, 1);
            }
            
            // Eliminar el objeto de la lista
            objects.splice(index, 1);
        }
    });
    
    // Recrear la celosía con los nuevos parámetros
    crearCelosiaRadial();
    
    console.log(`Celosía regenerada: ${numRepeticiones} repeticiones, distancia ${distanciaRepeticiones.toFixed(2)}, escala ${escalaUniforme.toFixed(2)}, offset angular ${offsetAngular.toFixed(3)}, desplazamiento radial ${desplazamientoRadial.toFixed(2)}`);
}

/**
 * Carga un archivo SVG y lo convierte en una forma 3D
 * @param {string} url - Ruta al archivo SVG
 * @param {number} rotationZ - Rotación en radianes alrededor del eje Z
 * @param {number} numPajaritas - Número total de pajaritas (para cálculos de posición)
 * @param {number} posX - Posición X en la escena
 * @param {number} posY - Posición Y en la escena
 * @param {number} posZ - Posición Z en la escena
 * @param {number} escala - Factor de escala para la pajarita
 * @param {string} tipo - Tipo de pajarita ('interior' o 'celosia')
 * @param {number} indice - Índice de la pajarita para cálculos de color
 */
function loadSVG(url, rotationZ = 0, numPajaritas = 6, posX = 0, posY = 0, posZ = 0, escala = 1.0, tipo = 'interior', indice = 0) {
    const svgLoader = new SVGLoader();
    
    console.log(`Cargando SVG para ${tipo} #${indice} en posición (${posX.toFixed(2)}, ${posY.toFixed(2)}, ${posZ.toFixed(2)}), rotación: ${rotationZ.toFixed(2)}, escala: ${escala.toFixed(2)}`);
    
    svgLoader.load(url, function(data) {
        const svgGroup = new THREE.Group();
        const paths = data.paths;
        
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
        // Multiplicamos por el factor de escala proporcionado
        const scale = (1 / Math.max(width, height)) * escala;
        
        paths.forEach((path) => {
            const shapes = SVGLoader.createShapes(path);
            
            shapes.forEach((shape) => {
                // Crear la geometría extruida (con profundidad y bisel para mayor realismo)
                const geometry = new THREE.ExtrudeGeometry(shape, {
                  depth: 60 * escala, // Profundidad proporcional a la escala
                  bevelEnabled: true,
                  steps: 4,
                  bevelThickness: 10 * escala,
                  bevelSize: 4 * escala,
                  bevelOffset: 1 * escala,
                  bevelSegments: 3,
                });
                
                // Determinar el color según el tipo y el índice
                let materialColor;
                
                if (tipo === 'interior') {
                    // Para el anillo interior: alternamos verde y dorado
                    materialColor = indice % 2 === 0 ? 0x7D8A2E : 0xAA8A50;
                } else {
                    // Para la celosía: patrón alternado pero con un offset para cada dirección
                    const colorIndex = Math.floor(indice / numPajaritas) + (indice % numPajaritas);
                    materialColor = colorIndex % 2 === 0 ? 0x8A9D35 : 0xC09A60; // Colores ligeramente diferentes
                }
                
                const material = new THREE.MeshStandardMaterial({
                  color: materialColor,
                  metalness: 0.5,
                  roughness: 0.4,
                  flatShading: false,
                  envMapIntensity: 1.2,
                  shadowSide: THREE.FrontSide,
                  dithering: true
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
        
        // Centrar la geometría
        svgGroup.children.forEach(mesh => {
            mesh.position.x -= center.x;
            mesh.position.y -= center.y;
            mesh.position.z -= center.z;
        });
        
        // Crear un marcador para el centro
        const centerMarker = createCenterMarker();
        centerMarker.visible = markersVisible;
        svgGroup.add(centerMarker);
        centerMarkers.push(centerMarker);
        
        // Creamos un grupo adicional que servirá como punto de pivote
        const pivotGroup = new THREE.Group();
        scene.add(pivotGroup);
        
        // Movemos la geometría para que el punto de pivot quede en el origen
        svgGroup.position.set(pivotX, pivotY, pivotZ);
        
        // Añadimos el grupo SVG al grupo pivot
        pivotGroup.add(svgGroup);
        
        // Posicionamos el grupo pivot en la posición indicada
        pivotGroup.position.set(posX, posY, posZ);
        
        // Crear una línea que conecte el centro con el pivot
        const connectionLine = createConnectionLine();
        connectionLine.visible = markersVisible;
        svgGroup.add(connectionLine);
        connectionLines.push(connectionLine);
        
        // Aplicar la rotación
        pivotGroup.rotation.z = rotationZ;
        
        // Crear un marcador para el pivot
        const pivotMarker = createPivotMarker();
        pivotMarker.position.set(0, 0, 0);
        pivotMarker.visible = markersVisible;
        pivotGroup.add(pivotMarker);
        pivotMarkers.push(pivotMarker);
        
        // Crear objeto para animación
        const svgRotator = {
          object: pivotGroup,
          rotateX: { active: false, speed: 0 },
          rotateY: { active: false, speed: 0 },
          rotateZ: { active: false, speed: 0.01 },
          initialRotationZ: rotationZ,
          tipo: tipo,  // Guardar el tipo para filtrar después
          indice: indice // Guardar el índice para identificación
        };
        
        // Guardar la rotación inicial
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
    console.log(`Tecla presionada: ${event.key}, Código: ${event.code}`); // Para depuración
    
    // Tecla 'r' o 'R' para activar/detener la rotación y restablecer posiciones
    if (event.key === 'r' || event.key === 'R') {
        // Alternar rotación para todos los objetos
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
    
    // Tecla 'a' o 'A' para ocultar/mostrar las marcas
    if (event.key === 'a' || event.key === 'A') {
        // Cambiar el estado de visibilidad
        markersVisible = !markersVisible;
        
        // Aplicar visibilidad a los marcadores de centro
        centerMarkers.forEach(marker => {
            marker.visible = markersVisible;
        });
        
        // Aplicar visibilidad a los marcadores de pivot
        pivotMarkers.forEach(marker => {
            marker.visible = markersVisible;
        });
        
        // Aplicar visibilidad a las líneas de conexión
        connectionLines.forEach(line => {
            line.visible = markersVisible;
        });
        
        console.log("Marcadores " + (markersVisible ? "visibles" : "ocultos"));
    }
    
    // Control del número de repeticiones en la celosía
    const incremento = 0.05;
    
    // Modificar el número de repeticiones
    if (event.key === '1' || event.code === 'Digit1' || event.code === 'Numpad1') {
        // Disminuir número (mínimo 1)
        numRepeticiones = Math.max(1, numRepeticiones - 1);
        console.log(`Número de repeticiones: ${numRepeticiones}`);
        regenerarCelosia();
    } else if (event.key === '2' || event.code === 'Digit2' || event.code === 'Numpad2') {
        // Aumentar número
        numRepeticiones += 1;
        console.log(`Número de repeticiones: ${numRepeticiones}`);
        regenerarCelosia();
    }
    
    // Modificar la distancia entre repeticiones
    if (event.key === '3' || event.code === 'Digit3' || event.code === 'Numpad3') {
        // Disminuir distancia (mínimo 0.2)
        distanciaRepeticiones = Math.max(0.2, distanciaRepeticiones - incremento);
        console.log(`Distancia entre repeticiones: ${distanciaRepeticiones.toFixed(2)}`);
        regenerarCelosia();
    } else if (event.key === '4' || event.code === 'Digit4' || event.code === 'Numpad4') {
        // Aumentar distancia
        distanciaRepeticiones += incremento;
        console.log(`Distancia entre repeticiones: ${distanciaRepeticiones.toFixed(2)}`);
        regenerarCelosia();
    }
    
    // Modificar el factor de escala
    if (event.key === '5' || event.code === 'Digit5' || event.code === 'Numpad5') {
        // Disminuir escala (mínimo 0.1)
        escalaUniforme = Math.max(0.1, escalaUniforme - incremento);
        console.log(`Escala uniforme: ${escalaUniforme.toFixed(2)}`);
        regenerarCelosia();
    } else if (event.key === '6' || event.code === 'Digit6' || event.code === 'Numpad6') {
        // Aumentar escala (máximo 3.0)
        escalaUniforme = Math.min(3.0, escalaUniforme + incremento);
        console.log(`Escala uniforme: ${escalaUniforme.toFixed(2)}`);
        regenerarCelosia();
    }
    
    // Modificar la altura Z
    if (event.key === '7' || event.code === 'Digit7' || event.code === 'Numpad7') {
        // Disminuir altura Z
        alturaZ = Math.max(0, alturaZ - incremento);
        console.log(`Altura Z: ${alturaZ.toFixed(2)}`);
        regenerarCelosia();
    } else if (event.key === '8' || event.code === 'Digit8' || event.code === 'Numpad8') {
        // Aumentar altura Z
        alturaZ += incremento;
        console.log(`Altura Z: ${alturaZ.toFixed(2)}`);
        regenerarCelosia();
    }
    
    // Modificar el offset angular
    if (event.key === '9' || event.code === 'Digit9' || event.code === 'Numpad9') {
        // Disminuir offset angular
        offsetAngular -= incremento * 0.1; // Más pequeño para un control fino
        console.log(`Offset angular: ${offsetAngular.toFixed(3)}`);
        regenerarCelosia();
    } else if (event.key === '0' || event.code === 'Digit0' || event.code === 'Numpad0') {
        // Aumentar offset angular
        offsetAngular += incremento * 0.1;
        console.log(`Offset angular: ${offsetAngular.toFixed(3)}`);
        regenerarCelosia();
    }
    
    // Modificar el desplazamiento radial
    if (event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract') {
        // Disminuir desplazamiento radial
        desplazamientoRadial -= incremento;
        console.log(`Desplazamiento radial: ${desplazamientoRadial.toFixed(2)}`);
        regenerarCelosia();
    } else if (event.key === '=' || event.key === '+' || event.code === 'Equal' || event.code === 'NumpadAdd') {
        // Aumentar desplazamiento radial
        desplazamientoRadial += incremento;
        console.log(`Desplazamiento radial: ${desplazamientoRadial.toFixed(2)}`);
        regenerarCelosia();
    }
}

/**
 * Crea un marcador en forma de cruceta para visualizar el pivot
 * @returns {THREE.Object3D} - Objeto 3D que representa el marcador
 */
function createPivotMarker() {
    // Crear un grupo para contener las líneas de la cruceta
    const markerGroup = new THREE.Group();
    
    // Tamaño de la cruceta
    const size = 0.05;
    
    // Material para las líneas de la cruceta (azul brillante)
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff,
        transparent: true,
        opacity: 0.2
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
    
    return line;
}

/**
 * Crea un marcador en forma de cruceta para visualizar el centro de la pajarita
 * @returns {THREE.Object3D} - Objeto 3D que representa el marcador
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
