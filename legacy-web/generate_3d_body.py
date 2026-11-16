#!/usr/bin/env python3
"""
生成带有3D人体模型的HTML代码片段
"""

# Three.js + OrbitControls 引入
threejs_import = '''
    <!-- Three.js -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js"></script>
'''

# 3D人体CSS样式
css_3d = '''
        /* 3D人体容器 */
        .body-3d-container {
            width: 100%;
            height: 500px;
            position: relative;
            cursor: grab;
        }
        .body-3d-container:active {
            cursor: grabbing;
        }
        .body-3d-container canvas {
            display: block;
        }
        
        /* 肌肉提示标签 */
        .muscle-tooltip {
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            border: 1px solid rgba(255, 107, 53, 0.5);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transform: translate(-50%, -100%);
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
        }
        .muscle-tooltip.visible {
            opacity: 1;
        }
        .muscle-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: rgba(255, 107, 53, 0.5);
        }
        
        /* 3D控制提示 */
        .controls-hint {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            pointer-events: none;
        }
'''

# 3D人体容器HTML
html_3d_body = '''
            <!-- 3D人体模型 -->
            <div class="body-3d-container" id="body-3d-container">
                <div class="controls-hint">🖱️ 拖动旋转 · 滚轮缩放 · 点击肌肉选择</div>
            </div>
            <div class="muscle-tooltip" id="muscle-tooltip"></div>
'''

