
        // ============ 3D人体模型 V3 - 精致版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleMeshes = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0d1117);
            
            camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            camera.position.set(0, 0.5, 16);
            
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.insertBefore(renderer.domElement, container.firstChild);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.enablePan = false;
            controls.minDistance = 10;
            controls.maxDistance = 35;
            controls.target.set(0, 0.5, 0);
            controls.maxPolarAngle = Math.PI * 0.92;
            controls.minPolarAngle = Math.PI * 0.08;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.4;
            
            // 光照系统
            const ambient = new THREE.AmbientLight(0xffffff, 0.3);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
            keyLight.position.set(5, 8, 6);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = 2048;
            keyLight.shadow.mapSize.height = 2048;
            keyLight.shadow.camera.near = 0.5;
            keyLight.shadow.camera.far = 50;
            keyLight.shadow.camera.left = -8;
            keyLight.shadow.camera.right = 8;
            keyLight.shadow.camera.top = 10;
            keyLight.shadow.camera.bottom = -10;
            scene.add(keyLight);
            
            const fillLight = new THREE.DirectionalLight(0x8899bb, 0.3);
            fillLight.position.set(-6, 3, -4);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffaa77, 0.4);
            rimLight.position.set(0, 5, -7);
            scene.add(rimLight);
            
            const hemiLight = new THREE.HemisphereLight(0x8899aa, 0x443322, 0.25);
            scene.add(hemiLight);
            
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
            
            // 皮肤色阶
            const skinLight = 0xeec9a8;
            const skinMid = 0xddb896;
            const skinDark = 0xccaa88;
            const muscleLight = 0xe5b890;
            const muscleMid = 0xd8a878;
            const muscleDark = 0xc89868;
            
            // ====== 头部 ======
            const headGeo = new THREE.SphereGeometry(0.9, 32, 32);
            const headMat = new THREE.MeshStandardMaterial({ color: skinLight, roughness: 0.65, metalness: 0.02 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 5.2;
            head.scale.set(0.9, 1.1, 0.95);
            head.castShadow = true;
            bodyGroup.add(head);
            
            // 下颌
            const jawGeo = new THREE.SphereGeometry(0.5, 24, 24);
            const jaw = new THREE.Mesh(jawGeo, headMat);
            jaw.position.set(0, 4.65, 0.25);
            jaw.scale.set(1.1, 0.65, 0.85);
            jaw.castShadow = true;
            bodyGroup.add(jaw);
            
            // 颈部
            const neckGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.65, 20);
            const neckMat = new THREE.MeshStandardMaterial({ color: skinMid, roughness: 0.65, metalness: 0.02 });
            const neck = new THREE.Mesh(neckGeo, neckMat);
            neck.position.y = 4.2;
            neck.castShadow = true;
            bodyGroup.add(neck);
            
            // ====== 躯干（用旋转几何体） ======
            const torsoPoints = [];
            const torsoProfile = [
                [1.55, 3.6], [1.65, 3.2], [1.7, 2.8], [1.65, 2.2],
                [1.55, 1.6], [1.4, 1.0], [1.3, 0.4], [1.25, -0.2],
                [1.3, -0.8], [1.35, -1.2], [1.3, -1.5]
            ];
            for (let i = 0; i < torsoProfile.length; i++) {
                torsoPoints.push(new THREE.Vector2(torsoProfile[i][0], torsoProfile[i][1]));
            }
            
            const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
            const torsoMat = new THREE.MeshStandardMaterial({ color: skinMid, roughness: 0.6, metalness: 0.03 });
            const torso = new THREE.Mesh(torsoGeo, torsoMat);
            torso.scale.set(1, 1, 0.85);
            torso.castShadow = true;
            bodyGroup.add(torso);
            
            // ====== 胸大肌 ======
            const chestMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.55, metalness: 0.05 });
            
            function createChestSide(side) {
                const shape = new THREE.Shape();
                const w = 1.3, h = 1.2;
                shape.moveTo(0, -h * 0.4);
                shape.bezierCurveTo(w * 0.3, -h * 0.6, w * 0.8, -h * 0.3, w, 0);
                shape.bezierCurveTo(w * 0.8, h * 0.3, w * 0.3, h * 0.5, 0, h * 0.4);
                shape.bezierCurveTo(w * 0.2, 0, w * 0.2, -h * 0.2, 0, -h * 0.4);
                
                const extrudeSettings = {
                    depth: 0.55, bevelEnabled: true, bevelThickness: 0.18,
                    bevelSize: 0.15, bevelSegments: 6, curveSegments: 20
                };
                const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const mesh = new THREE.Mesh(geo, chestMat.clone());
                mesh.position.set(side * 0.1, 2.7, 1.25);
                mesh.rotation.y = side * 0.15;
                mesh.scale.set(side, 1, 1);
                mesh.castShadow = true;
                mesh.userData.muscle = '胸大肌';
                mesh.userData.isMuscle = true;
                return mesh;
            }
            
            const chestL = createChestSide(-1);
            const chestR = createChestSide(1);
            bodyGroup.add(chestL); muscleMeshes.push(chestL);
            bodyGroup.add(chestR); muscleMeshes.push(chestR);
            
            // ====== 腹肌 ======
            const abMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.55, metalness: 0.05 });
            for (let i = 0; i < 4; i++) {
                const abGeo = new THREE.SphereGeometry(0.3, 18, 18);
                const ab = new THREE.Mesh(abGeo, abMat.clone());
                ab.position.set(0, 2.2 - i * 0.5, 1.35);
                ab.scale.set(2.2, 0.75, 0.45);
                ab.castShadow = true;
                ab.userData.muscle = '腹直肌';
                ab.userData.isMuscle = true;
                bodyGroup.add(ab);
                muscleMeshes.push(ab);
            }
            
            // 腹白线（中间凹线）
            const lineGeo = new THREE.BoxGeometry(0.06, 2.0, 0.02);
            const lineMat = new THREE.MeshStandardMaterial({ color: skinDark, roughness: 0.7 });
            const abLine = new THREE.Mesh(lineGeo, lineMat);
            abLine.position.set(0, 1.45, 1.38);
            bodyGroup.add(abLine);
            
            // 腹外斜肌
            const oblMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.6, metalness: 0.04 });
            for (let side of [-1, 1]) {
                for (let i = 0; i < 3; i++) {
                    const oblGeo = new THREE.SphereGeometry(0.28, 14, 14);
                    const obl = new THREE.Mesh(oblGeo, oblMat.clone());
                    obl.position.set(side * 1.18, 2.0 - i * 0.55, 1.05);
                    obl.scale.set(0.7, 1.3, 0.5);
                    obl.rotation.z = side * 0.25;
                    obl.castShadow = true;
                    obl.userData.muscle = '腹外斜肌';
                    obl.userData.isMuscle = true;
                    bodyGroup.add(obl);
                    muscleMeshes.push(obl);
                }
            }
            
            // ====== 斜方肌 ======
            const trapsMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.55, metalness: 0.05 });
            
            const trapsShape = new THREE.Shape();
            trapsShape.moveTo(-1.8, 0);
            trapsShape.quadraticCurveTo(-1.2, 0.5, 0, 0.6);
            trapsShape.quadraticCurveTo(1.2, 0.5, 1.8, 0);
            trapsShape.quadraticCurveTo(1.0, 0.2, 0, 0.25);
            trapsShape.quadraticCurveTo(-1.0, 0.2, -1.8, 0);
            
            const trapsGeo = new THREE.ExtrudeGeometry(trapsShape, {
                depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 5, curveSegments: 24
            });
            const traps = new THREE.Mesh(trapsGeo, trapsMat.clone());
            traps.position.set(0, 3.7, -0.2);
            traps.rotation.x = -0.3;
            traps.castShadow = true;
            traps.userData.muscle = '斜方肌';
            traps.userData.isMuscle = true;
            bodyGroup.add(traps);
            muscleMeshes.push(traps);
            
            // 斜方肌两侧
            for (let side of [-1, 1]) {
                const trapSideGeo = new THREE.SphereGeometry(0.55, 20, 20);
                const trapSide = new THREE.Mesh(trapSideGeo, trapsMat.clone());
                trapSide.position.set(side * 1.55, 3.9, 0);
                trapSide.scale.set(0.9, 0.65, 1.0);
                trapSide.castShadow = true;
                trapSide.userData.muscle = '斜方肌';
                trapSide.userData.isMuscle = true;
                bodyGroup.add(trapSide);
                muscleMeshes.push(trapSide);
            }
            
            // ====== 肩部 ======
            const shoulderMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.55, metalness: 0.05 });
            
            for (let side of [-1, 1]) {
                const shoulderGeo = new THREE.SphereGeometry(0.52, 24, 24);
                const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
                shoulder.position.set(side * 1.95, 3.55, 0);
                shoulder.scale.set(1.05, 0.95, 1.1);
                shoulder.castShadow = true;
                shoulder.userData.muscle = '肩前束';
                shoulder.userData.isMuscle = true;
                bodyGroup.add(shoulder);
                muscleMeshes.push(shoulder);
                
                // 肩后束
                const rearDeltoidGeo = new THREE.SphereGeometry(0.4, 20, 20);
                const rearDeltoid = new THREE.Mesh(rearDeltoidGeo, trapsMat.clone());
                rearDeltoid.position.set(side * 1.85, 3.5, -0.35);
                rearDeltoid.scale.set(0.85, 0.8, 0.7);
                rearDeltoid.castShadow = true;
                rearDeltoid.userData.muscle = '肩后束';
                rearDeltoid.userData.isMuscle = true;
                bodyGroup.add(rearDeltoid);
                muscleMeshes.push(rearDeltoid);
            }
            
            // ====== 背部 - 背阔肌 ======
            const backMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.6, metalness: 0.04 });
            
            for (let side of [-1, 1]) {
                const latShape = new THREE.Shape();
                latShape.moveTo(0, 1.5);
                latShape.bezierCurveTo(0.3, 0.8, 0.9, 0.2, 1.2, -0.8);
                latShape.bezierCurveTo(1.0, -1.0, 0.6, -0.8, 0.4, 0);
                latShape.bezierCurveTo(0.2, 0.8, 0, 1.2, 0, 1.5);
                
                const latGeo = new THREE.ExtrudeGeometry(latShape, {
                    depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 20
                });
                const lat = new THREE.Mesh(latGeo, backMat.clone());
                lat.position.set(side * 0.1, 2.2, -1.1);
                lat.rotation.x = -0.15;
                lat.rotation.y = side * 0.1;
                lat.scale.set(side, 1, 1);
                lat.castShadow = true;
                lat.userData.muscle = '背阔肌';
                lat.userData.isMuscle = true;
                bodyGroup.add(lat);
                muscleMeshes.push(lat);
            }
            
            // 中背部
            const midBackGeo = new THREE.SphereGeometry(0.8, 24, 24);
            const midBack = new THREE.Mesh(midBackGeo, backMat.clone());
            midBack.position.set(0, 2.5, -1.25);
            midBack.scale.set(1.2, 1.5, 0.35);
            midBack.castShadow = true;
            midBack.userData.muscle = '中背部';
            midBack.userData.isMuscle = true;
            bodyGroup.add(midBack);
            muscleMeshes.push(midBack);
            
            // 下背部
            const lowerBackGeo = new THREE.SphereGeometry(0.65, 20, 20);
            const lowerBack = new THREE.Mesh(lowerBackGeo, backMat.clone());
            lowerBack.position.set(0, 0.5, -1.1);
            lowerBack.scale.set(1.1, 0.8, 0.4);
            lowerBack.castShadow = true;
            lowerBack.userData.muscle = '下背部';
            lowerBack.userData.isMuscle = true;
            bodyGroup.add(lowerBack);
            muscleMeshes.push(lowerBack);
            
            // ====== 上臂 ======
            const upperArmSkinMat = new THREE.MeshStandardMaterial({ color: skinMid, roughness: 0.62, metalness: 0.03 });
            
            for (let side of [-1, 1]) {
                // 上臂基础
                const armGeo = new THREE.SphereGeometry(0.38, 20, 20);
                const upperArm = new THREE.Mesh(armGeo, upperArmSkinMat.clone());
                upperArm.position.set(side * 2.05, 2.4, 0);
                upperArm.scale.set(0.95, 2.1, 0.9);
                upperArm.rotation.z = side * 0.1;
                upperArm.castShadow = true;
                bodyGroup.add(upperArm);
                
                // 肱二头肌
                const bicepMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.55, metalness: 0.05 });
                const bicepGeo = new THREE.SphereGeometry(0.32, 18, 18);
                const bicep = new THREE.Mesh(bicepGeo, bicepMat.clone());
                bicep.position.set(side * 2.0, 2.4, 0.45);
                bicep.scale.set(0.85, 1.6, 0.55);
                bicep.rotation.z = side * 0.1;
                bicep.castShadow = true;
                bicep.userData.muscle = '肱二头肌';
                bicep.userData.isMuscle = true;
                bodyGroup.add(bicep);
                muscleMeshes.push(bicep);
                
                // 肱三头肌
                const tricepMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.58, metalness: 0.04 });
                const tricepGeo = new THREE.SphereGeometry(0.3, 18, 18);
                const tricep = new THREE.Mesh(tricepGeo, tricepMat.clone());
                tricep.position.set(side * 2.08, 2.35, -0.35);
                tricep.scale.set(0.8, 1.5, 0.6);
                tricep.rotation.z = side * 0.08;
                tricep.castShadow = true;
                tricep.userData.muscle = '肱三头肌';
                tricep.userData.isMuscle = true;
                bodyGroup.add(tricep);
                muscleMeshes.push(tricep);
            }
            
            // ====== 前臂 ======
            const forearmMat = new THREE.MeshStandardMaterial({ color: skinDark, roughness: 0.65, metalness: 0.03 });
            
            for (let side of [-1, 1]) {
                const forearmGeo = new THREE.SphereGeometry(0.28, 18, 18);
                const forearm = new THREE.Mesh(forearmGeo, forearmMat.clone());
                forearm.position.set(side * 1.9, 0.7, 0.1);
                forearm.scale.set(0.85, 1.6, 0.78);
                forearm.rotation.z = side * 0.06;
                forearm.castShadow = true;
                forearm.userData.muscle = '前臂肌群';
                forearm.userData.isMuscle = true;
                bodyGroup.add(forearm);
                muscleMeshes.push(forearm);
            }
            
            // ====== 臀部 ======
            const gluteMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.55, metalness: 0.05 });
            
            for (let side of [-1, 1]) {
                const gluteGeo = new THREE.SphereGeometry(0.75, 24, 24);
                const glute = new THREE.Mesh(gluteGeo, gluteMat.clone());
                glute.position.set(side * 0.6, -0.8, -0.5);
                glute.scale.set(1.05, 0.85, 1.25);
                glute.castShadow = true;
                glute.userData.muscle = '臀大肌';
                glute.userData.isMuscle = true;
                bodyGroup.add(glute);
                muscleMeshes.push(glute);
            }
            
            // ====== 大腿 ======
            const thighSkinMat = new THREE.MeshStandardMaterial({ color: skinMid, roughness: 0.6, metalness: 0.03 });
            
            for (let side of [-1, 1]) {
                // 大腿基础
                const thighGeo = new THREE.SphereGeometry(0.52, 24, 24);
                const thigh = new THREE.Mesh(thighGeo, thighSkinMat.clone());
                thigh.position.set(side * 0.6, -2.5, 0);
                thigh.scale.set(0.95, 2.3, 0.88);
                thigh.castShadow = true;
                bodyGroup.add(thigh);
                
                // 股四头肌
                const quadMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.55, metalness: 0.05 });
                const quadGeo = new THREE.SphereGeometry(0.42, 20, 20);
                const quad = new THREE.Mesh(quadGeo, quadMat.clone());
                quad.position.set(side * 0.6, -2.5, 0.5);
                quad.scale.set(0.85, 1.9, 0.5);
                quad.castShadow = true;
                quad.userData.muscle = '股四头肌';
                quad.userData.isMuscle = true;
                bodyGroup.add(quad);
                muscleMeshes.push(quad);
                
                // 股外侧肌（突出的那一条）
                const vastGeo = new THREE.SphereGeometry(0.25, 16, 16);
                const vast = new THREE.Mesh(vastGeo, quadMat.clone());
                vast.position.set(side * 0.92, -2.6, 0.3);
                vast.scale.set(0.6, 1.8, 0.4);
                vast.castShadow = true;
                vast.userData.muscle = '股四头肌';
                vast.userData.isMuscle = true;
                bodyGroup.add(vast);
                muscleMeshes.push(vast);
                
                // 腘绳肌
                const hamMat = new THREE.MeshStandardMaterial({ color: muscleDark, roughness: 0.58, metalness: 0.04 });
                const hamGeo = new THREE.SphereGeometry(0.4, 20, 20);
                const ham = new THREE.Mesh(hamGeo, hamMat.clone());
                ham.position.set(side * 0.6, -2.6, -0.4);
                ham.scale.set(0.75, 1.8, 0.55);
                ham.castShadow = true;
                ham.userData.muscle = '腘绳肌';
                ham.userData.isMuscle = true;
                bodyGroup.add(ham);
                muscleMeshes.push(ham);
            }
            
            // ====== 小腿 ======
            const calfSkinMat = new THREE.MeshStandardMaterial({ color: skinDark, roughness: 0.65, metalness: 0.03 });
            
            for (let side of [-1, 1]) {
                // 小腿基础
                const shinGeo = new THREE.SphereGeometry(0.3, 20, 20);
                const shin = new THREE.Mesh(shinGeo, calfSkinMat.clone());
                shin.position.set(side * 0.55, -4.8, 0.1);
                shin.scale.set(0.7, 1.6, 0.6);
                shin.castShadow = true;
                bodyGroup.add(shin);
                
                // 腓肠肌（小腿肚）
                const calfMat = new THREE.MeshStandardMaterial({ color: muscleMid, roughness: 0.58, metalness: 0.04 });
                const calfGeo = new THREE.SphereGeometry(0.35, 20, 20);
                const calf = new THREE.Mesh(calfGeo, calfMat.clone());
                calf.position.set(side * 0.55, -4.9, -0.25);
                calf.scale.set(0.75, 1.3, 0.55);
                calf.castShadow = true;
                calf.userData.muscle = '小腿肌群';
                calf.userData.isMuscle = true;
                bodyGroup.add(calf);
                muscleMeshes.push(calf);
            }
            
            // 整体上移
            bodyGroup.position.y = 0.5;
            scene.add(bodyGroup);
        }
        
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
                const name = mesh.userData.muscle;
                
                if (hoveredMuscle !== mesh) {
                    if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                        setMuscleEmissive(hoveredMuscle, 0, 0);
                    }
                    hoveredMuscle = mesh;
                    if (name !== selectedMuscle3D) {
                        muscleMeshes.forEach(m => {
                            if (m.userData.muscle === name && m.userData.muscle !== selectedMuscle3D) {
                                setMuscleEmissive(m, 0xff6b35, 0.3);
                            }
                        });
                    }
                    document.body.style.cursor = 'pointer';
                }
                
                tooltip.textContent = name;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === hoveredMuscle.userData.muscle && m.userData.muscle !== selectedMuscle3D) {
                            setMuscleEmissive(m, 0, 0);
                        }
                    });
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }
        
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            
            if (intersects.length > 0) {
                const name = intersects[0].object.userData.muscle;
                if (selectedMuscle3D === name) return;
                
                // 清除之前选中的
                if (selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === selectedMuscle3D) {
                            setMuscleEmissive(m, 0, 0);
                        }
                    });
                }
                
                selectedMuscle3D = name;
                
                // 高亮选中的
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === name) {
                        setMuscleEmissive(m, 0xff8c00, 0.55);
                    }
                });
                
                selectMuscle(name, null);
            }
        }
        
        function onMouseLeave() {
            document.getElementById('muscle-tooltip').classList.remove('visible');
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === hoveredMuscle.userData.muscle && m.userData.muscle !== selectedMuscle3D) {
                        setMuscleEmissive(m, 0, 0);
                    }
                });
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        function setMuscleEmissive(mesh, colorHex, intensity) {
            if (mesh && mesh.material) {
                mesh.material.emissive.setHex(colorHex);
                mesh.material.emissiveIntensity = intensity;
                mesh.material.needsUpdate = true;
            }
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
            controls.update();
            renderer.render(scene, camera);
        }
