/**
 * Utilidades para la visualización 3D simplificada
 */

import * as THREE from './lib/three.module.js';

const Utils = {
    /**
     * Configura las luces básicas para la escena
     * @param {THREE.Scene} scene - La escena a la que añadir las luces
     */
    setupBasicLights: function(scene) {
        // Luz ambiente para iluminación general (aumentada para sombras más suaves)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        // Luz principal direccional (simula el sol)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        
        // Configurar las sombras para mayor difuminado y suavidad
        directionalLight.shadow.mapSize.width = 4096; // Mayor resolución
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.0001; // Ajuste para evitar artefactos
        directionalLight.shadow.normalBias = 0.08; // Mayor suavizado de los bordes
        directionalLight.shadow.radius = 20; // Mayor desenfoque/difuminado de las sombras
        directionalLight.shadow.blurSamples = 4; // Más muestras para el desenfoque
        
        scene.add(directionalLight);
        
        // Luz de relleno más intensa para suavizar las sombras
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, -5);
        scene.add(fillLight);
        
        // Añadir una luz hemisférica suave para iluminar toda la escena de manera más uniforme
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xfff0e0, 0.3);
        scene.add(hemiLight);
        
        return {
            ambient: ambientLight,
            main: directionalLight,
            fill: fillLight,
            hemi: hemiLight
        };
    },
    
    /**
     * Crea una malla 3D con la geometría y material especificados
     * @param {string} geometryType - Tipo de geometría ('cube', 'sphere', etc)
     * @param {Object} geometryParams - Parámetros para la geometría
     * @param {Object} materialOptions - Opciones para el material
     * @returns {THREE.Mesh} - La malla creada
     */
    createMesh: function(geometryType, geometryParams = {}, materialOptions = {}) {
        let geometry;
        
        // Crear la geometría según el tipo
        switch(geometryType.toLowerCase()) {
            case 'cube':
            case 'box':
                const { width = 1, height = 1, depth = 1 } = geometryParams;
                geometry = new THREE.BoxGeometry(width, height, depth);
                break;
                
            case 'sphere':
                const { radius = 1, widthSegments = 32, heightSegments = 32 } = geometryParams;
                geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
                break;
                
            case 'cylinder':
                const { 
                    radiusTop = 1, 
                    radiusBottom = 1, 
                    cylinderHeight = 1, 
                    radialSegments = 32 
                } = geometryParams;
                geometry = new THREE.CylinderGeometry(
                    radiusTop, radiusBottom, cylinderHeight, radialSegments
                );
                break;
                
            default:
                console.warn(`Tipo de geometría desconocido: ${geometryType}. Usando cubo por defecto.`);
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Crear el material según las opciones
        let material;
        const { type = 'MeshStandardMaterial', color = 0xffffff } = materialOptions;
        
        switch(type) {
            case 'MeshBasicMaterial':
                material = new THREE.MeshBasicMaterial({ color, ...materialOptions });
                break;
                
            case 'MeshLambertMaterial':
                material = new THREE.MeshLambertMaterial({ color, ...materialOptions });
                break;
                
            case 'MeshPhongMaterial':
                material = new THREE.MeshPhongMaterial({ color, ...materialOptions });
                break;
                
            case 'MeshToonMaterial':
                material = new THREE.MeshToonMaterial({ color, ...materialOptions });
                break;
                
            case 'MeshStandardMaterial':
            default:
                material = new THREE.MeshStandardMaterial({ color, ...materialOptions });
        }
        
        // Crear y devolver la malla
        return new THREE.Mesh(geometry, material);
    },
    
    /**
     * Anima objetos en la escena
     * @param {Array} objects - Array de objetos a animar
     * @param {Function} customAnimate - Función de animación personalizada
     */
    animate: function(objects, customAnimate) {
        if (Array.isArray(objects)) {
            objects.forEach(obj => {
                if (customAnimate && typeof customAnimate === 'function') {
                    customAnimate(obj);
                }
            });
        }
    }
};

export default Utils;
