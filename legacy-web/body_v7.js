
        // ============ 3D人体 V7 - 2D肌肉图 + 3D交互版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleHotspots = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        let currentView = 'front'; // front or back
        let targetRotation = 0;
        let mouseNDC = new THREE.Vector2();
        
        // 肌肉区域配置（正面）- [x, y, width, height, 名称]
        // 坐标是相对于人体的比例，中心为原点
        const frontMuscles = [
            { name: '胸大肌', x: -0.38, y: 1.8, w: 0.55, h: 0.65, side: 'left' },
            { name: '胸大肌', x: 0.38, y: 1.8, w: 0.55, h: 0.65, side: 'right' },
            { name: '腹直肌', x: 0, y: 0.9, w: 0.45, h: 1.5, side: 'both' },
            { name: '腹外斜肌', x: -0.55, y: 0.7, w: 0.35, h: 1.3, side: 'left' },
            { name: '腹外斜肌', x: 0.55, y: 0.7, w: 0.35, h: 1.3, side: 'right' },
            { name: '三角肌', x: -0.88, y: 2.5, w: 0.38, h: 0.5, side: 'left' },
            { name: '三角肌', x: 0.88, y: 2.5, w: 0.38, h: 0.5, side: 'right' },
            { name: '肱二头肌', x: -1.0, y: 1.4, w: 0.28, h: 0.75, side: 'left' },
            { name: '肱二头肌', x: 1.0, y: 1.4, w: 0.28, h: 0.75, side: 'right' },
            { name: '肱三头肌', x: -1.05, y: 1.35, w: 0.25, h: 0.7, side: 'left' },
            { name: '肱三头肌', x: 1.05, y: 1.35, w: 0.25, h: 0.7, side: 'right' },
            { name: '前臂肌群', x: -0.95, y: 0.2, w: 0.28, h: 0.8, side: 'left' },
            { name: '前臂肌群', x: 0.95, y: 0.2, w: 0.28, h: 0.8, side: 'right' },
            { name: '股四头肌', x: -0.42, y: -1.6, w: 0.4, h: 1.6, side: 'left' },
            { name: '股四头肌', x: 0.42, y: -1.6, w: 0.4, h: 1.6, side: 'right' },
            { name: '腘绳肌', x: -0.5, y: -1.7, w: 0.3, h: 1.3, side: 'left' },
            { name: '腘绳肌', x: 0.5, y: -1.7, w: 0.3, h: 1.3, side: 'right' },
            { name: '臀大肌', x: -0.38, y: -0.35, w: 0.38, h: 0.45, side: 'left' },
            { name: '臀大肌', x: 0.38, y: -0.35, w: 0.38, h: 0.45, side: 'right' },
            { name: '小腿肌群', x: -0.38, y: -3.1, w: 0.3, h: 1.0, side: 'left' },
            { name: '小腿肌群', x: 0.38, y: -3.1, w: 0.3, h: 1.0, side: 'right' },
            { name: '斜方肌', x: -0.55, y: 2.9, w: 0.4, h: 0.5, side: 'left' },
            { name: '斜方肌', x: 0.55, y: 2.9, w: 0.4, h: 0.5, side: 'right' },
        ];
        
        const backMuscles = [
            { name: '斜方肌', x: -0.5, y: 2.9, w: 0.45, h: 0.7, side: 'left' },
            { name: '斜方肌', x: 0.5, y: 2.9, w: 0.45, h: 0.7, side: 'right' },
            { name: '背阔肌', x: -0.6, y: 1.3, w: 0.5, h: 1.6, side: 'left' },
            { name: '背阔肌', x: 0.6, y: 1.3, w: 0.5, h: 1.6, side: 'right' },
            { name: '中背部', x: 0, y: 1.5, w: 0.35, h: 0.9, side: 'both' },
            { name: '下背部', x: 0, y: 0.2, w: 0.35, h: 0.5, side: 'both' },
            { name: '三角肌', x: -0.85, y: 2.4, w: 0.35, h: 0.45, side: 'left' },
            { name: '三角肌', x: 0.85, y: 2.4, w: 0.35, h: 0.45, side: 'right' },
            { name: '肱三头肌', x: -1.0, y: 1.3, w: 0.28, h: 0.7, side: 'left' },
            { name: '肱三头肌', x: 1.0, y: 1.3, w: 0.28, h: 0.7, side: 'right' },
            { name: '前臂肌群', x: -0.92, y: 0.25, w: 0.26, h: 0.75, side: 'left' },
            { name: '前臂肌群', x: 0.92, y: 0.25, w: 0.26, h: 0.75, side: 'right' },
            { name: '臀大肌', x: -0.4, y: -0.4, w: 0.42, h: 0.5, side: 'left' },
            { name: '臀大肌', x: 0.4, y: -0.4, w: 0.42, h: 0.5, side: 'right' },
            { name: '腘绳肌', x: -0.42, y: -1.65, w: 0.38, h: 1.4, side: 'left' },
            { name: '腘绳肌', x: 0.42, y: -1.65, w: 0.38, h: 1.4, side: 'right' },
            { name: '小腿肌群', x: -0.38, y: -3.1, w: 0.3, h: 1.0, side: 'left' },
            { name: '小腿肌群', x: 0.38, y: -3.1, w: 0.3, h: 1.0, side: 'right' },
        ];
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0d1117);
            
            camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            camera.position.set(0, 0, 10);
            
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.insertBefore(renderer.domElement, container.firstChild);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.enablePan = false;
            controls.enableZoom = true;
            controls.minDistance = 7;
            controls.maxDistance = 18;
            controls.target.set(0, 0, 0);
            controls.maxPolarAngle = Math.PI * 0.65;
            controls.minPolarAngle = Math.PI * 0.35;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            
            // 光照
            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff0e0, 0.8);
            keyLight.position.set(3, 4, 5);
            scene.add(keyLight);
            
            const rimLight = new THREE.DirectionalLight(0xff8844, 0.5);
            rimLight.position.set(0, 2, -4);
            scene.add(rimLight);
            
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            createBody();
            
            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
            renderer.domElement.addEventListener('mouseleave', onMouseLeave);
            window.addEventListener('resize', onWindowResize);
            
            renderer.domElement.addEventListener('mouseenter', () => { controls.autoRotate = false; });
            renderer.domElement.addEventListener('mouseleave', () => { controls.autoRotate = true; });
            
            animate();
        }
        
        function createBody() {
            bodyGroup = new THREE.Group();
            
            // ====== 背景光晕 ======
            const glowGeo = new THREE.CircleGeometry(4.5, 64);
            const glowMat = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0xff6633) },
                    intensity: { value: 0.08 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    uniform float intensity;
                    varying vec2 vUv;
                    void main() {
                        float d = distance(vUv, vec2(0.5));
                        float a = smoothstep(0.5, 0.0, d) * intensity;
                        gl_FragColor = vec4(color, a);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.z = -1.5;
            bodyGroup.add(glow);
            
            // ====== 主人体平面（带轻微弯曲） ======
            // 使用CylinderGeometry的一部分来创建弯曲的人体板
            const bodyWidth = 3.0;
            const bodyHeight = 6.0;
            const curvature = 0.5;
            
            const bodyGeo = new THREE.CylinderGeometry(
                bodyWidth / 2 + curvature,  // 上半径
                bodyWidth / 2 + curvature,  // 下半径
                bodyHeight,                 // 高度
                32,                         // 分段
                1,                          // 高度分段
                true,                       // 开放两端
                -Math.PI / 3,               // 起始角度
                Math.PI * 2 / 3             // 扫描角度
            );
            
            // 重新映射UV
            const pos = bodyGeo.attributes.position;
            const uvs = bodyGeo.attributes.uv;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                uvs.setXY(i, (x / bodyWidth) + 0.5, (y / bodyHeight) + 0.5);
            }
            bodyGeo.attributes.uv.needsUpdate = true;
            
            // 正面人体材质（用Canvas绘制风格化人体）
            const frontCanvas = createBodyCanvas('front');
            const frontTex = new THREE.CanvasTexture(frontCanvas);
            frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            
            const frontMat = new THREE.MeshStandardMaterial({
                map: frontTex,
                transparent: true,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.05
            });
            
            const bodyFront = new THREE.Mesh(bodyGeo, frontMat);
            bodyFront.rotation.y = Math.PI;  // 让正面朝向相机
            bodyFront.name = 'bodyFront';
            bodyGroup.add(bodyFront);
            
            // 背面上的人体
            const backCanvas = createBodyCanvas('back');
            const backTex = new THREE.CanvasTexture(backCanvas);
            backTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            
            const backMat = new THREE.MeshStandardMaterial({
                map: backTex,
                transparent: true,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.05
            });
            
            const bodyBack = new THREE.Mesh(bodyGeo.clone(), backMat);
            bodyBack.rotation.y = 0;
            bodyBack.name = 'bodyBack';
            bodyGroup.add(bodyBack);
            
            // 板的厚度边缘
            const edgeGeo = new THREE.TorusGeometry(bodyWidth / 2 + curvature * 0.5, 0.04, 8, 32, Math.PI * 2 / 3);
            const edgeMat = new THREE.MeshStandardMaterial({
                color: 0x1a1f2e,
                roughness: 0.5,
                metalness: 0.2
            });
            
            const topEdge = new THREE.Mesh(edgeGeo, edgeMat);
            topEdge.rotation.x = Math.PI / 2;
            topEdge.position.y = bodyHeight / 2;
            bodyGroup.add(topEdge);
            
            const bottomEdge = new THREE.Mesh(edgeGeo.clone(), edgeMat.clone());
            bottomEdge.rotation.x = Math.PI / 2;
            bottomEdge.position.y = -bodyHeight / 2;
            bodyGroup.add(bottomEdge);
            
            // ====== 肌肉热点（正面） ======
            frontMuscles.forEach(m => {
                const hotspot = createMuscleHotspot(m, 'front');
                bodyGroup.add(hotspot);
            });
            
            // ====== 肌肉热点（背面） ======
            backMuscles.forEach(m => {
                const hotspot = createMuscleHotspot(m, 'back');
                bodyGroup.add(hotspot);
            });
            
            // ====== 浮动粒子 ======
            const particleCount = 30;
            const particleGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 8;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
            }
            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const particleMat = new THREE.PointsMaterial({
                color: 0xff8844,
                size: 0.03,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            const particles = new THREE.Points(particleGeo, particleMat);
            particles.name = 'particles';
            bodyGroup.add(particles);
            
            scene.add(bodyGroup);
        }
        
        function createMuscleHotspot(muscleData, view) {
            const w = muscleData.w;
            const h = muscleData.h;
            const x = muscleData.x;
            const y = muscleData.y;
            
            // 创建一个稍微弯曲的热点面片
            const geo = new THREE.CylinderGeometry(
                w / 2 + 0.05, w / 2 + 0.05, h, 20, 1, true, -Math.PI / 3, Math.PI * 2 / 3
            );
            
            const mat = new THREE.MeshStandardMaterial({
                color: 0xff6633,
                transparent: true,
                opacity: 0,
                emissive: 0xff6633,
                emissiveIntensity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, view === 'front' ? 1.55 : -1.55);
            mesh.rotation.y = view === 'front' ? Math.PI : 0;
            mesh.scale.set(1, 1, 1);
            
            mesh.userData.muscle = muscleData.name;
            mesh.userData.isMuscle = true;
            mesh.userData.view = view;
            mesh.userData.baseOpacity = 0;
            mesh.userData.hoverOpacity = 0.35;
            mesh.userData.selectedOpacity = 0.5;
            mesh.userData.baseEmissive = 0;
            mesh.userData.hoverEmissive = 0.6;
            mesh.userData.selectedEmissive = 1.0;
            
            muscleHotspots.push(mesh);
            return mesh;
        }
        
        function createBodyCanvas(view) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            
            const bgGrad = ctx.createRadialGradient(256, 512, 0, 256, 512, 400);
            bgGrad.addColorStop(0, 'rgba(30, 38, 58, 0.9)');
            bgGrad.addColorStop(0.7, 'rgba(20, 25, 40, 0.7)');
            bgGrad.addColorStop(1, 'rgba(15, 18, 28, 0)');
            
            ctx.fillStyle = 'rgba(13, 17, 23, 0)';
            ctx.fillRect(0, 0, 512, 1024);
            
            // 绘制风格化人体
            drawStylizedBody(ctx, 256, 512, view);
            
            return canvas;
        }
        
        function drawStylizedBody(ctx, cx, cy, view) {
            ctx.save();
            
            const skinLight = '#e8c4a0';
            const skinMid = '#d4ae88';
            const skinDark = '#be976c';
            const muscLight = '#d89868';
            const muscMid = '#c48454';
            const muscDark = '#a66e3e';
            const muscDeep = '#8a5a32';
            
            const scale = 85;
            
            function fillBody(baseColor, shadowColor) {
                const grad = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
                grad.addColorStop(0, shadowColor);
                grad.addColorStop(0.3, baseColor);
                grad.addColorStop(0.5, skinLight);
                grad.addColorStop(0.7, baseColor);
                grad.addColorStop(1, shadowColor);
                return grad;
            }
            
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // 头部
            const headY = cy - 380;
            ctx.fillStyle = fillBody(skinMid, skinDark);
            ctx.beginPath();
            ctx.ellipse(cx, headY, 55, 68, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 下颌/脖子
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.moveTo(cx - 30, headY + 50);
            ctx.quadraticCurveTo(cx, headY + 75, cx + 30, headY + 50);
            ctx.lineTo(cx + 25, headY + 95);
            ctx.quadraticCurveTo(cx, headY + 110, cx - 25, headY + 95);
            ctx.closePath();
            ctx.fill();
            
            // 颈部
            ctx.fillStyle = fillBody(skinDark, muscDeep);
            ctx.beginPath();
            ctx.moveTo(cx - 22, headY + 85);
            ctx.lineTo(cx - 28, headY + 145);
            ctx.lineTo(cx + 28, headY + 145);
            ctx.lineTo(cx + 22, headY + 85);
            ctx.closePath();
            ctx.fill();
            
            if (view === 'front') {
                // 锁骨
                ctx.strokeStyle = skinDark;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 55, headY + 140);
                ctx.quadraticCurveTo(cx, headY + 150, cx + 55, headY + 140);
                ctx.stroke();
                
                // 胸大肌
                ctx.fillStyle = muscMid;
                for (let side of [-1, 1]) {
                    ctx.save();
                    ctx.translate(cx + side * 5, headY + 195);
                    ctx.beginPath();
                    ctx.ellipse(side * 45, 0, 50, 38, side * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    
                    const cg = ctx.createRadialGradient(side * 35, -10, 5, side * 45, 0, 50);
                    cg.addColorStop(0, muscLight);
                    cg.addColorStop(0.6, muscMid);
                    cg.addColorStop(1, muscDark);
                    ctx.fillStyle = cg;
                    ctx.fill();
                    ctx.restore();
                }
                
                // 胸肌中缝
                ctx.strokeStyle = muscDeep;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 160);
                ctx.lineTo(cx, headY + 240);
                ctx.stroke();
                
                // 腹肌区域
                ctx.fillStyle = muscMid;
                ctx.beginPath();
                ctx.moveTo(cx - 45, headY + 245);
                ctx.lineTo(cx - 38, headY + 390);
                ctx.quadraticCurveTo(cx, headY + 410, cx + 38, headY + 390);
                ctx.lineTo(cx + 45, headY + 245);
                ctx.quadraticCurveTo(cx, headY + 260, cx - 45, headY + 245);
                ctx.closePath();
                ctx.fill();
                
                // 腹肌块状
                const abGrad = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
                abGrad.addColorStop(0, muscDark);
                abGrad.addColorStop(0.4, muscLight);
                abGrad.addColorStop(0.6, muscLight);
                abGrad.addColorStop(1, muscDark);
                ctx.fillStyle = abGrad;
                
                for (let i = 0; i < 4; i++) {
                    const y = headY + 270 + i * 38;
                    ctx.beginPath();
                    ctx.ellipse(cx - 22, y, 20, 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(cx + 22, y, 20, 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 腹白线
                ctx.strokeStyle = muscDeep;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 255);
                ctx.lineTo(cx, headY + 400);
                ctx.stroke();
                
                // 腹外斜肌
                ctx.fillStyle = muscDark;
                for (let side of [-1, 1]) {
                    for (let i = 0; i < 3; i++) {
                        const y = headY + 265 + i * 40;
                        ctx.beginPath();
                        ctx.ellipse(cx + side * 62, y, 18, 26, side * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                // 背视图
                // 斜方肌
                ctx.fillStyle = muscDark;
                ctx.beginPath();
                ctx.moveTo(cx - 70, headY + 140);
                ctx.quadraticCurveTo(cx, headY + 105, cx + 70, headY + 140);
                ctx.lineTo(cx + 55, headY + 210);
                ctx.quadraticCurveTo(cx, headY + 230, cx - 55, headY + 210);
                ctx.closePath();
                ctx.fill();
                
                const trapGrad = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
                trapGrad.addColorStop(0, muscDeep);
                trapGrad.addColorStop(0.5, muscLight);
                trapGrad.addColorStop(1, muscDeep);
                ctx.fillStyle = trapGrad;
                ctx.fill();
                
                // 脊柱沟
                ctx.strokeStyle = muscDeep;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 160);
                ctx.lineTo(cx, headY + 400);
                ctx.stroke();
                
                // 背阔肌
                ctx.fillStyle = muscDeep;
                for (let side of [-1, 1]) {
                    ctx.save();
                    ctx.translate(cx, headY + 280);
                    ctx.beginPath();
                    ctx.moveTo(side * 50, -50);
                    ctx.quadraticCurveTo(side * 85, 0, side * 75, 80);
                    ctx.quadraticCurveTo(side * 55, 60, side * 35, -30);
                    ctx.closePath();
                    ctx.fill();
                    
                    const latGrad = ctx.createLinearGradient(0, -50, 0, 80);
                    latGrad.addColorStop(0, muscDark);
                    latGrad.addColorStop(0.5, muscMid);
                    latGrad.addColorStop(1, muscDark);
                    ctx.fillStyle = latGrad;
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                    ctx.restore();
                }
                
                // 中背部
                ctx.fillStyle = muscDark;
                ctx.beginPath();
                ctx.ellipse(cx, headY + 280, 35, 60, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 下背部
                ctx.fillStyle = muscDeep;
                ctx.beginPath();
                ctx.ellipse(cx, headY + 390, 30, 35, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 肩部（两侧都有）
            for (let side of [-1, 1]) {
                const shoulderX = cx + side * 85;
                const shoulderY = headY + 180;
                
                // 三角肌
                ctx.fillStyle = muscMid;
                ctx.beginPath();
                ctx.ellipse(shoulderX, shoulderY, 32, 28, side * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                const deltGrad = ctx.createRadialGradient(shoulderX - side * 10, shoulderY - 5, 5, shoulderX, shoulderY, 32);
                deltGrad.addColorStop(0, muscLight);
                deltGrad.addColorStop(0.7, muscMid);
                deltGrad.addColorStop(1, muscDark);
                ctx.fillStyle = deltGrad;
                ctx.fill();
                
                // 上臂
                ctx.fillStyle = fillBody(skinMid, skinDark);
                ctx.beginPath();
                ctx.ellipse(shoulderX + side * 5, shoulderY + 95, 22, 75, side * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                // 二头肌/三头肌
                if (view === 'front') {
                    ctx.fillStyle = muscMid;
                    ctx.beginPath();
                    ctx.ellipse(shoulderX + side * 8, shoulderY + 95, 16, 55, side * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = muscDark;
                    ctx.beginPath();
                    ctx.ellipse(shoulderX + side * 8, shoulderY + 95, 17, 58, side * 0.06, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 肘部
                ctx.fillStyle = skinDark;
                ctx.beginPath();
                ctx.arc(shoulderX + side * 8, shoulderY + 175, 18, 0, Math.PI * 2);
                ctx.fill();
                
                // 前臂
                ctx.fillStyle = fillBody(skinDark, muscDeep);
                ctx.beginPath();
                ctx.ellipse(shoulderX + side * 3, shoulderY + 245, 19, 65, side * 0.03, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 腰带/髋部
            ctx.fillStyle = muscDark;
            ctx.beginPath();
            ctx.ellipse(cx, headY + 425, 65, 28, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 臀部（背面更明显）
            if (view === 'back') {
                ctx.fillStyle = muscDark;
                for (let side of [-1, 1]) {
                    ctx.beginPath();
                    ctx.ellipse(cx + side * 35, headY + 445, 38, 32, side * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    const gluteGrad = ctx.createRadialGradient(cx + side * 30, headY + 435, 5, cx + side * 35, headY + 445, 38);
                    gluteGrad.addColorStop(0, muscMid);
                    gluteGrad.addColorStop(0.7, muscDark);
                    gluteGrad.addColorStop(1, muscDeep);
                    ctx.fillStyle = gluteGrad;
                    ctx.fill();
                }
            } else {
                // 正面髋部
                ctx.fillStyle = muscDeep;
                for (let side of [-1, 1]) {
                    ctx.beginPath();
                    ctx.ellipse(cx + side * 35, headY + 445, 32, 28, side * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // 大腿
            for (let side of [-1, 1]) {
                const thighX = cx + side * 35;
                const thighY = headY + 530;
                
                ctx.fillStyle = fillBody(skinMid, skinDark);
                ctx.beginPath();
                ctx.ellipse(thighX, thighY, 30, 100, side * 0.03, 0, Math.PI * 2);
                ctx.fill();
                
                // 股四头肌
                if (view === 'front') {
                    ctx.fillStyle = muscMid;
                    ctx.beginPath();
                    ctx.ellipse(thighX + side * 2, thighY, 22, 80, side * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // 股外侧肌线条
                    ctx.fillStyle = muscLight;
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    ctx.ellipse(thighX + side * 22, thighY, 8, 70, side * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
                
                // 腘绳肌
                if (view === 'back') {
                    ctx.fillStyle = muscDark;
                    ctx.beginPath();
                    ctx.ellipse(thighX + side * 3, thighY, 20, 78, side * 0.04, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // 膝盖
            for (let side of [-1, 1]) {
                ctx.fillStyle = skinDark;
                ctx.beginPath();
                ctx.ellipse(cx + side * 35, headY + 645, 22, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 小腿
            for (let side of [-1, 1]) {
                const calfX = cx + side * 33;
                const calfY = headY + 740;
                
                ctx.fillStyle = fillBody(skinDark, muscDeep);
                ctx.beginPath();
                ctx.ellipse(calfX, calfY, 20, 85, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 小腿肌肉
                ctx.fillStyle = muscMid;
                if (view === 'back') {
                    ctx.beginPath();
                    ctx.ellipse(calfX, calfY - 10, 18, 55, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.ellipse(calfX, calfY - 10, 16, 50, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
            
            ctx.restore();
        }
        
        function onMouseMove(event) {
            const container = document.getElementById('body-3d-container');
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // 鼠标位置用于视差
            mouseNDC.copy(mouse);
            
            raycaster.setFromCamera(mouse, camera);
            
            // 只检测当前视图面的热点
            const visibleHotspots = muscleHotspots.filter(h => {
                const isFront = h.userData.view === 'front';
                const groupRotY = bodyGroup.rotation.y % (Math.PI * 2);
                const normalized = groupRotY < 0 ? groupRotY + Math.PI * 2 : groupRotY;
                // 简单判断：正面可见当旋转接近0 (mod 2pi)，背面可见当接近pi
                const isFrontView = normalized < Math.PI / 2 || normalized > Math.PI * 3 / 2;
                return isFront ? isFrontView : !isFrontView;
            });
            
            const intersects = raycaster.intersectObjects(visibleHotspots);
            const tooltip = document.getElementById('muscle-tooltip');
            
            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const name = mesh.userData.muscle;
                
                if (hoveredMuscle !== mesh) {
                    if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                        setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
                    }
                    hoveredMuscle = mesh;
                    if (name !== selectedMuscle3D) {
                        setMuscleHighlight(name, true, false);
                    }
                    document.body.style.cursor = 'pointer';
                }
                
                tooltip.textContent = name;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }
        
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            const visibleHotspots = muscleHotspots.filter(h => {
                const isFront = h.userData.view === 'front';
                const groupRotY = bodyGroup.rotation.y % (Math.PI * 2);
                const normalized = groupRotY < 0 ? groupRotY + Math.PI * 2 : groupRotY;
                const isFrontView = normalized < Math.PI / 2 || normalized > Math.PI * 3 / 2;
                return isFront ? isFrontView : !isFrontView;
            });
            
            const intersects = raycaster.intersectObjects(visibleHotspots);
            
            if (intersects.length > 0) {
                const name = intersects[0].object.userData.muscle;
                if (selectedMuscle3D === name) return;
                
                if (selectedMuscle3D) {
                    setMuscleHighlight(selectedMuscle3D, false, false);
                }
                
                selectedMuscle3D = name;
                setMuscleHighlight(name, true, true);
                
                selectMuscle(name, null);
            }
        }
        
        function onMouseLeave() {
            document.getElementById('muscle-tooltip').classList.remove('visible');
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        function setMuscleHighlight(name, isActive, isSelected) {
            muscleHotspots.forEach(h => {
                if (h.userData.muscle === name) {
                    const mat = h.material;
                    if (isSelected) {
                        mat.opacity = h.userData.selectedOpacity;
                        mat.emissiveIntensity = h.userData.selectedEmissive;
                        mat.emissive.setHex(0xffaa33);
                    } else if (isActive) {
                        mat.opacity = h.userData.hoverOpacity;
                        mat.emissiveIntensity = h.userData.hoverEmissive;
                        mat.emissive.setHex(0xff6633);
                    } else {
                        mat.opacity = h.userData.baseOpacity;
                        mat.emissiveIntensity = h.userData.baseEmissive;
                    }
                    mat.needsUpdate = true;
                }
            });
        }
        
        function toggleView() {
            targetRotation += Math.PI;
        }
        
        function onWindowResize() {
            const container = document.getElementById('body-3d-container');
            if (!container || !camera || !renderer) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        
        function animate() {
            requestAnimationFrame(animate);
            
            // 平滑旋转到目标角度
            if (bodyGroup) {
                const diff = targetRotation - bodyGroup.rotation.y;
                if (Math.abs(diff) > 0.001) {
                    bodyGroup.rotation.y += diff * 0.08;
                }
                
                // 鼠标视差
                if (!controls.autoRotate) {
                    const targetX = mouseNDC.x * 0.15;
                    const targetY = mouseNDC.y * 0.1;
                    bodyGroup.rotation.x += (targetY - bodyGroup.rotation.x) * 0.03;
                }
            }
            
            // 粒子浮动
            const particles = bodyGroup ? bodyGroup.getObjectByName('particles') : null;
            if (particles) {
                particles.rotation.y += 0.001;
                const pos = particles.geometry.attributes.position;
                const t = Date.now() * 0.001;
                for (let i = 0; i < pos.count; i++) {
                    const y = pos.getY(i);
                    pos.setY(i, y + Math.sin(t + i) * 0.001);
                }
                pos.needsUpdate = true;
            }
            
            controls.update();
            renderer.render(scene, camera);
        }
