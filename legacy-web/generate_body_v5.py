#!/usr/bin/env python3
"""
生成V5版本的3D人体 - 流畅曲线风格，更自然
"""

js_code = '''
        // ============ 3D人体模型 V5 - 流畅自然版 ============
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
            
            camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
            camera.position.set(0, 0.2, 14.5);
            
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
            controls.target.set(0, 0.2, 0);
            controls.maxPolarAngle = Math.PI * 0.92;
            controls.minPolarAngle = Math.PI * 0.08;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.35;
            
            // ====== 光照 ======
            const ambient = new THREE.AmbientLight(0xfff0e0, 0.4);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
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
            
            const rimLight = new THREE.DirectionalLight(0xffaa66, 0.4);
            rimLight.position.set(0, 4, -6);
            scene.add(rimLight);
            
            const hemiLight = new THREE.HemisphereLight(0x99aabb, 0x554433, 0.3);
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
            
            // ====== 材质色板 ======
            const skin = {
                light: 0xf0d2b5,
                mid: 0xe4c29e,
                dark: 0xd4b088,
                deep: 0xc29c74
            };
            const musc = {
                light: 0xe8ba90,
                mid: 0xd9a77a,
                dark: 0xc79668,
                deep: 0xb38658
            };
            
            function m(type, level) {
                const pal = type === 'skin' ? skin : musc;
                const c = pal[level] || pal.mid;
                return new THREE.MeshStandardMaterial({
                    color: c, roughness: type === 'skin' ? 0.58 : 0.5,
                    metalness: 0.03
                });
            }
            
            function mark(mesh, name) {
                mesh.userData.muscle = name;
                mesh.userData.isMuscle = true;
                muscleMeshes.push(mesh);
            }
            
            // ====== 头部 ======
            const headGeo = new THREE.SphereGeometry(0.75, 32, 28);
            const head = new THREE.Mesh(headGeo, m('skin', 'light'));
            head.position.set(0, 5.1, 0);
            head.scale.set(0.9, 1.05, 0.95);
            head.castShadow = true;
            bodyGroup.add(head);
            
            // 下颌
            const jawGeo = new THREE.SphereGeometry(0.5, 24, 18);
            const jaw = new THREE.Mesh(jawGeo, m('skin', 'mid'));
            jaw.position.set(0, 4.55, 0.2);
            jaw.scale.set(1.05, 0.6, 0.8);
            jaw.castShadow = true;
            bodyGroup.add(jaw);
            
            // 颈部
            const neckGeo = new THREE.SphereGeometry(0.35, 20, 14);
            const neck = new THREE.Mesh(neckGeo, m('skin', 'mid'));
            neck.position.set(0, 4.1, 0);
            neck.scale.set(0.95, 0.85, 0.9);
            neck.castShadow = true;
            bodyGroup.add(neck);
            
            // ====== 躯干（平滑旋转几何体） ======
            const torsoPts = [];
            const prof = [
                [1.28, 3.8], [1.4, 3.5], [1.5, 3.2], [1.56, 2.9], [1.58, 2.6],
                [1.56, 2.3], [1.5, 2.0], [1.43, 1.7], [1.36, 1.4], [1.3, 1.1],
                [1.25, 0.8], [1.2, 0.5], [1.16, 0.2], [1.14, -0.1],
                [1.15, -0.4], [1.18, -0.7], [1.2, -1.0], [1.18, -1.3], [1.14, -1.55]
            ];
            for (let i = 0; i < prof.length; i++) {
                torsoPts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
            }
            const torsoGeo = new THREE.LatheGeometry(torsoPts, 40);
            const torso = new THREE.Mesh(torsoGeo, m('skin', 'mid'));
            torso.scale.set(1, 1, 0.78);
            torso.castShadow = true;
            bodyGroup.add(torso);
            
            // ====== 胸大肌 ======
            const chestMat = m('musc', 'mid');
            for (let side of [-1, 1]) {
                const c = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 20), chestMat.clone());
                c.position.set(side * 0.6, 2.95, 1.18);
                c.scale.set(side * 1.1, 0.9, 0.6);
                c.rotation.y = side * 0.4;
                c.rotation.z = side * 0.1;
                c.castShadow = true;
                mark(c, '胸大肌');
                bodyGroup.add(c);
                
                // 上胸
                const cu = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), m('musc', 'light').clone());
                cu.position.set(side * 0.5, 3.25, 1.1);
                cu.scale.set(side * 0.9, 0.6, 0.45);
                cu.rotation.y = side * 0.35;
                cu.castShadow = true;
                mark(cu, '胸大肌');
                bodyGroup.add(cu);
            }
            
            // ====== 腹肌 ======
            const abMat = m('musc', 'mid');
            for (let i = 0; i < 4; i++) {
                const ab = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), abMat.clone());
                ab.position.set(0, 2.3 - i * 0.46, 1.28);
                ab.scale.set(2.0, 0.52, 0.35);
                ab.castShadow = true;
                mark(ab, '腹直肌');
                bodyGroup.add(ab);
            }
            
            // 腹白线
            const abLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 1.7, 0.04),
                new THREE.MeshStandardMaterial({ color: skin.deep, roughness: 0.7 })
            );
            abLine.position.set(0, 1.61, 1.3);
            bodyGroup.add(abLine);
            
            // ====== 腹外斜肌 ======
            const oblMat = m('musc', 'dark');
            for (let side of [-1, 1]) {
                for (let i = 0; i < 3; i++) {
                    const o = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), oblMat.clone());
                    o.position.set(side * 1.02, 2.1 - i * 0.5, 1.0);
                    o.scale.set(0.7, 1.1, 0.45);
                    o.rotation.z = side * 0.3;
                    o.castShadow = true;
                    mark(o, '腹外斜肌');
                    bodyGroup.add(o);
                }
            }
            
            // ====== 斜方肌 ======
            const trapsMat = m('musc', 'dark');
            for (let side of [-1, 1]) {
                const t = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), trapsMat.clone());
                t.position.set(side * 0.9, 3.85, -0.1);
                t.scale.set(0.7, 0.95, 0.65);
                t.rotation.z = side * 0.3;
                t.rotation.x = -0.15;
                t.castShadow = true;
                mark(t, '斜方肌');
                bodyGroup.add(t);
            }
            
            // 中斜方
            const midTrap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), m('musc', 'deep').clone());
            midTrap.position.set(0, 3.5, -0.75);
            midTrap.scale.set(1.0, 0.45, 0.3);
            midTrap.rotation.x = -0.2;
            midTrap.castShadow = true;
            mark(midTrap, '斜方肌');
            bodyGroup.add(midTrap);
            
            // ====== 肩部 ======
            const deltMat = m('musc', 'mid');
            for (let side of [-1, 1]) {
                // 前中后束融合成一个更自然的三角
                const d1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 22, 18), deltMat.clone());
                d1.position.set(side * 1.7, 3.45, 0.35);
                d1.scale.set(0.95, 0.85, 0.9);
                d1.rotation.y = side * 0.35;
                d1.castShadow = true;
                mark(d1, '三角肌');
                bodyGroup.add(d1);
                
                const d2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), m('musc', 'light').clone());
                d2.position.set(side * 1.8, 3.45, 0);
                d2.scale.set(0.8, 0.9, 0.85);
                d2.castShadow = true;
                mark(d2, '三角肌');
                bodyGroup.add(d2);
                
                const d3 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), m('musc', 'dark').clone());
                d3.position.set(side * 1.65, 3.42, -0.35);
                d3.scale.set(0.8, 0.75, 0.8);
                d3.rotation.y = side * -0.3;
                d3.castShadow = true;
                mark(d3, '三角肌');
                bodyGroup.add(d3);
            }
            
            // ====== 背部 ======
            const backMat = m('musc', 'deep');
            for (let side of [-1, 1]) {
                // 背阔肌
                const lat = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 20), backMat.clone());
                lat.position.set(side * 0.7, 1.5, -1.0);
                lat.scale.set(0.8, 1.5, 0.35);
                lat.rotation.x = -0.08;
                lat.rotation.y = side * -0.2;
                lat.rotation.z = side * -0.12;
                lat.castShadow = true;
                mark(lat, '背阔肌');
                bodyGroup.add(lat);
            }
            
            // 中背部
            const midBack = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 18), m('musc', 'dark').clone());
            midBack.position.set(0, 2.2, -1.1);
            midBack.scale.set(0.9, 0.85, 0.3);
            midBack.rotation.x = -0.1;
            midBack.castShadow = true;
            mark(midBack, '中背部');
            bodyGroup.add(midBack);
            
            // 下背部
            const lowerBack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), backMat.clone());
            lowerBack.position.set(0, 0.5, -0.95);
            lowerBack.scale.set(0.85, 0.55, 0.3);
            lowerBack.castShadow = true;
            mark(lowerBack, '下背部');
            bodyGroup.add(lowerBack);
            
            // ====== 上臂 ======
            for (let side of [-1, 1]) {
                // 上臂
                const arm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), m('skin', 'mid'));
                arm.position.set(side * 1.9, 2.25, 0);
                arm.scale.set(0.85, 1.8, 0.85);
                arm.rotation.z = side * 0.08;
                arm.castShadow = true;
                bodyGroup.add(arm);
                
                // 肱二头肌
                const bi = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), m('musc', 'mid').clone());
                bi.position.set(side * 1.82, 2.3, 0.4);
                bi.scale.set(0.7, 1.2, 0.5);
                bi.rotation.z = side * 0.1;
                bi.castShadow = true;
                mark(bi, '肱二头肌');
                bodyGroup.add(bi);
                
                // 肱三头肌
                const tri = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), m('musc', 'dark').clone());
                tri.position.set(side * 1.92, 2.25, -0.3);
                tri.scale.set(0.65, 1.15, 0.55);
                tri.rotation.z = side * 0.05;
                tri.castShadow = true;
                mark(tri, '肱三头肌');
                bodyGroup.add(tri);
            }
            
            // ====== 前臂 ======
            for (let side of [-1, 1]) {
                const fore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), m('skin', 'dark'));
                fore.position.set(side * 1.78, 0.65, 0.05);
                fore.scale.set(0.7, 1.45, 0.7);
                fore.rotation.z = side * 0.05;
                fore.castShadow = true;
                mark(fore, '前臂肌群');
                bodyGroup.add(fore);
            }
            
            // ====== 臀部 ======
            const gluteMat = m('musc', 'dark');
            for (let side of [-1, 1]) {
                const g = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 20), gluteMat.clone());
                g.position.set(side * 0.52, -0.75, -0.48);
                g.scale.set(0.95, 0.75, 1.1);
                g.rotation.x = -0.12;
                g.castShadow = true;
                mark(g, '臀大肌');
                bodyGroup.add(g);
            }
            
            // ====== 大腿 ======
            for (let side of [-1, 1]) {
                // 大腿
                const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 20), m('skin', 'mid'));
                thigh.position.set(side * 0.5, -2.55, 0);
                thigh.scale.set(0.9, 2.1, 0.85);
                thigh.castShadow = true;
                bodyGroup.add(thigh);
                
                // 股四头肌
                const q = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), m('musc', 'mid').clone());
                q.position.set(side * 0.5, -2.55, 0.45);
                q.scale.set(0.7, 1.6, 0.42);
                q.castShadow = true;
                mark(q, '股四头肌');
                bodyGroup.add(q);
                
                // 股外侧肌
                const vl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), m('musc', 'light').clone());
                vl.position.set(side * 0.78, -2.6, 0.28);
                vl.scale.set(0.55, 1.5, 0.35);
                vl.rotation.z = side * 0.1;
                vl.castShadow = true;
                mark(vl, '股四头肌');
                bodyGroup.add(vl);
                
                // 腘绳肌
                const ham = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), m('musc', 'dark').clone());
                ham.position.set(side * 0.55, -2.6, -0.38);
                ham.scale.set(0.6, 1.5, 0.45);
                ham.castShadow = true;
                mark(ham, '腘绳肌');
                bodyGroup.add(ham);
            }
            
            // ====== 膝盖 ======
            for (let side of [-1, 1]) {
                const knee = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), m('skin', 'dark'));
                knee.position.set(side * 0.5, -3.95, 0.32);
                knee.scale.set(0.85, 0.65, 0.6);
                knee.castShadow = true;
                bodyGroup.add(knee);
            }
            
            // ====== 小腿 ======
            for (let side of [-1, 1]) {
                const shin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), m('skin', 'dark'));
                shin.position.set(side * 0.48, -4.95, 0.18);
                shin.scale.set(0.6, 1.3, 0.55);
                shin.castShadow = true;
                bodyGroup.add(shin);
                
                const calf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), m('musc', 'mid').clone());
                calf.position.set(side * 0.48, -5.0, -0.18);
                calf.scale.set(0.65, 1.0, 0.55);
                calf.rotation.x = -0.08;
                calf.castShadow = true;
                mark(calf, '小腿肌群');
                bodyGroup.add(calf);
            }
            
            // 整体位置
            bodyGroup.position.y = 0.2;
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
                                setMuscleEmissive(mm, 0xff6b35, 0.3);
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
                    muscleMeshes.forEach(mm => {
                        if (mm.userData.muscle === hoveredMuscle.userData.muscle) {
                            setMuscleEmissive(mm, 0, 0);
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
                        setMuscleEmissive(mm, 0xff8c00, 0.55);
                    }
                });
                
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

with open('body_v5.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print(f"V5 代码生成完成: {len(js_code)} 字符")
