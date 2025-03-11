async function loadProjectCard() {
    try {
        const response = await fetch('templates/project-card.html');
        return await response.text();
    } catch (error) {
        console.error('Erreur lors du chargement du template de projet:', error);
        return null;
    }
}

async function loadCVSection() {
    try {
        const response = await fetch('templates/cv-section.html');
        return await response.text();
    } catch (error) {
        console.error('Erreur lors du chargement du template de section CV:', error);
        return null;
    }
}

function createEducationHTML(education) {
    return `
        <div class="education-section">
            ${education.map((item, index) => `
                <div class="education-row visible">
                    ${index % 2 === 0 ? `
                        <div class="education-item">
                            <div class="education-content">
                                <div class="education-period">${item.period}</div>
                                <h3 class="education-title">${item.title}</h3>
                                <div class="education-institution">${item.institution}</div>
                                ${item.description ? `<div class="education-description">${item.description}</div>` : ''}
                            </div>
                        </div>
                        <div class="education-extra">
                            ${item.model3d ? `
                                <div class="model-viewer-container" 
                                    data-model="${item.model3d}"
                                    ${item.model3dOptions ? `data-options='${JSON.stringify(item.model3dOptions)}'` : ''}
                                >
                                    <canvas class="model-canvas"></canvas>
                                </div>
                            ` : `
                                <p>Espace disponible pour du contenu additionnel</p>
                            `}
                        </div>
                    ` : `
                        <div class="education-extra">
                            ${item.model3d ? `
                                <div class="model-viewer-container" 
                                    data-model="${item.model3d}"
                                    ${item.model3dOptions ? `data-options='${JSON.stringify(item.model3dOptions)}'` : ''}
                                >
                                    <canvas class="model-canvas"></canvas>
                                </div>
                            ` : `
                                <p>Espace disponible pour du contenu additionnel</p>
                            `}
                        </div>
                        <div class="education-item">
                            <div class="education-content">
                                <div class="education-period">${item.period}</div>
                                <h3 class="education-title">${item.title}</h3>
                                <div class="education-institution">${item.institution}</div>
                                ${item.description ? `<div class="education-description">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
    `;
}

function createSkillsHTML(skills) {
    return `
        <div class="skills-grid">
            <div class="skill-category">
                <h3>Programmation</h3>
                <ul class="skill-list">
                    ${skills.programming.map(skill => `<li class="skill-item">${skill}</li>`).join('')}
                </ul>
            </div>
            <div class="skill-category">
                <h3>Frameworks</h3>
                <ul class="skill-list">
                    ${skills.frameworks.map(skill => `<li class="skill-item">${skill}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function createAboutHTML(about) {
    return `
        <div class="about-content">
            <p>${about.content}</p>
        </div>
    `;
}

// Variables globales pour Three.js
let threeJsLoaded = false;
let loadingPromise = null;

async function loadThreeJsDependencies() {
    if (window.THREE) return;

    try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js');
        
        window.THREE = THREE;
        window.GLTFLoader = GLTFLoader;
        window.KTX2Loader = KTX2Loader;
    } catch (error) {
        console.error('Error loading Three.js dependencies:', error);
        throw error;
    }
}

async function initializeModel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Container not found:', containerId);
        return;
    }

    // Récupérer le chemin du modèle et les options
    const modelPath = container.dataset.model;
    const modelOptions = container.dataset.options ? JSON.parse(container.dataset.options) : {};
    
    if (!modelPath) {
        console.warn('No model path specified for container:', containerId);
        return;
    }

    try {
        await loadThreeJsDependencies();

        // Vérifier que Three.js est bien chargé
        if (!window.THREE || !window.GLTFLoader) {
            throw new Error('Three.js or GLTFLoader not loaded properly');
        }

        // Définir le shader pour l'effet de drapeau
        const flagShader = {
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    vec3 pos = position;
                    
                    float waveStrength = 3.0; // Global intensity multiplier

                    // Wave motion with better coherence
                    float wave1 = sin(pos.x * 6.0 + time * 2.0) * 0.1;
                    float wave2 = sin(pos.y * 4.0 + time * 1.5) * 0.08;
                    float wave3 = sin((pos.x + pos.y) * 5.0 + time * 1.8) * 0.06;
                    
                    // Smooth amplitude control from fixed edge
                    float amplitude = 0.3 + 0.7 * smoothstep(0.0, 1.0, pos.x);
                    pos.z += (wave1 + wave2 + wave3) * amplitude * waveStrength / 2.0;

                    // Wind effect
                    float windX = sin(time * 1.5 + pos.y * 3.0) * 0.02 * amplitude;
                    float windY = cos(time * 1.3 + pos.x * 2.5) * 0.2 * amplitude;
                    
                    pos.x += windX * amplitude * waveStrength;
                    pos.y += windY * amplitude * waveStrength;

                    // Adjust normal
                    vec3 newNormal = normalize(normal + vec3(wave1, wave2, wave3) * amplitude * waveStrength);
                    vNormal = normalMatrix * newNormal;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }


            `,
            fragmentShader: `
                uniform vec3 diffuse;
                uniform vec3 emissive;
                uniform float opacity;
                uniform sampler2D map;
                uniform bool useMap;
                uniform vec3 color;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                    vec4 diffuseColor = vec4(diffuse, opacity);
                    vec3 outgoingLight = diffuse;

                    // Appliquer la texture si elle existe
                    if (useMap) {
                        vec4 texelColor = texture2D(map, vUv);
                        diffuseColor *= texelColor;
                        outgoingLight = diffuseColor.rgb;
                    }

                    // Éclairage simple avec une luminosité de base plus élevée
                    vec3 normal = normalize(vNormal);
                    float light = dot(normal, vec3(0.0, 0.0, 1.0)) * 0.5 + 1.3; // Augmenté de 0.5 à 0.7
                    outgoingLight *= light;

                    gl_FragColor = vec4(outgoingLight, diffuseColor.a);
                }
            `,
            uniforms: {
                time: { value: 0.0 },
                diffuse: { value: new THREE.Color(0xffffff) },
                emissive: { value: new THREE.Color(0x000000) },
                opacity: { value: 1.0 },
                map: { value: null },
                useMap: { value: false },
                color: { value: new THREE.Color(0x2196F3) }
            }
        };

        // Nettoyer le conteneur et supprimer tout ancien canvas
        if (container._cleanupFunction) {
            container._cleanupFunction();
            delete container._cleanupFunction;
        }

        // Réinitialiser le contenu du conteneur
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Créer un nouveau canvas
        const canvas = document.createElement('canvas');
        canvas.classList.add('model-canvas');
        container.appendChild(canvas);

        // Dimensions du conteneur
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Créer la scène
        const scene = new THREE.Scene();
        
        // Configurer la caméra
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        
        // Configurer le renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);
        
        // Ajouter les lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        scene.add(ambientLight);

        // Lumière directionnelle principale (plus intense)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(1, 2, 3);
        scene.add(directionalLight);

        // Lumière directionnelle secondaire pour l'arrière
        const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
        backLight.position.set(-1, 2, -3);
        scene.add(backLight);

        // Lumière d'appoint pour le dessous
        const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
        fillLight.position.set(0, -2, 0);
        scene.add(fillLight);

        // Nouvelle lumière pour éclairer les côtés
        const sideLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
        sideLight1.position.set(3, 0, 0);
        scene.add(sideLight1);

        const sideLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
        sideLight2.position.set(-3, 0, 0);
        scene.add(sideLight2);

        // Charger le modèle
        const loader = new window.GLTFLoader();
        
        // Configurer le gestionnaire de textures
        const manager = new THREE.LoadingManager();
        manager.onError = function(url) {
            console.error('Erreur lors du chargement de la texture:', url);
        };
        
        // Configurer le renderer pour les textures
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        
        // Construire le chemin absolu du modèle
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        let absoluteModelPath = modelPath;
        
        // Si le chemin n'est pas absolu, le construire
        if (!modelPath.startsWith('http')) {
            // Extraire le nom du dossier du modèle à partir du chemin
            const modelFolder = modelPath.split('/')[1]; // artefacts/dossier_modele/fichier -> dossier_modele
            const modelFile = modelPath.split('/').pop().replace('.glb', '.gltf');
            absoluteModelPath = `${baseUrl}${modelPath.split('/')[0]}/${modelFolder}/${modelFile}`;
        }
        
        console.log('Base URL:', baseUrl);
        console.log('Model path:', modelPath);
        console.log('Absolute model path:', absoluteModelPath);

        // Créer un modèle simple de secours au cas où le chargement échoue
        const fallbackGeometry = new THREE.SphereGeometry(1, 32, 32);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF });
        const fallbackModel = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        let model = fallbackModel;
        scene.add(model);

        // Indiquer le chargement en cours
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('loading-message');
        loadingElement.textContent = 'Chargement du modèle 3D...';
        container.appendChild(loadingElement);

        // Essayer de charger le modèle
        try {
            const gltf = await new Promise((resolve, reject) => {
                // Configurer le loader pour utiliser le bon chemin de base pour les ressources
                loader.manager = manager;
                loader.manager.setURLModifier((url) => {
                    // Si l'URL est déjà absolue, la retourner telle quelle
                    if (url.startsWith('http')) {
                        return url;
                    }
                    
                    // Extraire le nom du fichier de l'URL
                    const fileName = url.split('/').pop();
                    
                    // Extraire le dossier du modèle du chemin original
                    const modelFolder = modelPath.split('/')[1];
                    
                    // Construire le chemin absolu en utilisant le bon dossier
                    const absoluteUrl = `${baseUrl}${modelPath.split('/')[0]}/${modelFolder}/${fileName}`;
                    console.log('Loading resource:', absoluteUrl);
                    return absoluteUrl;
                });

                loader.load(
                    absoluteModelPath,
                    (gltf) => {
                        // Traiter les matériaux et textures
                        gltf.scene.traverse((child) => {
                            if (child.isMesh) {
                                if (modelOptions.enspsFlag) {
                                    // Créer un nouveau matériau avec le shader
                                    // Appliquer le shader de drapeau uniquement sur la partie principale de l'objet, pas sur les enfants
                                    if (child === gltf.scene.children[0]) {
                                        const flagMaterial = new THREE.ShaderMaterial({
                                            vertexShader: flagShader.vertexShader,
                                            fragmentShader: flagShader.fragmentShader,
                                            uniforms: {
                                                ...flagShader.uniforms,
                                                diffuse: { value: child.material.color || new THREE.Color(0xffffff) },
                                                map: { value: child.material.map },
                                                useMap: { value: !!child.material.map }
                                            },
                                            side: THREE.DoubleSide,
                                            transparent: true
                                        });

                                        // Si le matériau original a une texture, la configurer
                                        if (child.material.map) {
                                            child.material.map.colorSpace = THREE.SRGBColorSpace;
                                            child.material.map.needsUpdate = true;
                                            flagMaterial.uniforms.map.value = child.material.map;
                                            flagMaterial.uniforms.useMap.value = true;
                                        }

                                        child.material = flagMaterial;
                                    }


                                    // const flagMaterial = new THREE.ShaderMaterial({
                                    //     vertexShader: flagShader.vertexShader,
                                    //     fragmentShader: flagShader.fragmentShader,
                                    //     uniforms: {
                                    //         ...flagShader.uniforms,
                                    //         diffuse: { value: child.material.color || new THREE.Color(0xffffff) },
                                    //         map: { value: child.material.map },
                                    //         useMap: { value: !!child.material.map }
                                    //     },
                                    //     side: THREE.DoubleSide,
                                    //     transparent: true
                                    // });

                                    // Si le matériau original a une texture, la configurer
                                    if (child.material.map) {
                                        child.material.map.colorSpace = THREE.SRGBColorSpace;
                                        child.material.map.needsUpdate = true;
                                        flagMaterial.uniforms.map.value = child.material.map;
                                        flagMaterial.uniforms.useMap.value = true;
                                    }

                                    // child.material = flagMaterial;
                                } else {
                                    // Configuration standard existante
                                    if (child.material) {
                                        child.material.needsUpdate = true;
                                        child.material.side = THREE.DoubleSide;
                                        
                                        if (child.material.map) {
                                            child.material.map.colorSpace = THREE.SRGBColorSpace;
                                            child.material.map.flipY = false;
                                            child.material.map.needsUpdate = true;
                                        }
                                    }
                                }
                            }
                        });
                        resolve(gltf);
                    },
                    (xhr) => {
                        const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
                        console.log(`${modelPath}: ${percent}% loaded`);
                        loadingElement.textContent = `Chargement: ${percent}%`;
                    },
                    reject
                );
            });
            
            // Supprimer le modèle de secours si le chargement a réussi
            scene.remove(fallbackModel);
            fallbackGeometry.dispose();
            fallbackMaterial.dispose();
            
            // Ajouter le modèle chargé
            model = gltf.scene;
            scene.add(model);
            
            // Supprimer le message de chargement
            if (loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
            
            console.log(`Model ${modelPath} loaded successfully`);
        } catch (error) {
            console.warn(`Failed to load ${modelPath}, using fallback model:`, error);
            loadingElement.textContent = 'Utilisation du modèle de remplacement';
            
            // Animer le modèle de secours en cas d'échec
            setTimeout(() => {
                if (loadingElement.parentNode) {
                    loadingElement.parentNode.removeChild(loadingElement);
                }
            }, 2000);
        }

        // Ajuster la taille et la position du modèle
        function resizeModel() {
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);

            model.position.x = -center.x * scale;
            model.position.y = -center.y * scale;
            model.position.z = -center.z * scale;
            
            return maxDim * scale * 2;
        }

        // Position de base de la caméra
        const baseCameraZ = resizeModel();
        camera.position.z = baseCameraZ;

        // Animation
        let animationFrameId = null;
        let isDestroyed = false;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let autoRotate = true;

        // Configurer la vitesse de rotation en fonction des options
        const rotationSpeed = modelOptions.fastRotation ? 0.015 : 0.005;
        const autoRotationDelay = modelOptions.fastRotation ? 1000 : 2000;

        // Gestionnaires d'événements pour la souris
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            autoRotate = false;
            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };

            // Rotation autour de l'axe Y (gauche/droite)
            model.rotation.y += deltaMove.x * (modelOptions.fastRotation ? 0.02 : 0.01);
            
            // Rotation autour de l'axe X (haut/bas) avec limites
            const newRotationX = model.rotation.x + (deltaMove.y * (modelOptions.fastRotation ? 0.02 : 0.01));
            model.rotation.x = Math.max(Math.min(newRotationX, Math.PI / 3), -Math.PI / 3);

            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            // Réactiver la rotation automatique après le délai configuré
            setTimeout(() => {
                if (!isDragging) autoRotate = true;
            }, autoRotationDelay);
        });

        // Sortir de la zone du modèle
        container.addEventListener('mouseleave', () => {
            isDragging = false;
            // Réactiver la rotation automatique après le délai configuré
            setTimeout(() => {
                if (!isDragging) autoRotate = true;
            }, autoRotationDelay);
        });

        function updateCameraPosition() {
            try {
                const rect = container.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                
                // Calculer la position relative dans la fenêtre (0 = haut, 1 = bas)
                const relativePosition = (rect.top + rect.height / 2) / windowHeight;
                
                // Calculer l'angle de la caméra (-0.6 à 0.6 radians)
                const angleY = -(0.5 - relativePosition) * 1.8;
                
                // Mettre à jour la position de la caméra avec des mouvements plus subtils
                camera.position.y = Math.sin(angleY) * baseCameraZ * 0.8;
                camera.position.z = baseCameraZ;
                
                // Réduire le décalage du point de focus pour garder l'objet plus centré
                camera.lookAt(0, -Math.sin(angleY) * 0.2, 0);
            } catch (e) {
                console.error("Error in updateCameraPosition:", e);
            }
        }

        function animate() {
            if (isDestroyed) return;
            animationFrameId = requestAnimationFrame(animate);
            
            try {
                if (model && model.rotation) {
                    if (modelOptions.enspsFlag) {
                        // Mettre à jour le temps pour l'animation du drapeau
                        model.traverse((child) => {
                            if (child.isMesh && child.material.uniforms) {
                                child.material.uniforms.time.value += 0.016;
                            }
                        });
                    } else if (autoRotate) {
                        model.rotation.y += rotationSpeed;
                    }
                }
                
                updateCameraPosition();
                renderer.render(scene, camera);
            } catch (e) {
                console.error("Error in animate:", e);
                cleanup();
            }
        }

        // Nettoyage
        function cleanup() {
            if (isDestroyed) return;
            isDestroyed = true;
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Supprimer les gestionnaires d'événements
            container.removeEventListener('mousedown', () => {});
            window.removeEventListener('mousemove', () => {});
            window.removeEventListener('mouseup', () => {});
            container.removeEventListener('mouseleave', () => {});
            
            try {
                // Nettoyer les ressources
                scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => {
                                if (material.map) material.map.dispose();
                                material.dispose();
                            });
                        } else {
                            if (object.material.map) object.material.map.dispose();
                            object.material.dispose();
                        }
                    }
                });
                
                renderer.dispose();
                renderer.forceContextLoss();
            } catch (e) {
                console.error("Error during cleanup:", e);
            }
        }

        // Gestion du redimensionnement
        function handleResize() {
            if (isDestroyed) return;
            try {
                const newWidth = container.clientWidth;
                const newHeight = container.clientHeight;
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            } catch (e) {
                console.error("Error in handleResize:", e);
            }
        }

        window.addEventListener('resize', handleResize);

        // Stocker la fonction de nettoyage sur le conteneur
        container._cleanupFunction = () => {
            cleanup();
            window.removeEventListener('resize', handleResize);
        };

        // Démarrer l'animation
        animate();

        return container._cleanupFunction;

    } catch (error) {
        console.error('Error initializing model:', error);
        container.innerHTML = `<div class="error-message">Error initializing 3D model: ${error.message}</div>`;
    }
}

