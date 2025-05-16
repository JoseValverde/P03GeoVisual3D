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
let centerTextInfo; // Elemento HTML para mostrar coordenadas

// Coordenadas originales del centro al cargar el SVG
const originalCenter = {
    x: 0,
    y: 0,
    z: 0
};

// Parámetros para controlar desde la GUI
const params = {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    showHelpers: true,
    showAxes: true,
    showCenterMarker: true,
    rotationActive: true, // Controlar la rotación
    resetCenter: function() {
        centerController.resetCenter();
    },
    resetRotation: function() {
        // Función para reiniciar los valores de rotación
        objects.forEach(obj => {
            if (obj.object && obj.object.rotation) {
                obj.object.rotation.set(0, 0, 0);
                console.log("Rotación reiniciada a (0, 0, 0)");
            }
        });
    }
};

// Inicializar la aplicación cuando el documento esté listo
window.addEventListener('load', init);
window.addEventListener('resize', onWindowResize);
window.addEventListener('keydown', handleKeyDown); // Añadir manejo de teclado

/**
 * Manejar eventos de teclado
 * @param {KeyboardEvent} event - El evento de teclado
 */
function handleKeyDown(event) {
    // Tecla 'R' para activar/desactivar rotación
    if (event.key === 'r' || event.key === 'R') {
        window.toggleRotation();
        // Actualizar el botón físico si existe
        const button = document.getElementById('rotationToggle');
        if (button) {
            button.textContent = params.rotationActive ? 'Pausar Rotación' : 'Activar Rotación';
            button.style.backgroundColor = params.rotationActive ? '#4CAF50' : '#f44336';
        }
    }
}

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
    
    // Crear el elemento HTML para mostrar coordenadas
    centerTextInfo = document.createElement('div');
    centerTextInfo.id = 'centerInfo';
    centerTextInfo.style.position = 'absolute';
    centerTextInfo.style.bottom = '10px';
    centerTextInfo.style.left = '10px';
    centerTextInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
    centerTextInfo.style.color = 'white';
    centerTextInfo.style.padding = '10px';
    centerTextInfo.style.fontFamily = 'monospace';
    centerTextInfo.style.fontSize = '14px';
    centerTextInfo.style.borderRadius = '5px';
    centerTextInfo.style.zIndex = '1000';
    centerTextInfo.style.lineHeight = '1.5';
    centerTextInfo.style.width = 'auto';
    centerTextInfo.style.minWidth = '300px';
    centerTextInfo.innerHTML = `
        <strong>Centro actual:</strong> X: 0.000, Y: 0.000, Z: 0.000<br>
        <strong>Posición del pivot:</strong> X: 0.000, Y: 0.000, Z: 0.000
    `;
    document.getElementById('container').appendChild(centerTextInfo);
    
    // Crear botón físico para controlar la rotación
    const rotationButton = document.createElement('button');
    rotationButton.id = 'rotationToggle';
    rotationButton.textContent = 'Pausar Rotación';
    rotationButton.style.position = 'absolute';
    rotationButton.style.top = '10px';
    rotationButton.style.right = '10px';
    rotationButton.style.padding = '8px 16px';
    rotationButton.style.backgroundColor = '#4CAF50';
    rotationButton.style.color = 'white';
    rotationButton.style.border = 'none';
    rotationButton.style.borderRadius = '4px';
    rotationButton.style.cursor = 'pointer';
    rotationButton.style.fontFamily = 'sans-serif';
    rotationButton.style.fontSize = '14px';
    rotationButton.style.zIndex = '1000';
    rotationButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    
    // Añadir efecto hover
    rotationButton.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#45a049';
    });
    rotationButton.addEventListener('mouseout', function() {
        this.style.backgroundColor = params.rotationActive ? '#4CAF50' : '#f44336';
    });
    
    // Añadir evento click para activar/desactivar la rotación
    rotationButton.addEventListener('click', function() {
        window.toggleRotation();
        this.textContent = params.rotationActive ? 'Pausar Rotación' : 'Activar Rotación';
        this.style.backgroundColor = params.rotationActive ? '#4CAF50' : '#f44336';
    });
    
    document.getElementById('container').appendChild(rotationButton);
    
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
        
        console.log("Centro geométrico original del SVG:", center);
        
        // Movemos la geometría para que el centro quede en el origen 
        // (esto hace que la rotación sea alrededor del centro del objeto)
        svgGroup.children.forEach(mesh => {
            mesh.position.x -= center.x;
            mesh.position.y -= center.y;
            mesh.position.z -= center.z;
        });
        
        // Después de centrar la geometría, el centro geométrico ahora está en (0,0,0)
        // Por lo tanto, establecemos originalCenter a (0,0,0)
        originalCenter.x = 0;
        originalCenter.y = 0;
        originalCenter.z = 0;
        
        // Posicionar el grupo en la escena - centrado en el origen para mejor control
        svgGroup.position.set(0, 0, 0);
        
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
        // Añadir el marcador a la escena directamente
        scene.add(centerMarker);
        // Posicionar el marcador en el origen del grupo SVG inicialmente
        centerMarker.position.copy(svgGroup.position);
        
        // Actualizar la información del centro
        updateCenterInfoText();
        
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
            // Solo aplicar rotación si está activa globalmente
            if (params.rotationActive) {
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
 * Ajusta el pivot de rotación de la pajarita estableciendo valores absolutos
 * @param {Object} svgGroup - El grupo que contiene la pajarita
 * @param {number} x - Posición X del pivot
 * @param {number} y - Posición Y del pivot
 * @param {number} z - Posición Z del pivot
 */
function setCenterPosition(svgGroup, x = 0, y = 0, z = 0) {
    if (!svgGroup) {
        console.error("No se ha encontrado el grupo SVG");
        return;
    }
    
    // Calculamos la diferencia entre la posición anterior y la nueva
    const deltaX = x - params.centerX;
    const deltaY = y - params.centerY;
    const deltaZ = z - params.centerZ;
    
    // 1. Establecer el punto de pivote para todos los objetos dentro del grupo
    // Guardamos la posición mundial original
    const worldPosition = new THREE.Vector3();
    svgGroup.getWorldPosition(worldPosition);
    
    // Movemos cada elemento dentro del grupo para cambiar su centro de rotación
    svgGroup.children.forEach(child => {
        if (child !== svgAxesHelper) {
            child.position.x += deltaX;
            child.position.y += deltaY;
            child.position.z += deltaZ;
        }
    });
    
    // 2. Compensamos el movimiento del grupo para mantener la posición visual
    svgGroup.position.x -= deltaX;
    svgGroup.position.y -= deltaY;
    svgGroup.position.z -= deltaZ;
    
    // 3. Actualizar la posición del marcador del centro para que coincida con el nuevo centro de rotación
    if (centerMarker) {
        centerMarker.position.set(
            svgGroup.position.x + x,
            svgGroup.position.y + y,
            svgGroup.position.z + z
        );
    }
    
    // Guardar los valores en los parámetros
    params.centerX = x;
    params.centerY = y;
    params.centerZ = z;
    
    // Actualizar la GUI y el texto informativo
    updateGUI();
    
    console.log(`Nuevo centro de rotación: (${x}, ${y}, ${z})`);
    console.log(`Posición del grupo SVG: (${svgGroup.position.x}, ${svgGroup.position.y}, ${svgGroup.position.z})`);
    
    console.log(`Centro ajustado a posición: X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`);
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
    
    // Establecer el centro en una posición absoluta
    setCenter: function(x, y, z) {
        if (!this.svgGroup) return;
        console.log("setCenter recibiendo valores:", { x, y, z });
        setCenterPosition(this.svgGroup, x, y, z);
    },
    
    // Establecer solo la posición X del centro
    setCenterX: function(x) {
        if (!this.svgGroup) return;
        setCenterPosition(this.svgGroup, x, params.centerY, params.centerZ);
    },
    
    // Establecer solo la posición Y del centro
    setCenterY: function(y) {
        if (!this.svgGroup) return;
        setCenterPosition(this.svgGroup, params.centerX, y, params.centerZ);
    },
    
    // Establecer solo la posición Z del centro
    setCenterZ: function(z) {
        if (!this.svgGroup) return;
        setCenterPosition(this.svgGroup, params.centerX, params.centerY, z);
    },
    
    // Reiniciar el centro a la posición original (0,0,0)
    resetCenter: function() {
        if (!this.svgGroup) return;
        
        console.log("Reiniciando centro a la posición (0,0,0)");
        
        // Guardar las posiciones actuales de los objetos y del grupo
        const currentGroupPosition = this.svgGroup.position.clone();
        
        // Calcular el centro geométrico actual de la figura
        const bbox = new THREE.Box3().setFromObject(this.svgGroup);
        const geometricCenter = bbox.getCenter(new THREE.Vector3());
        console.log("Centro geométrico actual:", geometricCenter);
        
        // Restablecer el centro a la posición (0,0,0)
        this.setCenter(0, 0, 0);
        
        // Forzar la actualización del marcador de centro
        if (centerMarker) {
            centerMarker.position.copy(this.svgGroup.position);
        }
        
        // No es necesario llamar explícitamente a updateCenterInfoText() aquí
        // ya que setCenter ya llama a updateGUI() que a su vez llama a updateCenterInfoText()
        
        console.log("Centro reiniciado con éxito. Nueva posición del grupo SVG:", this.svgGroup.position);
    }
};

/**
 * Configura el panel de control GUI
 */
function setupGUI() {
    gui = new GUI({ width: 300 });
    
    // Carpeta para controlar el centro de la figura
    const centerFolder = gui.addFolder('Modificación de pivot de rotación');
    
    // Panel para mostrar la posición dentro de la figura
    const deltaFolder = gui.addFolder('Posición dentro de la figura');
    
    // Crear campos de solo lectura para mostrar las diferencias
    const deltaX = deltaFolder.add({deltaX: '0.000'}, 'deltaX').name('ΔX:').listen();
    deltaX.__input.readOnly = true;
    
    const deltaY = deltaFolder.add({deltaY: '0.000'}, 'deltaY').name('ΔY:').listen();
    deltaY.__input.readOnly = true;
    
    const deltaZ = deltaFolder.add({deltaZ: '0.000'}, 'deltaZ').name('ΔZ:').listen();
    deltaZ.__input.readOnly = true;
    
    // Función para actualizar los valores mostrados
    const updateInfoDisplays = function() {
        if (!centerController.svgGroup) return;
        
        // Calcular el centro geométrico actual de la figura
        const bbox = new THREE.Box3().setFromObject(centerController.svgGroup);
        const geometricCenter = bbox.getCenter(new THREE.Vector3());
        
        // Calcular la posición del pivot relativa al centro geométrico de la figura
        // Tenemos que considerar la posición del grupo y los parámetros del centro
        const worldPivot = new THREE.Vector3(
            centerController.svgGroup.position.x + params.centerX,
            centerController.svgGroup.position.y + params.centerY,
            centerController.svgGroup.position.z + params.centerZ
        );
        
        // Calcular la posición relativa del pivot respecto al centro geométrico
        const posRelX = worldPivot.x - geometricCenter.x;
        const posRelY = worldPivot.y - geometricCenter.y;
        const posRelZ = worldPivot.z - geometricCenter.z;
        
        deltaX.object.deltaX = posRelX.toFixed(3);
        deltaY.object.deltaY = posRelY.toFixed(3);
        deltaZ.object.deltaZ = posRelZ.toFixed(3);
        
        console.log("updateInfoDisplays - Valores actualizados:", {
            centerX: params.centerX,
            centerY: params.centerY,
            centerZ: params.centerZ,
            posRelX: posRelX,
            posRelY: posRelY,
            posRelZ: posRelZ,
            geometricCenter: geometricCenter
        });
        
        // Forzar la actualización de la GUI
        deltaX.updateDisplay();
        deltaY.updateDisplay();
        deltaZ.updateDisplay();
    };
    
    // Configurar observadores para los cambios en el centro
    const originalUpdateGUI = updateGUI;
    updateGUI = function() {
        originalUpdateGUI();
        updateInfoDisplays();
    };
    
    // Abrir la carpeta por defecto
    deltaFolder.open();
    
    // Controles para mover el centro en cada eje
    const controllerX = centerFolder.add(params, 'centerX', -0.3, 0.3, 0.01).name('Pivot X');
    controllerX.onChange(value => {
        centerController.setCenterX(value);
    });
    
    const controllerY = centerFolder
      .add(params, "centerY", -0.3, 0.3, 0.01)
      .name("Pivot Y");
    controllerY.onChange(value => {
        centerController.setCenterY(value);
    });
    
    const controllerZ = centerFolder
      .add(params, "centerZ", -0.3, 0.3, 0.01)
      .name("Pivot Z");
    controllerZ.onChange(value => {
        centerController.setCenterZ(value);
    });
    
    centerFolder.add(params, 'resetCenter').name('Reiniciar Pivot');
    
    // Abrir la carpeta por defecto
    centerFolder.open();
    
    // Carpeta para controlar la visualización de los helpers
    const helpersFolder = gui.addFolder('Visualización');
    
    helpersFolder.add(params, 'showAxes').name('Mostrar Ejes').onChange(value => {
        if (axesHelper) axesHelper.visible = value;
    });
    
    helpersFolder.add(params, 'showCenterMarker').name('Mostrar Centro').onChange(value => {
        if (centerMarker) {
            centerMarker.visible = value;
        }
    });
    
    // Botón para activar/desactivar la rotación
    helpersFolder.add(params, 'rotationActive').name('Rotación Activa').onChange(value => {
        updateRotationStatus();
    });
    
    // Botón para reiniciar la rotación
    helpersFolder.add(params, 'resetRotation').name('Reiniciar Rotación');
    
    // Abrir la carpeta por defecto
    helpersFolder.open();
}

/**
 * Actualiza los valores en la GUI
 */
function updateGUI() {
    console.log("updateGUI llamado con valores:", {
        centerX: params.centerX,
        centerY: params.centerY,
        centerZ: params.centerZ
    });
    
    // Actualizar los controles de la GUI con los valores actuales
    if (gui) {
        for (let folder in gui.__folders) {
            const controllers = gui.__folders[folder].__controllers;
            for (const controller of controllers) {
                controller.updateDisplay();
            }
        }
    }
    
    // Actualizar el texto informativo con las coordenadas actuales
    updateCenterInfoText();
}

/**
 * Actualiza el texto informativo con las coordenadas actuales del centro
 */
function updateCenterInfoText() {
    if (centerTextInfo && centerController.svgGroup) {
        // Calcular el centro geométrico actual de la figura
        const bbox = new THREE.Box3().setFromObject(centerController.svgGroup);
        const geometricCenter = bbox.getCenter(new THREE.Vector3());
        
        // Calcular la posición del pivot relativa al centro geométrico de la figura
        // Tenemos que considerar la posición del grupo y los parámetros del centro
        const worldPivot = new THREE.Vector3(
            centerController.svgGroup.position.x + params.centerX,
            centerController.svgGroup.position.y + params.centerY,
            centerController.svgGroup.position.z + params.centerZ
        );
        
        // Calcular la posición relativa del pivot respecto al centro geométrico
        const posRelX = worldPivot.x - geometricCenter.x;
        const posRelY = worldPivot.y - geometricCenter.y;
        const posRelZ = worldPivot.z - geometricCenter.z;
        
        // Mostrar tanto las coordenadas absolutas como la posición relativa al centro geométrico
        centerTextInfo.innerHTML = `
            <strong>Centro actual:</strong> X: ${params.centerX.toFixed(3)}, Y: ${params.centerY.toFixed(3)}, Z: ${params.centerZ.toFixed(3)}<br>
            <strong>Posición del pivot:</strong> X: ${posRelX.toFixed(3)}, Y: ${posRelY.toFixed(3)}, Z: ${posRelZ.toFixed(3)}
        `;
        
        console.log("updateCenterInfoText - Valores actualizados:", {
            centerX: params.centerX,
            centerY: params.centerY,
            centerZ: params.centerZ,
            posRelX: posRelX,
            posRelY: posRelY,
            posRelZ: posRelZ,
            geometricCenter: geometricCenter
        });
    }
}

// Exponer funciones para poder usarlas desde la consola
window.toggleHelpers = toggleHelpers;
window.centerController = centerController;

// Función para alternar la rotación
window.toggleRotation = function() {
    params.rotationActive = !params.rotationActive;
    console.log(`Rotación ${params.rotationActive ? 'activada' : 'desactivada'}`);
    // Actualizar la GUI para reflejar el cambio
    if (gui) {
        const helpersFolder = gui.__folders['Visualización'];
        if (helpersFolder) {
            // Buscar el controlador de rotación y actualizar su visualización
            const controllers = helpersFolder.__controllers;
            for (const controller of controllers) {
                if (controller.property === 'rotationActive') {
                    controller.updateDisplay();
                    break;
                }
            }
        }
    }
    return params.rotationActive;
};

// Función para reiniciar la rotación de todos los objetos
function resetRotation() {
    objects.forEach(obj => {
        if (obj.object && obj.object.rotation) {
            obj.object.rotation.set(0, 0, 0);
            console.log("Rotación reiniciada a (0, 0, 0)");
        }
    });
    // También reiniciar la rotación del grupo SVG si existe
    if (centerController.svgGroup) {
        centerController.svgGroup.rotation.set(0, 0, 0);
        console.log("Rotación del grupo SVG reiniciada a (0, 0, 0)");
    }
}

// Actualizar el estado de la rotación en la GUI y reiniciar si es necesario
function updateRotationStatus() {
    // Si la rotación está desactivada, reiniciar la rotación
    if (!params.rotationActive) {
        resetRotation();
    }
    
    // Actualizar la visualización del botón de rotación
    const button = document.getElementById('rotationToggle');
    if (button) {
        button.textContent = params.rotationActive ? 'Pausar Rotación' : 'Activar Rotación';
        button.style.backgroundColor = params.rotationActive ? '#4CAF50' : '#f44336';
    }
}
