
        // ============ 3D人体模型 V2 - 更精致版本 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleMeshes = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        
        // 初始化3D场景
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            // 场景
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f0f1a);
            
            // 相机
            camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
            camera.position.set(0, 1, 14);
            
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
            controls.minDistance = 8;
            controls.maxDistance = 30;
            controls.target.set(0, 1, 0);
            controls.maxPolarAngle = Math.PI * 0.9;
            controls.minPolarAngle = Math.PI * 0.1;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.3;
            
            // 光照系统
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
            scene.add(ambientLight);
            
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
            mainLight.position.set(4, 6, 5);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 2048;
            mainLight.shadow.mapSize.height = 2048;
            mainLight.shadow.camera.near = 0.5;
            mainLight.shadow.camera.far = 50;
            mainLight.shadow.camera.left = -8;
            mainLight.shadow.camera.right = 8;
            mainLight.shadow.camera.top = 8;
            mainLight.shadow.camera.bottom = -8;
            scene.add(mainLight);
            
            const fillLight = new THREE.DirectionalLight(0x8899ff, 0.25);
            fillLight.position.set(-5, 3, -3);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffaa77, 0.35);
            rimLight.position.set(0, 4, -6);
            scene.add(rimLight);
            
            const bottomLight = new THREE.DirectionalLight(0x667788, 0.2);
            bottomLight.position.set(0, -4, 3);
            scene.add(bottomLight);
            
            // 射线检测
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            // 创建人体
            create3DBody();
            
            // 事件监听
            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
            renderer.domElement.addEventListener('mouseleave', onMouseLeave);
            
            window.addEventListener('resize', onWindowResize);
            
            // 开始动画
            animate();
            
            // 鼠标交互控制自动旋转
            renderer.domElement.addEventListener('mouseenter', () => {
                controls.autoRotate = false;
            });
            renderer.domElement.addEventListener('mouseleave', () => {
                controls.autoRotate = true;
            });
        }
        
        // 创建带圆角的圆柱体（模拟肌肉）
        function createMuscleLimb(radiusTop, radiusBottom, height, color) {
            const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 24, 4, false);
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.55,
                metalness: 0.05,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }
        
        // 创建球形肌肉
        function createMuscleSphere(radius, color, scaleX, scaleY, scaleZ) {
            const geo = new THREE.SphereGeometry(radius, 24, 24);
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.55,
                metalness: 0.05,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.scale.set(scaleX, scaleY, scaleZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }
        
        // 创建3D人体
        function create3DBody() {
            bodyGroup = new THREE.Group();
            
            const skinColor = 0xe8b896;
            const muscleColor = 0xddaa80;
            const darkMuscle = 0xcc9966;
            
            // === 头部 ===
            const head = createMuscleSphere(1.0, skinColor, 0.92, 1.15, 1.0);
            head.position.y = 4.5;
            bodyGroup.add(head);
            
            // 下颌
            const jaw = createMuscleSphere(0.55, skinColor, 1.1, 0.7, 0.9);
            jaw.position.set(0, 3.95, 0.3);
            bodyGroup.add(jaw);
            
            // 颈部
            const neck = createMuscleLimb(0.42, 0.5, 0.7, skinColor);
            neck.position.y = 3.6;
            bodyGroup.add(neck);
            
            // === 斜方肌 ===
            const trapsMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.55, metalness: 0.05 });
            
            // 左斜方肌
            const trapsLGeo = new THREE.SphereGeometry(0.8, 20, 20);
            const trapsL = new THREE.Mesh(trapsLGeo, trapsMat.clone());
            trapsL.position.set(-1.4, 3.45, 0);
            trapsL.scale.set(1.1, 0.6, 1.0);
            trapsL.castShadow = true;
            trapsL.userData.muscle = '斜方肌';
            trapsL.userData.isMuscle = true;
            bodyGroup.add(trapsL);
            muscleMeshes.push(trapsL);
            
            // 右斜方肌
            const trapsR = new THREE.Mesh(trapsLGeo, trapsMat.clone());
            trapsR.position.set(1.4, 3.45, 0);
            trapsR.scale.set(1.1, 0.6, 1.0);
            trapsR.castShadow = true;
            trapsR.userData.muscle = '斜方肌';
            trapsR.userData.isMuscle = true;
            bodyGroup.add(trapsR);
            muscleMeshes.push(trapsR);
            
            // 上背部斜方肌连接
            const trapsUpperGeo = new THREE.SphereGeometry(0.6, 20, 20);
            const trapsUpper = new THREE.Mesh(trapsUpperGeo, trapsMat.clone());
            trapsUpper.position.set(0, 3.5, -0.3);
            trapsUpper.scale.set(1.8, 0.5, 0.9);
            trapsUpper.castShadow = true;
            trapsUpper.userData.muscle = '斜方肌';
            trapsUpper.userData.isMuscle = true;
            bodyGroup.add(trapsUpper);
            muscleMeshes.push(trapsUpper);
            
            // === 肩部 ===
            const shoulderMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.55, metalness: 0.05 });
            
            const shoulderGeo = new THREE.SphereGeometry(0.55, 24, 24);
            const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
            shoulderL.position.set(-1.95, 3.1, 0);
            shoulderL.scale.set(1.0, 0.95, 1.1);
            shoulderL.castShadow = true;
            shoulderL.userData.muscle = '肩前束';
            shoulderL.userData.isMuscle = true;
            bodyGroup.add(shoulderL);
            muscleMeshes.push(shoulderL);
            
            const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
            shoulderR.position.set(1.95, 3.1, 0);
            shoulderR.scale.set(1.0, 0.95, 1.1);
            shoulderR.castShadow = true;
            shoulderR.userData.muscle = '肩前束';
            shoulderR.userData.isMuscle = true;
            bodyGroup.add(shoulderR);
            muscleMeshes.push(shoulderR);
            
            // === 躯干 ===
            const torsoMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.03 });
            
            // 胸部躯干主体
            const chestTorsoGeo = new THREE.SphereGeometry(1.8, 32, 32);
            const chestTorso = new THREE.Mesh(chestTorsoGeo, torsoMat.clone());
            chestTorso.position.set(0, 2.2, 0);
            chestTorso.scale.set(1.1, 0.85, 0.8);
            chestTorso.castShadow = true;
            bodyGroup.add(chestTorso);
            
            // 腹部躯干
            const abTorsoGeo = new THREE.SphereGeometry(1.5, 32, 32);
            const abTorso = new THREE.Mesh(abTorsoGeo, torsoMat.clone());
            abTorso.position.set(0, 0.7, -0.1);
            abTorso.scale.set(1.0, 1.0, 0.75);
            abTorso.castShadow = true;
            bodyGroup.add(abTorso);
            
            // 腰部
            const waistGeo = new THREE.SphereGeometry(1.3, 24, 24);
            const waist = new THREE.Mesh(waistGeo, torsoMat.clone());
            waist.position.set(0, -0.4, -0.15);
            waist.scale.set(1.0, 0.7, 0.7);
            waist.castShadow = true;
            bodyGroup.add(waist);
            
            // === 胸大肌 ===
            const chestMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.5, metalness: 0.08 });
            
            const chestGeo = new THREE.SphereGeometry(0.9, 24, 24);
            const chestL = new THREE.Mesh(chestGeo, chestMat.clone());
            chestL.position.set(-0.95, 2.4, 0.85);
            chestL.scale.set(1.0, 1.1, 0.6);
            chestL.castShadow = true;
            chestL.userData.muscle = '胸大肌';
            chestL.userData.isMuscle = true;
            bodyGroup.add(chestL);
            muscleMeshes.push(chestL);
            
            const chestR = new THREE.Mesh(chestGeo, chestMat.clone());
            chestR.position.set(0.95, 2.4, 0.85);
            chestR.scale.set(1.0, 1.1, 0.6);
            chestR.castShadow = true;
            chestR.userData.muscle = '胸大肌';
            chestR.userData.isMuscle = true;
            bodyGroup.add(chestR);
            muscleMeshes.push(chestR);
            
            // === 腹肌 ===
            const abMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.55, metalness: 0.05 });
            
            for (let i = 0; i < 4; i++) {
                const abGeo = new THREE.SphereGeometry(0.32, 16, 16);
                const ab = new THREE.Mesh(abGeo, abMat.clone());
                ab.position.set(0, 1.6 - i * 0.45, 0.95);
                ab.scale.set(1.8, 1.0, 0.5);
                ab.castShadow = true;
                ab.userData.muscle = '腹直肌';
                ab.userData.isMuscle = true;
                bodyGroup.add(ab);
                muscleMeshes.push(ab);
            }
            
            // 腹外斜肌
            const obliqueMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.55, metalness: 0.05 });
            for (let side of [-1, 1]) {
                for (let i = 0; i < 3; i++) {
                    const oblGeo = new THREE.SphereGeometry(0.25, 12, 12);
                    const obl = new THREE.Mesh(oblGeo, obliqueMat.clone());
                    obl.position.set(side * 1.2, 1.4 - i * 0.5, 0.7);
                    obl.scale.set(1.0, 1.3, 0.6);
                    obl.rotation.z = side * 0.2;
                    obl.castShadow = true;
                    obl.userData.muscle = '腹外斜肌';
                    obl.userData.isMuscle = true;
                    bodyGroup.add(obl);
                    muscleMeshes.push(obl);
                }
            }
            
            // === 背部 - 背阔肌 ===
            const backMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.55, metalness: 0.05 });
            
            const latGeo = new THREE.SphereGeometry(0.85, 24, 24);
            const latL = new THREE.Mesh(latGeo, backMat.clone());
            latL.position.set(-1.5, 1.5, -0.6);
            latL.scale.set(0.7, 1.5, 0.5);
            latL.rotation.z = -0.2;
            latL.castShadow = true;
            latL.userData.muscle = '背阔肌';
            latL.userData.isMuscle = true;
            bodyGroup.add(latL);
            muscleMeshes.push(latL);
            
            const latR = new THREE.Mesh(latGeo, backMat.clone());
            latR.position.set(1.5, 1.5, -0.6);
            latR.scale.set(0.7, 1.5, 0.5);
            latR.rotation.z = 0.2;
            latR.castShadow = true;
            latR.userData.muscle = '背阔肌';
            latR.userData.isMuscle = true;
            bodyGroup.add(latR);
            muscleMeshes.push(latR);
            
            // 中背部
            const midBackGeo = new THREE.SphereGeometry(0.9, 24, 24);
            const midBack = new THREE.Mesh(midBackGeo, backMat.clone());
            midBack.position.set(0, 1.8, -0.9);
            midBack.scale.set(1.1, 1.4, 0.35);
            midBack.castShadow = true;
            midBack.userData.muscle = '中背部';
            midBack.userData.isMuscle = true;
            bodyGroup.add(midBack);
            muscleMeshes.push(midBack);
            
            // 下背部
            const lowerBackGeo = new THREE.SphereGeometry(0.7, 20, 20);
            const lowerBack = new THREE.Mesh(lowerBackGeo, backMat.clone());
            lowerBack.position.set(0, 0.0, -0.85);
            lowerBack.scale.set(1.2, 0.8, 0.4);
            lowerBack.castShadow = true;
            lowerBack.userData.muscle = '下背部';
            lowerBack.userData.isMuscle = true;
            bodyGroup.add(lowerBack);
            muscleMeshes.push(lowerBack);
            
            // === 上臂 - 肱二头肌（前） ===
            const bicepMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.55, metalness: 0.05 });
            
            const bicepGeo = new THREE.SphereGeometry(0.4, 20, 20);
            const bicepL = new THREE.Mesh(bicepGeo, bicepMat.clone());
            bicepL.position.set(-2.1, 2.1, 0.4);
            bicepL.scale.set(0.9, 1.8, 1.0);
            bicepL.rotation.z = 0.15;
            bicepL.castShadow = true;
            bicepL.userData.muscle = '肱二头肌';
            bicepL.userData.isMuscle = true;
            bodyGroup.add(bicepL);
            muscleMeshes.push(bicepL);
            
            const bicepR = new THREE.Mesh(bicepGeo, bicepMat.clone());
            bicepR.position.set(2.1, 2.1, 0.4);
            bicepR.scale.set(0.9, 1.8, 1.0);
            bicepR.rotation.z = -0.15;
            bicepR.castShadow = true;
            bicepR.userData.muscle = '肱二头肌';
            bicepR.userData.isMuscle = true;
            bodyGroup.add(bicepR);
            muscleMeshes.push(bicepR);
            
            // 上臂 - 肱三头肌（后）
            const tricepMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.55, metalness: 0.05 });
            
            const tricepGeo = new THREE.SphereGeometry(0.35, 20, 20);
            const tricepL = new THREE.Mesh(tricepGeo, tricepMat.clone());
            tricepL.position.set(-2.15, 2.0, -0.3);
            tricepL.scale.set(0.8, 1.6, 0.85);
            tricepL.rotation.z = 0.1;
            tricepL.castShadow = true;
            tricepL.userData.muscle = '肱三头肌';
            tricepL.userData.isMuscle = true;
            bodyGroup.add(tricepL);
            muscleMeshes.push(tricepL);
            
            const tricepR = new THREE.Mesh(tricepGeo, tricepMat.clone());
            tricepR.position.set(2.15, 2.0, -0.3);
            tricepR.scale.set(0.8, 1.6, 0.85);
            tricepR.rotation.z = -0.1;
            tricepR.castShadow = true;
            tricepR.userData.muscle = '肱三头肌';
            tricepR.userData.isMuscle = true;
            bodyGroup.add(tricepR);
            muscleMeshes.push(tricepR);
            
            // 上臂骨骼基础
            const upperArmMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.03 });
            const upperArmGeo = new THREE.SphereGeometry(0.38, 20, 20);
            
            const upperArmL = new THREE.Mesh(upperArmGeo, upperArmMat.clone());
            upperArmL.position.set(-2.1, 2.05, 0);
            upperArmL.scale.set(0.95, 1.75, 0.95);
            upperArmL.rotation.z = 0.12;
            upperArmL.castShadow = true;
            bodyGroup.add(upperArmL);
            
            const upperArmR = new THREE.Mesh(upperArmGeo, upperArmMat.clone());
            upperArmR.position.set(2.1, 2.05, 0);
            upperArmR.scale.set(0.95, 1.75, 0.95);
            upperArmR.rotation.z = -0.12;
            upperArmR.castShadow = true;
            bodyGroup.add(upperArmR);
            
            // === 前臂 ===
            const forearmMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.03 });
            
            const forearmGeo = new THREE.SphereGeometry(0.3, 20, 20);
            const forearmL = new THREE.Mesh(forearmGeo, forearmMat.clone());
            forearmL.position.set(-1.95, 0.5, 0.1);
            forearmL.scale.set(0.9, 1.5, 0.85);
            forearmL.rotation.z = 0.08;
            forearmL.castShadow = true;
            forearmL.userData.muscle = '前臂肌群';
            forearmL.userData.isMuscle = true;
            bodyGroup.add(forearmL);
            muscleMeshes.push(forearmL);
            
            const forearmR = new THREE.Mesh(forearmGeo, forearmMat.clone());
            forearmR.position.set(1.95, 0.5, 0.1);
            forearmR.scale.set(0.9, 1.5, 0.85);
            forearmR.rotation.z = -0.08;
            forearmR.castShadow = true;
            forearmR.userData.muscle = '前臂肌群';
            forearmR.userData.isMuscle = true;
            bodyGroup.add(forearmR);
            muscleMeshes.push(forearmR);
            
            // === 臀部 ===
            const gluteMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.5, metalness: 0.05 });
            
            const gluteGeo = new THREE.SphereGeometry(0.8, 24, 24);
            const gluteL = new THREE.Mesh(gluteGeo, gluteMat.clone());
            gluteL.position.set(-0.65, -0.9, -0.5);
            gluteL.scale.set(1.0, 0.85, 1.2);
            gluteL.castShadow = true;
            gluteL.userData.muscle = '臀大肌';
            gluteL.userData.isMuscle = true;
            bodyGroup.add(gluteL);
            muscleMeshes.push(gluteL);
            
            const gluteR = new THREE.Mesh(gluteGeo, gluteMat.clone());
            gluteR.position.set(0.65, -0.9, -0.5);
            gluteR.scale.set(1.0, 0.85, 1.2);
            gluteR.castShadow = true;
            gluteR.userData.muscle = '臀大肌';
            gluteR.userData.isMuscle = true;
            bodyGroup.add(gluteR);
            muscleMeshes.push(gluteR);
            
            // === 大腿 - 股四头肌（前） ===
            const quadMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.55, metalness: 0.05 });
            
            const quadGeo = new THREE.SphereGeometry(0.55, 24, 24);
            const quadL = new THREE.Mesh(quadGeo, quadMat.clone());
            quadL.position.set(-0.65, -2.8, 0.35);
            quadL.scale.set(0.95, 2.0, 0.95);
            quadL.castShadow = true;
            quadL.userData.muscle = '股四头肌';
            quadL.userData.isMuscle = true;
            bodyGroup.add(quadL);
            muscleMeshes.push(quadL);
            
            const quadR = new THREE.Mesh(quadGeo, quadMat.clone());
            quadR.position.set(0.65, -2.8, 0.35);
            quadR.scale.set(0.95, 2.0, 0.95);
            quadR.castShadow = true;
            quadR.userData.muscle = '股四头肌';
            quadR.userData.isMuscle = true;
            bodyGroup.add(quadR);
            muscleMeshes.push(quadR);
            
            // 大腿 - 腘绳肌（后）
            const hamstringMat = new THREE.MeshStandardMaterial({ color: darkMuscle, roughness: 0.55, metalness: 0.05 });
            
            const hamstringGeo = new THREE.SphereGeometry(0.48, 20, 20);
            const hamstringL = new THREE.Mesh(hamstringGeo, hamstringMat.clone());
            hamstringL.position.set(-0.65, -2.9, -0.3);
            hamstringL.scale.set(0.8, 1.7, 0.8);
            hamstringL.castShadow = true;
            hamstringL.userData.muscle = '腘绳肌';
            hamstringL.userData.isMuscle = true;
            bodyGroup.add(hamstringL);
            muscleMeshes.push(hamstringL);
            
            const hamstringR = new THREE.Mesh(hamstringGeo, hamstringMat.clone());
            hamstringR.position.set(0.65, -2.9, -0.3);
            hamstringR.scale.set(0.8, 1.7, 0.8);
            hamstringR.castShadow = true;
            hamstringR.userData.muscle = '腘绳肌';
            hamstringR.userData.isMuscle = true;
            bodyGroup.add(hamstringR);
            muscleMeshes.push(hamstringR);
            
            // 大腿基础
            const thighMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.03 });
            const thighGeo = new THREE.SphereGeometry(0.55, 24, 24);
            
            const thighL = new THREE.Mesh(thighGeo, thighMat.clone());
            thighL.position.set(-0.65, -2.85, 0);
            thighL.scale.set(0.95, 2.0, 0.9);
            thighL.castShadow = true;
            bodyGroup.add(thighL);
            
            const thighR = new THREE.Mesh(thighGeo, thighMat.clone());
            thighR.position.set(0.65, -2.85, 0);
            thighR.scale.set(0.95, 2.0, 0.9);
            thighR.castShadow = true;
            bodyGroup.add(thighR);
            
            // === 小腿 ===
            const calfMat = new THREE.MeshStandardMaterial({ color: muscleColor, roughness: 0.55, metalness: 0.05 });
            
            const calfGeo = new THREE.SphereGeometry(0.38, 20, 20);
            const calfL = new THREE.Mesh(calfGeo, calfMat.clone());
            calfL.position.set(-0.6, -4.9, -0.15);
            calfL.scale.set(0.85, 1.5, 0.75);
            calfL.castShadow = true;
            calfL.userData.muscle = '小腿肌群';
            calfL.userData.isMuscle = true;
            bodyGroup.add(calfL);
            muscleMeshes.push(calfL);
            
            const calfR = new THREE.Mesh(calfGeo, calfMat.clone());
            calfR.position.set(0.6, -4.9, -0.15);
            calfR.scale.set(0.85, 1.5, 0.75);
            calfR.castShadow = true;
            calfR.userData.muscle = '小腿肌群';
            calfR.userData.isMuscle = true;
            bodyGroup.add(calfR);
            muscleMeshes.push(calfR);
            
            // 胫骨前
            const shinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.03 });
            const shinGeo = new THREE.SphereGeometry(0.3, 20, 20);
            
            const shinL = new THREE.Mesh(shinGeo, shinMat.clone());
            shinL.position.set(-0.6, -4.9, 0.2);
            shinL.scale.set(0.7, 1.4, 0.6);
            shinL.castShadow = true;
            bodyGroup.add(shinL);
            
            const shinR = new THREE.Mesh(shinGeo, shinMat.clone());
            shinR.position.set(0.6, -4.9, 0.2);
            shinR.scale.set(0.7, 1.4, 0.6);
            shinR.castShadow = true;
            bodyGroup.add(shinR);
            
            // 调整整体位置
            bodyGroup.position.y = 1.0;
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
                    if (hoveredMuscle && hoveredMuscle !== selectedMuscle3D) {
                        setMuscleHighlight(hoveredMuscle, false);
                    }
                    
                    hoveredMuscle = mesh;
                    if (mesh.userData.muscle !== selectedMuscle3D) {
                        setMuscleHighlight(mesh, true, false);
                    }
                    
                    document.body.style.cursor = 'pointer';
                }
                
                tooltip.textContent = muscleName;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    setMuscleHighlight(hoveredMuscle, false);
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
                
                if (selectedMuscle3D === muscleName) return;
                
                if (selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === selectedMuscle3D) {
                            setMuscleSelected(m, false);
                        }
                    });
                }
                
                selectedMuscle3D = muscleName;
                
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === muscleName) {
                        setMuscleSelected(m, true);
                    }
                });
                
                selectMuscle(muscleName, null);
            }
        }
        
        function onMouseLeave() {
            const tooltip = document.getElementById('muscle-tooltip');
            tooltip.classList.remove('visible');
            
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                setMuscleHighlight(hoveredMuscle, false);
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        function setMuscleHighlight(mesh, isHover, isSelected) {
            if (mesh.material) {
                if (isSelected) {
                    mesh.material.emissive.setHex(0xff8c00);
                    mesh.material.emissiveIntensity = 0.6;
                } else if (isHover) {
                    mesh.material.emissive.setHex(0xff6b35);
                    mesh.material.emissiveIntensity = 0.35;
                } else {
                    mesh.material.emissive.setHex(0x000000);
                    mesh.material.emissiveIntensity = 0;
                }
                mesh.material.needsUpdate = true;
            }
        }
        
        function setMuscleSelected(mesh, selected) {
            if (mesh.material) {
                if (selected) {
                    mesh.material.emissive.setHex(0xff8c00);
                    mesh.material.emissiveIntensity = 0.6;
                } else {
                    mesh.material.emissive.setHex(0x000000);
                    mesh.material.emissiveIntensity = 0;
                }
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