function setupScrollAnimations() {
    const elements = document.querySelectorAll('.fade-in');
    const modelViewers = document.querySelectorAll('.model-viewer-container');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        observer.observe(element);
    });
    
    // Initialiser les modèles 3D uniquement lorsqu'ils sont visibles
    const modelObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                
                // Attribuer un ID unique si nécessaire
                if (!container.id) {
                    container.id = `model-viewer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                }
                
                // Vérifier si un canvas existe déjà et en créer un si nécessaire
                if (!container.querySelector('canvas')) {
                    const canvas = document.createElement('canvas');
                    canvas.classList.add('model-canvas');
                    container.appendChild(canvas);
                }
                
                // Initialiser le modèle
                if (!container._initialized) {
                    container._initialized = true;
                    setTimeout(() => {
                        initializeModel(container.id).catch(error => {
                            console.error("Failed to initialize model:", error);
                            container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
                        });
                    }, 100);
                }
            }
        });
    }, { threshold: 0 });
    
    modelViewers.forEach(container => {
        modelObserver.observe(container);
    });
}

async function loadContent() {
    try {
        const response = await fetch('content.json');
        const content = await response.json();
        
        window.MathJax = {
            tex2jax: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']]
            },
            "HTML-CSS": { linebreaks: { automatic: true } },
            SVG: { linebreaks: { automatic: true } }
        };

        if (!window.MathJax || !window.MathJax.Hub) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
        
        await new Promise(resolve => {
            if (document.querySelector('.profile-card')) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (document.querySelector('.profile-card')) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });

        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            const img = profileCard.querySelector('.profile-image');
            const h1 = profileCard.querySelector('h1');
            const bio = profileCard.querySelector('.bio');
            
            if (img) img.src = content.profile.image;
            if (h1) h1.textContent = content.profile.name;
            if (bio) {
                bio.innerHTML = content.profile.title;
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.MathJax && window.MathJax.Hub) {
                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, bio]);
                }
            }
            
            const socialLinks = profileCard.querySelector('.social-links');
            if (socialLinks) {
                const emailLink = socialLinks.querySelector('a[href^="mailto:"]');
                const linkedinLink = socialLinks.querySelector('a[href*="linkedin"]');
                const scholarLink = socialLinks.querySelector('a[href*="scholar"]');
                const githubLink = socialLinks.querySelector('a[href*="github"]');
                
                if (emailLink) emailLink.href = `mailto:${content.profile.social.email}`;
                if (linkedinLink) linkedinLink.href = content.profile.social.linkedin;
                if (scholarLink) scholarLink.href = content.profile.social.scholar;
                if (githubLink) githubLink.href = content.profile.social.github;
            }
        }

        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const pageName = window.location.pathname.split('/').pop() || 'index.html';
            
            switch(pageName) {
                case 'projects.html':
                    const projectsContainer = mainContent.querySelector('.projects-grid');
                    if (projectsContainer && content.projects) {
                        const projectTemplate = await loadProjectCard();
                        if (projectTemplate) {
                            projectsContainer.innerHTML = '';
                            content.projects.forEach(project => {
                                const projectElement = document.createElement('div');
                                projectElement.innerHTML = projectTemplate;
                                
                                const img = projectElement.querySelector('.project-img');
                                const title = projectElement.querySelector('h3');
                                const description = projectElement.querySelector('.project-description');
                                const codeLink = projectElement.querySelector('.project-link:first-child');
                                const demoLink = projectElement.querySelector('.project-link:last-child');
                                
                                if (img) {
                                    img.src = project.image;
                                    img.alt = project.title;
                                }
                                if (title) title.textContent = project.title;
                                if (description) description.textContent = project.description;
                                if (codeLink) codeLink.href = project.github;
                                if (demoLink) demoLink.href = project.demo;
                                
                                projectsContainer.appendChild(projectElement);
                            });
                        }
                    }
                    break;

                case 'cv.html':
                    console.log('Chargement du template CV...');
                    const cvTemplate = await loadCVSection();
                    console.log('Template CV chargé:', cvTemplate);
                    if (cvTemplate && content.cv) {
                        console.log('Contenu CV trouvé:', content.cv);
                        const projectsGrid = mainContent.querySelector('.projects-grid');
                        if (projectsGrid) {
                            console.log('Container projects-grid trouvé');
                            projectsGrid.innerHTML = '';
                            
                            if (content.cv.about) {
                                console.log('Ajout de la section About');
                                const aboutSection = document.createElement('div');
                                aboutSection.classList.add('fade-in');
                                aboutSection.innerHTML = cvTemplate;
                                aboutSection.querySelector('.section-title').textContent = content.cv.about.title;
                                aboutSection.querySelector('.section-body').innerHTML = createAboutHTML(content.cv.about);
                                aboutSection.querySelector('.cv-section').classList.add('visible');
                                projectsGrid.appendChild(aboutSection);
                            }
                            
                            if (content.cv.education) {
                                console.log('Ajout de la section Education');
                                const educationSection = document.createElement('div');
                                educationSection.classList.add('fade-in');
                                educationSection.innerHTML = cvTemplate;
                                educationSection.querySelector('.section-title').textContent = 'Formation';
                                educationSection.querySelector('.section-body').innerHTML = createEducationHTML(content.cv.education);
                                educationSection.querySelector('.cv-section').classList.add('visible');
                                projectsGrid.appendChild(educationSection);
                            }
                            
                            if (content.cv.skills) {
                                console.log('Ajout de la section Skills');
                                const skillsSection = document.createElement('div');
                                skillsSection.classList.add('fade-in');
                                skillsSection.innerHTML = cvTemplate;
                                skillsSection.querySelector('.section-title').textContent = 'Compétences';
                                skillsSection.querySelector('.section-body').innerHTML = createSkillsHTML(content.cv.skills);
                                skillsSection.querySelector('.cv-section').classList.add('visible');
                                projectsGrid.appendChild(skillsSection);
                            }
                            
                            setupScrollAnimations();
                        } else {
                            console.error('Container projects-grid non trouvé');
                        }
                    } else {
                        console.error('Template CV ou contenu CV non trouvé:', { template: cvTemplate, content: content.cv });
                    }
                    break;

                default:
                    const pageContent = content.pages[pageName];
                    if (pageContent) {
                        mainContent.innerHTML = pageContent;
                    }
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement du contenu:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadContent); 