# Three.js 3D人体实现JS
js_3d_body = '''
        // ============ 3D人体模型 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleMeshes = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        
        // 肌肉颜色配置
        const muscleColors = {
            default: 0xd4a574,       // 皮肤色
            hover: 0xff6b35,         // 悬停橙色
            selected: 0xff8c00,      // 选中深橙色
            chest: 0xe74c3c,         // 胸-红
            back: 0x3498db,          // 背-蓝
            shoulders: 0x9b59b6,     // 肩-紫
            arms: 0x2ecc71,          // 手臂-绿
            abs: 0xf39c12,           // 腹-黄
            legs: 0x1abc9c,          // 腿-青
            glutes: 0xe91e63,        // 臀-粉
        };
        
        // 初始化3D场景
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            // 场景
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);
            
            // 相机
            camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera.position.set(0, 0, 12);
            
            // 渲染器
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.insertBefore(renderer.domElement, container.firstChild);
            
            // 控制器
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enablePan = false;
            controls.minDistance = 6;
            controls.maxDistance = 20;
            controls.maxPolarAngle = Math.PI * 0.85;
            controls.minPolarAngle = Math.PI * 0.15;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            
            // 光照
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(ambientLight);
            
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            mainLight.position.set(5, 8, 5);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 1024;
            mainLight.shadow.mapSize.height = 1024;
            scene.add(mainLight);
            
            const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
            fillLight.position.set(-5, 3, -5);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffaa66, 0.4);
            rimLight.position.set(0, 5, -8);
            scene.add(rimLight);
            
            // 射线检测
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            // 创建人体
            create3DBody();
            
            // 事件监听
            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
            renderer.domElement.addEventListener('mouseleave', onMouseLeave);
            
            // 窗口大小变化
            window.addEventListener('resize', onWindowResize);
            
            // 开始动画
            animate();
            
            // 鼠标移入时停止自动旋转
            renderer.domElement.addEventListener('mouseenter', () => {
                controls.autoRotate = false;
            });
            renderer.domElement.addEventListener('mouseleave', () => {
                controls.autoRotate = true;
            });
        }
        
        // 创建3D人体
        function create3DBody() {
            bodyGroup = new THREE.Group();
            
            const skinMat = new THREE.MeshStandardMaterial({
                color: muscleColors.default,
                roughness: 0.7,
                metalness: 0.1,
                flatShading: false
            });
            
            // === 头部 ===
            const headGeo = new THREE.SphereGeometry(1.1, 32, 32);
            headGeo.scale(0.9, 1.1, 0.95);
            const head = new THREE.Mesh(headGeo, skinMat.clone());
            head.position.y = 4.2;
            head.castShadow = true;
            bodyGroup.add(head);
            
            // 颈部
            const neckGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.6, 16);
            const neck = new THREE.Mesh(neckGeo, skinMat.clone());
            neck.position.y = 3.5;
            neck.castShadow = true;
            bodyGroup.add(neck);
            
            // === 胸大肌（前） ===
            const chestShape = new THREE.Shape();
            chestShape.moveTo(-1.8, 1.5);
            chestShape.quadraticCurveTo(-2, 2.5, -1.2, 3.2);
            chestShape.lineTo(0, 3.4);
            chestShape.lineTo(0, 1.3);
            chestShape.quadraticCurveTo(-1, 1.2, -1.8, 1.5);
            
            const chestExtrudeSettings = { depth: 0.6, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 4 };
            const chestGeo = new THREE.ExtrudeGeometry(chestShape, chestExtrudeSettings);
            const chestMat = new THREE.MeshStandardMaterial({ color: 0xe8a87c, roughness: 0.6, metalness: 0.1 });
            
            const chestL = new THREE.Mesh(chestGeo, chestMat.clone());
            chestL.position.z = 0.5;
            chestL.castShadow = true;
            chestL.userData.muscle = '胸大肌';
            chestL.userData.isMuscle = true;
            bodyGroup.add(chestL);
            muscleMeshes.push(chestL);
            
            const chestR = chestL.clone();
            chestR.scale.x = -1;
            chestR.userData.muscle = '胸大肌';
            chestR.userData.isMuscle = true;
            bodyGroup.add(chestR);
            muscleMeshes.push(chestR);
            
            // === 躯干主体 ===
            const torsoPoints = [];
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const y = 3.2 - t * 3.5;
                let width;
                if (t < 0.2) {
                    width = 2.2 - t * 1;
                } else if (t < 0.6) {
                    width = 2.0 - (t - 0.2) * 0.5;
                } else {
                    width = 1.8 - (t - 0.6) * 0.8;
                }
                let depth;
                if (t < 0.3) {
                    depth = 1.1 - t * 0.3;
                } else {
                    depth = 1.0 - (t - 0.3) * 0.4;
                }
                torsoPoints.push(new THREE.Vector2(width, y));
            }
            
            const torsoGeo = new THREE.LatheGeometry(torsoPoints, 24);
            const torso = new THREE.Mesh(torsoGeo, skinMat.clone());
            torso.castShadow = true;
            torso.position.y = 1.5;
            bodyGroup.add(torso);
            
            // === 腹肌 ===
            for (let i = 0; i < 4; i++) {
                const abGeo = new THREE.BoxGeometry(1.6, 0.45, 0.15);
                abGeo.translate(0, 0, 0);
                const abMat = new THREE.MeshStandardMaterial({ color: 0xe8a87c, roughness: 0.65 });
                const ab = new THREE.Mesh(abGeo, abMat.clone());
                ab.position.set(0, 0.8 - i * 0.5, 1.15);
                ab.castShadow = true;
                ab.userData.muscle = '腹直肌';
                ab.userData.isMuscle = true;
                bodyGroup.add(ab);
                muscleMeshes.push(ab);
            }
            
            // 腹外斜肌（两侧）
            for (let side of [-1, 1]) {
                const obliqueShape = new THREE.Shape();
                obliqueShape.moveTo(side * 1.5, 1.2);
                obliqueShape.quadraticCurveTo(side * 1.8, 0.5, side * 1.7, -0.5);
                obliqueShape.lineTo(side * 1.3, -0.3);
                obliqueShape.quadraticCurveTo(side * 1.4, 0.5, side * 1.2, 1.0);
                
                const obliqueGeo = new THREE.ExtrudeGeometry(obliqueShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
                const obliqueMat = new THREE.MeshStandardMaterial({ color: 0xe0a070, roughness: 0.65 });
                const oblique = new THREE.Mesh(obliqueGeo, obliqueMat);
                oblique.position.z = 0.8;
                oblique.castShadow = true;
                oblique.userData.muscle = '腹外斜肌';
                oblique.userData.isMuscle = true;
                bodyGroup.add(oblique);
                muscleMeshes.push(oblique);
            }
            
            // === 斜方肌 ===
            const trapsShape = new THREE.Shape();
            trapsShape.moveTo(-2.2, 3.4);
            trapsShape.quadraticCurveTo(-1.5, 3.8, 0, 3.9);
            trapsShape.quadraticCurveTo(1.5, 3.8, 2.2, 3.4);
            trapsShape.lineTo(1.8, 3.0);
            trapsShape.quadraticCurveTo(1, 3.3, 0, 3.4);
            trapsShape.quadraticCurveTo(-1, 3.3, -1.8, 3.0);
            trapsShape.lineTo(-2.2, 3.4);
            
            const trapsGeo = new THREE.ExtrudeGeometry(trapsShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15 });
            const trapsMat = new THREE.MeshStandardMaterial({ color: 0xdca06c, roughness: 0.6 });
            const traps = new THREE.Mesh(trapsGeo, trapsMat);
            traps.position.set(0, 0, -0.2);
            traps.castShadow = true;
            traps.userData.muscle = '斜方肌';
            traps.userData.isMuscle = true;
            bodyGroup.add(traps);
            muscleMeshes.push(traps);
            
            // === 肩部 ===
            const shoulderGeo = new THREE.SphereGeometry(0.65, 24, 24);
            const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xdca06c, roughness: 0.6 });
            
            const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
            shoulderL.position.set(-2.1, 3.0, 0);
            shoulderL.scale.set(1, 0.9, 1.1);
            shoulderL.castShadow = true;
            shoulderL.userData.muscle = '肩前束';
            shoulderL.userData.isMuscle = true;
            bodyGroup.add(shoulderL);
            muscleMeshes.push(shoulderL);
            
            const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
            shoulderR.position.set(2.1, 3.0, 0);
            shoulderR.scale.set(1, 0.9, 1.1);
            shoulderR.castShadow = true;
            shoulderR.userData.muscle = '肩前束';
            shoulderR.userData.isMuscle = true;
            bodyGroup.add(shoulderR);
            muscleMeshes.push(shoulderR);
            
            // === 上臂（肱二头肌侧） ===
            const upperArmGeo = new THREE.CapsuleGeometry(0.4, 1.6, 8, 16);
            const armMat = new THREE.MeshStandardMaterial({ color: 0xdca06c, roughness: 0.65 });
            
            const bicepL = new THREE.Mesh(upperArmGeo, armMat.clone());
            bicepL.position.set(-2.3, 1.8, 0.2);
            bicepL.rotation.z = 0.15;
            bicepL.castShadow = true;
            bicepL.userData.muscle = '肱二头肌';
            bicepL.userData.isMuscle = true;
            bodyGroup.add(bicepL);
            muscleMeshes.push(bicepL);
            
            const bicepR = new THREE.Mesh(upperArmGeo, armMat.clone());
            bicepR.position.set(2.3, 1.8, 0.2);
            bicepR.rotation.z = -0.15;
            bicepR.castShadow = true;
            bicepR.userData.muscle = '肱二头肌';
            bicepR.userData.isMuscle = true;
            bodyGroup.add(bicepR);
            muscleMeshes.push(bicepR);
            
            // 肱三头肌（后侧）
            const tricepL = new THREE.Mesh(upperArmGeo, armMat.clone());
            tricepL.position.set(-2.3, 1.8, -0.2);
            tricepL.rotation.z = 0.15;
            tricepL.scale.set(0.85, 0.9, 0.85);
            tricepL.castShadow = true;
            tricepL.userData.muscle = '肱三头肌';
            tricepL.userData.isMuscle = true;
            bodyGroup.add(tricepL);
            muscleMeshes.push(tricepL);
            
            const tricepR = new THREE.Mesh(upperArmGeo, armMat.clone());
            tricepR.position.set(2.3, 1.8, -0.2);
            tricepR.rotation.z = -0.15;
            tricepR.scale.set(0.85, 0.9, 0.85);
            tricepR.castShadow = true;
            tricepR.userData.muscle = '肱三头肌';
            tricepR.userData.isMuscle = true;
            bodyGroup.add(tricepR);
            muscleMeshes.push(tricepR);
            
            // === 前臂 ===
            const forearmGeo = new THREE.CapsuleGeometry(0.32, 1.4, 8, 16);
            const forearmMat = new THREE.MeshStandardMaterial({ color: 0xd4a070, roughness: 0.7 });
            
            const forearmL = new THREE.Mesh(forearmGeo, forearmMat.clone());
            forearmL.position.set(-2.1, 0.3, 0.1);
            forearmL.rotation.z = 0.1;
            forearmL.castShadow = true;
            forearmL.userData.muscle = '前臂肌群';
            forearmL.userData.isMuscle = true;
            bodyGroup.add(forearmL);
            muscleMeshes.push(forearmL);
            
            const forearmR = new THREE.Mesh(forearmGeo, forearmMat.clone());
            forearmR.position.set(2.1, 0.3, 0.1);
            forearmR.rotation.z = -0.1;
            forearmR.castShadow = true;
            forearmR.userData.muscle = '前臂肌群';
            forearmR.userData.isMuscle = true;
            bodyGroup.add(forearmR);
            muscleMeshes.push(forearmR);
            
            // === 背部 - 背阔肌 ===
            const latShape = new THREE.Shape();
            latShape.moveTo(-0.5, 2.5);
            latShape.quadraticCurveTo(-2, 1.5, -2.5, 0);
            latShape.quadraticCurveTo(-2, -0.5, -1, 0);
            latShape.quadraticCurveTo(-1.5, 1.2, -0.5, 2);
            latShape.lineTo(-0.5, 2.5);
            
            const latGeo = new THREE.ExtrudeGeometry(latShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.1 });
            const backMat = new THREE.MeshStandardMaterial({ color: 0xd09868, roughness: 0.6 });
            
            const latL = new THREE.Mesh(latGeo, backMat.clone());
            latL.position.z = -0.9;
            latL.rotation.x = -0.1;
            latL.castShadow = true;
            latL.userData.muscle = '背阔肌';
            latL.userData.isMuscle = true;
            bodyGroup.add(latL);
            muscleMeshes.push(latL);
            
            const latR = latL.clone();
            latR.scale.x = -1;
            latR.userData.muscle = '背阔肌';
            latR.userData.isMuscle = true;
            bodyGroup.add(latR);
            muscleMeshes.push(latR);
            
            // 中背部
            const midBackShape = new THREE.Shape();
            midBackShape.moveTo(-1.2, 2.8);
            midBackShape.quadraticCurveTo(-0.5, 3.0, 0, 2.9);
            midBackShape.quadraticCurveTo(0.5, 3.0, 1.2, 2.8);
            midBackShape.lineTo(1.0, 0.5);
            midBackShape.quadraticCurveTo(0.5, 0.8, 0, 0.6);
            midBackShape.quadraticCurveTo(-0.5, 0.8, -1.0, 0.5);
            midBackShape.lineTo(-1.2, 2.8);
            
            const midBackGeo = new THREE.ExtrudeGeometry(midBackShape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08 });
            const midBack = new THREE.Mesh(midBackGeo, backMat.clone());
            midBack.position.z = -1.0;
            midBack.castShadow = true;
            midBack.userData.muscle = '中背部';
            midBack.userData.isMuscle = true;
            bodyGroup.add(midBack);
            muscleMeshes.push(midBack);
            
            // 下背部
            const lowerBackGeo = new THREE.BoxGeometry(1.8, 1.0, 0.3);
            const lowerBack = new THREE.Mesh(lowerBackGeo, backMat.clone());
            lowerBack.position.set(0, -0.8, -0.95);
            lowerBack.castShadow = true;
            lowerBack.userData.muscle = '下背部';
            lowerBack.userData.isMuscle = true;
            bodyGroup.add(lowerBack);
            muscleMeshes.push(lowerBack);
            
            // === 臀部 ===
            const gluteGeo = new THREE.SphereGeometry(1.0, 24, 24);
            const gluteMat = new THREE.MeshStandardMaterial({ color: 0xcc9060, roughness: 0.6 });
            
            const gluteL = new THREE.Mesh(gluteGeo, gluteMat.clone());
            gluteL.position.set(-0.7, -1.8, -0.5);
            gluteL.scale.set(0.9, 0.8, 1.1);
            gluteL.castShadow = true;
            gluteL.userData.muscle = '臀大肌';
            gluteL.userData.isMuscle = true;
            bodyGroup.add(gluteL);
            muscleMeshes.push(gluteL);
            
            const gluteR = new THREE.Mesh(gluteGeo, gluteMat.clone());
            gluteR.position.set(0.7, -1.8, -0.5);
            gluteR.scale.set(0.9, 0.8, 1.1);
            gluteR.castShadow = true;
            gluteR.userData.muscle = '臀大肌';
            gluteR.userData.isMuscle = true;
            bodyGroup.add(gluteR);
            muscleMeshes.push(gluteR);
            
            // === 大腿 - 股四头肌（前） ===
            const thighGeo = new THREE.CapsuleGeometry(0.55, 2.0, 8, 16);
            const legMat = new THREE.MeshStandardMaterial({ color: 0xd4a070, roughness: 0.65 });
            
            const quadL = new THREE.Mesh(thighGeo, legMat.clone());
            quadL.position.set(-0.65, -3.5, 0.3);
            quadL.castShadow = true;
            quadL.userData.muscle = '股四头肌';
            quadL.userData.isMuscle = true;
            bodyGroup.add(quadL);
            muscleMeshes.push(quadL);
            
            const quadR = new THREE.Mesh(thighGeo, legMat.clone());
            quadR.position.set(0.65, -3.5, 0.3);
            quadR.castShadow = true;
            quadR.userData.muscle = '股四头肌';
            quadR.userData.isMuscle = true;
            bodyGroup.add(quadR);
            muscleMeshes.push(quadR);
            
            // 腘绳肌（后）
            const hamstringL = new THREE.Mesh(thighGeo, legMat.clone());
            hamstringL.position.set(-0.65, -3.5, -0.3);
            hamstringL.scale.set(0.75, 0.9, 0.7);
            hamstringL.castShadow = true;
            hamstringL.userData.muscle = '腘绳肌';
            hamstringL.userData.isMuscle = true;
            bodyGroup.add(hamstringL);
            muscleMeshes.push(hamstringL);
            
            const hamstringR = new THREE.Mesh(thighGeo, legMat.clone());
            hamstringR.position.set(0.65, -3.5, -0.3);
            hamstringR.scale.set(0.75, 0.9, 0.7);
            hamstringR.castShadow = true;
            hamstringR.userData.muscle = '腘绳肌';
            hamstringR.userData.isMuscle = true;
            bodyGroup.add(hamstringR);
            muscleMeshes.push(hamstringR);
            
            // === 小腿 ===
            const calfGeo = new THREE.CapsuleGeometry(0.38, 1.6, 8, 16);
            const calfMat = new THREE.MeshStandardMaterial({ color: 0xd09868, roughness: 0.7 });
            
            const calfL = new THREE.Mesh(calfGeo, calfMat.clone());
            calfL.position.set(-0.6, -5.6, -0.1);
            calfL.castShadow = true;
            calfL.userData.muscle = '小腿肌群';
            calfL.userData.isMuscle = true;
            bodyGroup.add(calfL);
            muscleMeshes.push(calfL);
            
            const calfR = new THREE.Mesh(calfGeo, calfMat.clone());
            calfR.position.set(0.6, -5.6, -0.1);
            calfR.castShadow = true;
            calfR.userData.muscle = '小腿肌群';
            calfR.userData.isMuscle = true;
            bodyGroup.add(calfR);
            muscleMeshes.push(calfR);
            
            // 调整整体位置
            bodyGroup.position.y = 1.5;
            scene.add(bodyGroup);
        }
        
        // 鼠标移动
        function onMouseMove(event) {
            const container = document.getElementById('body-3d-container');
            const rect = container.getBoundingClientRect();
            
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            
            const tooltip = document.getElementById('muscle-tooltip');
            
            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const muscleName = mesh.userData.muscle;
                
                if (hoveredMuscle !== mesh) {
                    // 恢复之前的
                    if (hoveredMuscle && hoveredMuscle !== selectedMuscle3D) {
                        setMuscleEmissive(hoveredMuscle, 0x000000);
                    }
                    
                    hoveredMuscle = mesh;
                    if (mesh !== selectedMuscle3D) {
                        setMuscleEmissive(mesh, 0xff6b35, 0.3);
                    }
                    
                    document.body.style.cursor = 'pointer';
                }
                
                // 显示提示
                tooltip.textContent = muscleName;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 10) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle !== selectedMuscle3D) {
                    setMuscleEmissive(hoveredMuscle, 0x000000);
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }
        
        // 鼠标点击
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            
            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const muscleName = mesh.userData.muscle;
                
                // 清除之前选中的
                if (selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === selectedMuscle3D) {
                            setMuscleEmissive(m, 0x000000);
                        }
                    });
                }
                
                selectedMuscle3D = muscleName;
                
                // 高亮所有同名肌肉
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === muscleName) {
                        setMuscleEmissive(m, 0xff8c00, 0.5);
                    }
                });
                
                // 调用原有的选择函数
                selectMuscle(muscleName, null);
            }
        }
        
        function onMouseLeave() {
            const tooltip = document.getElementById('muscle-tooltip');
            tooltip.classList.remove('visible');
            
            if (hoveredMuscle && hoveredMuscle !== selectedMuscle3D) {
                setMuscleEmissive(hoveredMuscle, 0x000000);
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        // 设置肌肉自发光
        function setMuscleEmissive(mesh, color, intensity = 0) {
            if (mesh.material) {
                mesh.material.emissive.setHex(color);
                mesh.material.emissiveIntensity = intensity;
                mesh.material.needsUpdate = true;
            }
        }
        
        function onWindowResize() {
            const container = document.getElementById('body-3d-container');
            if (!container || !camera || !renderer) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
'''

print("=== 3D人体代码生成完成 ===")
print(f"Three.js 导入: {len(threejs_import)} 字符")
print(f"CSS样式: {len(css_3d)} 字符")
print(f"HTML容器: {len(html_3d_body)} 字符")
print(f"JS实现: {len(js_3d_body)} 字符")

# 写入到文件供后续使用
with open('three_body_code.txt', 'w', encoding='utf-8') as f:
    f.write("=== THREEJS_IMPORT ===\n")
    f.write(threejs_import)
    f.write("\n=== CSS_3D ===\n")
    f.write(css_3d)
    f.write("\n=== HTML_3D_BODY ===\n")
    f.write(html_3d_body)
    f.write("\n=== JS_3D_BODY ===\n")
    f.write(js_3d_body)

print("\n已保存到 three_body_code.txt")
