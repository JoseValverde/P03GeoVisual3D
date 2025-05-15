/**
 * Funciones útiles para trabajar con Three.js
 */

import * as THREE from './lib/three.module.js';

const Utils = {
    /**
     * Crear una malla básica (cubo, esfera, etc.)
     * @param {string} type - Tipo de geometría ('cube', 'sphere', 'cylinder', etc.)
     * @param {Object} params - Parámetros de la geometría
     * @param {Object} materialOptions - Opciones del material
     * @returns {THREE.Mesh} - Malla creada
     */
    createMesh: function(type, params = {}, materialOptions = {}) {
        let geometry;
        
        // Crear la geometría según el tipo
        switch(type) {
            case 'cube':
                const { width = 1, height = 1, depth = 1 } = params;
                geometry = new THREE.BoxGeometry(width, height, depth);
                break;
            case 'sphere':
                const { radius = 1, widthSegments = 32, heightSegments = 32 } = params;
                geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
                break;
            case 'cylinder':
                const { radiusTop = 1, radiusBottom = 1, cylinderHeight = 1, radialSegments = 32 } = params;
                geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, cylinderHeight, radialSegments);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Crear el material
        const material = this.createMaterial(materialOptions);
        
        // Crear y devolver la malla
        return new THREE.Mesh(geometry, material);
    },
    
    /**
     * Crear un material Three.js
     * @param {Object} options - Opciones del material
     * @returns {THREE.Material} - Material creado
     */
    createMaterial: function(options = {}) {
        const {
            type = 'MeshStandardMaterial',
            color = 0x3498db,
            wireframe = false,
            transparent = false,
            opacity = 1,
            map = null,
            envMap = null,
            metalness = 0.5,
            roughness = 0.5
        } = options;
        
        let material;
        
        switch(type) {
            case 'MeshBasicMaterial':
                material = new THREE.MeshBasicMaterial({
                    color,
                    wireframe,
                    transparent,
                    opacity,
                    map
                });
                break;
            case 'MeshLambertMaterial':
                material = new THREE.MeshLambertMaterial({
                    color,
                    wireframe,
                    transparent,
                    opacity,
                    map
                });
                break;
            case 'MeshPhongMaterial':
                material = new THREE.MeshPhongMaterial({
                    color,
                    wireframe,
                    transparent,
                    opacity,
                    map,
                    envMap
                });
                break;
            case 'MeshStandardMaterial':
            default:
                material = new THREE.MeshStandardMaterial({
                    color,
                    wireframe,
                    transparent,
                    opacity,
                    map,
                    envMap,
                    metalness,
                    roughness
                });
        }
        
        return material;
    },
    
    /**
     * Configuración rápida de luces en la escena
     * @param {THREE.Scene} scene - La escena donde añadir las luces
     */
    setupBasicLights: function(scene) {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0xf2efe9,1.5);
        scene.add(ambientLight);
        
        // Luz direccional
        const directionalLight = new THREE.DirectionalLight(0x7d8a2e, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Configurar sombras para la luz direccional
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        
        // Mejorar la calidad de las sombras
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.0005;
        
        return {
            ambient: ambientLight,
            directional: directionalLight
        };
    },
    
    /**
     * Función de animación para actualizar los objetos
     * @param {Array} objects - Array de objetos a animar
     * @param {Function} callback - Función de callback para cada objeto
     */
    animate: function(objects, callback) {
        if (Array.isArray(objects) && objects.length > 0) {
            objects.forEach(obj => {
                if (typeof callback === 'function') {
                    callback(obj);
                }
            });
        }
    }
};

export default Utils;
