#!/usr/bin/env python3
"""
生成V6版本的3D人体 - 完整皮肤 + 内层肌肉
整体是一个完整的人形，肌肉在皮肤下，悬停时发光
"""

js_code = '''
        // ============ 3D人体模型 V6 - 皮肤肌肉双层版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let skinMeshes = [];
        let muscleMeshes = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0e14);
            
            camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
            camera.position.set(0, 0.3, 14.5);
            
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
            controls.minDistance = 9;
            controls.maxDistance = 30;
            controls.target.set(0, 0.3, 0);
            controls.maxPolarAngle = Math.PI * 0.93;
            controls.minPolarAngle = Math.PI * 0.07;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.35;
            
            // ====== 光照 ======
            const ambient = new THREE.AmbientLight(0xfff0e0, 0.35);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
            keyLight.position.set(4, 7, 5);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = 2048;
            keyLight.shadow.mapSize.height = 2048;
            keyLight.shadow.camera.near = 0.5;
            keyLight.shadow.camera.far = 50;
            keyLight.shadow.camera.left = -6;
            keyLight.shadow.camera.right = 6;
            keyLight.shadow.camera.top = 8;
            keyLight.shadow.camera.bottom = -8;
            scene.add(keyLight);
            
            const fillLight = new THREE.DirectionalLight(0x8899bb, 0.35);
            fillLight.position.set(-5, 3, -3);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xff9955, 0.5);
            rimLight.position.set(0, 4, -6);
            scene.add(rimLight);
            
            const hemiLight = new THREE.HemisphereLight(0x99aabb, 0x443322, 0.25);
            scene.add(hemiLight);
            
            // 点光源（肌肉发光时的补光）
            const pointLight = new THREE.PointLight(0xff6633, 0, 20);
            pointLight.position.set(0, 2, 3);
            pointLight.name = 'accentLight';
            scene.add(pointLight);
            
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
            
            // ====== 颜色 ======
            const skinColor = 0xe2b890;
            const skinDark = 0xc9a078;
            const muscleColor = 0xd4996a;
            const muscleDark = 0xb88358;
            
            // ====== 皮肤材质（半透明，让肌肉透出） ======
            const skinMat = new THREE.MeshStandardMaterial({
                color: skinColor,
                roughness: 0.55,
                metalness: 0.02,
                transparent: true,
                opacity: 0.85
            });
            
            // 肌肉基础材质
            function muscleMat(color) {
                return new THREE.MeshStandardMaterial({
                    color: color || muscleColor,
                    roughness: 0.5,
                    metalness: 0.04,
                    emissive: 0x000000,
                    emissiveIntensity: 0
                });
            }
            
            function mark(mesh, name) {
                mesh.userData.muscle = name;
                mesh.userData.isMuscle = true;
                muscleMeshes.push(mesh);
            }
            
            function addSkin(mesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                skinMeshes.push(mesh);
                bodyGroup.add(mesh);
            }
            
            // ========== 皮肤层 ==========
            
            // 头部
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 32, 28), skinMat.clone());
            head.position.set(0, 5.05, 0);
            head.scale.set(0.88, 1.0, 0.92);
            addSkin(head);
            
            // 下颌
            const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 18), skinMat.clone());
            jaw.position.set(0, 4.52, 0.22);
            jaw.scale.set(1.0, 0.58, 0.78);
            addSkin(jaw);
            
            // 颈部
            const neckGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.55, 20);
            const neck = new THREE.Mesh(neckGeo, skinMat.clone());
            neck.position.set(0, 4.15, 0);
            addSkin(neck);
            
            // 躯干（用LatheGeometry创建平滑的身体轮廓）
            const torsoPts = [];
            const prof = [
                [1.2, 3.85], [1.35, 3.6], [1.48, 3.35], [1.56, 3.1],
                [1.6, 2.85], [1.6, 2.6], [1.58, 2.35], [1.54, 2.1],
                [1.48, 1.85], [1.42, 1.6], [1.36, 1.35], [1.3, 1.1],
                [1.25, 0.85], [1.21, 0.6], [1.18, 0.35], [1.15, 0.1],
                [1.14, -0.15], [1.15, -0.4], [1.18, -0.65], [1.2, -0.9],
                [1.18, -1.15], [1.14, -1.4], [1.1, -1.6]
            ];
            for (let i = 0; i < prof.length; i++) {
                torsoPts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
            }
            const torsoGeo = new THREE.LatheGeometry(torsoPts, 40);
            const torso = new THREE.Mesh(torsoGeo, skinMat.clone());
            torso.scale.set(1, 1, 0.78);
            addSkin(torso);
            
            // 肩部皮肤过渡
            for (let side of [-1, 1]) {
                const shoulderSkin = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 20), skinMat.clone());
                shoulderSkin.position.set(side * 1.55, 3.5, 0);
                shoulderSkin.scale.set(1.0, 0.85, 0.95);
                addSkin(shoulderSkin);
            }
            
            // 上臂皮肤
            for (let side of [-1, 1]) {
                const upperArm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), skinMat.clone());
                upperArm.position.set(side * 1.8, 2.15, 0);
                upperArm.scale.set(0.8, 1.7, 0.8);
                upperArm.rotation.z = side * 0.06;
                addSkin(upperArm);
            }
            
            // 肘部
            for (let side of [-1, 1]) {
                const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), skinMat.clone());
                elbow.position.set(side * 1.72, 0.85, 0);
                elbow.scale.set(0.85, 0.6, 0.8);
                addSkin(elbow);
            }
            
            // 前臂皮肤
            for (let side of [-1, 1]) {
                const forearm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skinMat.clone());
                forearm.position.set(side * 1.68, 0.3, 0);
                forearm.scale.set(0.65, 1.3, 0.7);
                forearm.rotation.z = side * 0.04;
                addSkin(forearm);
            }
            
            // 髋部皮肤
            const hipSkin = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 20), skinMat.clone());
            hipSkin.position.set(0, -1.0, -0.15);
            hipSkin.scale.set(1.0, 0.4, 0.6);
            addSkin(hipSkin);
            
            // 大腿皮肤
            for (let side of [-1, 1]) {
                const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 26, 20), skinMat.clone());
                thigh.position.set(side * 0.52, -2.5, 0);
                thigh.scale.set(0.88, 2.0, 0.82);
                addSkin(thigh);
            }
            
            // 膝盖
            for (let side of [-1, 1]) {
                const knee = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), skinMat.clone());
                knee.position.set(side * 0.5, -3.9, 0.25);
                knee.scale.set(0.8, 0.6, 0.7);
                addSkin(knee);
            }
            
            // 小腿皮肤
            for (let side of [-1, 1]) {
                const calf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skinMat.clone());
                calf.position.set(side * 0.48, -4.9, 0);
                calf.scale.set(0.6, 1.25, 0.6);
                addSkin(calf);
            }
            
            // ========== 肌肉层（在皮肤下，稍微突出） ==========
            
            // 胸大肌
            const chestMat = muscleMat(muscleColor);
            for (let side of [-1, 1]) {
                const c = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 20), chestMat.clone());
                c.position.set(side * 0.55, 2.9, 1.18);
                c.scale.set(side * 1.0, 0.78, 0.5);
                c.rotation.y = side * 0.38;
                c.rotation.z = side * 0.08;
                mark(c, '胸大肌');
                bodyGroup.add(c);
            }
            
            // 腹肌
            const abMat = muscleMat(muscleColor);
            for (let i = 0; i < 4; i++) {
                const ab = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), abMat.clone());
                ab.position.set(0, 2.25 - i * 0.45, 1.25);
                ab.scale.set(1.7, 0.48, 0.32);
                mark(ab, '腹直肌');
                bodyGroup.add(ab);
            }
            
            // 腹外斜肌
            const oblMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                for (let i = 0; i < 3; i++) {
                    const o = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), oblMat.clone());
                    o.position.set(side * 0.98, 2.05 - i * 0.48, 0.98);
                    o.scale.set(0.6, 1.0, 0.4);
                    o.rotation.z = side * 0.3;
                    mark(o, '腹外斜肌');
                    bodyGroup.add(o);
                }
            }
            
            // 斜方肌
            const trapsMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const t = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), trapsMat.clone());
                t.position.set(side * 0.85, 3.78, -0.08);
                t.scale.set(0.6, 0.85, 0.55);
                t.rotation.z = side * 0.28;
                t.rotation.x = -0.12;
                mark(t, '斜方肌');
                bodyGroup.add(t);
            }
            
            const midTrap = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), muscleMat(0xa6784d).clone());
            midTrap.position.set(0, 3.45, -0.72);
            midTrap.scale.set(0.9, 0.4, 0.28);
            midTrap.rotation.x = -0.2;
            mark(midTrap, '斜方肌');
            bodyGroup.add(midTrap);
            
            // 三角肌（肩部）
            const deltMat = muscleMat(muscleColor);
            for (let side of [-1, 1]) {
                const d = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 18), deltMat.clone());
                d.position.set(side * 1.62, 3.45, 0);
                d.scale.set(0.9, 0.75, 0.85);
                mark(d, '三角肌');
                bodyGroup.add(d);
            }
            
            // 背阔肌
            const latMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const lat = new THREE.Mesh(new THREE.SphereGeometry(0.45, 22, 18), latMat.clone());
                lat.position.set(side * 0.65, 1.5, -0.98);
                lat.scale.set(0.7, 1.4, 0.32);
                lat.rotation.x = -0.08;
                lat.rotation.y = side * -0.18;
                lat.rotation.z = side * -0.1;
                mark(lat, '背阔肌');
                bodyGroup.add(lat);
            }
            
            // 中背部
            const midBack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), muscleMat(0xa6784d).clone());
            midBack.position.set(0, 2.2, -1.05);
            midBack.scale.set(0.8, 0.75, 0.28);
            midBack.rotation.x = -0.08;
            mark(midBack, '中背部');
            bodyGroup.add(midBack);
            
            // 下背部
            const lowerBack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), latMat.clone());
            lowerBack.position.set(0, 0.5, -0.9);
            lowerBack.scale.set(0.75, 0.5, 0.28);
            mark(lowerBack, '下背部');
            bodyGroup.add(lowerBack);
            
            // 肱二头肌
            const bicepMat = muscleMat(muscleColor);
            for (let side of [-1, 1]) {
                const bi = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), bicepMat.clone());
                bi.position.set(side * 1.72, 2.2, 0.38);
                bi.scale.set(0.6, 1.0, 0.42);
                bi.rotation.z = side * 0.08;
                mark(bi, '肱二头肌');
                bodyGroup.add(bi);
            }
            
            // 肱三头肌
            const tricepMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const tri = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), tricepMat.clone());
                tri.position.set(side * 1.78, 2.18, -0.3);
                tri.scale.set(0.55, 0.95, 0.45);
                tri.rotation.z = side * 0.05;
                mark(tri, '肱三头肌');
                bodyGroup.add(tri);
            }
            
            // 前臂肌群
            const foreMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const fore = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), foreMat.clone());
                fore.position.set(side * 1.62, 0.3, 0.15);
                fore.scale.set(0.55, 1.1, 0.5);
                fore.rotation.z = side * 0.04;
                mark(fore, '前臂肌群');
                bodyGroup.add(fore);
            }
            
            // 臀大肌
            const gluteMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const g = new THREE.Mesh(new THREE.SphereGeometry(0.52, 22, 18), gluteMat.clone());
                g.position.set(side * 0.48, -0.72, -0.45);
                g.scale.set(0.85, 0.65, 0.95);
                g.rotation.x = -0.1;
                mark(g, '臀大肌');
                bodyGroup.add(g);
            }
            
            // 股四头肌
            const quadMat = muscleMat(muscleColor);
            for (let side of [-1, 1]) {
                const q = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), quadMat.clone());
                q.position.set(side * 0.5, -2.5, 0.42);
                q.scale.set(0.6, 1.4, 0.38);
                mark(q, '股四头肌');
                bodyGroup.add(q);
                
                // 股外侧肌线条
                const vl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), muscleMat(0xe0a87a).clone());
                vl.position.set(side * 0.72, -2.55, 0.25);
                vl.scale.set(0.45, 1.3, 0.3);
                vl.rotation.z = side * 0.1;
                mark(vl, '股四头肌');
                bodyGroup.add(vl);
            }
            
            // 腘绳肌
            const hamMat = muscleMat(muscleDark);
            for (let side of [-1, 1]) {
                const ham = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), hamMat.clone());
                ham.position.set(side * 0.52, -2.55, -0.35);
                ham.scale.set(0.5, 1.3, 0.4);
                mark(ham, '腘绳肌');
                bodyGroup.add(ham);
            }
            
            // 小腿肌群
            const calfMat = muscleMat(muscleColor);
            for (let side of [-1, 1]) {
                const calf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), calfMat.clone());
                calf.position.set(side * 0.46, -4.9, -0.15);
                calf.scale.set(0.55, 0.85, 0.48);
                calf.rotation.x = -0.08;
                mark(calf, '小腿肌群');
                bodyGroup.add(calf);
            }
            
            // 整体位置
            bodyGroup.position.y = 0.3;
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
                        muscleMeshes.forEach(mm => {
                            if (mm.userData.muscle === hoveredMuscle.userData.muscle) {
                                setMuscleEmissive(mm, 0, 0);
                            }
                        });
                    }
                    hoveredMuscle = mesh;
                    if (name !== selectedMuscle3D) {
                        muscleMeshes.forEach(mm => {
                            if (mm.userData.muscle === name) {
                                setMuscleEmissive(mm, 0xff6633, 0.5);
                            }
                        });
                    }
                    document.body.style.cursor = 'pointer';
                    
                    const light = scene.getObjectByName('accentLight');
                    if (light) { light.intensity = 0.4; }
                }
                
                tooltip.textContent = name;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    muscleMeshes.forEach(mm => {
                        if (mm.userData.muscle === hoveredMuscle.userData.muscle) {
                            setMuscleEmissive(mm, 0, 0);
                        }
                    });
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
                
                const light = scene.getObjectByName('accentLight');
                if (light && !selectedMuscle3D) { light.intensity = 0; }
            }
        }
        
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            
            if (intersects.length > 0) {
                const name = intersects[0].object.userData.muscle;
                if (selectedMuscle3D === name) return;
                
                if (selectedMuscle3D) {
                    muscleMeshes.forEach(mm => {
                        if (mm.userData.muscle === selectedMuscle3D) {
                            setMuscleEmissive(mm, 0, 0);
                        }
                    });
                }
                
                selectedMuscle3D = name;
                
                muscleMeshes.forEach(mm => {
                    if (mm.userData.muscle === name) {
                        setMuscleEmissive(mm, 0xff8c00, 0.7);
                    }
                });
                
                const light = scene.getObjectByName('accentLight');
                if (light) { light.intensity = 0.6; }
                
                selectMuscle(name, null);
            }
        }
        
        function onMouseLeave() {
            document.getElementById('muscle-tooltip').classList.remove('visible');
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                muscleMeshes.forEach(mm => {
                    if (mm.userData.muscle === hoveredMuscle.userData.muscle) {
                        setMuscleEmissive(mm, 0, 0);
                    }
                });
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
            
            const light = scene.getObjectByName('accentLight');
            if (light && !selectedMuscle3D) { light.intensity = 0; }
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
'''

with open('body_v6.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print(f"V6 代码生成完成: {len(js_code)} 字符")
